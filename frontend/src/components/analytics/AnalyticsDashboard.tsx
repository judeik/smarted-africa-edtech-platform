import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Loader2, TrendingUp, Trophy, Brain, BookOpen } from 'lucide-react';
import { analyticsApi, ApiError } from '../../lib/api';

interface AnalyticsData {
  weeklyActivity?: { _id: string; lessonsCompleted: number }[];
  scoresByExam?: { _id: string; avgScore: number; attempts: number; bestScore: number }[];
  quizAttempts?: { title: string; examType: string; score: number; completedAt: string }[];
  aiUsage?: { _id: string; sessions: number; tokens: number }[];
  enrollments?: number;
}

const EXAM_COLORS: Record<string, string> = {
  WAEC: '#16a34a',
  JAMB: '#2563eb',
  NECO: '#7c3aed',
  GCE: '#f59e0b',
  NCE: '#0d9488',
  General: '#6b7280',
};

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsApi.getStudentAnalytics()
      .then((res) => setData(res.data as AnalyticsData))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load analytics'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-gray-400">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{error}</p>
        <p className="text-xs mt-1">Complete some lessons and quizzes to see your progress here.</p>
      </div>
    );
  }

  if (!data) return null;

  // Prepare weekly activity data (last 7 days)
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const activityMap = new Map((data.weeklyActivity || []).map((a) => [a._id, a.lessonsCompleted]));
  const weeklyData = weekDays.map((day) => ({
    day: new Date(day).toLocaleDateString('en', { weekday: 'short' }),
    lessons: activityMap.get(day) || 0,
  }));

  // Scores by exam type
  const radarData = (data.scoresByExam || []).map((s) => ({
    subject: s._id,
    score: Math.round(s.avgScore),
    best: Math.round(s.bestScore),
  }));

  // Recent quiz scores
  const recentScores = (data.quizAttempts || []).slice(0, 10).map((q) => ({
    name: q.title.length > 20 ? q.title.slice(0, 20) + '…' : q.title,
    score: q.score,
    type: q.examType,
  }));

  // Exam distribution pie
  const examDist = Object.entries(
    (data.quizAttempts || []).reduce<Record<string, number>>((acc, q) => {
      acc[q.examType] = (acc[q.examType] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-md text-xs">
        <p className="font-medium text-gray-700">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-green-600">{p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'Enrolled Courses', value: data.enrollments || 0, color: 'text-green-600 bg-green-50' },
          { icon: Trophy, label: 'Quiz Attempts', value: (data.quizAttempts || []).length, color: 'text-blue-600 bg-blue-50' },
          {
            icon: TrendingUp,
            label: 'Avg Score',
            value: (data.quizAttempts || []).length > 0
              ? `${Math.round((data.quizAttempts || []).reduce((s, q) => s + q.score, 0) / (data.quizAttempts || []).length)}%`
              : '—',
            color: 'text-purple-600 bg-purple-50',
          },
          { icon: Brain, label: 'AI Sessions (30d)', value: (data.aiUsage || []).reduce((s, d) => s + d.sessions, 0), color: 'text-orange-600 bg-orange-50' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg ${color} mb-2`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Weekly activity bar chart */}
      {weeklyData.some((d) => d.lessons > 0) && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" /> Weekly Study Activity
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="lessons" fill="#16a34a" radius={[4, 4, 0, 0]} name="Lessons" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Radar chart — scores by exam type */}
      {radarData.length > 2 && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" /> Performance by Exam Type
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <Radar name="Avg Score" dataKey="score" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
              <Radar name="Best Score" dataKey="best" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
              <Legend iconSize={10} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent quiz scores */}
        {recentScores.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Quiz Scores</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={recentScores} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {recentScores.map((entry, i) => (
                    <Cell key={i} fill={EXAM_COLORS[entry.type] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Exam distribution pie */}
        {examDist.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Study Focus</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={examDist}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {examDist.map((entry, i) => (
                    <Cell key={i} fill={EXAM_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* AI usage trend */}
      {(data.aiUsage || []).some((d) => d.sessions > 0) && (
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" /> AI Tutor Usage (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={(data.aiUsage || []).reverse()} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="_id" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="sessions" stroke="#7c3aed" strokeWidth={2} dot={false} name="Sessions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!weeklyData.some((d) => d.lessons > 0) && recentScores.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No learning activity yet</p>
          <p className="text-xs mt-1">Complete lessons and quizzes to see your progress charts here.</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
