// ============================================================
// PATCH للـ App.js — إضافة إنشاء مستخدمين Firebase تلقائياً
// المشروع: coffe-school
// ============================================================


// ── الخطوة 1: أضف هذا الاستيراد في أعلى App.js ──────────────

import { createFirebaseUser } from './utils/createFirebaseUser';


// ── الخطوة 2: استبدل saveTenant الحالية بهذه ─────────────────
// (ابحث عن: const saveTenant = useCallback)

const saveTenant = useCallback(async (e) => {
  e.preventDefault();

  if (formData.isNew) {
    if (tenants.find(t => t.id === formData.id)) {
      showToast('كود الكافيه موجود بالفعل!', 'error');
      return;
    }

    // إنشاء حساب المدير في Firebase
    try {
      await createFirebaseUser(formData.adminEmail, formData.adminPassword);
    } catch (err) {
      showToast(`فشل إنشاء حساب المدير: ${err.message}`, 'error');
      return;
    }

    // إنشاء حساب الكاشير في Firebase
    try {
      await createFirebaseUser(formData.cashierEmail, formData.cashierPassword);
    } catch (err) {
      showToast(`فشل إنشاء حساب الكاشير: ${err.message}`, 'error');
      return;
    }

    const newTenant = { ...formData, status: 'active' };
    delete newTenant.isNew;
    delete newTenant.adminPassword;
    delete newTenant.cashierPassword;

    const newTenants = [...tenants, newTenant];
    setField('tenants', newTenants);
    syncPlatformToCloud({ tenants: newTenants });

  } else {
    const newTenants = tenants.map(t =>
      t.id === formData.id ? { ...t, ...formData } : t
    );
    setField('tenants', newTenants);
    syncPlatformToCloud({ tenants: newTenants });
  }

  closeModal();
  showToast('تم حفظ بيانات الكافيه', 'success');
}, [formData, tenants, setField, syncPlatformToCloud, closeModal, showToast]);


// ── الخطوة 3: استبدل modal 'tenant' في قسم MODALS ────────────
// (ابحث عن: {activeModal === 'tenant' && ( )

{activeModal === 'tenant' && (
  <CustomModal
    title={formData.id && !formData.isNew ? "تعديل الكافيه" : "إضافة كافيه جديد"}
    onClose={closeModal}
  >
    <form onSubmit={saveTenant} className="space-y-4">

      {/* كود الكافيه — عند الإضافة فقط */}
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

      {/* اسم الكافيه */}
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

      {/* تاريخ الاشتراك */}
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

      {/* إيميل المدير */}
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

      {/* كلمة مرور المدير — عند الإضافة فقط */}
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
            minLength={6}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"
            dir="ltr"
          />
        </div>
      )}

      {/* إيميل الكاشير */}
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

      {/* كلمة مرور الكاشير — عند الإضافة فقط */}
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
            minLength={6}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"
            dir="ltr"
          />
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-lg transition-colors shadow-lg mt-2"
      >
        {formData.isNew ? '🔥 إنشاء الحسابات وحفظ' : 'حفظ'}
      </button>

    </form>
  </CustomModal>
)}
