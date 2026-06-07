import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, AlertCircle, CheckCircle, X, RotateCcw, Clock, Loader2 } from 'lucide-react';
import AuthInputField from './AuthInputField';
import PasswordStrength from './PasswordStrength';
import { translations } from '../../utils/translations';
import { authApi, AuthUser, ApiError } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authType: 'login' | 'signup';
  currentLanguage: string;
  onSuccess?: (user: AuthUser) => void;
}

type SignupStep = 'email' | 'confirm-sent' | 'set-password';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, authType, currentLanguage, onSuccess }) => {
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;
  const { login } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Signup multi-step
  const [signupStep, setSignupStep] = useState<SignupStep>('email');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingUserId, setPendingUserId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setGlobalError('');
      setGlobalSuccess('');
      setLoginEmail('');
      setLoginPassword('');
      setLoginErrors({});
      setSignupStep('email');
      setSignupName('');
      setSignupEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setPendingUserId('');
      setShowForgotPassword(false);
      setForgotEmail('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((p) => p - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Handle confirmation token from URL (user clicked email link and came back)
  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    if (userId && userId.length === 24) {
      setPendingUserId(userId);
      setSignupStep('set-password');
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    const errs: Record<string, string> = {};
    if (!loginEmail) errs.email = 'Email is required';
    if (!loginPassword) errs.password = 'Password is required';
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }

    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      setGlobalSuccess(t.loginSuccess || 'Login successful!');
      setTimeout(() => {
        const user = useAuthStore.getState().user;
        if (user) onSuccess?.(user);
        onClose();
      }, 800);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      setGlobalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    if (!signupName.trim() || signupName.trim().length < 2) {
      setGlobalError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!signupEmail || !/\S+@\S+\.\S+/.test(signupEmail)) {
      setGlobalError('Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authApi.register(signupName.trim(), signupEmail.trim().toLowerCase());
      setGlobalSuccess(t.verificationSent || 'Check your email for a confirmation link.');
      setSignupStep('confirm-sent');
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    if (!pendingUserId) {
      setGlobalError('User ID is missing. Please re-confirm your email.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setGlobalError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setGlobalError('Password must be at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await authApi.setPassword(pendingUserId, newPassword, confirmPassword);
      localStorage.setItem('smarted_access_token', data.accessToken);
      useAuthStore.getState().setUser(data.user);
      setGlobalSuccess('Account created! Welcome to SmartEd Africa.');
      setTimeout(() => {
        onSuccess?.(data.user);
        onClose();
      }, 800);
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Could not set password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsSubmitting(true);
    try {
      await authApi.resendConfirmation(signupEmail);
      setGlobalSuccess('Confirmation email resent.');
      setResendCooldown(60);
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Could not resend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setIsSubmitting(true);
    try {
      const data = await authApi.forgotPassword(forgotEmail);
      setGlobalSuccess(data.message);
    } catch (err) {
      setGlobalError(err instanceof ApiError ? err.message : 'Could not send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={authType === 'login' ? t.login : t.signup}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {showForgotPassword
              ? 'Reset Password'
              : authType === 'login'
              ? t.login
              : t.signup}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {globalError && (
          <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        )}
        {globalSuccess && (
          <div role="status" className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{globalSuccess}</p>
          </div>
        )}

        {/* ── Forgot Password ── */}
        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} noValidate>
            <AuthInputField
              label="Email address"
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              required
              icon={Mail}
            />
            <button
              type="submit"
              disabled={isSubmitting || !forgotEmail}
              className="w-full py-2 px-4 rounded-md text-white font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Reset Link
            </button>
            <button
              type="button"
              onClick={() => { setShowForgotPassword(false); setGlobalError(''); setGlobalSuccess(''); }}
              className="mt-3 w-full text-sm text-center text-green-600 hover:text-green-500"
            >
              {t.backToLogin || 'Back to login'}
            </button>
          </form>
        ) : authType === 'login' ? (
          /* ── Login Form ── */
          <form onSubmit={handleLogin} noValidate>
            <AuthInputField
              label={t.emailOrPhone || 'Email'}
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(e) => { setLoginEmail(e.target.value); setLoginErrors((p) => ({ ...p, email: '' })); }}
              error={loginErrors.email}
              placeholder="you@example.com"
              required
              icon={Mail}
            />
            <AuthInputField
              label={t.password || 'Password'}
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(e) => { setLoginPassword(e.target.value); setLoginErrors((p) => ({ ...p, password: '' })); }}
              error={loginErrors.password}
              placeholder="••••••••"
              required
              icon={Lock}
              showPasswordToggle
              showPassword={showLoginPassword}
              setShowPassword={setShowLoginPassword}
            />
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setGlobalError(''); setGlobalSuccess(''); }}
                className="text-sm font-medium text-green-600 hover:text-green-500"
              >
                {t.forgotPassword || 'Forgot Password?'}
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-md text-white font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.login || 'Login'}
            </button>
          </form>
        ) : (
          /* ── Signup Multi-step ── */
          <>
            {signupStep === 'email' && (
              <form onSubmit={handleRegister} noValidate>
                <AuthInputField
                  label="Full Name"
                  id="signup-name"
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="John Doe"
                  required
                  icon={User}
                />
                <AuthInputField
                  label={t.emailOrPhone || 'Email'}
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  icon={Mail}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !signupEmail || !signupName}
                  className="w-full py-2 px-4 rounded-md text-white font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.sendVerification || 'Send Verification Email'}
                </button>
              </form>
            )}

            {signupStep === 'confirm-sent' && (
              <div className="text-center py-4">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h3>
                <p className="text-gray-600 mb-6 text-sm">
                  We sent a confirmation link to <strong>{signupEmail}</strong>.
                  Click the link in your email to verify your address — you'll be redirected back here automatically.
                </p>
                <p className="text-gray-500 text-xs mb-4">
                  Didn't receive it? Check your spam folder or resend below.
                </p>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className="text-sm text-green-600 hover:text-green-500 flex items-center justify-center gap-1 mx-auto disabled:text-gray-400"
                >
                  {resendCooldown > 0 ? (
                    <><Clock className="w-4 h-4" /> Resend in {resendCooldown}s</>
                  ) : (
                    <><RotateCcw className="w-4 h-4" /> {t.resendCode || 'Resend email'}</>
                  )}
                </button>
              </div>
            )}

            {signupStep === 'set-password' && (
              <form onSubmit={handleSetPassword} noValidate>
                <p className="text-sm text-gray-600 mb-4">
                  Email verified! Now set a strong password for your account.
                </p>
                <AuthInputField
                  label={t.password || 'Password'}
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  icon={Lock}
                  showPasswordToggle
                  showPassword={showNewPassword}
                  setShowPassword={setShowNewPassword}
                />
                <PasswordStrength password={newPassword} />
                <AuthInputField
                  label={t.confirmPassword || 'Confirm Password'}
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  icon={Lock}
                  showPasswordToggle
                  showPassword={showConfirmPassword}
                  setShowPassword={setShowConfirmPassword}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword || !confirmPassword}
                  className="w-full mt-2 py-2 px-4 rounded-md text-white font-medium bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.completeSignup || 'Complete Sign Up'}
                </button>
              </form>
            )}
          </>
        )}

        {!showForgotPassword && (
          <div className="mt-6 text-center text-sm text-gray-600">
            {authType === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => { setGlobalError(''); setGlobalSuccess(''); }}
                  className="font-medium text-green-600 hover:text-green-500"
                >
                  {t.signup || 'Sign Up'}
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={onClose}
                  className="font-medium text-green-600 hover:text-green-500"
                >
                  {t.login || 'Login'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
