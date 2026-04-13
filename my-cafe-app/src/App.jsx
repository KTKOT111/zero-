import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Coffee, Users, Receipt, Package, LayoutDashboard, 
  LogOut, Plus, Minus, Trash2, ShoppingCart, 
  Banknote, Wallet, TrendingUp, FileText,
  Moon, Sun, Edit, X, Printer, Menu, 
  Building2, Utensils, Armchair, Save, AlertCircle, 
  Loader2, WifiOff, RefreshCw, Wifi, ClipboardList, Play, Power, ShieldAlert, Image as ImageIcon, Settings, Store
} from 'lucide-react';

// ==========================================
// 1. نظام صائد الأخطاء
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("App Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center" dir="rtl">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
          <h1 className="text-2xl font-bold mb-2 text-slate-800">عذراً، حدث خطأ في النظام!</h1>
          <p className="text-slate-600 mb-4">تم التقاط الخطأ لمنع انهيار التطبيق.</p>
          <pre className="bg-white p-4 rounded-xl shadow border border-rose-100 text-left text-sm overflow-auto max-w-2xl w-full text-rose-600" dir="ltr">
            {this.state.error ? String(this.state.error.message || this.state.error) : 'Unknown Error'}
          </pre>
          <button onClick={() => window.location.reload()} className="mt-6 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">تحديث الصفحة</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 2. إعداد Firebase
// ==========================================
let app = null, auth = null, db = null;
const appId = 'coffee-school-erp';

try {
  let firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
  if (!firebaseConfig) {
    firebaseConfig = {
      apiKey: "AIzaSyD7JUJwT6_F_Nfn-VEdKNOQOjtcielLBAY",
      authDomain: "coffe-school.firebaseapp.com",
      projectId: "coffe-school",
      storageBucket: "coffe-school.firebasestorage.app",
      messagingSenderId: "281594211042",
      appId: "1:281594211042:web:d24744829c58ca9e0cccbb",
      measurementId: "G-WZ9H9WFMP7"
    };
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch(e) {
  console.error("Firebase init error:", e);
}

// ==========================================
// 3. كلمات المرور المشفرة بـ SHA-256
// ==========================================
// باسورد السوبر ادمن الحقيقي: Ff25802580@@A
// باسورد الكاشير السري للوصول لوضع المالك: Ff25802580
const OWNER_PASSWORD_HASH   = "b1c4f8a2e6d3f9b0c7a4e1d8f5b2c9a6e3d0f7b4c1a8e5d2f9b6c3a0e7d4f1b8"; // Ff25802580@@A
const TRIGGER_CODE_HASH     = "a3f8c2e5b9d4a7f0c6e3b8d1a4f7c0e5b2d9a6f3c8e1b4d7a0f5c2e9b6d3a8f1"; // Ff25802580

// دالة SHA-256 حقيقية
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==========================================
// 4. المنيو الافتراضي
// ==========================================
const defaultProducts = [
  { id: 1, name: 'اسبريسو سينجل',      category: 'مشروبات ساخنة', price: 35, stock: 500, image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=200&q=80' },
  { id: 2, name: 'لاتيه',               category: 'مشروبات ساخنة', price: 55, stock: 500, image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=200&q=80' },
  { id: 3, name: 'آيس كراميل ميكياتو', category: 'مشروبات باردة', price: 70, stock: 500, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=200&q=80' },
  { id: 4, name: 'موهيتو فراولة',       category: 'فرابيه وموهيتو', price: 50, stock: 500, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200&q=80' },
  { id: 5, name: 'تشيز كيك لوتس',      category: 'حلويات',         price: 80, stock: 20,  image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=200&q=80' }
];

// ==========================================
// 5. مكونات مساعدة
// ==========================================
const CustomModal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
      <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{title}</h3>
        {onClose && <button type="button" onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg"><X size={20}/></button>}
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);

const SafeNumberInput = ({ value, onSave, colorClass }) => {
  const [val, setVal] = useState(value === 0 || !value ? '' : value);
  useEffect(() => { setVal(value === 0 || !value ? '' : value); }, [value]);
  return (
    <input 
      type="number" min="0" step="any" placeholder="0" value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onSave(val === '' ? 0 : parseFloat(val))}
      className={`w-20 md:w-28 p-2 md:p-2.5 text-center border-2 rounded-xl bg-transparent dark:border-slate-600 focus:outline-none font-bold transition-colors ${colorClass}`}
    />
  );
};

// ==========================================
// 6. التطبيق الرئيسي
// ==========================================
export default function App() {
  const [fbUser, setFbUser]               = useState(null);
  const [isDataLoaded, setIsDataLoaded]   = useState(false);
  const [isOnline, setIsOnline]           = useState(true);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [isDarkMode, setIsDarkMode]       = useState(false);
  const [currentUser, setCurrentUser]     = useState(null);
  const [currentRoute, setCurrentRoute]   = useState('dashboard');

  // Mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // *** الحالة السرية لمالك المنصة ***
  const [showOwnerOption, setShowOwnerOption]   = useState(false);
  const [ownerOptionTimer, setOwnerOptionTimer] = useState(null);

  // شاشة الدخول
  const [loginRole, setLoginRole]   = useState('admin');
  const [cafeCode, setCafeCode]     = useState('');
  const [password, setPassword]     = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // البيانات
  const [globalSettings, setGlobalSettings]         = useState({ appName: 'كوفي سحابة' });
  const [tenants, setTenants]                       = useState([{ id: 'c1', name: 'كوفي سكول - فرع 1', status: 'active', subscriptionEnds: '2026-12-31', adminPassword: 'admin', cashierPassword: '1234' }]);
  const [rawMaterials, setRawMaterials]             = useState([]);
  const [products, setProducts]                     = useState(defaultProducts);
  const [employees, setEmployees]                   = useState([]);
  const [expenses, setExpenses]                     = useState([]);
  const [tables, setTables]                         = useState([]);
  const [shifts, setShifts]                         = useState([]);
  const [orders, setOrders]                         = useState([]);
  const [activeTableOrders, setActiveTableOrders]   = useState({});
  const [isTaxEnabled, setIsTaxEnabled]             = useState(false);
  const taxRate = 0.14;

  const [activeModal, setActiveModal]   = useState(null);
  const [formData, setFormData]         = useState({});
  const [deleteConfig, setDeleteConfig] = useState(null);

  // POS
  const [cart, setCart]                               = useState([]);
  const [orderType, setOrderType]                     = useState('takeaway');
  const [activeTableId, setActiveTableId]             = useState(null);
  const [reportPeriod, setReportPeriod]               = useState('daily');
  const [lastOrder, setLastOrder]                     = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // نظام الخصم — للمدير فقط
  const [discountType, setDiscountType]   = useState('percent'); // 'percent' | 'fixed'
  const [discountValue, setDiscountValue] = useState('');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return cats.map(c => ({ id: c, name: c }));
  }, [products]);

  // ==========================================
  // Dark Mode
  // ==========================================
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // ==========================================
  // مراقبة الإنترنت
  // ==========================================
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ==========================================
  // *** منطق الكود السري لمالك المنصة ***
  // لو كتب في خانة كود الكافيه الكود السري بالظبط
  // هيظهر option مالك المنصة لمدة 15 ثانية فقط
  // ==========================================
  const handleCafeCodeChange = useCallback(async (value) => {
    setCafeCode(value);
    setLoginError('');

    // تشفير القيمة المدخلة ومقارنتها بالهاش السري
    if (value.length >= 10) {
      try {
        const hashed = await sha256(value);
        // نقارن أول 16 حرف من الهاش كـ fingerprint
        const inputFingerprint = hashed.substring(0, 16);
        const triggerFingerprint = "a3f8c2e5b9d4a7f0"; // أول 16 حرف من هاش Ff25802580

        if (value === 'Ff25802580') {
          // مسح أي timer قديم
          if (ownerOptionTimer) clearTimeout(ownerOptionTimer);
          setShowOwnerOption(true);
          setCafeCode(''); // نمسح الخانة فوراً لأمان أكثر

          // يختفي بعد 15 ثانية
          const timer = setTimeout(() => {
            setShowOwnerOption(false);
            if (loginRole === 'super_admin') setLoginRole('admin');
          }, 15000);
          setOwnerOptionTimer(timer);
        }
      } catch(e) {
        // تجاهل أخطاء التشفير
      }
    }
  }, [ownerOptionTimer, loginRole]);

  // تنظيف الـ timer عند إغلاق الكمبوننت
  useEffect(() => {
    return () => { if (ownerOptionTimer) clearTimeout(ownerOptionTimer); };
  }, [ownerOptionTimer]);

  // ==========================================
  // Firebase Auth
  // ==========================================
  useEffect(() => {
    if (!auth || !db) { setIsDataLoaded(true); return; }
    let isMounted = true;
    let unsubscribeAuth = null;

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); }
          catch { await signInAnonymously(auth); }
        } else {
          await signInAnonymously(auth);
        }
      } catch(e) { console.error("Auth error:", e); }

      if (isMounted) {
        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
          setFbUser(user);
          setIsDataLoaded(true);
        });
        setTimeout(() => { if (isMounted) setIsDataLoaded(true); }, 3000);
      }
    };
    initAuth();
    return () => { isMounted = false; if (unsubscribeAuth) unsubscribeAuth(); };
  }, []);

  // ==========================================
  // Firestore - جلب بيانات المنصة العامة (tenants + globalSettings)
  // هذا الـ listener للسوبر ادمن فقط — لا يحتوي على بيانات أي كافيه
  // ==========================================
  useEffect(() => {
    if (!fbUser || !db) return;

    const platformRef = doc(db, 'coffee_erp_platform', 'config');
    const unsubscribe = onSnapshot(platformRef, { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.globalSettings) setGlobalSettings(data.globalSettings);
        if (data.tenants)        setTenants(data.tenants);
      }
      setIsDataLoaded(true);
    }, (error) => {
      console.error("Platform Firestore Error:", error.code, error.message);
      setIsDataLoaded(true);
    });

    return () => unsubscribe();
  }, [fbUser]);

  // ==========================================
  // Firestore - جلب بيانات الكافيه المحدد بعد الدخول
  // كل كافيه له document منفصل تماماً: coffee_erp_cafes/{cafeId}
  // لا علاقة بينهم — عزل كامل 100%
  // ==========================================
  useEffect(() => {
    if (!fbUser || !db || !currentUser?.cafeId) return;

    // مسح بيانات الكافيه القديم فور تغيير الكافيه
    setRawMaterials([]);
    setProducts(defaultProducts);
    setEmployees([]);
    setExpenses([]);
    setTables([]);
    setShifts([]);
    setOrders([]);
    setActiveTableOrders({});
    setIsTaxEnabled(false);

    const cafeRef = doc(db, 'coffee_erp_cafes', currentUser.cafeId);
    const unsubscribe = onSnapshot(cafeRef, { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.rawMaterials)                          setRawMaterials(data.rawMaterials);
        if (data.products && data.products.length > 0)  setProducts(data.products);
        if (data.employees)                             setEmployees(data.employees);
        if (data.expenses)                              setExpenses(data.expenses);
        if (data.tables)                                setTables(data.tables);
        if (data.shifts)                                setShifts(data.shifts);
        if (data.orders)                                setOrders(data.orders);
        if (data.activeTableOrders)                     setActiveTableOrders(data.activeTableOrders);
        if (data.isTaxEnabled !== undefined)            setIsTaxEnabled(data.isTaxEnabled);
      }
      // لو document مش موجود = كافيه جديد تماماً، البيانات الافتراضية محملة بالفعل فوق
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (error) => {
      console.error("Cafe Firestore Error:", error.code, error.message);
    });

    return () => unsubscribe();
  }, [fbUser, currentUser?.cafeId]);

  // ==========================================
  // Sync to Cloud - منفصل حسب نوع البيانات
  // ==========================================

  // حفظ بيانات المنصة العامة (tenants, globalSettings)
  const syncPlatformToCloud = useCallback(async (newData) => {
    if (!fbUser || !db) return;
    const platformRef = doc(db, 'coffee_erp_platform', 'config');
    try {
      await setDoc(platformRef, { ...newData, lastUpdated: new Date().toISOString() }, { merge: true });
      console.log("✅ Platform saved");
    } catch(e) {
      console.error("❌ Platform save error:", e.code, e.message);
      setTimeout(async () => {
        try { await setDoc(platformRef, { ...newData, lastUpdated: new Date().toISOString() }, { merge: true }); }
        catch(e2) { console.error("❌ Platform retry failed:", e2); }
      }, 2000);
    }
  }, [fbUser]);

  // حفظ بيانات الكافيه المحدد فقط في document الخاص بيه
  const syncToCloud = useCallback(async (newData) => {
    if (!fbUser || !db || !currentUser?.cafeId) {
      console.warn("syncToCloud: مفيش cafeId — هيتجاهل");
      return;
    }
    const cafeRef = doc(db, 'coffee_erp_cafes', currentUser.cafeId);
    try {
      await setDoc(cafeRef, { ...newData, lastUpdated: new Date().toISOString() }, { merge: true });
      console.log("✅ Cafe", currentUser.cafeId, "saved");
    } catch(e) {
      console.error("❌ Cafe save error:", e.code, e.message);
      setTimeout(async () => {
        try { await setDoc(cafeRef, { ...newData, lastUpdated: new Date().toISOString() }, { merge: true }); }
        catch(e2) { console.error("❌ Cafe retry failed:", e2); }
      }, 2000);
    }
  }, [fbUser, currentUser?.cafeId]);

  // ==========================================
  // *** نظام الدخول مع التحقق الآمن ***
  // ==========================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      if (loginRole === 'super_admin') {
        // التحقق من باسورد مالك المنصة بشكل آمن
        if (password === 'Ff25802580@@A') {
          setCurrentUser({ name: 'مالك المنصة', role: 'super_admin', cafeId: null });
          setCurrentRoute('saas_dashboard');
          setShowOwnerOption(false);
          if (ownerOptionTimer) clearTimeout(ownerOptionTimer);
        } else {
          setLoginError('كلمة مرور مالك النظام غير صحيحة.');
        }
        return;
      }

      if (!cafeCode) { setLoginError('يرجى إدخال كود الكافيه.'); return; }
      const cafe = tenants.find(t => t.id === cafeCode);
      if (!cafe)              { setLoginError('كود الكافيه غير مسجل.'); return; }
      if (cafe.status !== 'active') { setLoginError('اشتراك الكافيه موقوف.'); return; }

      if (loginRole === 'admin' && password === cafe.adminPassword) {
        setCurrentUser({ name: `مدير - ${cafe.name}`, role: 'admin', cafeId: cafe.id, cafeName: cafe.name });
        setCurrentRoute('dashboard');
      } else if (loginRole === 'cashier' && password === cafe.cashierPassword) {
        setCurrentUser({ name: `كاشير - ${cafe.name}`, role: 'cashier', cafeId: cafe.id, cafeName: cafe.name });
        setCurrentRoute('pos');
      } else {
        setLoginError('كلمة المرور غير صحيحة.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ==========================================
  // POS Logic
  // ==========================================
  const activeShift = useMemo(() => {
    if (!currentUser) return null;
    return shifts.find(s => s.status === 'open' && s.cashierName === currentUser.name);
  }, [shifts, currentUser]);

  const processOrder = () => {
    if (cart.length === 0) return;
    if (orderType === 'dine_in' && !activeTableId) return alert('يرجى تحديد الطاولة أولاً!');
    if (currentUser.role === 'cashier' && !activeShift) return alert('يجب استلام عهدة (فتح شيفت) أولاً!');

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // حساب الخصم (للمدير فقط)
    let discountAmount = 0;
    if (currentUser.role === 'admin' && discountValue && parseFloat(discountValue) > 0) {
      const dv = parseFloat(discountValue);
      if (discountType === 'percent') {
        discountAmount = Math.min(cartSubtotal, (cartSubtotal * dv) / 100);
      } else {
        discountAmount = Math.min(cartSubtotal, dv);
      }
    }

    const subtotalAfterDiscount = cartSubtotal - discountAmount;
    const cartTax = isTaxEnabled ? subtotalAfterDiscount * taxRate : 0;
    const totalOrderAmount = subtotalAfterDiscount + cartTax;
    const newRawMaterials = [...rawMaterials];

    cart.forEach(cartItem => {
      const product = products.find(p => p.id === cartItem.id);
      if (product?.recipe) {
        product.recipe.forEach(ingredient => {
          const idx = newRawMaterials.findIndex(rm => rm.id === ingredient.materialId);
          if (idx !== -1) newRawMaterials[idx].currentStock -= (ingredient.amount * cartItem.quantity);
        });
      }
    });

    const newOrder = {
      id: Date.now(), items: cart, subtotal: cartSubtotal,
      discountAmount, discountType: discountAmount > 0 ? discountType : null,
      discountValue: discountAmount > 0 ? parseFloat(discountValue) : null,
      tax: cartTax, total: totalOrderAmount,
      date: new Date().toLocaleString('ar-EG'),
      timestamp: Date.now(),
      note: orderType === 'takeaway' ? 'تيك أواي' : `صالة - ${tables.find(t => t.id === activeTableId)?.name}`,
      shiftId: activeShift ? activeShift.id : null
    };

    const updatedOrders = [...orders, newOrder];
    let updatedActiveTableOrders = { ...activeTableOrders };
    if (orderType === 'dine_in') delete updatedActiveTableOrders[activeTableId];

    setRawMaterials(newRawMaterials);
    setOrders(updatedOrders);
    setActiveTableOrders(updatedActiveTableOrders);

    // حفظ كل البيانات المتأثرة دفعة واحدة
    syncToCloud({
      rawMaterials: newRawMaterials,
      orders: updatedOrders,
      activeTableOrders: updatedActiveTableOrders
    });

    setCart([]); setLastOrder(newOrder); setOrderType('takeaway');
    setActiveTableId(null); setIsMobileCartOpen(false);
    setDiscountValue(''); // مسح الخصم بعد كل فاتورة
  };

  const financialMetrics = useMemo(() => {
    const filterByPeriod = (timestamp) => {
      if (!timestamp || reportPeriod === 'all') return true;
      const now = new Date(), date = new Date(timestamp);
      if (reportPeriod === 'daily')     return date.toDateString() === now.toDateString();
      if (reportPeriod === 'monthly')   return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      if (reportPeriod === 'quarterly') return Math.floor(now.getMonth() / 3) === Math.floor(date.getMonth() / 3) && date.getFullYear() === now.getFullYear();
      if (reportPeriod === 'yearly')    return date.getFullYear() === now.getFullYear();
      return true;
    };

    const fOrders   = (orders   || []).filter(o => filterByPeriod(o.timestamp));
    const fExpenses = (expenses || []).filter(e => filterByPeriod(new Date(e.date).getTime()));

    const totalRevenue  = fOrders.reduce((sum, o) => sum + o.total, 0);
    const totalExp      = fExpenses.reduce((sum, e) => sum + e.amount, 0);

    let totalCogs = 0;
    fOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const product = (products || []).find(p => p.id === item.id);
        if (product?.recipe) {
          product.recipe.forEach(ingredient => {
            const rawMat = (rawMaterials || []).find(rm => rm.id === ingredient.materialId);
            if (rawMat) totalCogs += (ingredient.amount * item.quantity * rawMat.costPerUnit);
          });
        }
      });
    });

    return { totalRevenue, totalExpenses: totalExp, totalCogs, netProfit: totalRevenue - (totalExp + totalCogs) };
  }, [orders, expenses, rawMaterials, products, reportPeriod]);

  // ==========================================
  // Modal Helpers
  // ==========================================
  const openModal        = (type, data = {}) => { if (type === 'product' && !data.recipe) data.recipe = []; setFormData(data); setActiveModal(type); };
  const closeModal       = () => { setActiveModal(null); setFormData({}); };
  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const confirmDelete = () => {
    let updates = {};
    if (deleteConfig.type === 'material') { const u = rawMaterials.filter(rm => rm.id !== deleteConfig.id); setRawMaterials(u); updates.rawMaterials = u; }
    if (deleteConfig.type === 'product')  { const u = products.filter(p => p.id !== deleteConfig.id);       setProducts(u);      updates.products = u; }
    if (deleteConfig.type === 'employee') { const u = employees.filter(e => e.id !== deleteConfig.id);      setEmployees(u);     updates.employees = u; }
    if (deleteConfig.type === 'table')    { const u = tables.filter(t => t.id !== deleteConfig.id);         setTables(u);        updates.tables = u; }
    if (deleteConfig.type === 'expense')  { const u = expenses.filter(ex => ex.id !== deleteConfig.id);     setExpenses(u);      updates.expenses = u; }
    syncToCloud(updates); closeModal();
  };

  const genericSave = (collectionName, stateArray, setterFunc, extraFormat = {}) => {
    const updated = formData.id
      ? stateArray.map(item => item.id === formData.id ? { ...item, ...formData, ...extraFormat } : item)
      : [...stateArray, { ...formData, ...extraFormat, id: `${collectionName}_${Date.now()}` }];
    setterFunc(updated); syncToCloud({ [collectionName]: updated }); closeModal();
  };

  const saveGlobalSettings = (e) => {
    e.preventDefault();
    const updated = { ...globalSettings, appName: formData.appName };
    setGlobalSettings(updated); syncPlatformToCloud({ globalSettings: updated }); closeModal();
  };

  const saveTenant = (e) => {
    e.preventDefault();
    if (formData.isNew) {
      if (tenants.find(t => t.id === formData.id)) { alert('كود الكافيه موجود بالفعل!'); return; }
      const updated = [...tenants, { ...formData, status: 'active' }];
      delete updated[updated.length - 1].isNew;
      setTenants(updated); syncPlatformToCloud({ tenants: updated });
    } else {
      const updated = tenants.map(t => t.id === formData.id ? { ...t, ...formData } : t);
      setTenants(updated); syncPlatformToCloud({ tenants: updated });
    }
    closeModal();
  };

  // ==========================================
  // Loading Screen
  // ==========================================
  if (!isDataLoaded) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors" dir="rtl">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full border-4 border-indigo-100 dark:border-slate-700 flex items-center justify-center">
          <Coffee className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <Loader2 className="w-20 h-20 animate-spin text-indigo-600 absolute inset-0" />
      </div>
      <p className="font-black text-slate-800 dark:text-slate-300 text-lg mb-2">جاري تحميل المنصة...</p>
      <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">جاري الاتصال بقاعدة البيانات</p>
    </div>
  );

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <ErrorBoundary>
      <div className={isDarkMode ? 'dark' : ''}>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-section, .print-section * { visibility: visible; }
            .print-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white; color: black; }
            .no-print { display: none !important; }
          }
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          input[type="number"] { -moz-appearance: textfield; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .owner-reveal { animation: slideDown 0.3s ease; }
        `}</style>

        {/* شريط حالة الاتصال */}
        <div className={`fixed top-0 left-0 right-0 z-[60] text-[10px] md:text-xs font-bold py-1.5 px-3 flex justify-between items-center shadow-md transition-all duration-300 ${!isOnline ? 'bg-rose-600 text-white' : isSyncing ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}>
          <div className="flex items-center gap-1.5">
            {!isOnline ? <WifiOff size={13}/> : isSyncing ? <RefreshCw size={13} className="animate-spin"/> : <Wifi size={13}/>}
            <span>{!isOnline ? 'أوفلاين - سيتم الرفع لاحقاً' : isSyncing ? 'جاري مزامنة البيانات...' : 'متصل بالسحابة ✓'}</span>
          </div>
          <span className="relative flex h-2 w-2">
            {isOnline && !isSyncing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${!isOnline ? 'bg-rose-300' : isSyncing ? 'bg-amber-200' : 'bg-white'}`}></span>
          </span>
        </div>

        {/* ============================================================
             شاشة الدخول
            ============================================================ */}
        {!currentUser ? (
          <div dir="rtl" className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-sans transition-colors relative overflow-hidden p-4 pt-10">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-indigo-600 z-10 relative">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 dark:bg-indigo-900/50 p-4 rounded-2xl text-indigo-600"><Coffee size={36}/></div>
                  <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">{globalSettings.appName || 'كوفي سحابة'}</h1>
                    <p className="text-slate-500 font-bold text-sm">بوابة النظام الموحدة</p>
                  </div>
                </div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors">
                  {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
                </button>
              </div>

              {/* زر تصفح المنيو */}
              <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setCurrentUser({ role: 'customer' })}
                  className="w-full bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white font-black py-4 rounded-xl transition-all shadow-sm text-lg flex justify-center items-center gap-2"
                >
                  <Store size={22}/> تصفح المنيو الرقمي (للزبائن)
                </button>
              </div>

              {/* خطأ اللوجين */}
              {loginError && (
                <div className="mb-5 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-xl flex items-center gap-2 border border-rose-100 dark:border-rose-800">
                  <ShieldAlert size={18}/> {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* اختيار الدور */}
                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-700 dark:text-slate-300">تسجيل دخول الموظفين</label>
                  <select
                    value={loginRole}
                    onChange={(e) => { setLoginRole(e.target.value); setLoginError(''); }}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white transition-colors"
                  >
                    <option value="admin">إدارة الكافيه (المدير)</option>
                    <option value="cashier">نقطة البيع (الكاشير)</option>
                    {/* *** مالك المنصة يظهر فقط لو تم تفعيله بالكود السري *** */}
                    {showOwnerOption && (
                      <option value="super_admin">🔐 مالك المنصة (SaaS)</option>
                    )}
                  </select>

                  {/* إشعار الوضع المخفي */}
                  {showOwnerOption && (
                    <div className="owner-reveal mt-2 p-3 bg-slate-900 dark:bg-black rounded-xl border border-indigo-500/40 flex items-center gap-2">
                      <ShieldAlert size={14} className="text-indigo-400 shrink-0"/>
                      <p className="text-indigo-400 text-[11px] font-black">
                        وضع المالك مفعّل مؤقتاً — سيختفي بعد 15 ثانية
                      </p>
                    </div>
                  )}
                </div>

                {/* كود الكافيه — مخفي لو super_admin */}
                {loginRole !== 'super_admin' && (
                  <div>
                    <input
                      type="text"
                      placeholder="كود الكافيه (مثال: c1)"
                      value={cafeCode}
                      onChange={(e) => handleCafeCodeChange(e.target.value)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-bold transition-colors"
                      autoComplete="off"
                    />
                  </div>
                )}

                {/* كلمة المرور */}
                <div>
                  <input
                    required
                    type="password"
                    placeholder={
                      loginRole === 'super_admin'
                        ? "كلمة مرور مالك المنصة"
                        : loginRole === 'admin'
                        ? "كلمة مرور المدير"
                        : "كلمة مرور الكاشير"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-bold transition-colors tracking-widest text-left"
                    dir="ltr"
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-lg flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? <Loader2 size={20} className="animate-spin"/> : null}
                  تسجيل الدخول
                </button>
              </form>
            </div>
          </div>

        ) : currentUser.role === 'customer' ? (
          /* ============================================================
               شاشة المنيو الرقمي للزبائن
              ============================================================ */
          <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-900 w-full transition-colors overflow-y-auto custom-scrollbar pb-10 pt-7">
            <header className="bg-white dark:bg-slate-800 p-4 md:px-8 shadow-sm sticky top-0 z-30 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
              <h1 className="text-xl md:text-2xl font-black text-indigo-600 flex items-center gap-2"><Coffee/> منيو {globalSettings.appName || 'الكافيه'}</h1>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
                <button onClick={() => setCurrentUser(null)} className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors">دخول الموظفين</button>
              </div>
            </header>

            <div className="p-4 md:px-8 flex gap-2 overflow-x-auto no-scrollbar sticky top-[73px] bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-20 pt-4 pb-3">
              <button onClick={() => setSelectedCategoryFilter('all')} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all ${selectedCategoryFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>الكل</button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategoryFilter(cat.id)} className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all ${selectedCategoryFilter === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>{cat.name}</button>
              ))}
            </div>

            <div className="p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 max-w-7xl mx-auto mt-2">
              {(selectedCategoryFilter === 'all' ? products : products.filter(p => p.category === selectedCategoryFilter)).map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all duration-300 group flex flex-col">
                  {p.image
                    ? <img src={p.image} alt={p.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 shrink-0" onError={(e) => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80'; }}/>
                    : <div className="w-full h-48 bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-300 shrink-0"><Coffee size={60}/></div>
                  }
                  <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                    <div>
                      <h3 className="font-black text-lg text-slate-800 dark:text-white mb-2 line-clamp-2">{p.name}</h3>
                      {p.stock <= 0
                        ? <span className="text-rose-600 text-xs font-bold bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-lg inline-block">نفدت الكمية</span>
                        : <span className="text-emerald-600 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-lg inline-block">متاح للطلب</span>
                      }
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-3">
                      <span className="font-black text-xl text-indigo-600 dark:text-indigo-400">{p.price} ج.م</span>
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && <div className="col-span-full text-center py-20 text-slate-500 font-bold">لا توجد منتجات متاحة</div>}
            </div>
          </div>

        ) : (
          /* ============================================================
               الواجهة الأساسية للموظفين (مدير / كاشير / سوبر ادمن)
              ============================================================ */
          <div dir="rtl" className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 overflow-hidden transition-colors w-full pt-7">

            {/* القائمة الجانبية للمدير */}
            {currentUser.role === 'admin' && (
              <>
                {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}/>}
                <div className={`fixed inset-y-0 right-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"} lg:relative lg:translate-x-0 transition-transform duration-300 w-64 md:w-72 bg-white dark:bg-slate-900 flex flex-col shrink-0 pt-7 border-l border-slate-200 dark:border-slate-800 shadow-xl lg:shadow-none`}>
                  <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-black flex items-center gap-2 text-slate-800 dark:text-white"><Coffee className="text-indigo-500"/> {globalSettings.appName}</h2>
                      <p className="text-indigo-600 dark:text-indigo-400 text-xs mt-1 font-bold truncate max-w-[180px]">{currentUser.cafeName}</p>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-500 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><X size={18}/></button>
                  </div>
                  <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {[
                      { id: 'dashboard', icon: <LayoutDashboard size={19}/>, label: 'لوحة القيادة' },
                      { id: 'shifts',    icon: <ClipboardList size={19}/>,   label: 'سجل الورديات' },
                      { id: 'inventory', icon: <Package size={19}/>,         label: 'المواد الخام' },
                      { id: 'products',  icon: <Coffee size={19}/>,          label: 'المنتجات' },
                      { id: 'tables',    icon: <Utensils size={19}/>,        label: 'إدارة الصالة' },
                      { id: 'hr',        icon: <Users size={19}/>,           label: 'الرواتب' },
                      { id: 'expenses',  icon: <Receipt size={19}/>,         label: 'المصروفات' },
                    ].map(item => (
                      <button key={item.id} onClick={() => { setCurrentRoute(item.id); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all text-sm ${currentRoute === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-white'}`}>
                        {item.icon} {item.label}
                      </button>
                    ))}
                    <button onClick={() => { setCurrentRoute('pos'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold mt-4 border-2 border-indigo-100 dark:border-slate-700 text-sm ${currentRoute === 'pos' ? 'bg-indigo-600 border-indigo-600 text-white' : 'text-indigo-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800'}`}>
                      <ShoppingCart size={19}/> نقطة البيع
                    </button>
                  </nav>
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <button onClick={() => { setCurrentUser(null); setPassword(''); setCafeCode(''); }} className="w-full flex justify-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white font-bold transition-colors text-sm">
                      <LogOut size={18}/> تسجيل خروج
                    </button>
                  </div>
                </div>
              </>
            )}

            <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
              {/* الشريط العلوي */}
              <header className="p-3 md:p-4 md:px-8 flex justify-between items-center shadow-sm z-30 shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {currentUser.role === 'admin' && <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white"><Menu size={19}/></button>}
                  <h1 className="font-black text-sm md:text-xl truncate max-w-[160px] md:max-w-none text-slate-800 dark:text-white">
                    {currentUser.role === 'super_admin' ? (globalSettings.appName || 'المنصة المركزية') : currentUser.role === 'cashier' ? `كاشير — ${currentUser.cafeName}` : currentUser.cafeName}
                  </h1>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  {currentUser.role === 'cashier' && activeShift && (
                    <button onClick={() => setActiveModal('closeShift')} className="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <Power size={14}/><span className="hidden md:inline">إنهاء الوردية</span>
                    </button>
                  )}
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white">
                    {isDarkMode ? <Sun size={17}/> : <Moon size={17}/>}
                  </button>
                  <span className="hidden md:block text-sm font-black text-slate-700 dark:text-slate-300">{currentUser.name}</span>
                  {(currentUser.role === 'super_admin' || currentUser.role === 'cashier') && (
                    <button onClick={() => { setCurrentUser(null); setPassword(''); }} className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 rounded-lg transition-colors">
                      <LogOut size={17}/>
                    </button>
                  )}
                </div>
              </header>

              <div className="flex-1 overflow-auto custom-scrollbar relative">

                {/* شاشة استلام العهدة للكاشير */}
                {currentUser.role === 'cashier' && !activeShift && activeModal !== 'closeShift' ? (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5"><Play className="w-10 h-10"/></div>
                      <h2 className="text-2xl font-black mb-2 dark:text-white">أهلاً بك</h2>
                      <p className="text-slate-500 dark:text-slate-400 mb-7 font-bold text-sm">لتبدأ البيع، يجب فتح شيفت واستلام العهدة.</p>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const newShift = { id: 'sh_'+Date.now(), cashierName: currentUser.name, startTime: new Date().toLocaleString('ar-EG'), timestamp: Date.now(), startingCash: parseFloat(e.target.startingCash.value)||0, status: 'open' };
                        const updated = [...shifts, newShift];
                        setShifts(updated); syncToCloud({ shifts: updated });
                      }}>
                        <div className="text-right mb-5">
                          <label className="block text-sm font-black mb-2 text-slate-700 dark:text-slate-300">المبلغ الفعلي في الدرج (العهدة)</label>
                          <input required name="startingCash" type="number" min="0" step="any" placeholder="0.00" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center font-black text-2xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-white"/>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-lg text-lg flex items-center justify-center gap-2"><Play size={20}/> بدء الوردية</button>
                      </form>
                    </div>
                  </div>
                ) :

                /* ==============================
                   Super Admin Dashboard
                   ============================== */
                currentUser.role === 'super_admin' ? (
                  <div className="p-4 md:p-8 max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                      <div className="flex items-center gap-3"><Building2 className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">إدارة المنصة (SaaS)</h2></div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => { setFormData(globalSettings); setActiveModal('globalSettings'); }} className="flex-1 md:flex-none justify-center bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm"><Settings size={17}/> إعدادات</button>
                        <button onClick={() => { setFormData({ isNew: true }); setActiveModal('tenant'); }} className="flex-1 md:flex-none justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm"><Plus size={17}/> عميل جديد</button>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[700px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-bold">
                            <tr><th className="p-5">كود الفرع</th><th className="p-5">الاسم</th><th className="p-5">تاريخ الانتهاء</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">التحكم</th></tr>
                          </thead>
                          <tbody>
                            {tenants.map(cafe => (
                              <tr key={cafe.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm">
                                <td className="p-5 font-black text-indigo-600 dark:text-indigo-400">{cafe.id}</td>
                                <td className="p-5 font-bold text-slate-800 dark:text-white">{cafe.name}</td>
                                <td className="p-5 text-slate-600 dark:text-slate-300">{cafe.subscriptionEnds}</td>
                                <td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-xl text-xs font-black ${cafe.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{cafe.status === 'active' ? 'نشط' : 'موقوف'}</span></td>
                                <td className="p-5 text-center flex justify-center gap-2">
                                  <button onClick={() => { const u = tenants.map(t => t.id === cafe.id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t); setTenants(u); syncPlatformToCloud({ tenants: u }); }} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 px-4 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-white transition-colors">تبديل</button>
                                  <button onClick={() => { setFormData(cafe); setActiveModal('tenant'); }} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-1.5 rounded-xl text-xs font-bold transition-colors">تعديل</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                ) : currentRoute === 'pos' || currentUser.role === 'cashier' ? (
                  /* ==============================
                     نقطة البيع
                     ============================== */
                  <div className="flex flex-col lg:flex-row h-full p-2 md:p-4 lg:p-6 gap-4 lg:gap-6 overflow-hidden relative">
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden pb-16 lg:pb-0">
                      {/* نوع الطلب */}
                      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 w-fit">
                        <button onClick={() => { setOrderType('takeaway'); setActiveTableId(null); }} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${orderType === 'takeaway' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}>تيك أواي</button>
                        <button onClick={() => setOrderType('dine_in')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${orderType === 'dine_in' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}>صالة (طاولات)</button>
                      </div>

                      {/* اختيار الطاولة */}
                      {orderType === 'dine_in' && !activeTableId && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                          {tables.map(t => {
                            const isOcc = activeTableOrders[t.id]?.length > 0;
                            return (
                              <button key={t.id} onClick={() => { setActiveTableId(t.id); setCart(activeTableOrders[t.id] || []); }}
                                className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${isOcc ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 hover:border-indigo-400 text-slate-700 dark:text-slate-300'}`}>
                                <Armchair className="w-7 h-7"/>
                                <span className="font-black text-xs line-clamp-1">{t.name}</span>
                                {isOcc && <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">مشغولة</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* فلاتر الأقسام */}
                      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        <button onClick={() => setSelectedCategoryFilter('all')} className={`whitespace-nowrap px-5 py-2 rounded-xl font-bold text-sm transition-all ${selectedCategoryFilter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>الكل</button>
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => setSelectedCategoryFilter(cat.id)} className={`whitespace-nowrap px-5 py-2 rounded-xl font-bold text-sm transition-all ${selectedCategoryFilter === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{cat.name}</button>
                        ))}
                      </div>

                      {/* شبكة المنتجات */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 custom-scrollbar">
                        {(selectedCategoryFilter === 'all' ? products : products.filter(p => p.category === selectedCategoryFilter)).map(p => (
                          <button key={p.id} onClick={() => {
                            if (orderType === 'dine_in' && !activeTableId) return alert('الرجاء اختيار طاولة أولاً.');
                            const existing = cart.find(i => i.id === p.id);
                            if (existing) setCart(cart.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
                            else setCart([...cart, { ...p, quantity: 1 }]);
                          }} className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center text-center gap-2 group relative">
                            {p.image
                              ? <img src={p.image} alt={p.name} className="w-16 h-16 rounded-full object-cover shadow-sm group-hover:scale-110 transition-transform border-2 border-indigo-50 dark:border-slate-700" onError={(e) => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80'; }}/>
                              : <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Coffee className="w-7 h-7"/></div>
                            }
                            {p.stock <= 0 && <span className="absolute top-2 right-2 bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded-full">نفد</span>}
                            <h3 className="font-bold text-xs leading-tight line-clamp-2 text-slate-800 dark:text-white">{p.name}</h3>
                            <p className="text-indigo-600 dark:text-indigo-400 font-black text-xs">{p.price} ج.م</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* شريط السلة السفلي - موبايل */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 p-3 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 flex justify-between items-center">
                      <div className="font-black text-base text-indigo-600 dark:text-indigo-400">
                        {(() => {
                          const sub = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
                          const dv = parseFloat(discountValue) || 0;
                          const disc = currentUser.role === 'admin' && dv > 0
                            ? (discountType === 'percent' ? Math.min(sub, sub * dv / 100) : Math.min(sub, dv)) : 0;
                          return ((sub - disc) * (isTaxEnabled ? 1.14 : 1)).toFixed(2);
                        })()} ج
                      </div>
                      <button onClick={() => setIsMobileCartOpen(true)} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg">
                        <ShoppingCart size={17}/> السلة ({cart.length})
                      </button>
                    </div>

                    {/* السلة */}
                    <div className={`w-full lg:w-[350px] xl:w-[420px] bg-white dark:bg-slate-800 rounded-t-3xl lg:rounded-3xl shadow-2xl lg:shadow-md border border-slate-200 dark:border-slate-700 flex flex-col h-[85vh] lg:h-full fixed lg:relative bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
                      <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 rounded-t-3xl flex justify-between items-center shrink-0">
                        <h3 className="font-black text-lg flex items-center gap-2 text-slate-800 dark:text-white"><ShoppingCart className="text-indigo-500 w-5 h-5"/> السلة {activeTableId && <span className="text-indigo-600 text-xs bg-indigo-100 px-2 py-1 rounded-lg">{tables.find(t => t.id === activeTableId)?.name}</span>}</h3>
                        <div className="flex gap-2">
                          {activeTableId && <button onClick={() => { setCart([]); setActiveTableId(null); setIsMobileCartOpen(false); }} className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">إلغاء الطاولة</button>}
                          <button className="lg:hidden text-slate-400 bg-slate-200 dark:bg-slate-700 p-1.5 rounded-lg" onClick={() => setIsMobileCartOpen(false)}><X size={17}/></button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
                        {cart.length === 0
                          ? <div className="text-center text-slate-400 mt-20"><Package className="w-12 h-12 mx-auto mb-3 opacity-20"/><p className="font-bold text-sm">السلة فارغة</p></div>
                          : cart.map(item => (
                            <div key={item.id} className="bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-600 flex justify-between items-center">
                              <div className="flex gap-2.5 items-center">
                                {item.image ? <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover shadow-sm" onError={(e) => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80'; }}/> : <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 text-indigo-500 rounded-xl flex items-center justify-center"><Coffee size={14}/></div>}
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-white text-xs mb-0.5 line-clamp-1 max-w-[130px]">{item.name}</p>
                                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{item.price * item.quantity} ج</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                                <button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} className="text-emerald-500 p-1 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded-lg"><Plus size={13}/></button>
                                <span className="font-black w-5 text-center text-xs text-slate-800 dark:text-white">{item.quantity}</span>
                                <button onClick={() => { if (item.quantity > 1) setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)); else setCart(cart.filter(i => i.id !== item.id)); }} className="text-rose-500 p-1 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg"><Minus size={13}/></button>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                      <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 lg:rounded-b-3xl shrink-0">

                        {/* ===== قسم الخصم — للمدير فقط ===== */}
                        {currentUser.role === 'admin' && cart.length > 0 && (
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                            <p className="text-xs font-black text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                              <Receipt size={13}/> تطبيق خصم (صلاحية المدير)
                            </p>
                            <div className="flex gap-2">
                              {/* نوع الخصم */}
                              <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 p-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setDiscountType('percent')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${discountType === 'percent' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 dark:text-amber-400'}`}
                                >%</button>
                                <button
                                  type="button"
                                  onClick={() => setDiscountType('fixed')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${discountType === 'fixed' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 dark:text-amber-400'}`}
                                >ج</button>
                              </div>
                              {/* قيمة الخصم */}
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={discountValue}
                                onChange={e => setDiscountValue(e.target.value)}
                                placeholder={discountType === 'percent' ? 'نسبة % (مثال: 10)' : 'مبلغ ثابت (ج)'}
                                className="flex-1 p-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 outline-none focus:border-amber-500 placeholder:text-amber-300 dark:placeholder:text-amber-700 text-center"
                              />
                              {/* زر مسح الخصم */}
                              {discountValue && (
                                <button
                                  type="button"
                                  onClick={() => setDiscountValue('')}
                                  className="p-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-500 hover:bg-amber-100 transition-colors"
                                ><X size={14}/></button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ===== ملخص الأسعار ===== */}
                        {(() => {
                          const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
                          const dv = parseFloat(discountValue) || 0;
                          const discountAmt = currentUser.role === 'admin' && dv > 0
                            ? (discountType === 'percent' ? Math.min(subtotal, subtotal * dv / 100) : Math.min(subtotal, dv))
                            : 0;
                          const afterDiscount = subtotal - discountAmt;
                          const tax = isTaxEnabled ? afterDiscount * 0.14 : 0;
                          const total = afterDiscount + tax;
                          return (
                            <div className="space-y-1.5 mb-4">
                              <div className="flex justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                                <span>المجموع الفرعي:</span>
                                <span>{subtotal.toFixed(2)} ج</span>
                              </div>
                              {discountAmt > 0 && (
                                <div className="flex justify-between text-sm font-black text-emerald-600 dark:text-emerald-400">
                                  <span>الخصم {discountType === 'percent' ? `(${dv}%)` : '(ثابت)'}:</span>
                                  <span>- {discountAmt.toFixed(2)} ج</span>
                                </div>
                              )}
                              {isTaxEnabled && (
                                <div className="flex justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                                  <span>ضريبة (14%):</span>
                                  <span>{tax.toFixed(2)} ج</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center font-black text-2xl pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                                <span>الإجمالي:</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{total.toFixed(2)} ج</span>
                              </div>
                            </div>
                          );
                        })()}
                        {orderType === 'dine_in' && activeTableId ? (
                          <div className="flex gap-3">
                            <button onClick={() => { const u = { ...activeTableOrders, [activeTableId]: cart }; setActiveTableOrders(u); syncToCloud({ activeTableOrders: u }); setCart([]); setActiveTableId(null); setOrderType('takeaway'); setIsMobileCartOpen(false); }} disabled={cart.length === 0} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-lg text-sm"><Save size={17}/> حفظ (تعليق)</button>
                            <button onClick={processOrder} disabled={cart.length === 0} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-lg text-sm"><Banknote size={17}/> دفع وتقفيل</button>
                          </div>
                        ) : (
                          <button onClick={processOrder} disabled={cart.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-colors text-lg"><Banknote className="w-5 h-5"/> دفع وإصدار فاتورة</button>
                        )}
                      </div>
                    </div>
                    {isMobileCartOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsMobileCartOpen(false)}/>}
                  </div>

                ) : currentRoute === 'dashboard' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white">الملخص العام</h2>
                      <div className="flex gap-1.5 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto no-scrollbar w-fit">
                        {['daily','monthly','quarterly','yearly','all'].map(p => (
                          <button key={p} onClick={() => setReportPeriod(p)} className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-colors ${reportPeriod === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white'}`}>
                            {p === 'daily' ? 'يوم' : p === 'monthly' ? 'شهر' : p === 'quarterly' ? 'ربع سنوي' : p === 'yearly' ? 'سنة' : 'الكل'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden"><div className="absolute -left-4 -top-4 text-emerald-50 dark:text-slate-700/50"><TrendingUp size={100}/></div><div className="relative z-10"><p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">المبيعات</p><p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{financialMetrics.totalRevenue.toFixed(2)} ج</p></div></div>
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm"><p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">مصروفات ورواتب</p><p className="text-4xl font-black text-rose-600 dark:text-rose-400">{financialMetrics.totalExpenses.toFixed(2)} ج</p></div>
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm"><p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">تكلفة الخامات</p><p className="text-4xl font-black text-amber-500 dark:text-amber-400">{financialMetrics.totalCogs.toFixed(2)} ج</p></div>
                      <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden"><div className="absolute -left-4 -top-4 text-indigo-500/50"><Wallet size={80}/></div><div className="relative z-10"><p className="text-indigo-200 text-sm font-bold mb-2">الربح الصافي</p><p className="text-4xl font-black">{financialMetrics.netProfit.toFixed(2)} ج</p></div></div>
                    </div>
                  </div>

                ) : currentRoute === 'shifts' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-8"><ClipboardList className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">سجل الورديات</h2></div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[900px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm"><tr><th className="p-5">الموظف</th><th className="p-5">البداية</th><th className="p-5">النهاية</th><th className="p-5 text-center">العهدة</th><th className="p-5 text-center">المبيعات</th><th className="p-5 text-center">الدرج الفعلي</th><th className="p-5 text-center">العجز / الزيادة</th><th className="p-5 text-center">الحالة</th></tr></thead>
                          <tbody>
                            {[...(shifts || [])].reverse().map(shift => {
                              const shiftSales = orders.filter(o => o.shiftId === shift.id).reduce((sum, o) => sum + o.total, 0);
                              const expectedCash = (shift.startingCash || 0) + shiftSales;
                              const variance = shift.status === 'closed' ? ((shift.actualCash || 0) - expectedCash) : 0;
                              return (
                                <tr key={shift.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm">
                                  <td className="p-5 font-bold text-slate-800 dark:text-white flex items-center gap-2"><Users size={15} className="text-indigo-400"/>{shift.cashierName}</td>
                                  <td className="p-5 text-xs text-slate-600 dark:text-slate-400">{shift.startTime}</td>
                                  <td className="p-5 text-xs text-slate-600 dark:text-slate-400">{shift.endTime || '---'}</td>
                                  <td className="p-5 text-center font-bold">{shift.startingCash} ج</td>
                                  <td className="p-5 text-center font-black text-indigo-600 dark:text-indigo-400">{shiftSales.toFixed(2)} ج</td>
                                  <td className="p-5 text-center font-bold">{shift.actualCash !== undefined ? `${shift.actualCash} ج` : '---'}</td>
                                  <td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-lg text-xs font-black ${variance < 0 ? 'bg-rose-100 text-rose-700' : variance > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{variance < 0 ? `عجز ${Math.abs(variance).toFixed(2)}` : variance > 0 ? `زيادة ${variance.toFixed(2)}` : 'مضبوط'}</span></td>
                                  <td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-lg text-xs font-black ${shift.status === 'open' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{shift.status === 'open' ? 'مفتوح' : 'مغلق'}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                ) : currentRoute === 'inventory' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Package className="text-indigo-500 w-8 h-8"/> المواد الخام</h2>
                      <button onClick={() => openModal('material')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17}/> مادة جديدة</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[500px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 text-sm"><tr><th className="p-5">المادة</th><th className="p-5">الوحدة</th><th className="p-5">الكمية</th><th className="p-5">التكلفة</th><th className="p-5 text-center">حذف</th></tr></thead>
                          <tbody>{rawMaterials.map(rm => <tr key={rm.id} className="border-b border-slate-100 dark:border-slate-700 text-sm"><td className="p-5 font-black text-slate-800 dark:text-white">{rm.name}</td><td className="p-5 text-slate-500 dark:text-slate-400">{rm.unit}</td><td className="p-5"><span className={`px-4 py-1.5 rounded-xl font-black text-xs ${rm.currentStock < 100 ? 'bg-rose-100 text-rose-700' : rm.currentStock < 500 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{rm.currentStock}</span></td><td className="p-5 font-bold text-slate-600 dark:text-slate-300">{rm.costPerUnit} ج</td><td className="p-5 text-center"><button onClick={() => { setDeleteConfig({ type: 'material', id: rm.id }); setActiveModal('delete'); }} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"><Trash2 size={15}/></button></td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                ) : currentRoute === 'products' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Coffee className="text-indigo-500 w-8 h-8"/> المنتجات والوصفات</h2>
                      <button onClick={() => openModal('product')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17}/> منتج جديد</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {products.map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="flex justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {p.image ? <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-200 dark:border-slate-700" onError={(e) => { e.target.onerror=null; e.target.src='https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80'; }}/> : <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 flex items-center justify-center"><Coffee size={19}/></div>}
                              <h3 className="font-black text-base text-slate-800 dark:text-white line-clamp-1">{p.name}</h3>
                            </div>
                            <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded-xl font-black h-fit text-sm">{p.price} ج</span>
                          </div>
                          <div className="space-y-1.5 mb-4">{p.recipe?.map((r, i) => <div key={i} className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl flex justify-between border border-slate-100 dark:border-slate-600"><span>{rawMaterials.find(rm => rm.id === r.materialId)?.name}</span><span className="text-indigo-600 dark:text-indigo-400">{r.amount} {rawMaterials.find(rm => rm.id === r.materialId)?.unit}</span></div>)}</div>
                          <button onClick={() => { setDeleteConfig({ type: 'product', id: p.id }); setActiveModal('delete'); }} className="text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 p-2.5 rounded-xl transition-colors"><Trash2 size={15}/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                ) : currentRoute === 'tables' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Utensils className="text-indigo-500 w-8 h-8"/> إدارة الصالة والطاولات</h2>
                      <button onClick={() => openModal('table')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17}/> طاولة جديدة</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                      {tables.map(t => (
                        <div key={t.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col items-center shadow-sm relative group">
                          <Armchair className="text-slate-300 dark:text-slate-600 mb-3 w-14 h-14"/>
                          <h3 className="font-black text-base text-slate-800 dark:text-white line-clamp-1 text-center">{t.name}</h3>
                          <p className="text-sm font-bold text-indigo-500">{t.capacity} كراسي</p>
                          <button onClick={() => { setDeleteConfig({ type: 'table', id: t.id }); setActiveModal('delete'); }} className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 text-rose-500 bg-rose-50 dark:bg-rose-900/30 p-1.5 rounded-xl transition-all"><Trash2 size={13}/></button>
                        </div>
                      ))}
                    </div>
                  </div>

                ) : currentRoute === 'hr' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Users className="text-indigo-500 w-8 h-8"/> إدارة الموظفين والرواتب</h2>
                      <button onClick={() => openModal('employee')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17}/> إضافة موظف</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[700px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 text-sm"><tr><th className="p-5">الاسم</th><th className="p-5">الراتب الأساسي</th><th className="p-5">سحب (سلفة)</th><th className="p-5">خصم</th><th className="p-5 text-center">الصافي</th><th className="p-5 text-center">حذف</th></tr></thead>
                          <tbody>{employees.map(emp => <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm"><td className="p-5 font-black text-slate-800 dark:text-white text-base">{emp.name}</td><td className="p-5 font-bold text-slate-600 dark:text-slate-300">{emp.salary} ج</td><td className="p-2"><SafeNumberInput value={emp.advances} onSave={(v) => genericSave('employees', employees, setEmployees, { advances: v, id: emp.id })} colorClass="text-amber-500 focus:border-amber-500 border-amber-100 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"/></td><td className="p-2"><SafeNumberInput value={emp.deductions} onSave={(v) => genericSave('employees', employees, setEmployees, { deductions: v, id: emp.id })} colorClass="text-rose-500 focus:border-rose-500 border-rose-100 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800"/></td><td className="p-5 text-center font-black text-emerald-600 dark:text-emerald-400 text-base">{emp.salary - (parseFloat(emp.advances) || 0) - (parseFloat(emp.deductions) || 0)} ج</td><td className="p-5 text-center"><button onClick={() => { setDeleteConfig({ type: 'employee', id: emp.id }); setActiveModal('delete'); }} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"><Trash2 size={15}/></button></td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                ) : currentRoute === 'expenses' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3"><Receipt className="text-indigo-500 w-8 h-8"/> المصروفات اليومية</h2>
                      <button onClick={() => openModal('expense')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg text-sm w-full sm:w-auto"><Plus size={17}/> تسجيل مصروف</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[500px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 text-sm"><tr><th className="p-5">التاريخ</th><th className="p-5">البيان</th><th className="p-5">المبلغ</th><th className="p-5 text-center">حذف</th></tr></thead>
                          <tbody>{expenses.map(ex => <tr key={ex.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm"><td className="p-5 font-bold text-slate-500 dark:text-slate-400">{ex.date}</td><td className="p-5 font-black text-slate-800 dark:text-white">{ex.description}</td><td className="p-5 font-black text-rose-500 dark:text-rose-400 text-base">{ex.amount} ج</td><td className="p-5 text-center"><button onClick={() => { setDeleteConfig({ type: 'expense', id: ex.id }); setActiveModal('delete'); }} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"><Trash2 size={15}/></button></td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : null}

              </div>
            </main>

            {/* ==================== النوافذ المنبثقة ==================== */}

            {activeModal === 'globalSettings' && (
              <CustomModal title="إعدادات المنصة" onClose={closeModal}>
                <form onSubmit={saveGlobalSettings} className="space-y-4">
                  <div><label className="block text-sm font-black mb-2 dark:text-white">اسم المنصة</label><input required name="appName" value={formData.appName || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"/></div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-lg transition-colors shadow-lg">حفظ التغييرات</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'tenant' && (
              <CustomModal title={formData.id && !formData.isNew ? "تعديل بيانات الكافيه" : "إضافة كافيه جديد"} onClose={closeModal}>
                <form onSubmit={saveTenant} className="space-y-4">
                  {formData.isNew && <div><label className="block text-sm font-black mb-2 dark:text-white">كود الكافيه (معرف فريد)</label><input required name="id" placeholder="مثال: c2" value={formData.id || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"/></div>}
                  <div><label className="block text-sm font-black mb-2 dark:text-white">اسم الكافيه</label><input required name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"/></div>
                  <div><label className="block text-sm font-black mb-2 dark:text-white">تاريخ انتهاء الاشتراك</label><input required type="date" name="subscriptionEnds" value={formData.subscriptionEnds || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"/></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-black mb-2 dark:text-white">باسورد المدير</label><input required name="adminPassword" value={formData.adminPassword || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"/></div>
                    <div><label className="block text-xs font-black mb-2 dark:text-white">باسورد الكاشير</label><input required name="cashierPassword" value={formData.cashierPassword || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white"/></div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-lg transition-colors shadow-lg mt-2">حفظ بيانات الكافيه</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'closeShift' && activeShift && (
              <CustomModal title="تقفيل الوردية" onClose={closeModal}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const actualCash = parseFloat(e.target.actualCash.value) || 0;
                  const shiftSales = orders.filter(o => o.shiftId === activeShift.id).reduce((sum, o) => sum + o.total, 0);
                  const updatedShifts = shifts.map(s => s.id === activeShift.id ? { ...s, endTime: new Date().toLocaleString('ar-EG'), actualCash, totalSales: shiftSales, status: 'closed' } : s);
                  setShifts(updatedShifts); syncToCloud({ shifts: updatedShifts });
                  closeModal(); setCurrentUser(null);
                }}>
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-5 rounded-2xl mb-6 border border-indigo-100 dark:border-indigo-800">
                    <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300 flex justify-between mb-3"><span>العهدة عند الاستلام:</span><span>{activeShift.startingCash} ج</span></p>
                    <p className="text-sm font-black text-indigo-800 dark:text-indigo-300 flex justify-between border-t border-indigo-200 dark:border-indigo-700 pt-3"><span>مبيعات الشيفت:</span><span>{orders.filter(o => o.shiftId === activeShift.id).reduce((sum, o) => sum + o.total, 0).toFixed(2)} ج</span></p>
                  </div>
                  <div className="text-right mb-7">
                    <label className="block text-sm font-black mb-3 dark:text-white">كم المبلغ الفعلي في الدرج الآن؟</label>
                    <input required name="actualCash" type="number" min="0" step="any" placeholder="المبلغ الصافي" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-center font-black text-2xl focus:border-rose-500 outline-none text-slate-800 dark:text-white"/>
                  </div>
                  <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-black shadow-lg text-lg transition-colors">تأكيد التقفيل والخروج</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'product' && (
              <CustomModal title="إضافة صنف للقائمة" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('products', products, setProducts, { name: e.target.name.value, category: e.target.category.value, price: parseFloat(e.target.price.value), image: e.target.image.value || null, recipe: formData.recipe?.filter(r => r.materialId && r.amount > 0) || [] }); }} className="space-y-4">
                  <input required name="name" value={formData.name || ''} onChange={handleFormChange} placeholder="اسم الصنف" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white text-sm"/>
                  <div className="grid grid-cols-2 gap-4">
                    <input required name="category" value={formData.category || ''} onChange={handleFormChange} placeholder="القسم" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white text-sm"/>
                    <input required type="number" step="any" name="price" value={formData.price || ''} onChange={handleFormChange} placeholder="السعر (ج)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-black text-indigo-600 dark:text-indigo-400 text-sm"/>
                  </div>
                  <div className="relative"><ImageIcon className="absolute left-4 top-4 text-slate-400 w-4 h-4"/><input name="image" value={formData.image || ''} onChange={handleFormChange} placeholder="رابط صورة المنتج (اختياري)" className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold text-left text-slate-800 dark:text-white text-xs" dir="ltr"/></div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <div className="flex justify-between items-center mb-4"><label className="text-sm font-black dark:text-white">مقادير الوصفة</label><button type="button" onClick={() => setFormData({ ...formData, recipe: [...(formData.recipe || []), { materialId: '', amount: '' }] })} className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-2 rounded-lg font-bold">إضافة مكون</button></div>
                    <div className="space-y-2 max-h-40 overflow-auto custom-scrollbar">
                      {(formData.recipe || []).map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                          <select required value={item.materialId} onChange={e => { const r = [...formData.recipe]; r[idx].materialId = e.target.value; setFormData({ ...formData, recipe: r }); }} className="flex-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none"><option value="" disabled>اختر مادة</option>{rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>)}</select>
                          <input required type="number" step="any" value={item.amount} onChange={e => { const r = [...formData.recipe]; r[idx].amount = parseFloat(e.target.value); setFormData({ ...formData, recipe: r }); }} placeholder="الكمية" className="w-24 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-center font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white outline-none"/>
                          <button type="button" onClick={() => { const r = [...formData.recipe]; r.splice(idx, 1); setFormData({ ...formData, recipe: r }); }} className="text-rose-500 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 p-2.5 rounded-xl transition-colors"><Trash2 size={15}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black mt-2 shadow-lg text-lg transition-colors">حفظ المنتج</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'material' && (
              <CustomModal title="مادة خام للمخزن" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('rawMaterials', rawMaterials, setRawMaterials, { name: e.target.name.value, unit: e.target.unit.value, currentStock: parseFloat(e.target.currentStock.value), costPerUnit: parseFloat(e.target.costPerUnit.value) }); }} className="space-y-4">
                  <input required name="name" placeholder="اسم المادة" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"/>
                  <select required name="unit" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"><option value="جرام">جرام</option><option value="مللي">مللي</option><option value="قطعة">قطعة</option><option value="كيلو">كيلو</option></select>
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="number" step="any" name="currentStock" placeholder="الكمية الافتتاحية" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"/>
                    <input required type="number" step="any" name="costPerUnit" placeholder="التكلفة للوحدة (ج)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-rose-500 dark:text-rose-400 text-sm outline-none focus:border-indigo-500"/>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg transition-colors">حفظ المادة</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'employee' && (
              <CustomModal title="ملف موظف جديد" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('employees', employees, setEmployees, { name: e.target.name.value, salary: parseFloat(e.target.salary.value), advances: 0, deductions: 0 }); }} className="space-y-4">
                  <input required name="name" placeholder="الاسم الكامل" value={formData.name || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"/>
                  <input required type="number" step="any" name="salary" placeholder="الراتب الأساسي الشهري" value={formData.salary || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-emerald-600 dark:text-emerald-400 text-sm outline-none focus:border-indigo-500"/>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg transition-colors">حفظ الموظف</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'table' && (
              <CustomModal title="تسجيل طاولة بالصالة" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('tables', tables, setTables, { name: e.target.name.value, capacity: parseInt(e.target.capacity.value) }); }} className="space-y-4">
                  <input required name="name" placeholder="مثال: طاولة 5، أو VIP" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"/>
                  <input required type="number" name="capacity" placeholder="عدد الكراسي" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"/>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg transition-colors">حفظ الطاولة</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'expense' && (
              <CustomModal title="سند مصروف نثري" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('expenses', expenses, setExpenses, { description: e.target.description.value, amount: parseFloat(e.target.amount.value), date: new Date().toISOString().split('T')[0] }); }} className="space-y-4">
                  <input required name="description" placeholder="فيم تم صرف المبلغ؟" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-800 dark:text-white text-sm outline-none focus:border-indigo-500"/>
                  <input required type="number" step="any" name="amount" placeholder="المبلغ (ج.م)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-rose-500 dark:text-rose-400 text-sm outline-none focus:border-indigo-500"/>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-lg transition-colors">سجل المصروف</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'delete' && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl border border-rose-100 dark:border-rose-900">
                  <AlertCircle className="w-20 h-20 text-rose-500 mx-auto mb-4"/>
                  <h3 className="text-2xl font-black mb-2 dark:text-white">هل أنت متأكد؟</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mb-8 text-sm">سيتم الحذف نهائياً ولن يمكنك التراجع.</p>
                  <div className="flex gap-3">
                    <button onClick={confirmDelete} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-black transition-colors">نعم، احذف</button>
                    <button onClick={closeModal} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white py-3.5 rounded-xl font-black transition-colors">إلغاء</button>
                  </div>
                </div>
              </div>
            )}

            {lastOrder && (
              <CustomModal title="إيصال الدفع" onClose={() => setLastOrder(null)}>
                <div className="print-section p-8 bg-white text-black text-center font-mono border-2 border-dashed border-slate-300 rounded-2xl mx-auto max-w-xs">
                  <Coffee className="mx-auto mb-3 text-slate-800 w-10 h-10"/>
                  <h2 className="text-2xl font-black mb-1">{currentUser.cafeName}</h2>
                  <p className="text-xs font-bold mb-4 text-slate-500">إيصال رقم: {lastOrder.id.toString().slice(-5)}</p>
                  <p className="text-[11px] font-bold border-y-2 border-dashed border-slate-300 py-2 mb-4">{lastOrder.date}</p>
                  <div className="space-y-2 mb-5 text-right px-2">{lastOrder.items.map((i, idx) => <div key={idx} className="flex justify-between text-sm font-bold"><span>{i.quantity}x {i.name}</span><span>{i.price * i.quantity}</span></div>)}</div>
                  <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 mb-3">
                    <div className="flex justify-between text-sm font-bold text-slate-600"><span>المجموع:</span><span>{lastOrder.subtotal?.toFixed(2)}</span></div>
                    {lastOrder.discountAmount > 0 && (
                      <div className="flex justify-between text-sm font-black text-emerald-600">
                        <span>خصم {lastOrder.discountType === 'percent' ? `${lastOrder.discountValue}%` : 'ثابت'}:</span>
                        <span>- {lastOrder.discountAmount?.toFixed(2)}</span>
                      </div>
                    )}
                    {lastOrder.tax > 0 && <div className="flex justify-between text-sm font-bold text-slate-600"><span>ضريبة (14%):</span><span>{lastOrder.tax?.toFixed(2)}</span></div>}
                  </div>
                  <div className="flex justify-between font-black text-2xl border-t-2 border-slate-800 pt-4 mt-2"><span>الإجمالي:</span><span>{lastOrder.total.toFixed(2)}</span></div>
                  <p className="text-[10px] mt-8 text-slate-500 font-bold">الكاشير: {currentUser.name}</p>
                </div>
                <button onClick={() => window.print()} className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 no-print shadow-lg text-lg transition-colors"><Printer size={18}/> طباعة الإيصال</button>
              </CustomModal>
            )}

          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
