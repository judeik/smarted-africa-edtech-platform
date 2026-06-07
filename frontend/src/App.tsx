import React, { useState, useEffect } from 'react';
import Navbar from './components/navigation/Navbar';
import LandingPage from './pages/LandingPage';
import CoursesPage from './pages/CoursesPage';
import SubscriptionPage from './pages/SubscriptionPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AIChat from './components/chat/AIChat';
import AuthModal from './components/auth/AuthModal';
import ReviewModal from './components/reviews/ReviewModal';
import OfflineIndicator from './components/ui/OfflineIndicator';
import { translations as _translations } from './utils/translations';
import { Course } from './pages/CoursesPage';
import { useAuthStore } from './store/authStore';

type PageName =
  | 'landing' | 'courses' | 'subscription' | 'checkout'
  | 'payment-success' | 'StudentDashboard' | 'AdminDashboard'
  | 'confirm-email' | 'reset-password' | 'set-password';

const App: React.FC = () => {
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();

  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showAutoTranslatePopup, setShowAutoTranslatePopup] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  const [currentPage, setCurrentPage] = useState<PageName>('landing');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewCourse, setReviewCourse] = useState<{ id: string; title: string } | null>(null);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [confirmToken, setConfirmToken] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Detect deep-link tokens on mount
  useEffect(() => {
    const path = window.location.pathname;
    const confirmMatch = path.match(/^\/confirm\/([a-f0-9]{64})$/i);
    const resetMatch = path.match(/^\/reset-password\/([a-f0-9]{64})$/i);
    if (confirmMatch) {
      setConfirmToken(confirmMatch[1]);
      setCurrentPage('confirm-email');
      window.history.replaceState({}, '', '/');
      return;
    }
    if (resetMatch) {
      setResetToken(resetMatch[1]);
      setCurrentPage('reset-password');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Verify auth on mount
  useEffect(() => {
    if (currentPage === 'confirm-email' || currentPage === 'reset-password') return;
    checkAuth().then(() => {
      const state = useAuthStore.getState();
      if (state.isAuthenticated && state.user) {
        setDashboardReady(true);
        setCurrentPage(state.user.role === 'admin' ? 'AdminDashboard' : 'StudentDashboard');
      }
    });
  }, [checkAuth]);

  // Browser language detection
  useEffect(() => {
    const browserLang = navigator.language?.split('-')[0] || 'en';
    const supported = ['en', 'yo', 'ha', 'ig', 'fr', 'pt', 'sw', 'am'];
    if (supported.includes(browserLang) && browserLang !== 'en') {
      setDetectedLanguage(browserLang);
      setShowAutoTranslatePopup(true);
    }
  }, []);

  const handleAuthClick = (type: 'login' | 'signup') => {
    setAuthType(type);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    setDashboardReady(true);
    const state = useAuthStore.getState();
    setCurrentPage(state.user?.role === 'admin' ? 'AdminDashboard' : 'StudentDashboard');
  };

  const handleLogout = async () => {
    await logout();
    setCurrentPage('landing');
    setDashboardReady(false);
  };

  const handleCourseSubscribe = (course: Course) => {
    setSelectedCourse(course);
    setCurrentPage('subscription');
  };

  const handleWriteReview = (courseId: string, courseTitle: string) => {
    setReviewCourse({ id: courseId, title: courseTitle });
    setIsReviewModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Loading SmartEd Africa…</h2>
        </div>
      </div>
    );
  }

  // Deep-link pages
  if (currentPage === 'confirm-email' && confirmToken) {
    return (
      <ConfirmEmailPage
        token={confirmToken}
        onSetPassword={() => {
          setCurrentPage('landing');
          setAuthType('signup');
          setIsAuthModalOpen(true);
        }}
        onGoToLogin={() => {
          setCurrentPage('landing');
          setIsAuthModalOpen(true);
          setAuthType('login');
        }}
      />
    );
  }

  if (currentPage === 'reset-password' && resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onSuccess={() => {
          setCurrentPage('landing');
          setIsAuthModalOpen(true);
          setAuthType('login');
        }}
      />
    );
  }

  // Admin dashboard
  if (dashboardReady && isAuthenticated && user?.role === 'admin' && currentPage === 'AdminDashboard') {
    return (
      <>
        <Navbar
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
          showAutoDetect={false}
          onAuthClick={handleAuthClick}
          user={user}
          onLogout={handleLogout}
          currentPage={currentPage}
          onNavigate={(page) => setCurrentPage(page as PageName)}
        />
        <AdminDashboard onLogout={handleLogout} />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 transition-all duration-700">
      <Navbar
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        showAutoDetect={showAutoTranslatePopup}
        onAuthClick={handleAuthClick}
        user={user}
        onLogout={handleLogout}
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page as PageName)}
      />

      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 rounded-full shadow-lg hover:from-green-700 hover:to-teal-700 transition-all"
        aria-label="Open AI Tutor"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} currentLanguage={currentLanguage} />
      <OfflineIndicator />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        authType={authType}
        currentLanguage={currentLanguage}
        onSuccess={handleAuthSuccess}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        courseId={reviewCourse?.id || ''}
        courseTitle={reviewCourse?.title || ''}
      />

      {/* Auto-translate popup */}
      {showAutoTranslatePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Language preference">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Language Detected</h3>
            <p className="text-gray-600 mb-4 text-sm">
              We detected your browser language. Would you like to view this page in{' '}
              <strong>{detectedLanguage.toUpperCase()}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setCurrentLanguage(detectedLanguage); setShowAutoTranslatePopup(false); }}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm"
              >
                Yes, Translate
              </button>
              <button
                onClick={() => setShowAutoTranslatePopup(false)}
                className="flex-1 bg-gray-100 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-200 text-sm"
              >
                Keep English
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pages */}
      {!dashboardReady && currentPage === 'landing' && (
        <LandingPage currentLanguage={currentLanguage} onAuthClick={handleAuthClick} onNavigateToCourses={() => setCurrentPage('courses')} />
      )}
      {!dashboardReady && currentPage === 'courses' && (
        <CoursesPage currentLanguage={currentLanguage} onSubscribe={handleCourseSubscribe} onWriteReview={handleWriteReview} />
      )}
      {!dashboardReady && currentPage === 'subscription' && selectedCourse && (
        <SubscriptionPage course={selectedCourse} onBack={() => setCurrentPage('courses')} onProceedToCheckout={() => setCurrentPage('checkout')} />
      )}
      {!dashboardReady && currentPage === 'checkout' && selectedCourse && (
        <CheckoutPage
          course={selectedCourse}
          onBack={() => setCurrentPage('subscription')}
          onComplete={(method) => { setPaymentMethod(method); setCurrentPage('payment-success'); }}
        />
      )}
      {!dashboardReady && currentPage === 'payment-success' && selectedCourse && (
        <PaymentSuccessPage
          courseTitle={selectedCourse.title}
          paymentMethod={paymentMethod}
          onContinue={() => { setDashboardReady(true); setCurrentPage('StudentDashboard'); }}
        />
      )}
      {dashboardReady && isAuthenticated && user && currentPage === 'StudentDashboard' && (
        <StudentDashboard user={user} />
      )}
      {dashboardReady && !isAuthenticated && (
        <LandingPage currentLanguage={currentLanguage} onAuthClick={handleAuthClick} onNavigateToCourses={() => setCurrentPage('courses')} />
      )}
    </div>
  );
};

export default App;
