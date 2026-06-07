import Quiz from '../models/Quiz.js';

export const createQuiz = async (payload) => Quiz.create(payload);

export const getQuizById = async (id) => Quiz.findById(id).populate('lesson', 'title course');

export const submitQuiz = async (id, answers, userId) => {
  const quiz = await Quiz.findById(id);
  if (!quiz) return null;

  let correct = 0;
  const results = quiz.questions.map((q, idx) => {
    const given = typeof answers[idx] === 'number' ? answers[idx] : -1;
    const isCorrect = given === q.correctIndex;
    if (isCorrect) correct++;
    return {
      question: q.question,
      given,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = quiz.questions.length > 0
    ? Math.round((correct / quiz.questions.length) * 100)
    : 0;

  // Persist the attempt if we have a user
  if (userId) {
    quiz.attempts.push({ user: userId, answers, score, correct, total: quiz.questions.length });
    await quiz.save();
  }

  return { score, total: quiz.questions.length, correct, results };
};
