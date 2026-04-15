import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signInWithEmailLink, isSignInWithEmailLink } from './firebase';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AuthHandler = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const completeSignIn = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setStatus('error');
        setErrorMsg('رابط غير صالح أو منتهي الصلاحية');
        return;
      }

      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('الرجاء إدخال بريدك الإلكتروني للتأكيد');
      }

      if (!email) {
        setStatus('error');
        setErrorMsg('لم يتم توفير البريد الإلكتروني');
        return;
      }

      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        setStatus('success');
        toast.success('تم تسجيل الدخول بنجاح');
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } catch (error) {
        console.error('Email Link Sign-in Error:', error);
        setStatus('error');
        if (error.code === 'auth/invalid-email') {
          setErrorMsg('البريد الإلكتروني غير صالح');
        } else if (error.code === 'auth/invalid-action-code') {
          setErrorMsg('الرابط غير صالح أو تم استخدامه من قبل');
        } else if (error.code === 'auth/expired-action-code') {
          setErrorMsg('انتهت صلاحية الرابط');
        } else {
          setErrorMsg(error.message);
        }
      }
    };

    completeSignIn();
  }, [navigate, onLoginSuccess]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">جاري التحقق من الرابط...</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">يرجى الانتظار لحظة</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">تم تسجيل الدخول!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">جاري توجيهك إلى لوحة التحكم...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">عذراً، حدث خطأ</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              العودة لصفحة الدخول
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthHandler;
