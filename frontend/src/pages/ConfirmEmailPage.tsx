import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { authApi, ApiError } from '../lib/api';

interface ConfirmEmailPageProps {
  token: string;
  onSetPassword: (userId: string) => void;
  onGoToLogin: () => void;
}

const ConfirmEmailPage: React.FC<ConfirmEmailPageProps> = ({ token, onSetPassword, onGoToLogin }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    authApi.confirmEmail(token).then((data) => {
      if (cancelled) return;
      if (data.success && data.userId) {
        setStatus('success');
        setMessage(data.message || 'Email confirmed! Set your password to continue.');
        // Auto-redirect after short delay
        setTimeout(() => onSetPassword(data.userId!), 1500);
      } else {
        setStatus('error');
        setMessage(data.message || 'Confirmation failed.');
      }
    }).catch((err) => {
      if (cancelled) return;
      setStatus('error');
      setMessage(err instanceof ApiError ? err.message : 'Invalid or expired confirmation link.');
    });
    return () => { cancelled = true; };
  }, [token, onSetPassword]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-green-500 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email…</h2>
            <p className="text-gray-500 text-sm">Please wait while we confirm your address.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Confirmed!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-gray-400 text-sm">Redirecting you to set your password…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={onGoToLogin}
              className="w-full py-2 px-4 rounded-md text-white font-medium bg-green-600 hover:bg-green-700"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmailPage;
