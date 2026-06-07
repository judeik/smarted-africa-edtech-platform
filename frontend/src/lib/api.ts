const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
};

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('smarted_access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include', // send cookies (refresh token)
  });

  if (res.status === 401) {
    // Try token refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = localStorage.getItem('smarted_access_token');
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      const retry = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'include',
      });
      if (!retry.ok) {
        const errData = await retry.json().catch(() => ({}));
        throw new ApiError(retry.status, errData.message || 'Request failed');
      }
      return retry.json();
    }
    // Refresh failed — clear auth
    localStorage.removeItem('smarted_access_token');
    window.dispatchEvent(new Event('smarted:logout'));
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errData.message || 'Request failed');
  }

  return res.json();
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.accessToken) {
      localStorage.setItem('smarted_access_token', data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'teacher' | 'admin';
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  accessToken: string;
}

export const authApi = {
  register: (name: string, email: string) =>
    request<{ success: boolean; message: string }>(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: { name, email },
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: { email, password },
    }),

  logout: () =>
    request<{ success: boolean }>(`${BASE_URL}/auth/logout`, { method: 'POST' }),

  getMe: () =>
    request<{ success: boolean; user: AuthUser }>(`${BASE_URL}/auth/me`),

  confirmEmail: (token: string) =>
    request<{ success: boolean; message: string; userId?: string }>(
      `${BASE_URL}/auth/confirm/${token}`
    ),

  setPassword: (userId: string, password: string, confirmPassword: string) =>
    request<AuthResponse>(`${BASE_URL}/auth/set-password/${userId}`, {
      method: 'POST',
      body: { password, confirmPassword },
    }),

  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (token: string, password: string, confirmPassword: string) =>
    request<{ success: boolean; message: string }>(`${BASE_URL}/auth/reset-password/${token}`, {
      method: 'POST',
      body: { password, confirmPassword },
    }),

  resendConfirmation: (email: string) =>
    request<{ success: boolean; message: string }>(`${BASE_URL}/auth/resend-confirmation`, {
      method: 'POST',
      body: { email },
    }),
};

// ── Courses ───────────────────────────────────────────────────────────────────

export const coursesApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<{ success: boolean; data: { items: unknown[]; total: number; page: number } }>(
      `${BASE_URL}/courses${qs}`
    );
  },
  get: (id: string) => request<{ success: boolean; data: { course: unknown } }>(`${BASE_URL}/courses/${id}`),
};

// ── Enrollments ───────────────────────────────────────────────────────────────

export interface EnrolledCourse {
  enrollmentId: string;
  course: {
    _id: string;
    title: string;
    description: string;
    image?: string;
    examType: string;
    level: string;
  };
  progress: number;
  completedLessons: number;
  totalLessons: number;
  nextLesson: { id: string; title: string } | null;
  enrolledAt: string;
}

export interface DashboardStats {
  activeEnrollments: number;
  completedLessons: number;
  totalLessons: number;
  overallProgress: number;
}

export const enrollmentApi = {
  getMyEnrollments: () =>
    request<{ success: boolean; data: { enrollments: EnrolledCourse[] } }>(`${BASE_URL}/enrollments/me`),

  getMyStats: () =>
    request<{ success: boolean; data: DashboardStats }>(`${BASE_URL}/enrollments/stats`),

  completeLesson: (courseId: string, lessonId: string) =>
    request<{ success: boolean }>(`${BASE_URL}/enrollments/${courseId}/lessons/${lessonId}/complete`, {
      method: 'POST',
    }),
};

// ── Quizzes / CBT ─────────────────────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizData {
  _id: string;
  title: string;
  examType: string;
  timeLimitMinutes: number;
  questions: QuizQuestion[];
}

export const quizzesApi = {
  get: (id: string) =>
    request<{ success: boolean; data: { quiz: QuizData } }>(`${BASE_URL}/quizzes/${id}`),

  submit: (id: string, answers: number[]) =>
    request<{ success: boolean; data: { result: { score: number; correct: number; total: number; results: unknown[] } } }>(
      `${BASE_URL}/quizzes/${id}/submit`,
      { method: 'POST', body: { answers } }
    ),

  listForLesson: (courseId: string, lessonId: string) =>
    request<{ success: boolean; data: { quizzes: QuizData[] } }>(
      `${BASE_URL}/courses/${courseId}/lessons/${lessonId}/quizzes`
    ),
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const analyticsApi = {
  getStudentAnalytics: () =>
    request<{ success: boolean; data: unknown }>(`${BASE_URL}/analytics/student`),

  getAdminOverview: () =>
    request<{ success: boolean; data: unknown }>(`${BASE_URL}/analytics/admin/overview`),

  getAIUsageSummary: () =>
    request<{ success: boolean; data: unknown }>(`${BASE_URL}/analytics/ai-usage/summary`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () =>
    request<{ success: boolean; data: unknown }>(`${BASE_URL}/admin/stats`),

  listUsers: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<{ success: boolean; data: { users: unknown[]; total: number } }>(`${BASE_URL}/admin/users${qs}`);
  },

  updateUser: (id: string, updates: Record<string, unknown>) =>
    request<{ success: boolean; data: { user: unknown } }>(`${BASE_URL}/admin/users/${id}`, {
      method: 'PATCH',
      body: updates,
    }),

  disableUser: (id: string) =>
    request<{ success: boolean }>(`${BASE_URL}/admin/users/${id}`, { method: 'DELETE' }),

  listCourses: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<{ success: boolean; data: { courses: unknown[]; total: number } }>(`${BASE_URL}/admin/courses${qs}`);
  },

  togglePublish: (courseId: string) =>
    request<{ success: boolean; data: { course: unknown } }>(`${BASE_URL}/admin/courses/${courseId}/publish`, {
      method: 'PATCH',
    }),
};

// ── AI Chat ───────────────────────────────────────────────────────────────────

export const aiApi = {
  ask: async (message: string, sessionId?: string, language = 'en'): Promise<{ answer: string; session_id: string }> => {
    const data = await request<{ success: boolean; answer: string; session_id: string }>(
      `${BASE_URL}/ai/chat`,
      { method: 'POST', body: { message, session_id: sessionId, language, stream: false } },
    );
    return { answer: data.answer, session_id: data.session_id };
  },
};
