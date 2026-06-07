/**
 * SmartEd Africa Offline Database
 * IndexedDB via `idb` library for offline-first lesson content and quiz queuing.
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'smarted-offline';
const DB_VERSION = 1;

interface LessonContent {
  id: string;
  courseId: string;
  title: string;
  content: string;
  downloadedAt: number;
  expiresAt: number;
}

interface OfflineQuizAttempt {
  id: string;
  quizId: string;
  answers: number[];
  attemptedAt: number;
  synced: boolean;
}

interface SmartEdDB extends DBSchema {
  lessons: {
    key: string;
    value: LessonContent;
    indexes: { 'by-course': string };
  };
  quiz_queue: {
    key: string;
    value: OfflineQuizAttempt;
    indexes: { 'unsynced': number };
  };
}

let db: IDBPDatabase<SmartEdDB> | null = null;

async function getDb(): Promise<IDBPDatabase<SmartEdDB>> {
  if (db) return db;
  db = await openDB<SmartEdDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('lessons')) {
        const lessonStore = database.createObjectStore('lessons', { keyPath: 'id' });
        lessonStore.createIndex('by-course', 'courseId');
      }
      if (!database.objectStoreNames.contains('quiz_queue')) {
        const quizStore = database.createObjectStore('quiz_queue', { keyPath: 'id' });
        quizStore.createIndex('unsynced', 'synced');
      }
    },
  });
  return db;
}

// ── Lessons ───────────────────────────────────────────────────────────────────

const LESSON_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function saveLesson(lesson: Omit<LessonContent, 'downloadedAt' | 'expiresAt'>): Promise<void> {
  const database = await getDb();
  await database.put('lessons', {
    ...lesson,
    downloadedAt: Date.now(),
    expiresAt: Date.now() + LESSON_TTL_MS,
  });
}

export async function getLesson(lessonId: string): Promise<LessonContent | null> {
  const database = await getDb();
  const lesson = await database.get('lessons', lessonId);
  if (!lesson) return null;
  if (lesson.expiresAt < Date.now()) {
    await database.delete('lessons', lessonId);
    return null;
  }
  return lesson;
}

export async function getLessonsForCourse(courseId: string): Promise<LessonContent[]> {
  const database = await getDb();
  const all = await database.getAllFromIndex('lessons', 'by-course', courseId);
  const now = Date.now();
  return all.filter((l) => l.expiresAt > now);
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const database = await getDb();
  await database.delete('lessons', lessonId);
}

export async function getDownloadedLessonIds(): Promise<string[]> {
  const database = await getDb();
  return database.getAllKeys('lessons') as Promise<string[]>;
}

export async function getOfflineLessonCount(): Promise<number> {
  const database = await getDb();
  return database.count('lessons');
}

// ── Quiz attempt queue ────────────────────────────────────────────────────────

export async function queueQuizAttempt(quizId: string, answers: number[]): Promise<string> {
  const database = await getDb();
  const id = `${quizId}-${Date.now()}`;
  await database.put('quiz_queue', {
    id,
    quizId,
    answers,
    attemptedAt: Date.now(),
    synced: false,
  });
  return id;
}

export async function getUnsyncedAttempts(): Promise<OfflineQuizAttempt[]> {
  const database = await getDb();
  return database.getAllFromIndex('quiz_queue', 'unsynced', 0 as unknown as number);
}

export async function markAttemptSynced(id: string): Promise<void> {
  const database = await getDb();
  const attempt = await database.get('quiz_queue', id);
  if (attempt) {
    attempt.synced = true;
    await database.put('quiz_queue', attempt);
  }
}

export async function clearSyncedAttempts(): Promise<void> {
  const database = await getDb();
  const synced = await database.getAllFromIndex('quiz_queue', 'unsynced', 1 as unknown as number);
  const tx = database.transaction('quiz_queue', 'readwrite');
  await Promise.all(synced.map((a) => tx.store.delete(a.id)));
  await tx.done;
}

// ── Storage info ─────────────────────────────────────────────────────────────

export async function getStorageInfo(): Promise<{ lessonsCount: number; queuedAttempts: number }> {
  const database = await getDb();
  const [lessonsCount, allAttempts] = await Promise.all([
    database.count('lessons'),
    database.getAll('quiz_queue'),
  ]);
  return {
    lessonsCount,
    queuedAttempts: allAttempts.filter((a) => !a.synced).length,
  };
}

export async function clearAllOfflineData(): Promise<void> {
  const database = await getDb();
  await database.clear('lessons');
  await database.clear('quiz_queue');
}
