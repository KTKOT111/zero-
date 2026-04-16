import React, { useState, useMemo, useEffect, useCallback, useRef, useReducer } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import {
  Coffee, Users, Receipt, Package, LayoutDashboard, LogOut, Plus, Minus, Trash2,
  ShoppingCart, Banknote, Wallet, TrendingUp, FileText, Moon, Sun, Edit, X, Printer,
  Menu, Building2, Utensils, Armchair, Save, AlertCircle, Loader2, WifiOff,
  RefreshCw, Wifi, ClipboardList, Play, Power, ShieldAlert, Image as ImageIcon,
  Settings, Store, Bell, Tag, Gift, Gamepad2, Download, Calendar, AlertTriangle,
  User, Mail, Lock, Upload
} from 'lucide-react';

/* --- بداية: بدائل مضمنة لملفاتك المحلية لكي يعمل الكود في هذه البيئة المعزولة --- */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signInAnonymously, onAuthStateChanged, signOut, sendSignInLinkToEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "dummy" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() { if (this.state.hasError) return <div className="p-4 text-center text-rose-500 font-bold">حدث خطأ غير متوقع.</div>; return this.props.children; }
}

const CustomModal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative custom-scrollbar border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-700 pb-3">
        <h2 className="text-xl font-black text-slate-800 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500 hover:text-rose-500 transition-colors"><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

const exportReportPDF = () => toast.success('تم التصدير بنجاح (معاينة)');
const exportEmployeeReportPDF = () => toast.success('تم تصدير التقرير بنجاح (معاينة)');
const AuthHandler = () => <div className="p-10 text-center font-bold">جاري المصادقة...</div>;
/* --- نهاية البدائل المضمنة (يمكنك لاحقاً استبدالها بملفات مشروعك) --- */

const OWNER_EMAIL = 'owner@coffeeerp.app';
const STOCK_ALERT_THRESHOLD = 50;
const TAX_RATE = 0.14;

const defaultProducts = [];

// مكون داخلي آمن لتعديل الأرقام مباشرة (Inline Edit)
const InlineSafeInput = ({ value, onSave, colorClass }) => {
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  return (
    <input 
      type="number" 
      step="any" 
      value={val} 
      onChange={e => setVal(e.target.value)} 
      onBlur={() => onSave(parseFloat(val) || 0)} 
      className={`w-full p-2 border-2 rounded-xl outline-none font-black text-sm text-center transition-colors ${colorClass}`} 
    />
  );
};

// ========== Reducer ==========
const initialState = {
  fbUser: null,
  isDataLoaded: false,
  isOnline: true,
  isSyncing: false,
  syncStatus: 'idle',
  syncError: '',
  isDarkMode: false,
  currentUser: null,
  currentRoute: 'dashboard',
  isMobileMenuOpen: false,
  isMobileCartOpen: false,
  loginEmail: '',
  loginPassword: '',
  loginError: '',
  isLoggingIn: false,
  loginMethod: 'password',
  emailLinkSent: false,
  emailLinkEmail: '',
  emailLinkLoading: false,
  emailLinkError: '',
  globalSettings: { appName: 'كوفي سحابة' },
  tenants: [],
  rawMaterials: [],
  products: defaultProducts,
  employees: [],
  expenses: [],
  tables: [],
  shifts: [],
  orders: [],
  activeTableOrders: {},
  isTaxEnabled: false,
  offers: [],
  psDevices: [],
  psSessions: [],
  selectedEmployeeReport: null,
  activeModal: null,
  formData: {},
  deleteConfig: null,
  cart: [],
  orderType: 'takeaway',
  activeTableId: null,
  reportPeriod: 'daily',
  lastOrder: null,
  selectedCategoryFilter: 'all',
  discountType: 'percent',
  discountValue: '',
  isHoldingTable: false
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_MULTIPLE':
      return { ...state, ...action.payload };
    case 'RESET_CAFE_DATA':
      return {
        ...state,
        rawMaterials: [],
        products: defaultProducts,
        employees: [],
        expenses: [],
        tables: [],
        shifts: [],
        orders: [],
        activeTableOrders: {},
        isTaxEnabled: false,
        offers: [],
        psDevices: [],
        psSessions: []
      };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const {
    fbUser, isDataLoaded, isOnline, isSyncing, syncStatus, syncError, isDarkMode,
    currentUser, currentRoute, isMobileMenuOpen, isMobileCartOpen,
    loginEmail, loginPassword, loginError, isLoggingIn,
    loginMethod, emailLinkSent, emailLinkEmail, emailLinkLoading, emailLinkError,
    globalSettings, tenants, rawMaterials, products, employees, expenses,
    tables, shifts, orders, activeTableOrders, isTaxEnabled, offers,
    psDevices, psSessions, selectedEmployeeReport, activeModal, formData,
    deleteConfig, cart, orderType, activeTableId, reportPeriod, lastOrder,
    selectedCategoryFilter, discountType, discountValue, isHoldingTable
  } = state;

  const navigate = useNavigate();
  const location = useLocation();

  const fbUserRef = useRef(fbUser);
  const currentUserRef = useRef(currentUser);
  const stateRef = useRef(state);
  useEffect(() => { fbUserRef.current = fbUser; }, [fbUser]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { stateRef.current = state; }, [state]);

  const setState = useCallback((updates) => dispatch({ type: 'SET_MULTIPLE', payload: updates }), []);
  const setField = useCallback((field, value) => dispatch({ type: 'SET_FIELD', field, value }), []);

  const showToast = useCallback((message, type = 'success') => {
    toast[type](message, { duration: 3000, position: 'top-center' });
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    setField('isOnline', navigator.onLine);
    const handleOnline = () => setField('isOnline', true);
    const handleOffline = () => setField('isOnline', false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setField]);

  useEffect(() => {
    if (!auth || !db) { setField('isDataLoaded', true); return; }
    let unsubAuth = null;
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (e) { console.error("Auth init error:", e); }
    };
    initAuth();
    unsubAuth = onAuthStateChanged(auth, (user) => {
      setField('fbUser', user);
      setField('isDataLoaded', true);
    });
    const timer = setTimeout(() => setField('isDataLoaded', true), 3000);
    return () => { if (unsubAuth) unsubAuth(); clearTimeout(timer); };
  }, [setField]);

  useEffect(() => {
    if (!fbUser || !db) return;
    const platformRef = doc(db, 'coffee_erp_platform', 'config');
    const unsub = onSnapshot(platformRef, { includeMetadataChanges: true }, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setState({
          globalSettings: data.globalSettings || { appName: 'كوفي سحابة' },
          tenants: data.tenants || []
        });
      }
      setField('isDataLoaded', true);
    }, (err) => { console.error("Platform config error:", err); setField('isDataLoaded', true); });
    return () => unsub();
  }, [fbUser, setField, setState]);

  useEffect(() => {
    if (!fbUser || !db || !currentUser?.cafeId) return;
    dispatch({ type: 'RESET_CAFE_DATA' });
    const cafeRef = doc(db, 'coffee_erp_cafes', currentUser.cafeId);
    const unsub = onSnapshot(cafeRef, { includeMetadataChanges: true }, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setState({
          rawMaterials: data.rawMaterials || [],
          products: data.products?.length ? data.products : defaultProducts,
          employees: data.employees || [],
          expenses: data.expenses || [],
          tables: data.tables || [],
          shifts: data.shifts || [],
          orders: data.orders || [],
          activeTableOrders: data.activeTableOrders || {},
          isTaxEnabled: data.isTaxEnabled || false,
          offers: data.offers || [],
          psDevices: data.psDevices || [],
          psSessions: data.psSessions || []
        });
      }
      setField('isSyncing', snap.metadata.hasPendingWrites);
    }, (err) => { console.error("Cafe data error:", err); showToast('فشل تحميل بيانات الكافيه', 'error'); });
    return () => unsub();
  }, [fbUser, currentUser?.cafeId, setField, setState, showToast]);

  const syncPlatformToCloud = useCallback(async (newData) => {
    if (!db || !fbUserRef.current) throw new Error("قاعدة البيانات غير متصلة");
    try {
      await setDoc(doc(db, 'coffee_erp_platform', 'config'), { ...newData, lastUpdated: new Date().toISOString() }, { merge: true });
      return true;
    } catch (e) {
      console.error("Platform sync error:", e);
      showToast(`فشل المزامنة: ${e.message}`, 'error');
      throw e;
    }
  }, [showToast]);

  const syncToCloud = useCallback(async (newData) => {
    const cafeId = currentUserRef.current?.cafeId;
    if (!db || !fbUserRef.current || !cafeId) return;
    setField('syncStatus', 'saving');
    try {
      await setDoc(doc(db, 'coffee_erp_cafes', cafeId), { ...newData, lastUpdated: new Date().toISOString() }, { merge: true });
      setField('syncStatus', 'success');
      setField('syncError', '');
      setTimeout(() => setField('syncStatus', 'idle'), 2000);
    } catch (err) {
      setField('syncStatus', 'error');
      const msg = err.code === 'permission-denied' ? 'صلاحية غير كافية' :
                  err.code === 'unavailable' ? 'غير متصل بالإنترنت' : err.message;
      setField('syncError', msg);
      showToast(`فشل الحفظ: ${msg}`, 'error');
    }
  }, [setField, showToast]);

  // ========== Authentication ==========
  const processUserRole = useCallback(async (user) => {
    const email = user.email?.toLowerCase();
    if (email === OWNER_EMAIL) {
      setState({ currentUser: { name: 'مالك المنصة', role: 'super_admin', cafeId: null }, currentRoute: 'saas_dashboard' });
      showToast('مرحباً بمالك المنصة', 'success');
      return true;
    }
    let matchedTenant = null, matchedRole = null;
    for (const t of tenants) {
      if (t.adminEmail?.toLowerCase() === email) { matchedTenant = t; matchedRole = 'admin'; break; }
      if (t.cashierEmail?.toLowerCase() === email) { matchedTenant = t; matchedRole = 'cashier'; break; }
    }
    if (!matchedTenant) {
      await signOut(auth);
      setField('loginError', 'البريد الإلكتروني غير مسجل في النظام.');
      showToast('البريد الإلكتروني غير مسجل', 'error');
      return false;
    }
    if (matchedTenant.status !== 'active') {
      await signOut(auth);
      setField('loginError', 'اشتراك الكافيه موقوف. يرجى التواصل مع الدعم.');
      showToast('الاشتراك موقوف', 'error');
      return false;
    }
    const displayName = matchedRole === 'admin' ? `مدير - ${matchedTenant.name}` : `كاشير - ${matchedTenant.name}`;
    setState({
      currentUser: { name: displayName, role: matchedRole, cafeId: matchedTenant.id, cafeName: matchedTenant.name },
      currentRoute: matchedRole === 'admin' ? 'dashboard' : 'pos'
    });
    showToast(`أهلاً ${displayName}`, 'success');
    return true;
  }, [tenants, setField, setState, showToast]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setField('loginError', '');
    setField('isLoggingIn', true);
    const email = loginEmail.trim().toLowerCase();
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, loginPassword);
      await processUserRole(userCred.user);
    } catch (err) {
      let errorMsg = 'حدث خطأ غير متوقع';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') errorMsg = 'كلمة المرور غير صحيحة.';
      else if (err.code === 'auth/user-not-found') errorMsg = 'البريد الإلكتروني غير مسجل في Firebase.';
      else if (err.code === 'auth/too-many-requests') errorMsg = 'محاولات كثيرة. يرجى الانتظار.';
      else errorMsg = err.message;
      setField('loginError', errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setField('isLoggingIn', false);
    }
  };

  const handleSendEmailLink = async (e) => {
    e.preventDefault();
    const email = emailLinkEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) { setField('emailLinkError', 'يرجى إدخال بريد إلكتروني صحيح'); return; }
    setField('emailLinkLoading', true);
    setField('emailLinkError', '');
    const actionCodeSettings = { url: `${window.location.origin}/auth/email-link`, handleCodeInApp: true };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setState({ emailLinkSent: true, emailLinkEmail: email, emailLinkLoading: false });
      showToast('تم إرسال رابط الدخول إلى بريدك الإلكتروني', 'success');
    } catch (error) {
      let errorMsg = 'فشل إرسال الرابط. حاول مرة أخرى.';
      if (error.code === 'auth/invalid-email') errorMsg = 'بريد إلكتروني غير صالح';
      else if (error.code === 'auth/too-many-requests') errorMsg = 'طلبات كثيرة جداً.';
      setField('emailLinkError', errorMsg);
      setField('emailLinkLoading', false);
      showToast(errorMsg, 'error');
    }
  };

  const handleLogout = useCallback(async () => {
    try { await signOut(auth); } catch (e) { console.error("Logout error:", e); }
    setState({ currentUser: null, loginEmail: '', loginPassword: '', emailLinkSent: false, emailLinkEmail: '', cart: [], lastOrder: null, activeTableId: null, activeModal: null, isMobileCartOpen: false });
    showToast('تم تسجيل الخروج', 'success');
  }, [setState, showToast]);

  // ========== Computed Values ==========
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(c => ({ id: c, name: c }));
  }, [products]);

  const lowStockItems = useMemo(() => rawMaterials.filter(rm => rm.currentStock <= STOCK_ALERT_THRESHOLD), [rawMaterials]);

  const expiredProducts = useMemo(() => {
    const today = new Date();
    return products.filter(p => p.expiryDate && new Date(p.expiryDate) <= today);
  }, [products]);

  const nearExpiryProducts = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return products.filter(p => p.expiryDate && new Date(p.expiryDate) > today && new Date(p.expiryDate) <= nextWeek);
  }, [products]);

  const activeShift = useMemo(() => {
    if (!currentUser) return null;
    return shifts.find(s =>
      s.status === 'open' &&
      s.cashierName?.trim() === currentUser.name?.trim()
    );
  }, [shifts, currentUser]);

  const getProductPriceWithOffer = useCallback((product) => {
    const today = new Date();
    const validOffer = offers.find(o => {
      if (!o.isActive) return false;
      if (o.productId && o.productId !== product.id) return false;
      if (o.category && o.category !== product.category) return false;
      const start = o.startDate ? new Date(o.startDate) : null;
      const end = o.endDate ? new Date(o.endDate) : null;
      if (start && today < start) return false;
      if (end && today > end) return false;
      return true;
    });
    if (!validOffer) return product.price;
    if (validOffer.discountType === 'percent') return Math.max(0, product.price * (1 - validOffer.discountValue / 100));
    return Math.max(0, product.price - validOffer.discountValue);
  }, [offers]);

  // ========== Modal Handlers ==========
  const openModal = useCallback((type, data = {}) => {
    if (type === 'product' && !data.recipe) data.recipe = [];
    setState({ formData: data, activeModal: type });
  }, [setState]);

  const closeModal = useCallback(() => {
    setState({ activeModal: null, formData: {}, deleteConfig: null });
  }, [setState]);

  const handleFormChange = useCallback((e) => {
    setState({ formData: { ...stateRef.current.formData, [e.target.name]: e.target.value } });
  }, [setState]);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setState({ formData: { ...stateRef.current.formData, image: compressedBase64 } });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }, [setState]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfig) return;
    const { type, id } = deleteConfig;
    let updates = {};
    if (type === 'material') { const newArr = rawMaterials.filter(rm => rm.id !== id); setField('rawMaterials', newArr); updates.rawMaterials = newArr; }
    else if (type === 'product') { const newArr = products.filter(p => p.id !== id); setField('products', newArr); updates.products = newArr; }
    else if (type === 'employee') { const newArr = employees.filter(e => e.id !== id); setField('employees', newArr); updates.employees = newArr; }
    else if (type === 'table') { const newArr = tables.filter(t => t.id !== id); setField('tables', newArr); updates.tables = newArr; }
    else if (type === 'expense') { const newArr = expenses.filter(ex => ex.id !== id); setField('expenses', newArr); updates.expenses = newArr; }
    else if (type === 'offer') { const newArr = offers.filter(o => o.id !== id); setField('offers', newArr); updates.offers = newArr; }
    else if (type === 'psDevice') { const newArr = psDevices.filter(d => d.id !== id); setField('psDevices', newArr); updates.psDevices = newArr; }
    syncToCloud(updates);
    closeModal();
    showToast('تم الحذف بنجاح', 'success');
  }, [deleteConfig, rawMaterials, products, employees, tables, expenses, offers, psDevices, setField, syncToCloud, closeModal, showToast]);

  const genericSave = useCallback((collectionKey, arr, extra = {}) => {
    let newArr;
    if (stateRef.current.formData.id) {
      newArr = arr.map(item => item.id === stateRef.current.formData.id ? { ...item, ...stateRef.current.formData, ...extra } : item);
    } else {
      const newId = `${collectionKey}_${Date.now()}`;
      newArr = [...arr, { ...stateRef.current.formData, ...extra, id: newId }];
    }
    const stateMapping = { rawMaterials: 'rawMaterials', products: 'products', employees: 'employees', tables: 'tables', expenses: 'expenses', offers: 'offers', psDevices: 'psDevices' };
    setField(stateMapping[collectionKey], newArr);
    syncToCloud({ [collectionKey]: newArr });
    closeModal();
    showToast('تم الحفظ بنجاح', 'success');
  }, [setField, syncToCloud, closeModal, showToast]);

  const saveTenant = useCallback(async (e) => {
    e.preventDefault();
    const currentForm = stateRef.current.formData;
    let newTenants;
    if (currentForm.isNew) {
      if (tenants.find(t => t.id === currentForm.id)) { showToast('كود الكافيه موجود بالفعل!', 'error'); return; }
      const newTenant = { ...currentForm, status: 'active' };
      delete newTenant.isNew;
      newTenants = [...tenants, newTenant];
    } else {
      newTenants = tenants.map(t => t.id === currentForm.id ? { ...t, ...currentForm } : t);
    }
    try {
      await syncPlatformToCloud({ tenants: newTenants });
      setField('tenants', newTenants);
      closeModal();
      showToast('تم حفظ بيانات الكافيه', 'success');
    } catch (error) {}
  }, [tenants, setField, syncPlatformToCloud, closeModal, showToast]);

  const saveOffer = useCallback((e) => {
    e.preventDefault();
    const currentForm = stateRef.current.formData;
    genericSave('offers', offers, {
      name: currentForm.offerName,
      discountType: currentForm.offerDiscountType || 'percent',
      discountValue: parseFloat(currentForm.offerDiscountValue) || 0,
      productId: currentForm.offerProductId || null,
      category: currentForm.offerCategory || null,
      startDate: currentForm.offerStartDate || null,
      endDate: currentForm.offerEndDate || null,
      isActive: true
    });
  }, [offers, genericSave]);

  // ========== PlayStation Logic ==========
  const startPsSession = useCallback((deviceId) => {
    const device = psDevices.find(d => d.id === deviceId);
    if (!device) return;
    const session = {
      id: `ps_${Date.now()}`, deviceId, deviceName: device.name,
      startTime: Date.now(), startTimeStr: new Date().toLocaleString('ar-EG'),
      status: 'active', cashierName: currentUser.name
    };
    const newSessions = [...psSessions, session];
    setField('psSessions', newSessions);
    syncToCloud({ psSessions: newSessions });
    showToast(`تم بدء جلسة على ${device.name}`, 'success');
  }, [psDevices, psSessions, currentUser, setField, syncToCloud, showToast]);

  const endPsSession = useCallback((sessionId) => {
    const session = psSessions.find(s => s.id === sessionId);
    if (!session) return;
    const device = psDevices.find(d => d.id === session.deviceId);
    if (!device) return;
    const durationMinActual = Math.ceil((Date.now() - session.startTime) / 60000);
    const roundedMin = Math.ceil(durationMinActual / 15) * 15;
    const cost = (roundedMin / 60) * (device.hourlyRate || 0);
    const endedSession = { ...session, endTime: Date.now(), endTimeStr: new Date().toLocaleString('ar-EG'), durationMin: roundedMin, actualMin: durationMinActual, cost, status: 'ended' };
    const newSessions = psSessions.map(s => s.id === sessionId ? endedSession : s);
    setField('psSessions', newSessions);
    let updates = { psSessions: newSessions };
    if (cost > 0) {
      const psOrder = {
        id: Date.now(),
        items: [{ id: 'ps_device', name: `${device.name} - ${roundedMin} دقيقة`, price: cost, quantity: 1 }],
        subtotal: cost, discountAmount: 0, tax: 0, total: cost,
        date: new Date().toLocaleString('ar-EG'), timestamp: Date.now(),
        note: `بلايستيشن - ${device.name}`,
        shiftId: activeShift?.id || null, cashierName: currentUser.name
      };
      const newOrders = [...orders, psOrder];
      setField('orders', newOrders);
      updates.orders = newOrders;
    }
    syncToCloud(updates);
    showToast(`تم إنهاء الجلسة — ${roundedMin} دقيقة (فعلي: ${durationMinActual}) — ${cost.toFixed(2)} ج`, 'success');
  }, [psSessions, psDevices, orders, activeShift, currentUser, setField, syncToCloud, showToast]);

  // ========== POS Logic ==========
  const processOrder = useCallback(() => {
    if (cart.length === 0) { showToast('السلة فارغة', 'error'); return; }
    if (orderType === 'dine_in' && !activeTableId) { showToast('يرجى تحديد الطاولة أولاً!', 'error'); return; }
    if (currentUser.role === 'cashier' && !activeShift) { showToast('يجب استلام عهدة أولاً!', 'error'); return; }
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    if (currentUser.role === 'admin' && discountValue && parseFloat(discountValue) > 0) {
      const val = parseFloat(discountValue);
      discount = discountType === 'percent' ? Math.min(subtotal, subtotal * val / 100) : Math.min(subtotal, val);
    }
    const afterDiscount = subtotal - discount;
    const tax = isTaxEnabled ? afterDiscount * TAX_RATE : 0;
    const total = afterDiscount + tax;
    const newRM = [...rawMaterials];
    cart.forEach(cartItem => {
      const product = products.find(p => p.id === cartItem.id);
      if (product?.recipe) {
        product.recipe.forEach(ing => {
          const idx = newRM.findIndex(rm => rm.id === ing.materialId);
          if (idx !== -1) newRM[idx].currentStock = Math.max(0, newRM[idx].currentStock - (ing.amount * cartItem.quantity));
        });
      }
    });
    const newOrder = {
      id: Date.now(), items: cart, subtotal,
      discountAmount: discount, discountType: discount > 0 ? discountType : null,
      discountValue: discount > 0 ? parseFloat(discountValue) : null,
      tax, total, date: new Date().toLocaleString('ar-EG'), timestamp: Date.now(),
      note: orderType === 'takeaway' ? 'تيك أواي' : `صالة - ${tables.find(t => t.id === activeTableId)?.name || ''}`,
      shiftId: activeShift?.id || null, cashierName: currentUser.name
    };
    const newOrders = [...orders, newOrder];
    let newActiveTableOrders = { ...activeTableOrders };
    if (orderType === 'dine_in' && activeTableId) delete newActiveTableOrders[activeTableId];
    setState({ rawMaterials: newRM, orders: newOrders, activeTableOrders: newActiveTableOrders, cart: [], lastOrder: newOrder, orderType: 'takeaway', activeTableId: null, isMobileCartOpen: false, discountValue: '' });
    syncToCloud({ rawMaterials: newRM, orders: newOrders, activeTableOrders: newActiveTableOrders });
    showToast(`تم إتمام الطلب بقيمة ${total.toFixed(2)} ج`, 'success');
  }, [cart, orderType, activeTableId, currentUser, activeShift, discountValue, discountType, isTaxEnabled, rawMaterials, products, tables, orders, activeTableOrders, setState, syncToCloud, showToast]);

  const holdTableOrder = useCallback(async () => {
    if (isHoldingTable || cart.length === 0 || !activeTableId) return;
    setField('isHoldingTable', true);
    try {
      const newActiveTableOrders = { ...activeTableOrders, [activeTableId]: cart };
      setState({ activeTableOrders: newActiveTableOrders, cart: [], activeTableId: null, orderType: 'takeaway', isMobileCartOpen: false });
      await syncToCloud({ activeTableOrders: newActiveTableOrders });
      showToast('تم حفظ الطلب على الطاولة', 'success');
    } catch (error) { showToast('فشل حفظ الطلب', 'error'); }
    finally { setField('isHoldingTable', false); }
  }, [isHoldingTable, cart, activeTableId, activeTableOrders, setField, setState, syncToCloud, showToast]);

  // ========== Financial Metrics ==========
  const financialMetrics = useMemo(() => {
    const filterByPeriod = (timestamp) => {
      if (!timestamp || reportPeriod === 'all') return true;
      const date = new Date(timestamp);
      const now = new Date();
      switch (reportPeriod) {
        case 'daily': return date.toDateString() === now.toDateString();
        case 'weekly': { const start = new Date(now); start.setDate(now.getDate() - now.getDay()); return date >= start; }
        case 'monthly': return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        case 'quarterly': return Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3) && date.getFullYear() === now.getFullYear();
        case 'semi': { const half = Math.floor(date.getMonth() / 6); return half === Math.floor(now.getMonth() / 6) && date.getFullYear() === now.getFullYear(); }
        case 'yearly': return date.getFullYear() === now.getFullYear();
        default: return true;
      }
    };
    const filteredOrders = orders.filter(o => filterByPeriod(o.timestamp));
    const filteredExpenses = expenses.filter(e => filterByPeriod(new Date(e.date).getTime()));
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    let totalCogs = 0;
    filteredOrders.forEach(o => {
      o.items?.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product?.recipe) {
          product.recipe.forEach(ing => {
            const material = rawMaterials.find(rm => rm.id === ing.materialId);
            if (material) totalCogs += ing.amount * item.quantity * material.costPerUnit;
          });
        }
      });
    });
    return { totalRevenue, totalExpenses, totalCogs, netProfit: totalRevenue - (totalExpenses + totalCogs), orders: filteredOrders, ordersCount: filteredOrders.length };
  }, [orders, expenses, rawMaterials, products, reportPeriod]);

  const handleAuthSuccess = useCallback(async (user) => { await processUserRole(user); }, [processUserRole]);

  // ========== Loading ==========
  if (!isDataLoaded) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900" dir="rtl">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border-4 border-indigo-100 flex items-center justify-center">
            <Coffee className="w-8 h-8 text-indigo-600" />
          </div>
          <Loader2 className="w-20 h-20 animate-spin text-indigo-600 absolute inset-0" />
        </div>
        <p className="font-black text-slate-800 dark:text-white text-lg">جاري تحميل المنصة...</p>
      </div>
    );
  }

  if (location.pathname === '/auth/email-link') {
    return <ErrorBoundary><AuthHandler onLoginSuccess={handleAuthSuccess} /></ErrorBoundary>;
  }

  // ========== NAV ITEMS — used by sidebar ==========
  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={19} />, label: 'لوحة القيادة', roles: ['admin'] },
    { id: 'reports', icon: <FileText size={19} />, label: 'التقارير', roles: ['admin'] },
    { id: 'shifts', icon: <ClipboardList size={19} />, label: 'الورديات', roles: ['admin'] },
    { id: 'inventory', icon: <Package size={19} />, label: 'المواد الخام', roles: ['admin'] },
    { id: 'products', icon: <Coffee size={19} />, label: 'المنتجات', roles: ['admin'] },
    { id: 'offers', icon: <Tag size={19} />, label: 'العروض', roles: ['admin', 'cashier'] }, // <- متاح للكاشير
    { id: 'tables', icon: <Utensils size={19} />, label: 'الصالة', roles: ['admin'] },
    { id: 'playstation', icon: <Gamepad2 size={19} />, label: 'بلايستيشن', roles: ['admin', 'cashier'] }, // <- متاح للكاشير
    { id: 'hr', icon: <Users size={19} />, label: 'الرواتب', roles: ['admin'] },
    { id: 'expenses', icon: <Receipt size={19} />, label: 'المصروفات', roles: ['admin'] },
  ];

  // ========== MAIN RETURN ==========
  return (
    <ErrorBoundary>
      <div className={isDarkMode ? 'dark' : ''}>
        <Toaster />

        {/* Status bar */}
        <div className={`fixed top-0 left-0 right-0 z-[60] text-[10px] md:text-xs font-bold py-1.5 px-3 flex justify-between items-center shadow-md transition-all
          ${!isOnline ? 'bg-rose-600 text-white' : syncStatus === 'error' ? 'bg-rose-600 text-white' :
            syncStatus === 'saving' ? 'bg-amber-500 text-white' : syncStatus === 'success' ? 'bg-emerald-500 text-white' :
            isSyncing ? 'bg-amber-500 text-white' : fbUser ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}`}>
          <div className="flex items-center gap-1.5">
            {!isOnline ? <WifiOff size={13} /> : syncStatus === 'saving' || isSyncing ? <RefreshCw size={13} className="animate-spin" /> : syncStatus === 'error' ? <AlertCircle size={13} /> : <Wifi size={13} />}
            <span className="truncate max-w-[260px]">
              {!isOnline ? 'أوفلاين' : syncStatus === 'error' ? `❌ خطأ: ${syncError}` : syncStatus === 'saving' ? 'جاري الحفظ...' : syncStatus === 'success' ? '✅ تم الحفظ' : isSyncing ? 'جاري المزامنة...' : fbUser ? 'متصل ✓' : 'جاري التحميل...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && lowStockItems.length > 0 && (
              <button onClick={() => setField('currentRoute', 'inventory')} className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                <Bell size={11} /> {lowStockItems.length} مواد منخفضة
              </button>
            )}
            {currentUser && (expiredProducts.length > 0 || nearExpiryProducts.length > 0) && (
              <button onClick={() => setField('currentRoute', 'products')} className="flex items-center gap-1 bg-amber-400/30 px-2 py-0.5 rounded-full">
                <AlertTriangle size={11} /> {expiredProducts.length + nearExpiryProducts.length} صلاحيات
              </button>
            )}
          </div>
          <span className="relative flex h-2 w-2 shrink-0">
            {isOnline && syncStatus !== 'error' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${!isOnline || syncStatus === 'error' ? 'bg-rose-300' : 'bg-white'}`} />
          </span>
        </div>

        {/* ===== LOGIN ===== */}
        {!currentUser ? (
          <div dir="rtl" className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-sans relative overflow-hidden p-4 pt-10">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-indigo-600 z-10 relative">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 dark:bg-indigo-900/50 p-4 rounded-2xl text-indigo-600"><Coffee size={36} /></div>
                  <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">{globalSettings.appName || 'كوفي سحابة'}</h1>
                    <p className="text-slate-500 font-bold text-sm">بوابة النظام الموحدة</p>
                  </div>
                </div>
                <button onClick={() => setField('isDarkMode', !isDarkMode)} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500 hover:text-indigo-600">
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
              <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                <button onClick={() => setState({ currentUser: { role: 'customer' } })} className="w-full bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white font-black py-4 rounded-xl transition-all shadow-sm text-lg flex justify-center items-center gap-2">
                  <Store size={22} /> تصفح المنيو الرقمي (للزبائن)
                </button>
              </div>
              <div className="flex gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
                <button type="button" onClick={() => setField('loginMethod', 'password')} className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors ${loginMethod === 'password' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                  <Lock size={14} className="inline ml-1" /> كلمة المرور
                </button>
                <button type="button" onClick={() => setField('loginMethod', 'emailLink')} className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors ${loginMethod === 'emailLink' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                  <Mail size={14} className="inline ml-1" /> رابط سريع
                </button>
              </div>
              {loginError && loginMethod === 'password' && (
                <div className="mb-5 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-xl flex items-center gap-2 border border-rose-100 dark:border-rose-800">
                  <ShieldAlert size={18} /> {loginError}
                </div>
              )}
              {loginMethod === 'password' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">تسجيل دخول الموظفين</p>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    <input required type="email" placeholder="البريد الإلكتروني" value={loginEmail} onChange={e => { setField('loginEmail', e.target.value); setField('loginError', ''); }} className="w-full p-4 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-bold transition-colors text-sm" dir="ltr" autoComplete="email" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    <input required type="password" placeholder="كلمة المرور" value={loginPassword} onChange={e => { setField('loginPassword', e.target.value); setField('loginError', ''); }} className="w-full p-4 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-bold transition-colors tracking-widest text-left" dir="ltr" autoComplete="current-password" />
                  </div>
                  <button type="submit" disabled={isLoggingIn} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-lg flex items-center justify-center gap-2">
                    {isLoggingIn ? <Loader2 size={20} className="animate-spin" /> : null} تسجيل الدخول
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">أدخل بريدك الإلكتروني وسنرسل لك رابط تسجيل دخول فوري.</p>
                  {emailLinkError && <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={16} /> {emailLinkError}</div>}
                  {emailLinkSent ? (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl text-center border border-emerald-200 dark:border-emerald-800">
                      <Mail className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                      <h3 className="font-black text-lg text-emerald-700 dark:text-emerald-400 mb-2">تم إرسال الرابط!</h3>
                      <p className="text-sm text-emerald-600 dark:text-emerald-300 font-bold">أرسلنا رابط تسجيل الدخول إلى<br /><span dir="ltr" className="text-base mt-1 block">{emailLinkEmail}</span></p>
                      <button onClick={() => setState({ emailLinkSent: false, emailLinkEmail: '', emailLinkError: '', loginMethod: 'password' })} className="mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline">العودة لتسجيل الدخول بكلمة المرور</button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendEmailLink} className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                        <input required type="email" placeholder="البريد الإلكتروني" value={emailLinkEmail} onChange={(e) => { setField('emailLinkEmail', e.target.value); setField('emailLinkError', ''); }} className="w-full p-4 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-bold transition-colors text-sm" dir="ltr" autoComplete="email" />
                      </div>
                      <button type="submit" disabled={emailLinkLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-lg flex items-center justify-center gap-2">
                        {emailLinkLoading ? <><Loader2 size={20} className="animate-spin" /> جاري الإرسال...</> : 'إرسال رابط الدخول'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>

        ) : currentUser.role === 'customer' ? (
          /* ===== CUSTOMER MENU ===== */
          <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-900 w-full overflow-y-auto custom-scrollbar pb-10 pt-7">
            <header className="bg-white dark:bg-slate-800 p-4 md:px-8 shadow-sm sticky top-0 z-30 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
              <h1 className="text-xl md:text-2xl font-black text-indigo-600 flex items-center gap-2"><Coffee /> منيو {globalSettings.appName || 'الكافيه'}</h1>
              <div className="flex items-center gap-3">
                <button onClick={() => setField('isDarkMode', !isDarkMode)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
                <button onClick={() => setState({ currentUser: null })} className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors">دخول الموظفين</button>
              </div>
            </header>
            <div className="p-4 md:px-8 flex gap-2 overflow-x-auto no-scrollbar sticky top-[73px] bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-20 pt-4 pb-3">
              <button onClick={() => setField('selectedCategoryFilter', 'all')} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all ${selectedCategoryFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>الكل</button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setField('selectedCategoryFilter', cat.id)} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all ${selectedCategoryFilter === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>{cat.name}</button>
              ))}
            </div>
            <div className="p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto mt-2">
              {(selectedCategoryFilter === 'all' ? products : products.filter(p => p.category === selectedCategoryFilter)).map(p => {
                const op = getProductPriceWithOffer(p);
                const hasOffer = op < p.price;
                return (
                  <div key={p.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all group flex flex-col relative">
                    {hasOffer && <div className="absolute top-3 left-3 z-10 bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full">عرض خاص!</div>}
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 shrink-0" onError={e => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80'; }} /> : <div className="w-full h-48 bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-300 shrink-0"><Coffee size={60} /></div>}
                    <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                      <h3 className="font-black text-lg text-slate-800 dark:text-white line-clamp-2">{p.name}</h3>
                      <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-3">
                        <div>
                          {hasOffer && <span className="text-slate-400 line-through text-sm ml-2">{p.price} ج</span>}
                          <span className={`font-black text-xl ${hasOffer ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>{op.toFixed(0)} ج.م</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        ) : (
          /* ===== EMPLOYEE INTERFACE (admin / cashier / super_admin) ===== */
          <div dir="rtl" className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 overflow-hidden w-full pt-7">

            {/* ===== SIDEBAR — admin & cashier ===== */}
            {(currentUser.role === 'admin' || currentUser.role === 'cashier') && (
              <>
                {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setField('isMobileMenuOpen', false)} />}
                <div className={`fixed inset-y-0 right-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"} lg:relative lg:translate-x-0 transition-transform duration-300 w-64 md:w-72 bg-white dark:bg-slate-900 flex flex-col shrink-0 pt-7 border-l border-slate-200 dark:border-slate-800 shadow-xl lg:shadow-none`}>
                  <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-black flex items-center gap-2 text-slate-800 dark:text-white"><Coffee className="text-indigo-500" /> {globalSettings.appName}</h2>
                      <p className="text-indigo-600 dark:text-indigo-400 text-xs mt-1 font-bold truncate max-w-[180px]">{currentUser.cafeName}</p>
                    </div>
                    <button onClick={() => setField('isMobileMenuOpen', false)} className="lg:hidden text-slate-500 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><X size={18} /></button>
                  </div>
                  <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.filter(item => item.roles.includes(currentUser?.role)).map(item => (
                      <button key={item.id} onClick={() => { setField('currentRoute', item.id); setField('isMobileMenuOpen', false); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all text-sm ${currentRoute === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-white'}`}>
                        {item.icon} {item.label}
                        {item.id === 'inventory' && lowStockItems.length > 0 && <span className="mr-auto bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{lowStockItems.length}</span>}
                        {item.id === 'products' && expiredProducts.length > 0 && <span className="mr-auto bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{expiredProducts.length}</span>}
                      </button>
                    ))}
                    <button onClick={() => { setField('currentRoute', 'pos'); setField('isMobileMenuOpen', false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold mt-4 border-2 border-indigo-100 dark:border-slate-700 text-sm ${currentRoute === 'pos' ? 'bg-indigo-600 border-indigo-600 text-white' : 'text-indigo-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800'}`}>
                      <ShoppingCart size={19} /> نقطة البيع
                    </button>
                  </nav>
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    {currentUser.role === 'admin' && (
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الضريبة (14%)</span>
                        <button onClick={() => { const v = !isTaxEnabled; setField('isTaxEnabled', v); syncToCloud({ isTaxEnabled: v }); }} className={`w-12 h-6 rounded-full transition-colors relative ${isTaxEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isTaxEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    )}
                    <button onClick={handleLogout} className="w-full flex justify-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white font-bold transition-colors text-sm">
                      <LogOut size={18} /> تسجيل خروج
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
              {/* Header */}
              <header className="p-3 md:p-4 md:px-8 flex justify-between items-center shadow-sm z-30 shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {(currentUser.role === 'admin' || currentUser.role === 'cashier') && (
                    <button onClick={() => setField('isMobileMenuOpen', true)} className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white"><Menu size={19} /></button>
                  )}
                  <h1 className="font-black text-sm md:text-xl truncate max-w-[160px] md:max-w-none text-slate-800 dark:text-white">
                    {currentUser.role === 'super_admin' ? (globalSettings.appName || 'المنصة') : currentUser.role === 'cashier' ? `كاشير — ${currentUser.cafeName}` : currentUser.cafeName}
                  </h1>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  {/* Force Refresh Button for deployment cache issues */}
                  <button onClick={() => window.location.reload(true)} title="تحديث التطبيق (مسح الكاش)" className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-900/40 dark:text-indigo-400 transition-colors flex items-center gap-1">
                    <RefreshCw size={17} />
                    <span className="hidden md:inline text-xs font-bold">تحديث 🔄</span>
                  </button>

                  {currentUser.role === 'cashier' && activeShift && (
                    <button onClick={() => openModal('closeShift')} className="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <Power size={14} /><span className="hidden md:inline">إنهاء الوردية</span>
                    </button>
                  )}
                  <button onClick={() => setField('isDarkMode', !isDarkMode)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white">
                    {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                  </button>
                  <span className="hidden md:block text-sm font-black text-slate-700 dark:text-slate-300">{currentUser.name}</span>
                  {(currentUser.role === 'super_admin' || currentUser.role === 'cashier') && (
                    <button onClick={handleLogout} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 rounded-lg transition-colors"><LogOut size={17} /></button>
                  )}
                </div>
              </header>

              <div className="flex-1 overflow-auto custom-scrollbar relative">
                {/* شجرة عرض المحتوى المنظمة والمحمية من التكرار */}
                {currentUser.role === 'cashier' && !activeShift && activeModal !== 'closeShift' ? (
                  /* ===== CASHIER SHIFT GATE ===== */
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5"><Play className="w-10 h-10" /></div>
                      <h2 className="text-2xl font-black mb-2 dark:text-white">أهلاً بك</h2>
                      <p className="text-slate-500 dark:text-slate-400 mb-7 font-bold text-sm">لتبدأ البيع، يجب فتح شيفت واستلام العهدة.</p>
                      {shifts.filter(s => s.status === 'open').length > 0 && (
                        <div className="mb-5 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-right">
                          <p className="text-xs font-black text-amber-700 dark:text-amber-400 mb-2">⚠️ يوجد شيفت مفتوح لكاشير آخر:</p>
                          {shifts.filter(s => s.status === 'open').map(s => (
                            <p key={s.id} className="text-xs text-amber-600 font-bold">• {s.cashierName} — {s.startTime}</p>
                          ))}
                        </div>
                      )}
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const startingCash = parseFloat(e.target.startingCash.value) || 0;
                        const newShift = {
                          id: 'sh_' + Date.now(),
                          cashierName: currentUser.name.trim(),
                          cafeId: currentUser.cafeId,
                          startTime: new Date().toLocaleString('ar-EG'),
                          timestamp: Date.now(),
                          startingCash,
                          status: 'open'
                        };
                        const newShifts = [...shifts, newShift];
                        setField('shifts', newShifts);
                        syncToCloud({ shifts: newShifts });
                        showToast('تم بدء الوردية بنجاح', 'success');
                      }}>
                        <div className="text-right mb-5">
                          <label className="block text-sm font-black mb-2 dark:text-white">المبلغ الفعلي في الدرج</label>
                          <input required name="startingCash" type="number" min="0" step="any" placeholder="0.00" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center font-black text-2xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-lg text-lg flex items-center justify-center gap-2"><Play size={20} /> بدء الوردية</button>
                      </form>
                    </div>
                  </div>

                ) : currentUser.role === 'super_admin' ? (
                  /* ===== SUPER ADMIN ===== */
                  <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
                    {/* إدارة العملاء */}
                    <div>
                      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-3"><Building2 className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">إدارة المنصة</h2></div>
                        <button onClick={() => setState({ formData: { isNew: true }, activeModal: 'tenant' })} className="flex-1 md:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm"><Plus size={17} /> عميل جديد</button>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-right min-w-[700px]">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-bold">
                              <tr><th className="p-5">كود</th><th className="p-5">الاسم</th><th className="p-5">إيميل المدير</th><th className="p-5">إيميل الكاشير</th><th className="p-5">الانتهاء</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">تحكم</th></tr>
                            </thead>
                            <tbody>
                              {tenants.map(cafe => (
                                <tr key={cafe.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm">
                                  <td className="p-5 font-black text-indigo-600 dark:text-indigo-400">{cafe.id}</td>
                                  <td className="p-5 font-bold text-slate-800 dark:text-white">{cafe.name}</td>
                                  <td className="p-5 text-slate-500 text-xs" dir="ltr">{cafe.adminEmail}</td>
                                  <td className="p-5 text-slate-500 text-xs" dir="ltr">{cafe.cashierEmail}</td>
                                  <td className="p-5 text-slate-600 dark:text-slate-300">{cafe.subscriptionEnds}</td>
                                  <td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-xl text-xs font-black ${cafe.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{cafe.status === 'active' ? 'نشط' : 'موقوف'}</span></td>
                                  <td className="p-5 text-center flex justify-center gap-2">
                                    <button onClick={() => { const newTenants = tenants.map(t => t.id === cafe.id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t); setField('tenants', newTenants); syncPlatformToCloud({ tenants: newTenants }); }} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 px-4 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-white">تبديل</button>
                                    <button onClick={() => setState({ formData: cafe, activeModal: 'tenant' })} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-1.5 rounded-xl text-xs font-bold">تعديل</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* رفع المنيو لكافيه */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20">
                        <Coffee className="text-indigo-600 w-6 h-6" />
                        <h3 className="font-black text-xl text-slate-800 dark:text-white">رفع المنيو والمواد الخام لكافيه</h3>
                      </div>
                      <div className="p-6">
                        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">
                          <p className="font-black text-amber-800 dark:text-amber-300 text-sm">📋 خطوات الرفع:</p>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">١. اختر الكافيه المستهدف</p>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">٢. الصق بيانات المواد الخام بصيغة JSON (اختياري)</p>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">٣. الصق بيانات المنتجات بصيغة JSON (مع الريسيبي)</p>
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">٤. اضغط رفع — سيتم الحفظ مباشرة في Firebase</p>
                        </div>

                        {(() => {
                          const uploadCafeId = formData._uploadCafeId || '';
                          const uploadMaterials = formData._uploadMaterials || '';
                          const uploadProducts = formData._uploadProducts || '';
                          const uploadStatus = formData._uploadStatus || '';
                          const uploadError = formData._uploadError || '';

                          const handleUpload = async () => {
                            if (!uploadCafeId) { setState({ formData: { ...stateRef.current.formData, _uploadError: 'يجب اختيار الكافيه أولاً' } }); return; }
                            if (!uploadMaterials && !uploadProducts) { setState({ formData: { ...stateRef.current.formData, _uploadError: 'يجب إدخال مواد خام أو منتجات على الأقل' } }); return; }

                            setState({ formData: { ...stateRef.current.formData, _uploadStatus: 'uploading', _uploadError: '' } });

                            try {
                              let parsedMaterials = null;
                              let parsedProducts = null;

                              if (uploadMaterials.trim()) {
                                try {
                                  parsedMaterials = JSON.parse(uploadMaterials.trim());
                                  if (!Array.isArray(parsedMaterials)) throw new Error('يجب أن تكون مصفوفة []');
                                  parsedMaterials.forEach((rm, i) => {
                                    if (!rm.id) rm.id = `rm_${Date.now()}_${i}`;
                                    if (!rm.name) throw new Error(`المادة ${i+1}: حقل name مطلوب`);
                                    if (!rm.unit) rm.unit = 'جرام';
                                    if (rm.currentStock === undefined) rm.currentStock = 0;
                                    if (rm.costPerUnit === undefined) rm.costPerUnit = 0;
                                  });
                                } catch (e) {
                                  throw new Error(`خطأ في JSON المواد الخام: ${e.message}`);
                                }
                              }

                              if (uploadProducts.trim()) {
                                try {
                                  parsedProducts = JSON.parse(uploadProducts.trim());
                                  if (!Array.isArray(parsedProducts)) throw new Error('يجب أن تكون مصفوفة []');
                                  parsedProducts.forEach((p, i) => {
                                    if (!p.id) p.id = `prod_${Date.now()}_${i}`;
                                    if (!p.name) throw new Error(`المنتج ${i+1}: حقل name مطلوب`);
                                    if (!p.price) throw new Error(`المنتج ${i+1}: حقل price مطلوب`);
                                    if (!p.category) p.category = 'عام';
                                    if (!p.recipe) p.recipe = [];
                                  });
                                } catch (e) {
                                  throw new Error(`خطأ في JSON المنتجات: ${e.message}`);
                                }
                              }

                              const updateData = {};
                              if (parsedMaterials) updateData.rawMaterials = parsedMaterials;
                              if (parsedProducts) updateData.products = parsedProducts;
                              updateData.lastUpdated = new Date().toISOString();

                              await setDoc(doc(db, 'coffee_erp_cafes', uploadCafeId), updateData, { merge: true });

                              setState({ formData: {
                                ...stateRef.current.formData,
                                _uploadStatus: 'success',
                                _uploadError: '',
                                _uploadMaterials: '',
                                _uploadProducts: ''
                              }});
                              showToast(`✅ تم الرفع بنجاح`, 'success');

                            } catch (err) {
                              setState({ formData: { ...stateRef.current.formData, _uploadStatus: 'error', _uploadError: err.message } });
                            }
                          };

                          return (
                            <div className="space-y-5">
                              <div>
                                <label className="block text-sm font-black mb-2 text-slate-700 dark:text-slate-300">الكافيه المستهدف</label>
                                <select
                                  value={uploadCafeId}
                                  onChange={e => setState({ formData: { ...stateRef.current.formData, _uploadCafeId: e.target.value, _uploadStatus: '', _uploadError: '' } })}
                                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                                >
                                  <option value="">— اختر كافيه —</option>
                                  {tenants.filter(t => t.status === 'active').map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-black mb-2 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                  <Package size={15} className="text-indigo-500" /> المواد الخام (JSON) — اختياري
                                </label>
                                <textarea
                                  value={uploadMaterials}
                                  onChange={e => setState({ formData: { ...stateRef.current.formData, _uploadMaterials: e.target.value, _uploadStatus: '', _uploadError: '' } })}
                                  placeholder='[{"id":"rm_1","name":"قهوة","unit":"جرام","currentStock":1000,"costPerUnit":0.5}]'
                                  rows={5}
                                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 resize-y"
                                  dir="ltr"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-black mb-2 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                  <Coffee size={15} className="text-indigo-500" /> المنتجات والريسيبي (JSON) — اختياري
                                </label>
                                <textarea
                                  value={uploadProducts}
                                  onChange={e => setState({ formData: { ...stateRef.current.formData, _uploadProducts: e.target.value, _uploadStatus: '', _uploadError: '' } })}
                                  placeholder='[{"name":"قهوة تركي","category":"قهوة","price":25,"recipe":[{"materialId":"rm_1","amount":15}]}]'
                                  rows={7}
                                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 resize-y"
                                  dir="ltr"
                                />
                              </div>

                              {uploadError && (
                                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3">
                                  <AlertCircle className="text-rose-500 w-5 h-5 shrink-0 mt-0.5" />
                                  <p className="text-rose-700 dark:text-rose-400 text-sm font-bold">{uploadError}</p>
                                </div>
                              )}

                              {uploadStatus === 'success' && (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
                                  <Wifi className="text-emerald-500 w-5 h-5" />
                                  <p className="text-emerald-700 dark:text-emerald-400 text-sm font-black">✅ تم الرفع بنجاح!</p>
                                </div>
                              )}

                              <button
                                onClick={handleUpload}
                                disabled={uploadStatus === 'uploading' || !uploadCafeId}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg transition-colors"
                              >
                                {uploadStatus === 'uploading' ? (
                                  <><Loader2 size={20} className="animate-spin" /> جاري الرفع...</>
                                ) : (
                                  <><Upload size={20} /> رفع المنيو للكافيه</>
                                )}
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                ) : currentRoute === 'pos' ? (
                  /* ===== POS ===== */
                  <div className="flex flex-col lg:flex-row h-full p-2 md:p-4 lg:p-6 gap-4 lg:gap-6 overflow-hidden relative">
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden pb-16 lg:pb-0">
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 w-fit">
                        <button onClick={() => { setField('orderType', 'takeaway'); setField('activeTableId', null); }} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${orderType === 'takeaway' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'}`}>تيك أواي</button>
                        <button onClick={() => setField('orderType', 'dine_in')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${orderType === 'dine_in' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'}`}>صالة</button>
                      </div>
                      {orderType === 'dine_in' && !activeTableId && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                          {tables.map(t => {
                            const tableItems = activeTableOrders[t.id];
                            const isOccupied = Array.isArray(tableItems) && tableItems.length > 0;
                            return (
                              <button key={t.id} onClick={() => { setField('activeTableId', t.id); setField('cart', Array.isArray(activeTableOrders[t.id]) ? activeTableOrders[t.id] : []); }}
                                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${isOccupied ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 hover:border-indigo-400 text-slate-700 dark:text-slate-300'}`}>
                                <Armchair className="w-7 h-7" /><span className="font-black text-xs line-clamp-1">{t.name}</span>
                                {isOccupied && <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">{tableItems.length} صنف</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        <button onClick={() => setField('selectedCategoryFilter', 'all')} className={`whitespace-nowrap px-5 py-2 rounded-xl font-bold text-sm transition-all ${selectedCategoryFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>الكل</button>
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => setField('selectedCategoryFilter', cat.id)} className={`whitespace-nowrap px-5 py-2 rounded-xl font-bold text-sm transition-all ${selectedCategoryFilter === cat.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{cat.name}</button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 custom-scrollbar">
                        {(selectedCategoryFilter === 'all' ? products : products.filter(p => p.category === selectedCategoryFilter)).map(p => {
                          const op = getProductPriceWithOffer(p);
                          const hasOffer = op < p.price;
                          return (
                            <button key={p.id} onClick={() => {
                              if (orderType === 'dine_in' && !activeTableId) { showToast('الرجاء اختيار طاولة', 'error'); return; }
                              const existing = cart.find(i => i.id === p.id);
                              if (existing) setField('cart', cart.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
                              else setField('cart', [...cart, { ...p, price: op, originalPrice: p.price, quantity: 1 }]);
                            }} className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group relative">
                              {hasOffer && <div className="absolute top-2 right-2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">عرض</div>}
                              {p.image ? <img src={p.image} alt={p.name} className="w-16 h-16 rounded-full object-cover shadow-sm group-hover:scale-110 transition-transform border-2 border-indigo-50 dark:border-slate-700" onError={e => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80'; }} /> : <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-full flex items-center justify-center"><Coffee className="w-7 h-7" /></div>}
                              <h3 className="font-bold text-xs leading-tight line-clamp-2 text-slate-800 dark:text-white">{p.name}</h3>
                              <div>{hasOffer && <div className="text-slate-400 line-through text-[10px]">{p.price} ج</div>}<p className={`font-black text-xs ${hasOffer ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>{op.toFixed(0)} ج.م</p></div>
                            </button>
                          );
                        })}
                        {products.length === 0 && <div className="col-span-full mt-10 text-center text-slate-400"><Coffee className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="font-bold text-sm">لا توجد منتجات مضافة بعد</p></div>}
                      </div>
                    </div>
                    {/* Mobile bottom bar */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 p-3 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 flex justify-between items-center">
                      <div className="font-black text-base text-indigo-600 dark:text-indigo-400">
                        {(() => { const sub = cart.reduce((x, i) => x + (i.price * i.quantity), 0); const dv = parseFloat(discountValue) || 0; const d = currentUser.role === 'admin' && dv > 0 ? (discountType === 'percent' ? Math.min(sub, sub * dv / 100) : Math.min(sub, dv)) : 0; return ((sub - d) * (isTaxEnabled ? 1.14 : 1)).toFixed(2); })()} ج
                      </div>
                      <button onClick={() => setField('isMobileCartOpen', true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg"><ShoppingCart size={17} /> السلة ({cart.length})</button>
                    </div>
                    {/* Cart panel */}
                    <div className={`w-full lg:w-[350px] xl:w-[420px] bg-white dark:bg-slate-800 rounded-t-3xl lg:rounded-3xl shadow-2xl lg:shadow-md border border-slate-200 dark:border-slate-700 flex flex-col h-[85vh] lg:h-full fixed lg:relative bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
                      <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded-t-3xl flex justify-between items-center shrink-0">
                        <h3 className="font-black text-lg flex items-center gap-2 text-slate-800 dark:text-white"><ShoppingCart className="text-indigo-500 w-5 h-5" /> السلة {activeTableId && <span className="text-indigo-600 text-xs bg-indigo-100 px-2 py-1 rounded-lg">{tables.find(t => t.id === activeTableId)?.name}</span>}</h3>
                        <div className="flex gap-2">
                          {activeTableId && <button onClick={() => { setField('cart', []); setField('activeTableId', null); setField('isMobileCartOpen', false); }} className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">إلغاء</button>}
                          <button className="lg:hidden text-slate-400 bg-slate-200 dark:bg-slate-700 p-1.5 rounded-lg" onClick={() => setField('isMobileCartOpen', false)}><X size={17} /></button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
                        {cart.length === 0 ? (
                          <div className="text-center text-slate-400 mt-20"><Package className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-bold text-sm">السلة فارغة</p></div>
                        ) : cart.map(item => (
                          <div key={item.id} className="bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-600 flex justify-between items-center">
                            <div className="flex gap-2.5 items-center">
                              {item.image ? <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover shadow-sm" onError={e => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80'; }} /> : <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 text-indigo-500 rounded-xl flex items-center justify-center"><Coffee size={14} /></div>}
                              <div><p className="font-bold text-slate-800 dark:text-white text-xs mb-0.5 line-clamp-1 max-w-[130px]">{item.name}</p><p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{(item.price * item.quantity).toFixed(2)} ج</p></div>
                            </div>
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                              <button onClick={() => setField('cart', cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} className="text-emerald-500 p-1 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg"><Plus size={13} /></button>
                              <span className="font-black w-5 text-center text-xs text-slate-800 dark:text-white">{item.quantity}</span>
                              <button onClick={() => { if (item.quantity > 1) setField('cart', cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)); else setField('cart', cart.filter(i => i.id !== item.id)); }} className="text-rose-500 p-1 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg"><Minus size={13} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 lg:rounded-b-3xl shrink-0">
                        {currentUser.role === 'admin' && cart.length > 0 && (
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                            <p className="text-xs font-black text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5"><Receipt size={13} /> خصم (صلاحية المدير)</p>
                            <div className="flex gap-2">
                              <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 p-0.5 shrink-0">
                                <button type="button" onClick={() => setField('discountType', 'percent')} className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${discountType === 'percent' ? 'bg-amber-500 text-white' : 'text-amber-600 dark:text-amber-400'}`}>%</button>
                                <button type="button" onClick={() => setField('discountType', 'fixed')} className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${discountType === 'fixed' ? 'bg-amber-500 text-white' : 'text-amber-600 dark:text-amber-400'}`}>ج</button>
                              </div>
                              <input type="number" min="0" step="any" value={discountValue} onChange={e => setField('discountValue', e.target.value)} placeholder={discountType === 'percent' ? 'نسبة %' : 'مبلغ'} className="flex-1 p-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 outline-none focus:border-amber-500 text-center" />
                              {discountValue && <button type="button" onClick={() => setField('discountValue', '')} className="p-2 bg-white dark:bg-slate-800 border border-amber-200 rounded-xl text-amber-500 hover:bg-amber-100"><X size={14} /></button>}
                            </div>
                          </div>
                        )}
                        {(() => {
                          const sub = cart.reduce((x, i) => x + (i.price * i.quantity), 0);
                          const dv = parseFloat(discountValue) || 0;
                          const d = currentUser.role === 'admin' && dv > 0 ? (discountType === 'percent' ? Math.min(sub, sub * dv / 100) : Math.min(sub, dv)) : 0;
                          const after = sub - d;
                          const tax = isTaxEnabled ? after * TAX_RATE : 0;
                          const total = after + tax;
                          return (
                            <div className="space-y-1.5 mb-4">
                              <div className="flex justify-between text-sm font-bold text-slate-500"><span>المجموع:</span><span>{sub.toFixed(2)} ج</span></div>
                              {d > 0 && <div className="flex justify-between text-sm font-black text-emerald-600"><span>الخصم:</span><span>- {d.toFixed(2)} ج</span></div>}
                              {isTaxEnabled && <div className="flex justify-between text-sm font-bold text-slate-500"><span>ضريبة 14%:</span><span>{tax.toFixed(2)} ج</span></div>}
                              <div className="flex justify-between items-center font-black text-2xl pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"><span>الإجمالي:</span><span className="text-indigo-600 dark:text-indigo-400">{total.toFixed(2)} ج</span></div>
                            </div>
                          );
                        })()}
                        {orderType === 'dine_in' && activeTableId ? (
                          <div className="flex gap-3">
                            <button onClick={holdTableOrder} disabled={cart.length === 0 || isHoldingTable} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-white text-sm ${isHoldingTable ? 'bg-amber-400 cursor-wait' : 'bg-amber-500 hover:bg-amber-600'}`}>
                              {isHoldingTable ? <><RefreshCw size={15} className="animate-spin" /> جاري...</> : <><Save size={17} /> حفظ</>}
                            </button>
                            <button onClick={processOrder} disabled={cart.length === 0} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm"><Banknote size={17} /> دفع</button>
                          </div>
                        ) : (
                          <button onClick={processOrder} disabled={cart.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-lg"><Banknote className="w-5 h-5" /> دفع وإصدار فاتورة</button>
                        )}
                      </div>
                    </div>
                    {isMobileCartOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm" onClick={() => setField('isMobileCartOpen', false)} />}
                  </div>

                ) : currentRoute === 'dashboard' && currentUser.role === 'admin' ? (
                  /* ===== DASHBOARD ===== */
                  <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white">الملخص العام</h2>
                      <div className="flex gap-1.5 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto no-scrollbar w-fit">
                        {['daily', 'weekly', 'monthly', 'quarterly', 'semi', 'yearly', 'all'].map(p => (
                          <button key={p} onClick={() => setField('reportPeriod', p)} className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-colors ${reportPeriod === p ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            {p === 'daily' ? 'يوم' : p === 'weekly' ? 'أسبوع' : p === 'monthly' ? 'شهر' : p === 'quarterly' ? 'ربع سنوي' : p === 'semi' ? 'نصف سنوي' : p === 'yearly' ? 'سنة' : 'الكل'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden"><div className="absolute -left-4 -top-4 text-emerald-50 dark:text-slate-700/50"><TrendingUp size={100} /></div><div className="relative z-10"><p className="text-slate-500 text-sm font-bold mb-2">المبيعات</p><p className="text-4xl font-black text-emerald-600">{financialMetrics.totalRevenue.toFixed(2)} ج</p></div></div>
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm"><p className="text-slate-500 text-sm font-bold mb-2">المصروفات</p><p className="text-4xl font-black text-rose-600">{financialMetrics.totalExpenses.toFixed(2)} ج</p></div>
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm"><p className="text-slate-500 text-sm font-bold mb-2">تكلفة الخامات</p><p className="text-4xl font-black text-amber-500">{financialMetrics.totalCogs.toFixed(2)} ج</p></div>
                      <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden"><div className="absolute -left-4 -top-4 text-indigo-500/50"><Wallet size={80} /></div><div className="relative z-10"><p className="text-indigo-200 text-sm font-bold mb-2">الربح الصافي</p><p className="text-4xl font-black">{financialMetrics.netProfit.toFixed(2)} ج</p></div></div>
                    </div>
                    {(lowStockItems.length > 0 || expiredProducts.length > 0 || nearExpiryProducts.length > 0) && (
                      <div className="space-y-3">
                        {lowStockItems.length > 0 && <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-start gap-3"><Bell className="text-rose-500 shrink-0 mt-0.5 w-5 h-5" /><div><p className="font-black text-rose-700 dark:text-rose-400 text-sm mb-1">⚠️ مواد خام منخفضة ({lowStockItems.length})</p><p className="text-rose-600 dark:text-rose-300 text-xs font-bold">{lowStockItems.map(rm => `${rm.name} (${rm.currentStock} ${rm.unit})`).join('  •  ')}</p></div></div>}
                        {expiredProducts.length > 0 && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3"><AlertCircle className="text-red-500 shrink-0 mt-0.5 w-5 h-5" /><div><p className="font-black text-red-700 dark:text-red-400 text-sm mb-1">🚫 منتجات منتهية ({expiredProducts.length})</p><p className="text-red-600 dark:text-red-300 text-xs font-bold">{expiredProducts.map(p => p.name).join('  •  ')}</p></div></div>}
                        {nearExpiryProducts.length > 0 && <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3"><AlertTriangle className="text-amber-500 shrink-0 mt-0.5 w-5 h-5" /><div><p className="font-black text-amber-700 dark:text-amber-400 text-sm mb-1">⏰ تنتهي قريباً ({nearExpiryProducts.length})</p><p className="text-amber-600 dark:text-amber-300 text-xs font-bold">{nearExpiryProducts.map(p => `${p.name} (${p.expiryDate})`).join('  •  ')}</p></div></div>}
                      </div>
                    )}
                  </div>

                ) : currentRoute === 'reports' && currentUser.role === 'admin' ? (
                  /* ===== REPORTS ===== */
                  <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
                    <div className="flex items-center gap-3 mb-2"><FileText className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">التقارير والتصدير</h2></div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                      <h3 className="font-black text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2"><Calendar size={18} /> الفترة الزمنية</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                        {[{ v: 'daily', l: 'يومي' }, { v: 'weekly', l: 'أسبوعي' }, { v: 'monthly', l: 'شهري' }, { v: 'quarterly', l: 'ربع سنوي' }, { v: 'semi', l: 'نصف سنوي' }, { v: 'yearly', l: 'سنوي' }].map(p => (
                          <button key={p.v} onClick={() => setField('reportPeriod', p.v)} className={`py-3 rounded-xl font-bold text-sm transition-all ${reportPeriod === p.v ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-50'}`}>{p.l}</button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center"><p className="text-2xl font-black text-emerald-600">{financialMetrics.totalRevenue.toFixed(2)} ج</p><p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">المبيعات</p></div>
                        <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl text-center"><p className="text-2xl font-black text-rose-600">{financialMetrics.totalExpenses.toFixed(2)} ج</p><p className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-1">المصروفات</p></div>
                        <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-2xl text-center"><p className="text-2xl font-black text-slate-700 dark:text-white">{financialMetrics.ordersCount}</p><p className="text-xs font-bold text-slate-500 mt-1">الطلبات</p></div>
                        <div className={`p-4 rounded-2xl text-center ${financialMetrics.netProfit >= 0 ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}><p className={`text-2xl font-black ${financialMetrics.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{financialMetrics.netProfit.toFixed(2)} ج</p><p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mt-1">صافي الربح</p></div>
                      </div>
                      <button onClick={() => exportReportPDF('تقرير', { orders: financialMetrics.orders, totalRevenue: financialMetrics.totalRevenue, totalExpenses: financialMetrics.totalExpenses, netProfit: financialMetrics.netProfit, ordersCount: financialMetrics.ordersCount }, reportPeriod, currentUser.cafeName)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg text-lg transition-colors">
                        <Download size={20} /> تصدير PDF
                      </button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-100 dark:border-slate-700"><h3 className="font-black text-lg text-slate-800 dark:text-white">تفاصيل المعاملات</h3></div>
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[700px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm">
                            <tr><th className="p-4">التاريخ</th><th className="p-4">الكاشير</th><th className="p-4">النوع</th><th className="p-4">الأصناف</th><th className="p-4 text-center">الخصم</th><th className="p-4 text-center">الإجمالي</th></tr>
                          </thead>
                          <tbody>
                            {[...financialMetrics.orders].reverse().slice(0, 50).map(o => (
                              <tr key={o.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm">
                                <td className="p-4 text-slate-500 text-xs">{o.date}</td>
                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300 text-xs">{o.cashierName || '—'}</td>
                                <td className="p-4"><span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 px-2 py-1 rounded-lg text-xs font-bold">{o.note || 'تيك أواي'}</span></td>
                                <td className="p-4 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{(o.items || []).map(it => it.name).join('، ')}</td>
                                <td className="p-4 text-center text-xs font-bold text-emerald-600">{o.discountAmount > 0 ? `-${o.discountAmount.toFixed(2)} ج` : '—'}</td>
                                <td className="p-4 text-center font-black text-indigo-600 dark:text-indigo-400">{o.total.toFixed(2)} ج</td>
                              </tr>
                            ))}
                            {financialMetrics.orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold">لا توجد معاملات</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                ) : currentRoute === 'shifts' && currentUser.role === 'admin' ? (
                  /* ===== SHIFTS ===== */
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-8"><ClipboardList className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">سجل الورديات</h2></div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[900px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm">
                            <tr><th className="p-5">الموظف</th><th className="p-5">البداية</th><th className="p-5">النهاية</th><th className="p-5 text-center">العهدة</th><th className="p-5 text-center">المبيعات</th><th className="p-5 text-center">الدرج الفعلي</th><th className="p-5 text-center">العجز/الزيادة</th><th className="p-5 text-center">الحالة</th></tr>
                          </thead>
                          <tbody>
                            {[...(shifts || [])].reverse().map(shift => {
                              const ss = orders.filter(o => o.shiftId === shift.id).reduce((s, o) => s + o.total, 0);
                              const exp = (shift.startingCash || 0) + ss;
                              const v = shift.status === 'closed' ? ((shift.actualCash || 0) - exp) : 0;
                              return (
                                <tr key={shift.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm">
                                  <td className="p-5 font-bold text-slate-800 dark:text-white flex items-center gap-2"><Users size={15} className="text-indigo-400" />{shift.cashierName}</td>
                                  <td className="p-5 text-xs text-slate-600 dark:text-slate-400">{shift.startTime}</td>
                                  <td className="p-5 text-xs text-slate-600 dark:text-slate-400">{shift.endTime || '---'}</td>
                                  <td className="p-5 text-center font-bold">{shift.startingCash} ج</td>
                                  <td className="p-5 text-center font-black text-indigo-600 dark:text-indigo-400">{ss.toFixed(2)} ج</td>
                                  <td className="p-5 text-center font-bold">{shift.actualCash !== undefined ? `${shift.actualCash} ج` : '---'}</td>
                                  <td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-lg text-xs font-black ${v < 0 ? 'bg-rose-100 text-rose-700' : v > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{v < 0 ? `عجز ${Math.abs(v).toFixed(2)}` : v > 0 ? `زيادة ${v.toFixed(2)}` : 'مضبوط'}</span></td>
                                  <td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-lg text-xs font-black ${shift.status === 'open' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{shift.status === 'open' ? 'مفتوح' : 'مغلق'}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                ) : currentRoute === 'inventory' && currentUser.role === 'admin' ? (
                  /* ===== INVENTORY ===== */
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Package className="text-indigo-500 w-8 h-8" /> المواد الخام</h2>
                      <button onClick={() => openModal('material')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17} /> مادة جديدة</button>
                    </div>
                    {lowStockItems.length > 0 && <div className="mb-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3"><Bell className="text-rose-500 shrink-0 w-5 h-5" /><p className="text-rose-700 dark:text-rose-400 font-black text-sm">تنبيه: {lowStockItems.length} مادة وصلت للحد الأدنى!</p></div>}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[650px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 text-sm">
                            <tr>
                              <th className="p-4">المادة</th>
                              <th className="p-4">الوحدة</th>
                              <th className="p-4 text-center">الكمية الحالية</th>
                              <th className="p-4 text-center">تعديل الكمية</th>
                              <th className="p-4 text-center">التكلفة/وحدة</th>
                              <th className="p-4 text-center">حذف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rawMaterials.map(rm => (
                              <tr key={rm.id} className={`border-b border-slate-100 dark:border-slate-700 text-sm ${rm.currentStock <= STOCK_ALERT_THRESHOLD ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
                                <td className="p-4 font-black text-slate-800 dark:text-white">
                                  <div className="flex items-center gap-2">
                                    {rm.currentStock <= STOCK_ALERT_THRESHOLD && <Bell size={13} className="text-rose-500 shrink-0" />}
                                    {rm.name}
                                  </div>
                                </td>
                                <td className="p-4 text-slate-500 dark:text-slate-400 font-bold">{rm.unit}</td>
                                <td className="p-4 text-center">
                                  <span className={`px-3 py-1.5 rounded-xl font-black text-xs ${rm.currentStock <= 0 ? 'bg-red-100 text-red-700' : rm.currentStock <= STOCK_ALERT_THRESHOLD ? 'bg-rose-100 text-rose-700' : rm.currentStock < 500 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {rm.currentStock}
                                  </span>
                                </td>
                                <td className="p-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => {
                                        const newStock = Math.max(0, (rm.currentStock || 0) - 1);
                                        const newArr = rawMaterials.map(r => r.id === rm.id ? { ...r, currentStock: newStock } : r);
                                        setField('rawMaterials', newArr);
                                        syncToCloud({ rawMaterials: newArr });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center font-black transition-colors text-sm"
                                    >−</button>
                                    
                                    <div className="w-20">
                                      <InlineSafeInput
                                        value={rm.currentStock}
                                        onSave={v => {
                                          const newArr = rawMaterials.map(r => r.id === rm.id ? { ...r, currentStock: Math.max(0, v) } : r);
                                          setField('rawMaterials', newArr);
                                          syncToCloud({ rawMaterials: newArr });
                                        }}
                                        colorClass="text-indigo-600 focus:border-indigo-500 border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-700 text-center font-black"
                                      />
                                    </div>

                                    <button
                                      onClick={() => {
                                        const newStock = (rm.currentStock || 0) + 1;
                                        const newArr = rawMaterials.map(r => r.id === rm.id ? { ...r, currentStock: newStock } : r);
                                        setField('rawMaterials', newArr);
                                        syncToCloud({ rawMaterials: newArr });
                                      }}
                                      className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center font-black transition-colors text-sm"
                                    >+</button>
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <InlineSafeInput
                                    value={rm.costPerUnit}
                                    onSave={v => {
                                      const newArr = rawMaterials.map(r => r.id === rm.id ? { ...r, costPerUnit: v } : r);
                                      setField('rawMaterials', newArr);
                                      syncToCloud({ rawMaterials: newArr });
                                    }}
                                    colorClass="text-indigo-600 focus:border-indigo-500 border-indigo-100 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800"
                                  />
                                </td>
                                <td className="p-4 text-center">
                                  <button onClick={() => setState({ deleteConfig: { type: 'material', id: rm.id }, activeModal: 'delete' })} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"><Trash2 size={15} /></button>
                                </td>
                              </tr>
                            ))}
                            {rawMaterials.length === 0 && (
                              <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold">لا توجد مواد خام مضافة بعد</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                ) : currentRoute === 'products' && currentUser.role === 'admin' ? (
                  /* ===== PRODUCTS ===== */
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Coffee className="text-indigo-500 w-8 h-8" /> المنتجات</h2>
                      <button onClick={() => openModal('product')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17} /> منتج جديد</button>
                    </div>
                    {(expiredProducts.length > 0 || nearExpiryProducts.length > 0) && (
                      <div className="mb-6 space-y-3">
                        {expiredProducts.length > 0 && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3"><AlertCircle className="text-red-500 w-5 h-5 shrink-0" /><p className="text-red-700 dark:text-red-400 font-black text-sm">🚫 منتهية: {expiredProducts.map(p => p.name).join('، ')}</p></div>}
                        {nearExpiryProducts.length > 0 && <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3"><AlertTriangle className="text-amber-500 w-5 h-5 shrink-0" /><p className="text-amber-700 dark:text-amber-400 font-black text-sm">⏰ تنتهي قريباً: {nearExpiryProducts.map(p => `${p.name} (${p.expiryDate})`).join('، ')}</p></div>}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {products.map(p => {
                        const isExp = p.expiryDate && new Date(p.expiryDate) <= new Date();
                        const isNear = p.expiryDate && !isExp && new Date(p.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                        return (
                          <div key={p.id} className={`bg-white dark:bg-slate-800 p-5 rounded-3xl border-2 shadow-sm ${isExp ? 'border-red-300 dark:border-red-700' : isNear ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex justify-between mb-4">
                              <div className="flex items-center gap-3">
                                {p.image ? <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover shadow-sm" onError={e => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80'; }} /> : <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 flex items-center justify-center"><Coffee size={19} /></div>}
                                <div><h3 className="font-black text-base text-slate-800 dark:text-white line-clamp-1">{p.name}</h3>{p.expiryDate && <p className={`text-[10px] font-bold mt-0.5 ${isExp ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-slate-400'}`}>{isExp ? '🚫 منتهي' : isNear ? '⏰ ينتهي قريباً' : '✓ صالح'} — {p.expiryDate}</p>}</div>
                              </div>
                              <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-xl font-black h-fit text-sm">{p.price} ج</span>
                            </div>
                            <div className="space-y-1.5 mb-4">{p.recipe?.map((r, i) => <div key={i} className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl flex justify-between border border-slate-100 dark:border-slate-600"><span>{rawMaterials.find(rm => rm.id === r.materialId)?.name}</span><span className="text-indigo-600 dark:text-indigo-400">{r.amount} {rawMaterials.find(rm => rm.id === r.materialId)?.unit}</span></div>)}</div>
                            <button onClick={() => setState({ deleteConfig: { type: 'product', id: p.id }, activeModal: 'delete' })} className="text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 p-2.5 rounded-xl transition-colors"><Trash2 size={15} /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                ) : currentRoute === 'offers' && (currentUser.role === 'admin' || currentUser.role === 'cashier') ? (
                  /* ===== OFFERS — admin + cashier (cashier: read only) ===== */
                  <div className="p-4 md:p-8 max-w-6xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Tag className="text-indigo-500 w-8 h-8" /> العروض والخصومات</h2>
                      {currentUser.role === 'admin' && (
                        <button onClick={() => openModal('offer')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17} /> عرض جديد</button>
                      )}
                    </div>
                    {(() => {
                      const visibleOffers = currentUser.role === 'admin' ? offers : offers.filter(o => o.isActive);
                      if (visibleOffers.length === 0) {
                        return <div className="text-center py-20 text-slate-400"><Gift className="w-20 h-20 mx-auto mb-4 opacity-20" /><p className="font-bold text-lg">لا توجد عروض فعالة</p></div>;
                      }
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {visibleOffers.map(offer => {
                            const today = new Date();
                            const isAct = offer.isActive && (!offer.endDate || new Date(offer.endDate) >= today) && (!offer.startDate || new Date(offer.startDate) <= today);
                            return (
                              <div key={offer.id} className={`bg-white dark:bg-slate-800 p-5 rounded-3xl border-2 shadow-sm ${isAct ? 'border-emerald-300 dark:border-emerald-700' : 'border-slate-200 dark:border-slate-700 opacity-60'}`}>
                                <div className="flex justify-between items-start mb-3"><h3 className="font-black text-lg text-slate-800 dark:text-white">{offer.name}</h3><span className={`px-3 py-1 rounded-xl text-xs font-black ${isAct ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{isAct ? 'مفعّل' : 'منتهي'}</span></div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span className="text-slate-500 font-bold">الخصم:</span><span className="font-black text-rose-600">{offer.discountValue}{offer.discountType === 'percent' ? '%' : ' ج'}</span></div>
                                  {offer.productId && <div className="flex justify-between"><span className="text-slate-500 font-bold">المنتج:</span><span className="font-bold text-indigo-600">{products.find(p => p.id == offer.productId)?.name}</span></div>}
                                  {offer.category && <div className="flex justify-between"><span className="text-slate-500 font-bold">الفئة:</span><span className="font-bold text-indigo-600">{offer.category}</span></div>}
                                  {offer.endDate && <div className="flex justify-between"><span className="text-slate-500 font-bold">حتى:</span><span className="font-bold">{offer.endDate}</span></div>}
                                </div>
                                {currentUser.role === 'admin' && (
                                  <div className="flex gap-2 mt-4">
                                    <button onClick={() => { const newOffers = offers.map(o => o.id === offer.id ? { ...o, isActive: !o.isActive } : o); setField('offers', newOffers); syncToCloud({ offers: newOffers }); }} className={`flex-1 py-2 rounded-xl text-xs font-black transition-colors ${offer.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>{offer.isActive ? 'إيقاف' : 'تفعيل'}</button>
                                    <button onClick={() => setState({ deleteConfig: { type: 'offer', id: offer.id }, activeModal: 'delete' })} className="bg-rose-50 text-rose-500 hover:bg-rose-100 p-2 rounded-xl"><Trash2 size={14} /></button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                ) : currentRoute === 'playstation' && (currentUser.role === 'admin' || currentUser.role === 'cashier') ? (
                  /* ===== PLAYSTATION — admin + cashier ===== */
                  <div className="p-4 md:p-8 max-w-6xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Gamepad2 className="text-indigo-500 w-8 h-8" /> بلايستيشن</h2>
                      {currentUser.role === 'admin' && (
                        <button onClick={() => openModal('psDevice')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17} /> إضافة جهاز</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                      {psDevices.length === 0 ? (
                        <div className="col-span-full text-center py-16 text-slate-400"><Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-20" /><p className="font-bold">لا توجد أجهزة مضافة</p></div>
                      ) : psDevices.map(device => {
                        const aS = psSessions.find(s => s.deviceId === device.id && s.status === 'active');
                        const durMin = aS ? Math.floor((Date.now() - aS.startTime) / 60000) : 0;
                        const displayCost = aS ? (Math.ceil(Math.max(durMin, 1) / 15) * 15 / 60) * device.hourlyRate : 0;
                        return (
                          <div key={device.id} className={`bg-white dark:bg-slate-800 p-5 rounded-3xl border-2 shadow-sm ${aS ? 'border-emerald-400 dark:border-emerald-600' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex justify-between items-start mb-4">
                              <div><h3 className="font-black text-xl text-slate-800 dark:text-white">{device.name}</h3><p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-1">{device.hourlyRate} ج / ساعة</p></div>
                              <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${aS ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{aS ? 'شغال' : 'فاضي'}</span>
                            </div>
                            {aS && (
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 mb-4 space-y-1">
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">بدأ: {aS.startTimeStr}</p>
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">المدة الفعلية: {durMin} دقيقة</p>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300">المحسوبة (تقريب ربع ساعة): {Math.ceil(Math.max(durMin, 1) / 15) * 15} دقيقة</p>
                                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">التكلفة المتوقعة: {displayCost.toFixed(2)} ج</p>
                              </div>
                            )}
                            {aS ? (
                              <button onClick={() => endPsSession(aS.id)} className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors">
                                <Power size={16} /> إنهاء وإصدار فاتورة
                              </button>
                            ) : (
                              <button onClick={() => {
                                if (currentUser.role === 'cashier' && !activeShift) { showToast('يجب استلام عهدة أولاً!', 'error'); return; }
                                startPsSession(device.id);
                              }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-colors">
                                <Play size={16} /> بدء جلسة
                              </button>
                            )}
                            {currentUser.role === 'admin' && (
                              <button onClick={() => setState({ deleteConfig: { type: 'psDevice', id: device.id }, activeModal: 'delete' })} className="mt-2 w-full text-xs text-rose-400 hover:text-rose-600 font-bold py-1 transition-colors">حذف الجهاز</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {psSessions.filter(s => s.status === 'ended').length > 0 && (
                      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700"><h3 className="font-black text-lg text-slate-800 dark:text-white">سجل الجلسات</h3></div>
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-right min-w-[600px]">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm">
                              <tr><th className="p-4">الجهاز</th><th className="p-4">الكاشير</th><th className="p-4">البداية</th><th className="p-4">النهاية</th><th className="p-4 text-center">المدة الفعلية</th><th className="p-4 text-center">المحسوبة</th><th className="p-4 text-center">التكلفة</th></tr>
                            </thead>
                            <tbody>
                              {[...psSessions.filter(s => s.status === 'ended')].reverse().slice(0, 20).map(s => (
                                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm">
                                  <td className="p-4 font-bold text-slate-800 dark:text-white">{s.deviceName}</td>
                                  <td className="p-4 text-slate-500 dark:text-slate-400">{s.cashierName}</td>
                                  <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{s.startTimeStr}</td>
                                  <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{s.endTimeStr}</td>
                                  <td className="p-4 text-center font-bold text-slate-600 dark:text-slate-300">{s.actualMin} دقيقة</td>
                                  <td className="p-4 text-center font-bold text-indigo-500">{s.durationMin} دقيقة</td>
                                  <td className="p-4 text-center font-black text-indigo-600 dark:text-indigo-400">{s.cost.toFixed(2)} ج</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                ) : currentRoute === 'tables' && currentUser.role === 'admin' ? (
                  /* ===== TABLES ===== */
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Utensils className="text-indigo-500 w-8 h-8" /> الصالة والطاولات</h2>
                      <button onClick={() => openModal('table')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17} /> طاولة جديدة</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {tables.map(t => (
                        <div key={t.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col items-center shadow-sm relative group">
                          <Armchair className="text-slate-300 dark:text-slate-600 mb-3 w-14 h-14" />
                          <h3 className="font-black text-base text-slate-800 dark:text-white line-clamp-1 text-center">{t.name}</h3>
                          <p className="text-sm font-bold text-indigo-500">{t.capacity} كراسي</p>
                          <button onClick={() => setState({ deleteConfig: { type: 'table', id: t.id }, activeModal: 'delete' })} className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 text-rose-500 bg-rose-50 dark:bg-rose-900/30 p-1.5 rounded-xl transition-all"><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                ) : currentRoute === 'hr' && currentUser.role === 'admin' ? (
                  /* ===== HR ===== */
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Users className="text-indigo-500 w-8 h-8" /> الموظفين والرواتب</h2>
                      <button onClick={() => openModal('employee')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17} /> موظف جديد</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[700px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 text-sm">
                            <tr><th className="p-5">الاسم</th><th className="p-5">الراتب</th><th className="p-5">سلفة</th><th className="p-5">خصم</th><th className="p-5 text-center">الصافي</th><th className="p-5 text-center">تقرير</th><th className="p-5 text-center">حذف</th></tr>
                          </thead>
                          <tbody>
                            {employees.map(emp => (
                              <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm">
                                <td className="p-5 font-black text-slate-800 dark:text-white text-base">{emp.name}</td>
                                <td className="p-5 font-bold text-slate-600 dark:text-slate-300">{emp.salary} ج</td>
                                <td className="p-2"><InlineSafeInput value={emp.advances} onSave={(v) => genericSave('employees', employees, { advances: v, id: emp.id })} colorClass="text-amber-500 focus:border-amber-500 border-amber-100 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800" /></td>
                                <td className="p-2"><InlineSafeInput value={emp.deductions} onSave={(v) => genericSave('employees', employees, { deductions: v, id: emp.id })} colorClass="text-rose-500 focus:border-rose-500 border-rose-100 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800" /></td>
                                <td className="p-5 text-center font-black text-emerald-600 dark:text-emerald-400 text-base">{emp.salary - (parseFloat(emp.advances) || 0) - (parseFloat(emp.deductions) || 0)} ج</td>
                                <td className="p-5 text-center"><button onClick={() => setField('selectedEmployeeReport', emp)} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 mx-auto"><User size={12} /> تفاصيل</button></td>
                                <td className="p-5 text-center"><button onClick={() => setState({ deleteConfig: { type: 'employee', id: emp.id }, activeModal: 'delete' })} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"><Trash2 size={15} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {selectedEmployeeReport && (() => {
                      const emp = selectedEmployeeReport;
                      const eo = orders.filter(o => o.cashierName === emp.name);
                      const es = shifts.filter(s => s.cashierName === emp.name);
                      const ts = eo.reduce((s, o) => s + o.total, 0);
                      return (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden">
                          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
                            <h3 className="font-black text-lg text-indigo-800 dark:text-indigo-300 flex items-center gap-2"><User size={18} /> معاملات: {emp.name}</h3>
                            <div className="flex gap-2">
                              <button onClick={() => exportEmployeeReportPDF(emp, orders, currentUser.cafeName)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-indigo-700"><Download size={13} /> PDF</button>
                              <button onClick={() => setField('selectedEmployeeReport', null)} className="p-2 bg-white dark:bg-slate-700 rounded-xl text-slate-500"><X size={16} /></button>
                            </div>
                          </div>
                          <div className="p-4 grid grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-700">
                            <div className="text-center"><p className="text-2xl font-black text-indigo-600">{ts.toFixed(2)} ج</p><p className="text-xs text-slate-500 font-bold">مبيعاته</p></div>
                            <div className="text-center"><p className="text-2xl font-black text-emerald-600">{eo.length}</p><p className="text-xs text-slate-500 font-bold">طلبات</p></div>
                            <div className="text-center"><p className="text-2xl font-black text-amber-600">{es.length}</p><p className="text-xs text-slate-500 font-bold">ورديات</p></div>
                          </div>
                          <div className="overflow-x-auto custom-scrollbar max-h-80">
                            <table className="w-full text-right min-w-[500px]">
                              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-slate-500 font-bold text-xs"><tr><th className="p-3">التاريخ</th><th className="p-3">الأصناف</th><th className="p-3">النوع</th><th className="p-3 text-center">الإجمالي</th></tr></thead>
                              <tbody>
                                {[...eo].reverse().map(o => (
                                  <tr key={o.id} className="border-b border-slate-100 dark:border-slate-700 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="p-3 text-slate-500">{o.date}</td>
                                    <td className="p-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{(o.items || []).map(it => it.name).join('، ')}</td>
                                    <td className="p-3"><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">{o.note || 'تيك أواي'}</span></td>
                                    <td className="p-3 text-center font-black text-indigo-600">{o.total.toFixed(2)} ج</td>
                                  </tr>
                                ))}
                                {eo.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400 font-bold">لا توجد معاملات</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                ) : currentRoute === 'expenses' && currentUser.role === 'admin' ? (
                  /* ===== EXPENSES ===== */
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Receipt className="text-indigo-500 w-8 h-8" /> المصروفات</h2>
                      <button onClick={() => openModal('expense')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17} /> تسجيل مصروف</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[500px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 text-sm">
                            <tr><th className="p-5">التاريخ</th><th className="p-5">البيان</th><th className="p-5">المبلغ</th><th className="p-5 text-center">حذف</th></tr>
                          </thead>
                          <tbody>
                            {expenses.map(ex => (
                              <tr key={ex.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm">
                                <td className="p-5 font-bold text-slate-500 dark:text-slate-400">{ex.date}</td>
                                <td className="p-5 font-black text-slate-800 dark:text-white">{ex.description}</td>
                                <td className="p-5 font-black text-rose-500 dark:text-rose-400 text-base">{ex.amount} ج</td>
                                <td className="p-5 text-center"><button onClick={() => setState({ deleteConfig: { type: 'expense', id: ex.id }, activeModal: 'delete' })} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"><Trash2 size={15} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                ) : null}
              </div>
            </main>

            {/* ===== MODALS ===== */}
            {activeModal === 'tenant' && (
              <CustomModal title={formData.id && !formData.isNew ? "تعديل الكافيه" : "إضافة كافيه جديد"} onClose={closeModal}>
                <form onSubmit={saveTenant} className="space-y-4">
                  {formData.isNew && <div><label className="block text-sm font-black mb-2 dark:text-white">كود الكافيه</label><input required name="id" placeholder="مثال: c2" value={formData.id || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white" /></div>}
                  <div><label className="block text-sm font-black mb-2 dark:text-white">اسم الكافيه</label><input required name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white" /></div>
                  <div><label className="block text-sm font-black mb-2 dark:text-white">تاريخ انتهاء الاشتراك</label><input required type="date" name="subscriptionEnds" value={formData.subscriptionEnds || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white" /></div>
                  <div><label className="block text-sm font-black mb-2 dark:text-white">إيميل المدير</label><input required type="email" name="adminEmail" value={formData.adminEmail || ''} onChange={handleFormChange} placeholder="admin.c2@coffeeerp.app" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white" dir="ltr" /></div>
                  <div><label className="block text-sm font-black mb-2 dark:text-white">إيميل الكاشير</label><input required type="email" name="cashierEmail" value={formData.cashierEmail || ''} onChange={handleFormChange} placeholder="cashier.c2@coffeeerp.app" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white" dir="ltr" /></div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">⚠️ تأكد من إنشاء هذه الإيميلات في Firebase Authentication.</p>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-lg transition-colors shadow-lg mt-2">حفظ</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'closeShift' && activeShift && (
              <CustomModal title="تقفيل الوردية" onClose={closeModal}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const ac = parseFloat(e.target.actualCash.value) || 0;
                  const ss = orders.filter(o => o.shiftId === activeShift.id).reduce((s, o) => s + o.total, 0);
                  const newShifts = shifts.map(s => s.id === activeShift.id ? { ...s, endTime: new Date().toLocaleString('ar-EG'), actualCash: ac, totalSales: ss, status: 'closed' } : s);
                  setField('shifts', newShifts);
                  syncToCloud({ shifts: newShifts });
                  closeModal();
                  handleLogout();
                  showToast('تم تقفيل الوردية بنجاح', 'success');
                }}>
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-5 rounded-2xl mb-6 border border-indigo-100 dark:border-indigo-800">
                    <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300 flex justify-between mb-3"><span>العهدة:</span><span>{activeShift.startingCash} ج</span></p>
                    <p className="text-sm font-black text-indigo-800 dark:text-indigo-300 flex justify-between border-t border-indigo-200 dark:border-indigo-700 pt-3"><span>مبيعات الشيفت:</span><span>{orders.filter(o => o.shiftId === activeShift.id).reduce((s, o) => s + o.total, 0).toFixed(2)} ج</span></p>
                  </div>
                  <div className="text-right mb-7"><label className="block text-sm font-black mb-3 dark:text-white">المبلغ الفعلي في الدرج الآن</label><input required name="actualCash" type="number" min="0" step="any" placeholder="0.00" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center font-black text-2xl focus:border-rose-500 outline-none text-slate-800 dark:text-white" /></div>
                  <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-black shadow-lg text-lg">تأكيد التقفيل</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'product' && (
              <CustomModal title="إضافة صنف" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('products', products, { name: e.target.pname.value, category: e.target.category.value, price: parseFloat(e.target.price.value), image: formData.image || null, expiryDate: e.target.expiryDate.value || null, recipe: formData.recipe?.filter(r => r.materialId && r.amount > 0) || [] }); }} className="space-y-4">
                  <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors overflow-hidden">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    {formData.image ? <img src={formData.image} alt="preview" className="h-20 object-contain rounded-lg shadow-sm" /> : <><ImageIcon className="text-slate-400 w-8 h-8" /><span className="text-xs font-bold text-slate-500">اضغط لاختيار صورة (اختياري)</span></>}
                  </div>
                  <input required name="pname" value={formData.pname || formData.name || ''} onChange={e => setState({ formData: { ...formData, pname: e.target.value, name: e.target.value } })} placeholder="اسم الصنف" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white text-sm" />
                  <div className="grid grid-cols-2 gap-4">
                    <input required name="category" value={formData.category || ''} onChange={handleFormChange} placeholder="القسم" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white text-sm" />
                    <input required type="number" step="any" name="price" value={formData.price || ''} onChange={handleFormChange} placeholder="السعر" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-black text-indigo-600 dark:text-indigo-400 text-sm" />
                  </div>
                  <div><label className="block text-xs font-black mb-1.5 text-slate-600 dark:text-slate-400 flex items-center gap-1"><Calendar size={12} /> تاريخ الصلاحية (اختياري)</label><input type="date" name="expiryDate" value={formData.expiryDate || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white text-sm" /></div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <div className="flex justify-between items-center mb-4"><label className="text-sm font-black dark:text-white">الوصفة</label><button type="button" onClick={() => setState({ formData: { ...formData, recipe: [...(formData.recipe || []), { materialId: '', amount: '' }] } })} className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-2 rounded-lg font-bold">+ مكون</button></div>
                    <div className="space-y-2 max-h-40 overflow-auto custom-scrollbar">
                      {(formData.recipe || []).map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                          <select required value={item.materialId} onChange={e => { const r = [...formData.recipe]; r[idx].materialId = e.target.value; setState({ formData: { ...formData, recipe: r } }); }} className="flex-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none"><option value="" disabled>اختر مادة</option>{rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>)}</select>
                          <input required type="number" step="any" value={item.amount} onChange={e => { const r = [...formData.recipe]; r[idx].amount = parseFloat(e.target.value); setState({ formData: { ...formData, recipe: r } }); }} placeholder="الكمية" className="w-24 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none" />
                          <button type="button" onClick={() => { const r = [...formData.recipe]; r.splice(idx, 1); setState({ formData: { ...formData, recipe: r } }); }} className="text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 p-2.5 rounded-xl"><Trash2 size={15} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black mt-2 shadow-lg text-lg">حفظ المنتج</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'offer' && (
              <CustomModal title="إضافة عرض" onClose={closeModal}>
                <form onSubmit={saveOffer} className="space-y-4">
                  <input required name="offerName" value={formData.offerName || ''} onChange={handleFormChange} placeholder="اسم العرض" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white text-sm" />
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-black mb-1.5 dark:text-slate-300">نوع الخصم</label><select name="offerDiscountType" value={formData.offerDiscountType || 'percent'} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white text-sm"><option value="percent">نسبة %</option><option value="fixed">مبلغ ثابت ج</option></select></div>
                    <div><label className="block text-xs font-black mb-1.5 dark:text-slate-300">قيمة الخصم</label><input required type="number" step="any" min="0" name="offerDiscountValue" value={formData.offerDiscountValue || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-black text-rose-600 dark:text-rose-400 text-sm" /></div>
                  </div>
                  <div><label className="block text-xs font-black mb-1.5 dark:text-slate-300">منتج محدد (اختياري)</label><select name="offerProductId" value={formData.offerProductId || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white text-sm"><option value="">كل المنتجات</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div><label className="block text-xs font-black mb-1.5 dark:text-slate-300">فئة (اختياري)</label><select name="offerCategory" value={formData.offerCategory || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white text-sm"><option value="">كل الفئات</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-black mb-1.5 dark:text-slate-300">من</label><input type="date" name="offerStartDate" value={formData.offerStartDate || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white text-sm" /></div>
                    <div><label className="block text-xs font-black mb-1.5 dark:text-slate-300">حتى</label><input type="date" name="offerEndDate" value={formData.offerEndDate || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white text-sm" /></div>
                  </div>
                  <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black text-lg transition-colors shadow-lg">حفظ العرض</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'psDevice' && (
              <CustomModal title="إضافة جهاز بلايستيشن" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('psDevices', psDevices, { name: e.target.psName.value, hourlyRate: parseFloat(e.target.hourlyRate.value) || 0 }); }} className="space-y-4">
                  <input required name="psName" placeholder="مثال: PS5 رقم 1" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500" />
                  <input required type="number" step="any" name="hourlyRate" placeholder="سعر الساعة (ج)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-indigo-600 dark:text-indigo-400 text-sm outline-none focus:border-indigo-500" />
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg">حفظ</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'material' && (
              <CustomModal title="مادة خام" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('rawMaterials', rawMaterials, { name: e.target.name.value, unit: e.target.unit.value, currentStock: parseFloat(e.target.currentStock.value), costPerUnit: parseFloat(e.target.costPerUnit.value) }); }} className="space-y-4">
                  <input required name="name" placeholder="اسم المادة" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500" />
                  <select required name="unit" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"><option value="جرام">جرام</option><option value="مللي">مللي</option><option value="قطعة">قطعة</option><option value="كيلو">كيلو</option></select>
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="number" step="any" name="currentStock" placeholder="الكمية الافتتاحية" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500" />
                    <input required type="number" step="any" name="costPerUnit" placeholder="التكلفة للوحدة" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-rose-500 dark:text-rose-400 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg">حفظ</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'employee' && (
              <CustomModal title="موظف جديد" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('employees', employees, { name: e.target.empName.value, salary: parseFloat(e.target.salary.value), advances: 0, deductions: 0 }); }} className="space-y-4">
                  <input required name="empName" placeholder="الاسم الكامل" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500" />
                  <input required type="number" step="any" name="salary" placeholder="الراتب الأساسي" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-emerald-600 dark:text-emerald-400 text-sm outline-none focus:border-indigo-500" />
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg">حفظ</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'table' && (
              <CustomModal title="طاولة جديدة" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('tables', tables, { name: e.target.tableName.value, capacity: parseInt(e.target.capacity.value) }); }} className="space-y-4">
                  <input required name="tableName" placeholder="مثال: طاولة 5" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500" />
                  <input required type="number" name="capacity" placeholder="عدد الكراسي" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500" />
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg">حفظ</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'expense' && (
              <CustomModal title="سند مصروف" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('expenses', expenses, { description: e.target.description.value, amount: parseFloat(e.target.amount.value), date: new Date().toISOString().split('T')[0] }); }} className="space-y-4">
                  <input required name="description" placeholder="فيم تم صرف المبلغ؟" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500" />
                  <input required type="number" step="any" name="amount" placeholder="المبلغ" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-rose-500 dark:text-rose-400 text-sm outline-none focus:border-indigo-500" />
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg">سجل المصروف</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'delete' && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl border border-rose-100 dark:border-rose-900">
                  <AlertCircle className="w-20 h-20 text-rose-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-black mb-2 dark:text-white">هل أنت متأكد؟</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mb-8 text-sm">سيتم الحذف نهائياً.</p>
                  <div className="flex gap-3">
                    <button onClick={confirmDelete} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-black">نعم، احذف</button>
                    <button onClick={closeModal} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white py-3.5 rounded-xl font-black">إلغاء</button>
                  </div>
                </div>
              </div>
            )}

            {lastOrder && (
              <CustomModal title="إيصال الدفع" onClose={() => setField('lastOrder', null)}>
                <div className="print-section p-8 bg-white text-black text-center font-mono border-2 border-dashed border-slate-300 rounded-2xl mx-auto max-w-xs">
                  <Coffee className="mx-auto mb-3 text-slate-800 w-10 h-10" />
                  <h2 className="text-2xl font-black mb-1">{currentUser.cafeName}</h2>
                  <p className="text-xs font-bold mb-4 text-slate-500">إيصال رقم: {lastOrder.id.toString().slice(-5)}</p>
                  <p className="text-[11px] font-bold border-y-2 border-dashed border-slate-300 py-2 mb-4">{lastOrder.date}</p>
                  <div className="space-y-2 mb-5 text-right px-2">{lastOrder.items.map((i, idx) => <div key={idx} className="flex justify-between text-sm font-bold"><span>{i.quantity}x {i.name}</span><span>{(i.price * i.quantity).toFixed(2)}</span></div>)}</div>
                  <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 mb-3">
                    <div className="flex justify-between text-sm font-bold text-slate-600"><span>المجموع:</span><span>{lastOrder.subtotal?.toFixed(2)}</span></div>
                    {lastOrder.discountAmount > 0 && <div className="flex justify-between text-sm font-black text-emerald-600"><span>خصم:</span><span>- {lastOrder.discountAmount?.toFixed(2)}</span></div>}
                    {lastOrder.tax > 0 && <div className="flex justify-between text-sm font-bold text-slate-600"><span>ضريبة 14%:</span><span>{lastOrder.tax?.toFixed(2)}</span></div>}
                  </div>
                  <div className="flex justify-between font-black text-2xl border-t-2 border-slate-800 pt-4 mt-2"><span>الإجمالي:</span><span>{lastOrder.total.toFixed(2)}</span></div>
                  <p className="text-[10px] mt-8 text-slate-500 font-bold">الكاشير: {currentUser.name}</p>
                </div>
                <button onClick={() => window.print()} className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 no-print shadow-lg text-lg"><Printer size={18} /> طباعة</button>
              </CustomModal>
            )}

          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
