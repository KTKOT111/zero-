// ============================================================
// PATCH: إضافة تسجيل مستخدمين Firebase للـ Super Admin
// ============================================================
//
// الخطوة 1: أضف هذا الاستيراد في أعلى App.js
// ============================================================

import { createFirebaseUser } from './utils/createFirebaseUser';

// ============================================================
// الخطوة 2: أضف FIREBASE_API_KEY كـ constant بعد OWNER_EMAIL
// (خذها من Firebase Console → Project Settings → Web App Config)
// ============================================================

const FIREBASE_API_KEY = 'AIzaSy...'; // ← ضع Web API Key هنا

// ============================================================
// الخطوة 3: أضف هذه الـ Handler في قسم "Authentication Handlers"
// (بعد handleLogout مثلاً)
// ============================================================

const handleCreateFirebaseUser = useCallback(async (email, password) => {
  try {
    const result = await createFirebaseUser(email, password, FIREBASE_API_KEY);
    showToast(`✅ تم إنشاء الحساب: ${result.email}`, 'success');
    return true;
  } catch (err) {
    showToast(err.message, 'error');
    return false;
  }
}, [showToast]);

// ============================================================
// الخطوة 4: استبدل modal الـ 'tenant' الحالي بهذا الكود الكامل
// (يشمل إنشاء المستخدمين في Firebase تلقائياً عند الحفظ)
// ============================================================

// في saveTenant، استبدل الـ function الحالية بهذه:

const saveTenant = useCallback(async (e) => {
  e.preventDefault();

  if (formData.isNew) {
    if (tenants.find(t => t.id === formData.id)) {
      showToast('كود الكافيه موجود بالفعل!', 'error');
      return;
    }

    // ← إنشاء حسابات Firebase تلقائياً
    const adminCreated = await createFirebaseUser(
      formData.adminEmail,
      formData.adminPassword,
      FIREBASE_API_KEY
    );

    const cashierCreated = await createFirebaseUser(
      formData.cashierEmail,
      formData.cashierPassword,
      FIREBASE_API_KEY
    );

    if (!adminCreated || !cashierCreated) return; // وقف لو في خطأ

    const newTenant = { ...formData, status: 'active' };
    // امسح البيانات الحساسة قبل الحفظ في Firestore
    delete newTenant.isNew;
    delete newTenant.adminPassword;
    delete newTenant.cashierPassword;

    const newTenants = [...tenants, newTenant];
    setField('tenants', newTenants);
    syncPlatformToCloud({ tenants: newTenants });

  } else {
    // تعديل بيانات كافيه موجود (بدون تغيير كلمات المرور)
    const newTenants = tenants.map(t =>
      t.id === formData.id ? { ...t, ...formData } : t
    );
    setField('tenants', newTenants);
    syncPlatformToCloud({ tenants: newTenants });
  }

  closeModal();
  showToast('تم حفظ بيانات الكافيه', 'success');
}, [formData, tenants, setField, syncPlatformToCloud, closeModal, showToast]);


// ============================================================
// الخطوة 5: استبدل modal 'tenant' في قسم MODALS بهذا الكود
// يُضاف حقلا كلمة المرور فقط عند إضافة كافيه جديد
// ============================================================

{activeModal === 'tenant' && (
  <CustomModal
    title={formData.id && !formData.isNew ? "تعديل الكافيه" : "إضافة كافيه جديد"}
    onClose={closeModal}
  >
    <form onSubmit={saveTenant} className="space-y-4">

      {formData.isNew && (
        <div>
          <label className="block text-sm font-black mb-2 dark:text-white">كود الكافيه</label>
          <input
            required
            name="id"
            placeholder="مثال: c2"
            value={formData.id || ''}
            onChange={handleFormChange}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-black mb-2 dark:text-white">اسم الكافيه</label>
        <input
          required
          name="name"
          value={formData.name || ''}
          onChange={handleFormChange}
          className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-black mb-2 dark:text-white">تاريخ انتهاء الاشتراك</label>
        <input
          required
          type="date"
          name="subscriptionEnds"
          value={formData.subscriptionEnds || ''}
          onChange={handleFormChange}
          className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"
        />
      </div>

      {/* إيميل + كلمة مرور المدير */}
      <div>
        <label className="block text-sm font-black mb-2 dark:text-white">إيميل المدير</label>
        <input
          required
          type="email"
          name="adminEmail"
          value={formData.adminEmail || ''}
          onChange={handleFormChange}
          placeholder="admin.c2@coffeeerp.app"
          className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"
          dir="ltr"
        />
      </div>
      {formData.isNew && (
        <div>
          <label className="block text-sm font-black mb-2 dark:text-white">كلمة مرور المدير</label>
          <input
            required
            type="password"
            name="adminPassword"
            value={formData.adminPassword || ''}
            onChange={handleFormChange}
            placeholder="6 أحرف على الأقل"
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"
            dir="ltr"
            minLength={6}
          />
        </div>
      )}

      {/* إيميل + كلمة مرور الكاشير */}
      <div>
        <label className="block text-sm font-black mb-2 dark:text-white">إيميل الكاشير</label>
        <input
          required
          type="email"
          name="cashierEmail"
          value={formData.cashierEmail || ''}
          onChange={handleFormChange}
          placeholder="cashier.c2@coffeeerp.app"
          className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"
          dir="ltr"
        />
      </div>
      {formData.isNew && (
        <div>
          <label className="block text-sm font-black mb-2 dark:text-white">كلمة مرور الكاشير</label>
          <input
            required
            type="password"
            name="cashierPassword"
            value={formData.cashierPassword || ''}
            onChange={handleFormChange}
            placeholder="6 أحرف على الأقل"
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"
            dir="ltr"
            minLength={6}
          />
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-lg transition-colors shadow-lg mt-2"
      >
        {formData.isNew ? 'إنشاء الحسابات وحفظ' : 'حفظ'}
      </button>

    </form>
  </CustomModal>
)}
