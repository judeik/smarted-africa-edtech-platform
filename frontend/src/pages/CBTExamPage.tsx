import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock, Flag, ChevronLeft, ChevronRight, CheckCircle, XCircle,
  AlertTriangle, Trophy, BookOpen, BarChart3, ArrowLeft
} from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  subject?: string;
}

interface CBTExamPageProps {
  quizId: string;
  quizTitle?: string;
  questions: Question[];
  timeLimitMinutes: number;
  examType?: string;
  onComplete: (result: ExamResult) => void;
  onBack: () => void;
}

export interface ExamResult {
  score: number;
  correct: number;
  total: number;
  timeTakenSeconds: number;
  answers: number[];
  results: { question: string; given: number; correctIndex: number; isCorrect: boolean; explanation: string }[];
}

type ExamPhase = 'briefing' | 'exam' | 'review';

const CBTExamPage: React.FC<CBTExamPageProps> = ({
  quizTitle, questions, timeLimitMinutes, examType = 'General', onComplete, onBack
}) => {
  const [phase, setPhase] = useState<ExamPhase>('briefing');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes * 60);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = timeLimitMinutes * 60;
  const answered = answers.filter((a) => a !== -1).length;
  const timePercent = (timeLeft / totalSeconds) * 100;
  const isTimeWarning = timeLeft < 300; // < 5 minutes
  const isTimeCritical = timeLeft < 60;  // < 1 minute

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const submitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const timeTaken = Math.max(0, totalSeconds - timeLeft);
    let correct = 0;
    const results = questions.map((q, i) => {
      const given = answers[i];
      const isCorrect = given === q.correctIndex;
      if (isCorrect) correct++;
      return { question: q.question, given, correctIndex: q.correctIndex, isCorrect, explanation: q.explanation || '' };
    });
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const examResult: ExamResult = { score, correct, total: questions.length, timeTakenSeconds: timeTaken, answers, results };
    setResult(examResult);
    setPhase('review');
    onComplete(examResult);
  }, [answers, questions, timeLeft, totalSeconds, onComplete]);

  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, submitExam]);

  const startExam = () => {
    setPhase('exam');
  };

  const selectAnswer = (optionIndex: number) => {
    const next = [...answers];
    next[currentQ] = optionIndex;
    setAnswers(next);
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ)) next.delete(currentQ);
      else next.add(currentQ);
      return next;
    });
  };

  if (phase === 'briefing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
            <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">{examType}</span>
            <h1 className="text-2xl font-bold text-gray-900">{quizTitle || 'Mock Exam'}</h1>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Questions', value: questions.length },
              { label: 'Time Limit', value: `${timeLimitMinutes} min` },
              { label: 'Pass Mark', value: '50%' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-green-600">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800 space-y-1">
            <p className="font-semibold mb-2">Instructions:</p>
            <p>• Read each question carefully before selecting your answer.</p>
            <p>• You can flag questions and return to them later.</p>
            <p>• The exam auto-submits when time expires.</p>
            <p>• You can review your answers before final submission.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={onBack} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={startExam} className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-teal-700 transition-all">
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'review' && result) {
    const grade = result.score >= 80 ? 'A' : result.score >= 70 ? 'B' : result.score >= 60 ? 'C' : result.score >= 50 ? 'D' : 'F';
    const gradeColor = result.score >= 60 ? 'text-green-600' : result.score >= 50 ? 'text-yellow-600' : 'text-red-600';

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 pt-16 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          {/* Score card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 text-center">
            <Trophy className={`w-16 h-16 mx-auto mb-4 ${result.score >= 50 ? 'text-yellow-500' : 'text-gray-400'}`} />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Complete!</h1>
            <div className={`text-7xl font-black ${gradeColor} mb-2`}>{grade}</div>
            <p className="text-2xl font-bold text-gray-700">{result.score}%</p>
            <p className="text-gray-500 mt-1">{result.correct} / {result.total} correct</p>

            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { label: 'Score', value: `${result.score}%` },
                { label: 'Time Used', value: `${Math.floor(result.timeTakenSeconds / 60)}m ${result.timeTakenSeconds % 60}s` },
                { label: 'Correct', value: `${result.correct}/${result.total}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Question breakdown */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" /> Answer Review
            </h2>
            <div className="space-y-4">
              {result.results.map((r, i) => (
                <div key={i} className={`border rounded-xl p-4 ${r.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-3">
                    {r.isCorrect
                      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm mb-2">Q{i + 1}. {r.question}</p>
                      <div className="text-sm space-y-1">
                        {r.given !== -1 && (
                          <p className={`${r.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            Your answer: <span className="font-medium">{questions[i]?.options[r.given]}</span>
                          </p>
                        )}
                        {!r.isCorrect && (
                          <p className="text-green-700">
                            Correct: <span className="font-medium">{questions[i]?.options[r.correctIndex]}</span>
                          </p>
                        )}
                        {r.explanation && (
                          <p className="text-gray-600 mt-2 text-xs bg-white border border-gray-200 rounded-lg p-2">
                            💡 {r.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full mt-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-teal-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Exam phase
  const q = questions[currentQ];
  const unansweredCount = answers.filter((a) => a === -1).length;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Exam Header */}
      <header className={`sticky top-0 z-30 shadow-md px-4 py-3 flex items-center justify-between ${isTimeCritical ? 'bg-red-600' : isTimeWarning ? 'bg-orange-500' : 'bg-green-700'} text-white transition-colors`}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm hidden sm:block">{quizTitle || 'Mock Exam'}</span>
          <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">{examType}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-lg font-bold">
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
        <div className="text-sm">{answered}/{questions.length} answered</div>
      </header>

      {/* Timer bar */}
      <div className="h-1.5 bg-gray-200">
        <div
          className={`h-full transition-all duration-1000 ${isTimeCritical ? 'bg-red-500' : isTimeWarning ? 'bg-orange-400' : 'bg-green-500'}`}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigator (Desktop sidebar) */}
        <aside className="hidden lg:block w-56 bg-white shadow-sm p-4 overflow-y-auto flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Questions</p>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
                  i === currentQ ? 'bg-green-600 text-white' :
                  answers[i] !== -1 ? (flagged.has(i) ? 'bg-yellow-400 text-white' : 'bg-green-100 text-green-700') :
                  flagged.has(i) ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                  'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 text-xs">
            {[
              { color: 'bg-green-100 text-green-700', label: 'Answered' },
              { color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', label: 'Flagged' },
              { color: 'bg-gray-100 text-gray-600', label: 'Not answered' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded ${color} flex-shrink-0`} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Question Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Question card */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-semibold text-gray-500">Question {currentQ + 1} of {questions.length}</span>
                <button
                  onClick={toggleFlag}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    flagged.has(currentQ)
                      ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                      : 'border-gray-300 text-gray-500 hover:border-yellow-400 hover:text-yellow-600'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {flagged.has(currentQ) ? 'Flagged' : 'Flag for review'}
                </button>
              </div>

              <p className="text-lg font-semibold text-gray-900 leading-relaxed mb-6">{q.question}</p>

              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => selectAnswer(i)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                      answers[currentQ] === i
                        ? 'border-green-500 bg-green-50 text-green-900 font-medium'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-800'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 flex-shrink-0 ${
                      answers[currentQ] === i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
                disabled={currentQ === 0}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              {currentQ < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ((p) => Math.min(questions.length - 1, p + 1))}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-teal-700 flex items-center justify-center gap-2"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-teal-700"
                >
                  Submit Exam
                </button>
              )}
            </div>

            {/* Mobile question grid */}
            <div className="lg:hidden mt-4 bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 mb-2">Jump to question:</p>
              <div className="flex flex-wrap gap-1.5">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`w-8 h-8 text-xs rounded-lg font-medium ${
                      i === currentQ ? 'bg-green-600 text-white' :
                      answers[i] !== -1 ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Submit Exam?</h2>
            {unansweredCount > 0 && (
              <p className="text-center text-orange-600 text-sm mb-3">
                You have <strong>{unansweredCount}</strong> unanswered question{unansweredCount !== 1 ? 's' : ''}.
              </p>
            )}
            <p className="text-center text-gray-500 text-sm mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50">
                Review
              </button>
              <button onClick={() => { setShowSubmitConfirm(false); submitExam(); }} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CBTExamPage;
