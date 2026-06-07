import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Calendar, Trophy, TrendingUp, MessageSquare, Settings,
  Bell, Menu, X, Star, CheckCircle, Clock, Download, Play,
  BarChart3, Users, Award, Target, Brain, Loader2, RefreshCw,
} from 'lucide-react';
import { enrollmentApi, EnrolledCourse, DashboardStats, ApiError } from '../lib/api';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

interface StudentDashboardProps {
  user?: { name: string; email: string; role?: string };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'course' | 'assignment' | 'system';
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const safeUser = user ?? { name: 'Student', email: '' };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);

  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const notifications: Notification[] = [
    { id: '1', title: 'Welcome to SmartEd Africa!', message: 'Your learning journey starts here.', time: 'just now', read: false, type: 'system' },
  ];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [enrollRes, statsRes] = await Promise.all([
        enrollmentApi.getMyEnrollments(),
        enrollmentApi.getMyStats(),
      ]);
      setEnrollments(enrollRes.data.enrollments);
      setStats(statsRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }: {
    title: string; value: string | number; icon: React.ElementType; color?: string;
  }) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      yellow: 'bg-yellow-100 text-yellow-600',
    };
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  const CourseCard = ({ enrollment }: { enrollment: EnrolledCourse }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-semibold text-gray-900 truncate">{enrollment.course.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{enrollment.course.examType} · {enrollment.course.level}</p>
        </div>
        <span className="shrink-0 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
          {enrollment.progress}%
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{enrollment.completedLessons}/{enrollment.totalLessons} lessons</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${enrollment.progress}%` }}
          />
        </div>
      </div>

      {enrollment.nextLesson && (
        <p className="text-xs text-gray-500 mb-4 truncate">
          Next: <span className="font-medium">{enrollment.nextLesson.title}</span>
        </p>
      )}

      <button className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-2 rounded-lg font-medium hover:from-green-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2">
        <Play className="w-4 h-4" />
        {enrollment.progress === 0 ? 'Start Learning' : 'Continue Learning'}
      </button>
    </div>
  );

  const EmptyState = ({ title, description }: { title: string; description: string }) => (
    <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 pt-20 pb-16">
      {/* Mobile header */}
      <div className="md:hidden bg-white shadow-sm px-4 py-3 fixed top-16 w-full z-30">
        <div className="flex justify-between items-center">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <button onClick={() => setShowNotifications(true)} className="relative p-2 text-gray-600">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className={`fixed md:sticky md:top-20 h-screen md:h-[calc(100vh-5rem)] top-0 z-50 md:z-0 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-64 bg-white shadow-lg md:shadow-none flex-shrink-0`}>
          <div className="p-6 border-b border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              {safeUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{safeUser.name}</p>
              <p className="text-xs text-gray-500 capitalize">{safeUser.role || 'Student'}</p>
            </div>
          </div>

          <nav className="p-4 overflow-y-auto flex-1">
            {[
              { id: 'overview', label: 'Dashboard', icon: BarChart3 },
              { id: 'courses', label: 'My Courses', icon: BookOpen },
              { id: 'progress', label: 'Progress', icon: TrendingUp },
              { id: 'achievements', label: 'Achievements', icon: Trophy },
              { id: 'community', label: 'Study Groups', icon: Users },
              { id: 'ai-tutor', label: 'AI Tutor', icon: Brain },
              { id: 'messages', label: 'Messages', icon: MessageSquare },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors mb-1 ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-green-50 to-teal-50 text-green-700 border-r-2 border-green-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 md:pt-4 min-w-0">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Welcome back, {safeUser.name.split(' ')[0]}!
              </h1>
              <p className="text-gray-600 mt-1">Continue your learning journey</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDashboardData}
                title="Refresh"
                className="p-2 text-gray-500 hover:text-gray-700 bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={() => setShowNotifications(true)} className="relative p-2 text-gray-600 bg-white rounded-lg border border-gray-200 shadow-sm hidden md:flex">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <span className="font-medium">Error:</span> {error}
              <button onClick={fetchDashboardData} className="ml-auto text-red-600 hover:text-red-800 font-medium">Retry</button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading your dashboard…</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Enrolled Courses" value={stats?.activeEnrollments ?? 0} icon={BookOpen} color="green" />
                <StatCard title="Overall Progress" value={`${stats?.overallProgress ?? 0}%`} icon={TrendingUp} color="blue" />
                <StatCard title="Lessons Done" value={stats?.completedLessons ?? 0} icon={CheckCircle} color="purple" />
                <StatCard title="Total Lessons" value={stats?.totalLessons ?? 0} icon={Target} color="yellow" />
              </div>

              {/* Tab content */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Continue Learning</h2>
                      <button onClick={() => setActiveTab('courses')} className="text-green-600 hover:text-green-700 font-medium text-sm">
                        View All
                      </button>
                    </div>
                    {enrollments.length === 0 ? (
                      <EmptyState
                        title="No courses yet"
                        description="Browse the course marketplace and enroll to start your learning journey."
                      />
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {enrollments.slice(0, 3).map((e) => <CourseCard key={e.enrollmentId} enrollment={e} />)}
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { icon: Brain, color: 'blue', title: 'Ask AI Tutor', desc: 'Get instant help with difficult topics', action: () => setActiveTab('ai-tutor') },
                        { icon: Download, color: 'purple', title: 'Download Lessons', desc: 'Save courses for offline access', action: () => {} },
                        { icon: Users, color: 'green', title: 'Join Study Group', desc: 'Collaborate with classmates', action: () => setActiveTab('community') },
                      ].map(({ icon: Icon, color, title, desc, action }) => (
                        <button key={title} onClick={action} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left">
                          <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center mb-4`}>
                            <Icon className={`w-6 h-6 text-${color}-600`} />
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                          <p className="text-gray-500 text-sm">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'courses' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">My Courses</h2>
                  {enrollments.length === 0 ? (
                    <EmptyState
                      title="No enrolled courses"
                      description="Enroll in a course to get started."
                    />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {enrollments.map((e) => <CourseCard key={e.enrollmentId} enrollment={e} />)}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'progress' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Learning Progress & Analytics</h2>
                  <AnalyticsDashboard />
                </div>
              )}

              {(activeTab === 'achievements' || activeTab === 'community' || activeTab === 'ai-tutor' || activeTab === 'messages' || activeTab === 'settings') && (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-12 h-12 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 capitalize">{activeTab.replace('-', ' ')}</h2>
                  <p className="text-gray-500">This feature is coming soon. Stay tuned!</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Notifications modal */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.map((n) => (
                <div key={n.id} className={`p-4 border-b border-gray-50 ${!n.read ? 'bg-green-50' : ''}`}>
                  <h3 className="font-medium text-gray-900 text-sm">{n.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button onClick={() => setShowNotifications(false)} className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
