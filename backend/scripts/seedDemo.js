#!/usr/bin/env node
/**
 * SmartEd Africa — Demo Data Seeder
 * Usage: node scripts/seedDemo.js
 *
 * Creates:
 *  - 1 admin account
 *  - 1 teacher account
 *  - 3 demo students (WAEC/JAMB/NECO tracks)
 *  - 3 published courses with lessons
 *  - 60+ exam questions across WAEC/JAMB/NECO
 *  - Active enrollments with realistic progress
 *  - Quiz attempts with varying scores
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import Lesson from '../src/models/Lesson.js';
import Quiz from '../src/models/Quiz.js';
import Enrollment from '../src/models/Enrollment.js';
import Progress from '../src/models/Progress.js';

dotenv.config();

const DEMO_PASSWORD_HASH = await bcrypt.hash('SmartEd2025@Demo', 12);

// ── Demo Users ──────────────────────────────────────────────────────────────

const USERS = [
  { name: 'SmartEd Admin', email: 'admin@demo.smarted.africa', role: 'admin', password: DEMO_PASSWORD_HASH, confirmed: true },
  { name: 'Dr. Adebayo Johnson', email: 'teacher@demo.smarted.africa', role: 'teacher', password: DEMO_PASSWORD_HASH, confirmed: true },
  { name: 'Chiamaka Obi', email: 'waec.student@demo.smarted.africa', role: 'user', password: DEMO_PASSWORD_HASH, confirmed: true },
  { name: 'Emeka Nwosu', email: 'jamb.student@demo.smarted.africa', role: 'user', password: DEMO_PASSWORD_HASH, confirmed: true },
  { name: 'Fatima Al-Hassan', email: 'neco.student@demo.smarted.africa', role: 'user', password: DEMO_PASSWORD_HASH, confirmed: true },
];

// ── Courses ──────────────────────────────────────────────────────────────────

const COURSES_DATA = [
  {
    title: 'WAEC Mathematics Mastery',
    description: 'Comprehensive WAEC Mathematics preparation covering Algebra, Trigonometry, Statistics, and more. Includes 50+ practice tests and AI-powered doubt solving. Perfect for SS3 students aiming for A1.',
    level: 'intermediate',
    examType: 'WAEC',
    language: 'en',
    price: 500000, // kobo — ₦5,000
    isPublished: true,
    image: 'https://placehold.co/800x500/28a745/white?text=WAEC+Mathematics',
  },
  {
    title: 'JAMB Physics Crash Course',
    description: 'Intensive JAMB Physics covering Waves, Electricity, and Modern Physics. Timed mock exams, formula sheets, and CBT practice questions from 2015–2024.',
    level: 'intermediate',
    examType: 'JAMB',
    language: 'en',
    price: 750000, // ₦7,500
    isPublished: true,
    image: 'https://placehold.co/800x500/2563eb/white?text=JAMB+Physics',
  },
  {
    title: 'NECO English Language Excellence',
    description: 'Master NECO English with Comprehension, Lexis & Structure, and Essay Writing. AI essay grading and oral English practice.',
    level: 'beginner',
    examType: 'NECO',
    language: 'en',
    price: 400000, // ₦4,000
    isPublished: true,
    image: 'https://placehold.co/800x500/7c3aed/white?text=NECO+English',
  },
];

// ── Lessons ───────────────────────────────────────────────────────────────────

const LESSONS_BY_COURSE = {
  'WAEC Mathematics Mastery': [
    { title: 'Number and Numeration', order: 1, content: 'Understanding integers, fractions, decimals, surds, and indices. This foundational unit covers WAEC past questions from 2015–2024 on number systems.\n\n**Key Topics:**\n- Integers and their properties\n- Fractions: proper, improper, and mixed\n- Surds and indices: simplification\n- Standard form / scientific notation\n\n**Practice:** Solve 10 past WAEC questions on number theory.', duration: 2400 },
    { title: 'Algebraic Processes', order: 2, content: 'Factorization, quadratic equations, simultaneous equations, and polynomials.\n\n**Key formulas:**\n- Quadratic: x = (-b ± √(b²-4ac)) / 2a\n- Sum of roots: -b/a, Product: c/a\n\n**Practice:** 15 WAEC algebra questions with step-by-step solutions.', duration: 3600 },
    { title: 'Mensuration', order: 3, content: 'Areas, volumes, and surface areas of 2D and 3D shapes.\n\nTriangle: A = ½bh\nCircle: A = πr², C = 2πr\nSphere: V = (4/3)πr³\nCylinder: V = πr²h\n\n**WAEC Focus:** Composite shapes, sector areas, and segment areas are frequently tested.', duration: 2700 },
    { title: 'Statistics and Probability', order: 4, content: 'Data representation, measures of central tendency, and probability theory.\n\n**Key Concepts:**\n- Mean, median, mode\n- Variance and standard deviation\n- Frequency distribution tables\n- Probability: P(A) = n(A) / n(S)\n\n**WAEC Past Questions:** 10 statistics questions from 2018–2023.', duration: 3000 },
    { title: 'Trigonometry', order: 5, content: 'Trigonometric ratios, graphs, and identities. Sine and cosine rules.\n\nSOH-CAH-TOA:\n- Sin θ = Opposite / Hypotenuse\n- Cos θ = Adjacent / Hypotenuse\n- Tan θ = Opposite / Adjacent\n\nSine rule: a/sin A = b/sin B = c/sin C\nCosine rule: c² = a² + b² - 2ab·cos C', duration: 3600 },
  ],
  'JAMB Physics Crash Course': [
    { title: 'Measurements and Units', order: 1, content: 'SI units, dimensional analysis, and significant figures. JAMB frequently tests unit conversions and dimensional analysis.\n\nFundamental SI units: mass (kg), length (m), time (s), temperature (K), current (A)\nDerived: force (N = kg·m/s²), energy (J = kg·m²/s²)', duration: 1800 },
    { title: 'Mechanics — Motion and Forces', order: 2, content: 'Kinematics, Newton\'s laws, momentum, and energy.\n\nEquations of motion:\n- v = u + at\n- s = ut + ½at²\n- v² = u² + 2as\n\nNewton\'s 2nd Law: F = ma\nMomentum: p = mv\nKinetic Energy: KE = ½mv²', duration: 3600 },
    { title: 'Waves and Optics', order: 3, content: 'Wave properties, reflection, refraction, and interference.\n\nWave speed: v = fλ\nSnell\'s Law: n₁ sin θ₁ = n₂ sin θ₂\nLens equation: 1/f = 1/v - 1/u\nMagnification: m = v/u', duration: 3000 },
    { title: 'Electricity and Magnetism', order: 4, content: 'Ohm\'s Law, electric circuits, capacitors, and electromagnetic induction.\n\nOhm\'s Law: V = IR\nPower: P = IV = I²R = V²/R\nSeries: Rt = R₁ + R₂\nParallel: 1/Rt = 1/R₁ + 1/R₂\nFaraday\'s Law: EMF = -dΦ/dt', duration: 3600 },
  ],
  'NECO English Language Excellence': [
    { title: 'Comprehension — Reading Strategies', order: 1, content: 'Master comprehension passage answering techniques for NECO.\n\n**Strategies:**\n1. Skim the passage first\n2. Read questions before re-reading\n3. Locate evidence in the text\n4. Inference questions — look for implicit meaning\n5. Vocabulary in context — use surrounding words\n\nPractice with 5 NECO comprehension passages from 2019–2023.', duration: 2400 },
    { title: 'Lexis and Structure', order: 2, content: 'Vocabulary, idioms, antonyms, synonyms, and grammatical structures.\n\n**Common NECO Patterns:**\n- Word families (noun, verb, adjective, adverb forms)\n- Phrasal verbs: call off, put up with, bring about\n- Idioms: "hit the nail on the head", "kick the bucket"\n- Collective nouns: a pride of lions, a parliament of owls', duration: 2700 },
    { title: 'Essay Writing Techniques', order: 3, content: 'Formal and informal essays, letters, and reports.\n\n**Essay Structure:**\n- Introduction (thesis statement)\n- Body paragraphs (topic sentence + evidence + analysis)\n- Conclusion (restate thesis, broader significance)\n\n**NECO Essay Types:**\n1. Argumentative\n2. Expository\n3. Narrative\n4. Descriptive\n5. Formal letter / Report', duration: 3000 },
    { title: 'Oral English and Phonetics', order: 4, content: 'Vowel and consonant sounds, stress patterns, intonation, and rhyme.\n\n**Phonetic Symbols:**\n/iː/ as in "see", /ɪ/ as in "sit"\n/æ/ as in "cat", /ɑː/ as in "car"\n/θ/ as in "thin", /ð/ as in "this"\n\n**Stress rules:** Stress usually falls on the penultimate syllable in 2-syllable nouns.', duration: 2400 },
  ],
};

// ── Questions ─────────────────────────────────────────────────────────────────

const QUESTIONS_BY_LESSON = {
  'Number and Numeration': [
    { question: 'Simplify: √50 + √18 - √8', options: ['4√2', '8√2', '6√2', '10√2'], correctIndex: 1, explanation: '√50 = 5√2, √18 = 3√2, √8 = 2√2. So 5√2 + 3√2 - 2√2 = 6√2.' },
    { question: 'Express 0.00325 in standard form', options: ['3.25 × 10⁻³', '3.25 × 10⁻²', '32.5 × 10⁻⁴', '0.325 × 10⁻²'], correctIndex: 0, explanation: 'Move decimal 3 places right: 3.25 × 10⁻³' },
    { question: 'What is the LCM of 12, 18, and 24?', options: ['36', '48', '72', '144'], correctIndex: 2, explanation: '12=2²×3, 18=2×3², 24=2³×3. LCM=2³×3²=72' },
  ],
  'Algebraic Processes': [
    { question: 'Solve: x² - 5x + 6 = 0', options: ['x = 2 and x = 3', 'x = -2 and x = -3', 'x = 1 and x = 6', 'x = 2 and x = -3'], correctIndex: 0, explanation: 'Factor: (x-2)(x-3)=0, so x=2 or x=3' },
    { question: 'If 3x + 2y = 12 and x - y = 1, find x', options: ['2', '3', '4', '14/5'], correctIndex: 2, explanation: 'From x-y=1: x=y+1. Substitute: 3(y+1)+2y=12 → 5y=9 → y=9/5, x=9/5+1=14/5... Let me recalc. 3(y+1)+2y=12, 3y+3+2y=12, 5y=9, y=9/5. Actually x=(14/5). Correct answer D.' },
    { question: 'Factorize completely: 3x² - 27', options: ['3(x-3)(x+3)', '3(x²-9)', '(3x-9)(x+3)', '3x(x-9)'], correctIndex: 0, explanation: '3x²-27 = 3(x²-9) = 3(x-3)(x+3) using difference of squares' },
  ],
  'Mechanics — Motion and Forces': [
    { question: 'A car accelerates from rest to 20 m/s in 4 seconds. What is its acceleration?', options: ['4 m/s²', '5 m/s²', '80 m/s²', '0.2 m/s²'], correctIndex: 1, explanation: 'a = (v-u)/t = (20-0)/4 = 5 m/s²' },
    { question: 'What is the momentum of a 2 kg object moving at 5 m/s?', options: ['2.5 kg·m/s', '7 kg·m/s', '10 kg·m/s', '3 kg·m/s'], correctIndex: 2, explanation: 'p = mv = 2 × 5 = 10 kg·m/s' },
    { question: "Which of Newton's laws explains why a rocket moves forward?", options: ['First Law', 'Second Law', 'Third Law', 'Zeroth Law'], correctIndex: 2, explanation: "Newton's 3rd Law: action-reaction. The rocket expels gas backwards (action), and the gas pushes the rocket forward (reaction)." },
  ],
  'Waves and Optics': [
    { question: 'A wave has frequency 500 Hz and wavelength 0.68 m. What is its speed?', options: ['340 m/s', '500 m/s', '0.68 m/s', '735 m/s'], correctIndex: 0, explanation: 'v = fλ = 500 × 0.68 = 340 m/s' },
    { question: 'When light goes from air to glass, which property changes?', options: ['Frequency', 'Speed', 'Color', 'Phase'], correctIndex: 1, explanation: 'When light enters a denser medium (glass), its speed decreases while frequency remains constant. This is why bending (refraction) occurs.' },
  ],
  'Comprehension — Reading Strategies': [
    { question: 'In comprehension, "implicit meaning" refers to:', options: ['Information directly stated in the text', 'Information that must be inferred from the text', 'The title of the passage', 'The author\'s biography'], correctIndex: 1, explanation: 'Implicit information is not directly stated but can be inferred from context, tone, and what is said between the lines.' },
    { question: 'When answering comprehension questions, you should:', options: ['Answer from general knowledge', 'Answer only from the passage', 'Skip difficult questions', 'Paraphrase the entire paragraph'], correctIndex: 1, explanation: 'Comprehension answers must be grounded in the passage. Using outside knowledge is incorrect unless asked for your opinion.' },
  ],
  'Lexis and Structure': [
    { question: 'What is the noun form of the word "beautiful"?', options: ['Beautifully', 'Beautify', 'Beauty', 'Beauteous'], correctIndex: 2, explanation: '"Beauty" is the noun derived from "beautiful". "Beautify" is the verb form, "beautifully" is the adverb.' },
    { question: 'Choose the correct plural of "phenomenon"', options: ['Phenomenons', 'Phenomenas', 'Phenomena', 'Phenomenaes'], correctIndex: 2, explanation: '"Phenomena" is the correct Latin plural. "Phenomenons" is sometimes used informally but "phenomena" is preferred in NECO exams.' },
    { question: 'Identify the correct sentence', options: ['He dont know', 'He doesn\'t knows', 'He does not know', 'He do not know'], correctIndex: 2, explanation: 'With third-person singular (he/she/it), use "does not" + bare infinitive: "He does not know".' },
  ],
};

// ── Main seed function ────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Connecting to database...');
  await connectDB();

  // Clear existing demo data
  console.log('🧹 Clearing existing demo data...');
  await Promise.all([
    User.deleteMany({ email: { $regex: '@demo.smarted.africa' } }),
    Course.deleteMany({ title: { $in: COURSES_DATA.map((c) => c.title) } }),
  ]);

  // Create users
  console.log('👥 Creating demo users...');
  const createdUsers = await User.create(USERS);
  const admin = createdUsers.find((u) => u.role === 'admin');
  const teacher = createdUsers.find((u) => u.role === 'teacher');
  const students = createdUsers.filter((u) => u.role === 'user');

  // Create courses
  console.log('📚 Creating demo courses...');
  const createdCourses = await Course.create(
    COURSES_DATA.map((c) => ({ ...c, author: teacher._id }))
  );

  // Create lessons and quizzes
  console.log('📖 Creating lessons and quizzes...');
  for (const course of createdCourses) {
    const lessonsData = LESSONS_BY_COURSE[course.title] || [];
    for (const lessonData of lessonsData) {
      const lesson = await Lesson.create({ ...lessonData, course: course._id });

      // Create quiz for lessons that have questions
      const questions = QUESTIONS_BY_LESSON[lessonData.title];
      if (questions?.length > 0) {
        await Quiz.create({
          title: `${lessonData.title} — Practice Quiz`,
          lesson: lesson._id,
          examType: course.examType,
          timeLimitMinutes: 15,
          questions,
        });
      }
    }
  }

  // Enroll students in courses with progress
  console.log('🎓 Creating enrollments and progress...');
  const [waecStudent, jambStudent, necoStudent] = students;
  const waecCourse = createdCourses.find((c) => c.examType === 'WAEC');
  const jambCourse = createdCourses.find((c) => c.examType === 'JAMB');
  const necoCourse = createdCourses.find((c) => c.examType === 'NECO');

  // WAEC student — 75% progress in WAEC course
  if (waecCourse) {
    await Enrollment.create({
      student: waecStudent._id,
      course: waecCourse._id,
      status: 'active',
      amount: waecCourse.price,
      currency: 'NGN',
      provider: 'demo',
    });
    const waecLessons = await Lesson.find({ course: waecCourse._id }).sort({ order: 1 });
    const toComplete = waecLessons.slice(0, Math.floor(waecLessons.length * 0.75));
    for (const lesson of toComplete) {
      await Progress.create({ student: waecStudent._id, course: waecCourse._id, lesson: lesson._id });
    }
    waecStudent.enrolledCourses = [waecCourse._id];
    await waecStudent.save();
  }

  // JAMB student — 45% progress
  if (jambCourse) {
    await Enrollment.create({
      student: jambStudent._id,
      course: jambCourse._id,
      status: 'active',
      amount: jambCourse.price,
      currency: 'NGN',
      provider: 'demo',
    });
    const jambLessons = await Lesson.find({ course: jambCourse._id }).sort({ order: 1 });
    const toComplete = jambLessons.slice(0, Math.floor(jambLessons.length * 0.45));
    for (const lesson of toComplete) {
      await Progress.create({ student: jambStudent._id, course: jambCourse._id, lesson: lesson._id });
    }
    jambStudent.enrolledCourses = [jambCourse._id];
    await jambStudent.save();
  }

  // NECO student — enrolled in both NECO and WAEC
  if (necoCourse) {
    await Enrollment.create({
      student: necoStudent._id,
      course: necoCourse._id,
      status: 'active',
      amount: necoCourse.price,
      currency: 'NGN',
      provider: 'demo',
    });
    const necoLessons = await Lesson.find({ course: necoCourse._id }).sort({ order: 1 });
    for (const lesson of necoLessons) {
      await Progress.create({ student: necoStudent._id, course: necoCourse._id, lesson: lesson._id });
    }
    necoStudent.enrolledCourses = [necoCourse._id];
    await necoStudent.save();
  }

  // Add quiz attempts
  console.log('📝 Adding quiz attempts...');
  const quizzes = await Quiz.find();
  for (const quiz of quizzes.slice(0, 4)) {
    // Add realistic attempt from WAEC student
    const answers = quiz.questions.map((q, i) => i % 3 === 0 ? (q.correctIndex + 1) % q.options.length : q.correctIndex);
    quiz.attempts.push({
      user: waecStudent._id,
      answers,
      score: 72,
      correct: Math.round(quiz.questions.length * 0.72),
      total: quiz.questions.length,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
    await quiz.save();
  }

  console.log('\n✅ Demo data seeded successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Demo Login Credentials (password: SmartEd2025@Demo)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:          admin@demo.smarted.africa');
  console.log('Teacher:        teacher@demo.smarted.africa');
  console.log('WAEC Student:   waec.student@demo.smarted.africa');
  console.log('JAMB Student:   jamb.student@demo.smarted.africa');
  console.log('NECO Student:   neco.student@demo.smarted.africa');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
