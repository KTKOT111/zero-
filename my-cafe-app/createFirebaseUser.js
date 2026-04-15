// src/utils/createFirebaseUser.js

const FIREBASE_API_KEY = "AIzaSyD7JUJwT6_F_Nfn-VEdKNOQOjtcielLBAY";

/**
 * إنشاء مستخدم جديد في Firebase Authentication
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{uid: string, email: string}>}
 */
export async function createFirebaseUser(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorCode = data?.error?.message || 'UNKNOWN_ERROR';
    const errorMessages = {
      'EMAIL_EXISTS': 'البريد الإلكتروني مسجل بالفعل في Firebase',
      'WEAK_PASSWORD : Password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      'INVALID_EMAIL': 'صيغة البريد الإلكتروني غير صحيحة',
      'OPERATION_NOT_ALLOWED': 'تسجيل الإيميل/كلمة مرور غير مفعّل في Firebase Console',
      'TOO_MANY_ATTEMPTS_TRY_LATER': 'طلبات كثيرة، انتظر قليلاً',
    };
    throw new Error(errorMessages[errorCode] || `خطأ Firebase: ${errorCode}`);
  }

  return { uid: data.localId, email: data.email };
}
