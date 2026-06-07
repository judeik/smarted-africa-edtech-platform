import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, BookOpen, TrendingUp, DollarSign, Activity, Shield,
  Search, Ban, CheckCircle, Eye, EyeOff, BarChart3,
  AlertCircle, Loader2, RefreshCw, LogOut, Brain
} from 'lucide-react';
import { adminApi, analyticsApi, ApiError } from '../lib/api';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'overview' | 'users' | 'courses' | 'analytics' | 'ai-usage';

interface SystemStats {
  users: { total: number; confirmed: number };
  courses: { total: number; published: number };
  enrollments: { total: number; active: number };
  learning: { lessonsCompleted: number; quizAttempts: number };
  revenue: { totalNgn: number };
}

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  confirmed: boolean;
  createdAt: string;
  loginAttempts: number;
  lockUntil?: string;
}

interface CourseRecord {
  _id: string;
  title: string;
  examType: string;
  level: string;
  isPublished: boolean;
  enrollmentCount: number;
  price: number;
  author?: { name: string };
  createdAt: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userTotal, setUserTotal] = useState(0);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [courseTotal, setCourseTotal] = useState(0);
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [aiUsageData, setAiUsageData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminApi.getStats();
      setStats(res.data as SystemStats);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load stats');
    }
  }, []);

  const loadUsers = useCallback(async (search = '') => {
    setIsLoading(true);
    try {
      const res = await adminApi.listUsers({ search, limit: 50 });
      setUsers(res.data.users as UserRecord[]);
      setUserTotal(res.data.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.listCourses({ limit: 50 });
      setCourses(res.data.courses as CourseRecord[]);
      setCourseTotal(res.data.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overview, aiUsage] = await Promise.all([
        analyticsApi.getAdminOverview(),
        analyticsApi.getAIUsageSummary(),
      ]);
      setAnalyticsData(overview.data as Record<string, unknown>);
      setAiUsageData(aiUsage.data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setError('');
    if (activeTab === 'users') loadUsers(userSearch);
    else if (activeTab === 'courses') loadCourses();
    else if (activeTab === 'analytics' || activeTab === 'ai-usage') loadAnalytics();
  }, [activeTab, loadUsers, loadCourses, loadAnalytics, userSearch]);

  const handleUserAction = async (userId: string, action: 'disable' | 'confirm') => {
    setActionLoading(`${action}-${userId}`);
    try {
      if (action === 'disable') {
        await adminApi.disableUser(userId);
      } else {
        await adminApi.updateUser(userId, { confirmed: true });
      }
      await loadUsers(userSearch);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (courseId: string) => {
    setActionLoading(`publish-${courseId}`);
    try {
      await adminApi.togglePublish(courseId);
      await loadCourses();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Toggle failed');
    } finally {
      setActionLoading(null);
    }
  };

  const StatCard = ({ title, value, sub, icon: Icon, color }: {
    title: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
  }) => (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'ai-usage', label: 'AI Usage', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Admin header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-green-400" />
          <div>
            <h1 className="font-bold text-lg">Admin Dashboard</h1>
            <p className="text-xs text-gray-400">SmartEd Africa Control Panel</p>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">System Overview</h2>
              <button onClick={loadStats} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Total Users" value={stats.users.total} sub={`${stats.users.confirmed} confirmed`} icon={Users} color="bg-blue-500" />
                <StatCard title="Published Courses" value={stats.courses.published} sub={`${stats.courses.total} total`} icon={BookOpen} color="bg-green-500" />
                <StatCard title="Active Enrollments" value={stats.enrollments.active} sub={`${stats.enrollments.total} total`} icon={Activity} color="bg-purple-500" />
                <StatCard title="Revenue (NGN)" value={`₦${(stats.revenue.totalNgn / 100).toLocaleString()}`} sub="All time" icon={DollarSign} color="bg-orange-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-5 shadow-sm h-24 animate-pulse" />
                ))}
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-700 mb-3">Learning Activity</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Lessons Completed</span><span className="font-bold">{stats.learning.lessonsCompleted.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">Quiz Attempts</span><span className="font-bold">{stats.learning.quizAttempts.toLocaleString()}</span></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-700 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button onClick={() => setActiveTab('users')} className="w-full text-left text-sm text-blue-600 hover:text-blue-700 py-1">→ Manage Users ({stats.users.total})</button>
                    <button onClick={() => setActiveTab('courses')} className="w-full text-left text-sm text-green-600 hover:text-green-700 py-1">→ Manage Courses ({stats.courses.total})</button>
                    <button onClick={() => setActiveTab('ai-usage')} className="w-full text-left text-sm text-purple-600 hover:text-purple-700 py-1">→ View AI Usage</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">User Management <span className="text-sm font-normal text-gray-400">({userTotal})</span></h2>
              <button onClick={() => loadUsers(userSearch)} className="p-2 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers(userSearch)}
                placeholder="Search by name or email… (press Enter)"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                            u.role === 'admin' ? 'bg-red-100 text-red-700' :
                            u.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          {u.confirmed
                            ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Confirmed</span>
                            : <span className="flex items-center gap-1 text-yellow-600 text-xs"><AlertCircle className="w-3.5 h-3.5" /> Pending</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {!u.confirmed && (
                              <button
                                onClick={() => handleUserAction(u._id, 'confirm')}
                                disabled={actionLoading === `confirm-${u._id}`}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                            )}
                            <button
                              onClick={() => handleUserAction(u._id, 'disable')}
                              disabled={actionLoading === `disable-${u._id}`}
                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Ban className="w-3 h-3" /> Disable
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && !isLoading && (
                  <div className="text-center py-12 text-gray-400">No users found</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Courses ── */}
        {activeTab === 'courses' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Course Management <span className="text-sm font-normal text-gray-400">({courseTotal})</span></h2>
              <button onClick={loadCourses} className="p-2 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Title', 'Exam', 'Level', 'Price', 'Enrolled', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {courses.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                          <div className="truncate">{c.title}</div>
                          {c.author && <div className="text-xs text-gray-400">{c.author.name}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{c.examType}</span>
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-500 text-xs">{c.level}</td>
                        <td className="px-4 py-3 text-gray-700">₦{(c.price / 100).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-500">{c.enrollmentCount || 0}</td>
                        <td className="px-4 py-3">
                          {c.isPublished
                            ? <span className="flex items-center gap-1 text-green-600 text-xs"><Eye className="w-3.5 h-3.5" /> Live</span>
                            : <span className="flex items-center gap-1 text-gray-400 text-xs"><EyeOff className="w-3.5 h-3.5" /> Draft</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleTogglePublish(c._id)}
                            disabled={actionLoading === `publish-${c._id}`}
                            className={`text-xs px-2 py-1 rounded hover:opacity-80 disabled:opacity-50 ${c.isPublished ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}
                          >
                            {c.isPublished ? 'Unpublish' : 'Publish'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {courses.length === 0 && !isLoading && (
                  <div className="text-center py-12 text-gray-400">No courses found</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Analytics ── */}
        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Platform Analytics</h2>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
            ) : analyticsData ? (
              <div className="space-y-6">
                {/* Revenue chart (simplified) */}
                {(analyticsData.revenueStats as { _id: string; revenue: number; enrollments: number }[])?.length > 0 && (
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-700 mb-4">Daily Revenue (Last 30 Days)</h3>
                    <div className="flex items-end gap-1 h-32">
                      {(analyticsData.revenueStats as { _id: string; revenue: number }[]).map((d, i) => {
                        const maxRev = Math.max(...(analyticsData.revenueStats as { revenue: number }[]).map((x) => x.revenue));
                        const height = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div
                              className="w-full bg-green-400 hover:bg-green-500 rounded-t transition-colors"
                              style={{ height: `${height}%`, minHeight: d.revenue > 0 ? '4px' : '0' }}
                            />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                              ₦{(d.revenue / 100).toFixed(0)} on {d._id}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* New users */}
                {(analyticsData.newUsersDaily as unknown[])?.length > 0 && (
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-700 mb-4">New Users (Last 30 Days)</h3>
                    <div className="flex items-end gap-1 h-24">
                      {(analyticsData.newUsersDaily as { _id: string; newUsers: number }[]).map((d, i) => {
                        const max = Math.max(...(analyticsData.newUsersDaily as { newUsers: number }[]).map((x) => x.newUsers));
                        const h = max > 0 ? (d.newUsers / max) * 100 : 0;
                        return (
                          <div key={i} title={`${d.newUsers} users on ${d._id}`}
                            className="flex-1 bg-blue-400 hover:bg-blue-500 rounded-t transition-colors cursor-pointer"
                            style={{ height: `${h}%`, minHeight: d.newUsers > 0 ? '4px' : '0' }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">No analytics data available</div>
            )}
          </div>
        )}

        {/* ── AI Usage ── */}
        {activeTab === 'ai-usage' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">AI Usage & Cost Metering</h2>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
            ) : aiUsageData ? (
              <div className="space-y-6">
                {/* Summary cards */}
                {aiUsageData.summary && (() => {
                  const s = aiUsageData.summary as { totalRequests: number; totalTokens: number; totalCostUsd: number };
                  return (
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Total Requests (30d)', value: s.totalRequests?.toLocaleString() || 0 },
                        { label: 'Total Tokens (30d)', value: s.totalTokens?.toLocaleString() || 0 },
                        { label: 'Estimated Cost (30d)', value: `$${(s.totalCostUsd || 0).toFixed(4)}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                          <p className="text-2xl font-bold text-gray-900">{value}</p>
                          <p className="text-sm text-gray-500 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Language breakdown */}
                {(aiUsageData.languageBreakdown as { _id: string; requests: number; tokens: number }[])?.length > 0 && (
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-700 mb-3">Language Distribution</h3>
                    <div className="space-y-2">
                      {(aiUsageData.languageBreakdown as { _id: string; requests: number; tokens: number }[]).map((lang) => {
                        const totalReq = (aiUsageData.summary as { totalRequests: number }).totalRequests || 1;
                        const pct = Math.round((lang.requests / totalReq) * 100);
                        return (
                          <div key={lang._id} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600 w-8 uppercase">{lang._id}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-16 text-right">{lang.requests} req ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top users */}
                {(aiUsageData.topUsers as { _id: string; name: string; email: string; requests: number; tokens: number }[])?.length > 0 && (
                  <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-700 mb-3">Top AI Users (by token usage)</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left pb-2">User</th><th className="text-right pb-2">Requests</th><th className="text-right pb-2">Tokens</th></tr></thead>
                      <tbody>
                        {(aiUsageData.topUsers as { name?: string; email?: string; requests: number; tokens: number }[]).map((u, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-2 text-gray-700">{u.name || u.email || 'Anonymous'}</td>
                            <td className="py-2 text-right text-gray-500">{u.requests}</td>
                            <td className="py-2 text-right text-gray-500">{u.tokens?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">No AI usage data available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
