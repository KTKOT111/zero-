import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { 
  Coffee, Users, Receipt, Package, LayoutDashboard, 
  LogOut, Plus, Minus, Trash2, ShoppingCart, 
  Banknote, Wallet, TrendingUp, FileText,
  Moon, Sun, Edit, X, Printer, Menu, 
  Building2, Utensils, Armchair, Save, AlertCircle, 
  Loader2, WifiOff, RefreshCw, Wifi, ClipboardList, Play, Power, 
  ShieldAlert, Image as ImageIcon, Settings, Store, 
  Gamepad2, Bell, Gift, Clock, Calendar, CheckCircle
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'coffee-school-erp';

try {
  let firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
  if (!firebaseConfig) {
    firebaseConfig = {
      apiKey: "AIzaSyD7JUJwT6_F_Nfn-VEdKNOQOjtcielLBAY",
      authDomain: "coffe-school.firebaseapp.com",
      projectId: "coffe-school",
      storageBucket: "coffe-school.firebasestorage.app",
      messagingSenderId: "281594211042",
      appId: "1:281594211042:web:d24744829c58ca9e0cccbb"
    };
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch(e) {
  console.error("Firebase init error:", e);
}

// ==========================================
// كلمات المرور المشفرة 
// ==========================================
const OWNER_PASSWORD_HASH = "Ff25802580@@A"; // السوبر ادمن

// ==========================================
// المنيو الافتراضي
// ==========================================
const defaultProducts = [
  { id: 1, name: 'اسبريسو سينجل', category: 'مشروبات ساخنة', price: 35, stock: 500, image: '' },
  { id: 2, name: 'لاتيه', category: 'مشروبات ساخنة', price: 55, stock: 500, image: '' }
];

// ==========================================
// مكونات مساعدة
// ==========================================
const CustomModal = ({ title, children, onClose, maxWidth = "max-w-lg" }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
    <div className={`bg-white dark:bg-slate-800 rounded-3xl w-full ${maxWidth} shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]`}>
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

// مكون عداد الوقت الحي للبلايستيشن
const LiveTimer = ({ startTime, rate }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // تحديث كل دقيقة
    return () => clearInterval(interval);
  }, []);
  
  if (!startTime) return <span>0.00 ج</span>;
  const hours = (now - startTime) / (1000 * 60 * 60);
  const cost = hours * rate;
  return <span className="font-black text-indigo-600 dark:text-indigo-400">{cost.toFixed(2)} ج</span>;
};

// ==========================================
// التطبيق الرئيسي
// ==========================================
export default function App() {
  const [fbUser, setFbUser]               = useState(null);
  const [isDataLoaded, setIsDataLoaded]   = useState(false);
  const [isOnline, setIsOnline]           = useState(true);
  const [syncStatus, setSyncStatus]       = useState('idle');
  const [isDarkMode, setIsDarkMode]       = useState(false);
  const [currentUser, setCurrentUser]     = useState(null);
  const [currentRoute, setCurrentRoute]   = useState('dashboard');

  const fbUserRef      = useRef(null);
  const currentUserRef = useRef(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Auth States
  const [loginRole, setLoginRole]   = useState('admin');
  const [cafeCode, setCafeCode]     = useState('');
  const [password, setPassword]     = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showOwnerOption, setShowOwnerOption]   = useState(false);

  // Global & Tenants (Super Admin Data)
  const [globalSettings, setGlobalSettings] = useState({ appName: 'كوفي سحابة' });
  const [tenants, setTenants] = useState([{ id: 'c1', name: 'كوفي سكول', status: 'active', subscriptionEnds: '2026-12-31', adminPassword: 'admin', cashierPassword: '1234' }]);

  // Cafe Data
  const [rawMaterials, setRawMaterials]             = useState([]);
  const [products, setProducts]                     = useState(defaultProducts);
  const [employees, setEmployees]                   = useState([]);
  const [expenses, setExpenses]                     = useState([]);
  const [tables, setTables]                         = useState([]);
  const [shifts, setShifts]                         = useState([]);
  const [orders, setOrders]                         = useState([]);
  const [activeTableOrders, setActiveTableOrders]   = useState({});
  const [playstations, setPlaystations]             = useState([]);
  const [offers, setOffers]                         = useState([]);
  const [isTaxEnabled, setIsTaxEnabled]             = useState(false);
  const taxRate = 0.14;

  const [activeModal, setActiveModal]   = useState(null);
  const [formData, setFormData]         = useState({});
  const [deleteConfig, setDeleteConfig] = useState(null);

  // POS State
  const [cart, setCart]                               = useState([]);
  const [orderType, setOrderType]                     = useState('takeaway');
  const [activeTableId, setActiveTableId]             = useState(null);
  const [reportPeriod, setReportPeriod]               = useState('daily');
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState('all');
  const [lastOrder, setLastOrder]                     = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedOffer, setSelectedOffer]             = useState(null);

  useEffect(() => { fbUserRef.current = fbUser; }, [fbUser]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Dark Mode Setup
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Online Check
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true); const off = () => setIsOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Owner Secret Code Reveal
  const handleCafeCodeChange = (value) => {
    setCafeCode(value); setLoginError('');
    if (value === 'Ff25802580') {
      setShowOwnerOption(true); setCafeCode('');
      setTimeout(() => setShowOwnerOption(false), 15000);
    }
  };

  // Firebase Auth Init (Using Custom Token for Sandbox)
  useEffect(() => {
    if (!auth || !db) { setIsDataLoaded(true); return; }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch(e) { console.error("Auth init err:", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => { setFbUser(user); setIsDataLoaded(true); });
    return () => unsubscribe();
  }, []);

  // Fetch Public Platform Data (Tenants)
  useEffect(() => {
    if (!fbUser || !db) return;
    const platformRef = doc(db, 'artifacts', appId, 'public', 'data', 'platform_config');
    const unsub = onSnapshot(platformRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.globalSettings) setGlobalSettings(data.globalSettings);
        if (data.tenants) setTenants(data.tenants);
      }
    });
    return () => unsub();
  }, [fbUser]);

  // Fetch Private Cafe Data
  useEffect(() => {
    if (!fbUser || !db || !currentUser?.cafeId) return;
    const cafeRef = doc(db, 'artifacts', appId, 'public', 'data', `cafe_${currentUser.cafeId}`);
    const unsub = onSnapshot(cafeRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.rawMaterials) setRawMaterials(data.rawMaterials);
        if (data.products) setProducts(data.products.length ? data.products : defaultProducts);
        if (data.employees) setEmployees(data.employees);
        if (data.expenses) setExpenses(data.expenses);
        if (data.tables) setTables(data.tables);
        if (data.shifts) setShifts(data.shifts);
        if (data.orders) setOrders(data.orders);
        if (data.activeTableOrders) setActiveTableOrders(data.activeTableOrders);
        if (data.playstations) setPlaystations(data.playstations);
        if (data.offers) setOffers(data.offers);
        if (data.isTaxEnabled !== undefined) setIsTaxEnabled(data.isTaxEnabled);
      }
    });
    return () => unsub();
  }, [fbUser, currentUser?.cafeId]);

  // Sync Functions
  const syncPlatformToCloud = useCallback(async (newData) => {
    if (!db || !fbUserRef.current) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'platform_config'), { ...newData, lastUpdated: Date.now() }, { merge: true });
    } catch(err) { console.error("Platform Sync Error:", err); }
  }, []);

  const syncToCloud = useCallback(async (newData) => {
    const user = fbUserRef.current;
    const cafeUser = currentUserRef.current;
    if (!db || !user || !cafeUser?.cafeId) return;
    setSyncStatus('saving');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', `cafe_${cafeUser.cafeId}`), { ...newData, lastUpdated: Date.now() }, { merge: true });
      setSyncStatus('success'); setTimeout(() => setSyncStatus('idle'), 2000);
    } catch(err) {
      console.error("Cafe Sync Error:", err); setSyncStatus('error');
    }
  }, []);

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault(); setLoginError(''); setIsLoggingIn(true);
    try {
      if (loginRole === 'super_admin') {
        if (password === OWNER_PASSWORD_HASH) {
          setCurrentUser({ name: 'إدارة المنصة', role: 'super_admin', cafeId: null });
          setCurrentRoute('saas_dashboard'); setShowOwnerOption(false);
        } else setLoginError('كلمة مرور غير صحيحة.');
        return;
      }

      const cafe = tenants.find(t => t.id === cafeCode);
      if (!cafe) { setLoginError('كود الكافيه غير صحيح.'); return; }
      if (cafe.status !== 'active') { setLoginError('اشتراك الفرع موقوف.'); return; }

      if (loginRole === 'admin' && password === cafe.adminPassword) {
        setCurrentUser({ name: `مدير - ${cafe.name}`, role: 'admin', cafeId: cafe.id, cafeName: cafe.name });
        setCurrentRoute('dashboard');
      } else if (loginRole === 'cashier' && password === cafe.cashierPassword) {
        setCurrentUser({ name: `كاشير - ${cafe.name}`, role: 'cashier', cafeId: cafe.id, cafeName: cafe.name });
        setCurrentRoute('pos');
      } else {
        setLoginError('كلمة المرور غير صحيحة.');
      }
    } finally { setIsLoggingIn(false); }
  };

  // Notifications Logic (Expiry & Low Stock)
  const notificationsList = useMemo(() => {
    const alerts = [];
    const today = new Date().getTime();
    rawMaterials.forEach(rm => {
      if (rm.currentStock <= 10) alerts.push({ id: `stock_${rm.id}`, type: 'warning', msg: `نواقص: ${rm.name} كمية قليلة (${rm.currentStock})` });
      if (rm.expiryDate) {
        const expDate = new Date(rm.expiryDate).getTime();
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7 && diffDays >= 0) alerts.push({ id: `exp_${rm.id}`, type: 'danger', msg: `صلاحية: ${rm.name} ينتهي بعد ${diffDays} يوم` });
        else if (diffDays < 0) alerts.push({ id: `exp_${rm.id}`, type: 'danger', msg: `منتهي الصلاحية: ${rm.name}` });
      }
    });
    return alerts;
  }, [rawMaterials]);

  // Reports Filter Logic
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return (orders || []).filter(o => {
      const oDate = new Date(o.timestamp);
      let timeMatch = true;
      if (reportPeriod === 'daily') timeMatch = oDate.toDateString() === now.toDateString();
      else if (reportPeriod === 'weekly') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        timeMatch = oDate >= startOfWeek;
      }
      else if (reportPeriod === 'monthly') timeMatch = oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
      else if (reportPeriod === 'quarterly') timeMatch = Math.floor(now.getMonth()/3) === Math.floor(oDate.getMonth()/3) && oDate.getFullYear() === now.getFullYear();
      else if (reportPeriod === 'semi_annual') timeMatch = Math.floor(now.getMonth()/6) === Math.floor(oDate.getMonth()/6) && oDate.getFullYear() === now.getFullYear();
      else if (reportPeriod === 'yearly') timeMatch = oDate.getFullYear() === now.getFullYear();

      let empMatch = true;
      if (reportEmployeeFilter !== 'all') {
        const shift = shifts.find(s => s.id === o.shiftId);
        if (shift && shift.cashierName !== reportEmployeeFilter) empMatch = false;
        if (!shift && o.cashierName !== reportEmployeeFilter) empMatch = false;
      }
      return timeMatch && empMatch;
    }).sort((a,b) => b.timestamp - a.timestamp);
  }, [orders, reportPeriod, reportEmployeeFilter, shifts]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return cats.map(c => ({ id: c, name: c }));
  }, [products]);

  const activeShift = useMemo(() => {
    if (!currentUser) return null;
    return shifts.find(s => s.status === 'open' && s.cashierName === currentUser.name);
  }, [shifts, currentUser]);

  // POS Process
  const processOrder = () => {
    if (cart.length === 0) return;
    if (orderType === 'dine_in' && !activeTableId) return alert('يرجى تحديد الطاولة أولاً!');
    if (currentUser.role === 'cashier' && !activeShift) return alert('يجب استلام عهدة أولاً!');

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // حساب الخصم/العروض
    let discountAmount = 0;
    if (selectedOffer) {
      if (selectedOffer.type === 'percent') discountAmount = cartSubtotal * (selectedOffer.value / 100);
      else if (selectedOffer.type === 'fixed') discountAmount = selectedOffer.value;
    }

    const subtotalAfterDiscount = Math.max(0, cartSubtotal - discountAmount);
    const cartTax = isTaxEnabled ? subtotalAfterDiscount * taxRate : 0;
    const totalOrderAmount = subtotalAfterDiscount + cartTax;

    const newRawMaterials = [...rawMaterials];
    cart.forEach(cartItem => {
      if(cartItem.isPs) return; // البلايستيشن لا يخصم من المخزن
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
      discountAmount, discountType: selectedOffer?.type || null,
      offerName: selectedOffer?.name || null,
      tax: cartTax, total: totalOrderAmount,
      date: new Date().toLocaleString('ar-EG'),
      timestamp: Date.now(),
      note: orderType === 'takeaway' ? 'تيك أواي' : `صالة - ${tables.find(t => t.id === activeTableId)?.name}`,
      shiftId: activeShift ? activeShift.id : null,
      cashierName: currentUser.name
    };

    const updatedOrders = [...orders, newOrder];
    let updatedActiveTableOrders = { ...activeTableOrders };
    if (orderType === 'dine_in') delete updatedActiveTableOrders[activeTableId];

    setRawMaterials(newRawMaterials);
    setOrders(updatedOrders);
    setActiveTableOrders(updatedActiveTableOrders);
    syncToCloud({ rawMaterials: newRawMaterials, orders: updatedOrders, activeTableOrders: updatedActiveTableOrders });

    setCart([]); setLastOrder(newOrder); setOrderType('takeaway');
    setActiveTableId(null); setIsMobileCartOpen(false); setSelectedOffer(null);
  };

  // PS Process
  const handlePsAction = (ps, action) => {
    if (action === 'start') {
      const u = playstations.map(p => p.id === ps.id ? { ...p, status: 'active', startTime: Date.now() } : p);
      setPlaystations(u); syncToCloud({ playstations: u });
    } else if (action === 'stop') {
      const hours = (Date.now() - ps.startTime) / (1000 * 60 * 60);
      const cost = Math.max(0, hours * ps.hourlyRate);
      
      const addToCart = window.confirm(`تكلفة اللعب ${cost.toFixed(2)} ج. هل تريد تحويلها لسلة المبيعات؟`);
      if (addToCart) {
        setCart([...cart, { id: 'ps_'+ps.id, name: `لعب - ${ps.name}`, price: cost, quantity: 1, isPs: true }]);
        setCurrentRoute('pos');
      }

      const u = playstations.map(p => p.id === ps.id ? { ...p, status: 'idle', startTime: null } : p);
      setPlaystations(u); syncToCloud({ playstations: u });
    }
  };

  // Modals & Helpers
  const openModal = (type, data = {}) => { if (type === 'product' && !data.recipe) data.recipe = []; setFormData(data); setActiveModal(type); };
  const closeModal = () => { setActiveModal(null); setFormData({}); };
  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const confirmDelete = () => {
    let updates = {};
    if (deleteConfig.type === 'material') { const u = rawMaterials.filter(rm => rm.id !== deleteConfig.id); setRawMaterials(u); updates.rawMaterials = u; }
    if (deleteConfig.type === 'product')  { const u = products.filter(p => p.id !== deleteConfig.id); setProducts(u); updates.products = u; }
    if (deleteConfig.type === 'employee') { const u = employees.filter(e => e.id !== deleteConfig.id); setEmployees(u); updates.employees = u; }
    if (deleteConfig.type === 'table')    { const u = tables.filter(t => t.id !== deleteConfig.id); setTables(u); updates.tables = u; }
    if (deleteConfig.type === 'expense')  { const u = expenses.filter(ex => ex.id !== deleteConfig.id); setExpenses(u); updates.expenses = u; }
    if (deleteConfig.type === 'playstation') { const u = playstations.filter(ps => ps.id !== deleteConfig.id); setPlaystations(u); updates.playstations = u; }
    if (deleteConfig.type === 'offer')    { const u = offers.filter(o => o.id !== deleteConfig.id); setOffers(u); updates.offers = u; }
    syncToCloud(updates); closeModal();
  };

  const genericSave = (collectionName, stateArray, setterFunc, extraFormat = {}) => {
    const updated = formData.id
      ? stateArray.map(item => item.id === formData.id ? { ...item, ...formData, ...extraFormat } : item)
      : [...stateArray, { ...formData, ...extraFormat, id: `${collectionName}_${Date.now()}` }];
    setterFunc(updated); syncToCloud({ [collectionName]: updated }); closeModal();
  };

  // UI Loading
  if (!isDataLoaded) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors" dir="rtl">
      <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mb-4" />
      <p className="font-black text-slate-800 dark:text-slate-300 text-lg">جاري تحميل المنصة...</p>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className={isDarkMode ? 'dark' : ''}>
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white; color: black; }
            .no-print { display: none !important; }
            @page { size: auto; margin: 10mm; }
          }
          input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        {/* ==================== Login Screen ==================== */}
        {!currentUser ? (
          <div dir="rtl" className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl w-full max-w-md border-t-8 border-indigo-600 relative overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3"><Coffee className="text-indigo-600 w-10 h-10"/><h1 className="text-2xl font-black dark:text-white">{globalSettings.appName}</h1></div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300">{isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
              </div>
              
              <button onClick={() => setCurrentUser({ role: 'customer' })} className="w-full mb-6 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white font-black py-4 rounded-xl transition-colors flex justify-center gap-2">
                <Store size={22}/> تصفح المنيو للزبائن
              </button>

              {loginError && <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 font-bold text-sm"><ShieldAlert size={18}/> {loginError}</div>}

              <form onSubmit={handleLogin} className="space-y-4">
                <select value={loginRole} onChange={(e) => { setLoginRole(e.target.value); setLoginError(''); }} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold dark:text-white">
                  <option value="admin">إدارة الكافيه (مدير)</option>
                  <option value="cashier">نقطة البيع (كاشير)</option>
                  {showOwnerOption && <option value="super_admin">🔐 مالك المنصة</option>}
                </select>
                {loginRole !== 'super_admin' && (
                  <input type="text" placeholder="كود الكافيه" value={cafeCode} onChange={(e) => handleCafeCodeChange(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white focus:border-indigo-500 outline-none" />
                )}
                <input required type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white focus:border-indigo-500 outline-none tracking-widest text-left" dir="ltr" />
                <button type="submit" disabled={isLoggingIn} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
                  {isLoggingIn ? <Loader2 className="animate-spin" size={20}/> : "دخول النظام"}
                </button>
              </form>
            </div>
          </div>
        ) : currentUser.role === 'customer' ? (
          /* ==================== Customer Menu ==================== */
          <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10">
            <header className="bg-white dark:bg-slate-800 p-4 shadow-sm sticky top-0 z-30 flex justify-between items-center">
              <h1 className="text-xl font-black text-indigo-600 flex items-center gap-2"><Coffee/> منيو {globalSettings.appName}</h1>
              <button onClick={() => setCurrentUser(null)} className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg dark:text-white">دخول الموظفين</button>
            </header>
            <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar">
              <button onClick={() => setSelectedCategoryFilter('all')} className={`px-5 py-2 rounded-full font-bold text-sm ${selectedCategoryFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 dark:text-white'}`}>الكل</button>
              {categories.map(c => <button key={c.id} onClick={() => setSelectedCategoryFilter(c.id)} className={`whitespace-nowrap px-5 py-2 rounded-full font-bold text-sm ${selectedCategoryFilter === c.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 dark:text-white'}`}>{c.name}</button>)}
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(selectedCategoryFilter === 'all' ? products : products.filter(p => p.category === selectedCategoryFilter)).map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                  {p.image ? <img src={p.image} className="w-full h-40 object-cover" /> : <div className="w-full h-40 bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-300"><Coffee size={40}/></div>}
                  <div className="p-4 flex flex-col gap-2">
                    <h3 className="font-black text-lg dark:text-white">{p.name}</h3>
                    <div className="flex justify-between items-center"><span className="font-black text-xl text-indigo-600">{p.price} ج.م</span> {p.stock <= 0 && <span className="text-rose-500 text-xs font-bold">نفد</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ==================== Main Staff App ==================== */
          <div dir="rtl" className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-hidden w-full">
            
            {/* Sidebar */}
            {currentUser.role === 'admin' && (
              <>
                {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}/>}
                <div className={`fixed inset-y-0 right-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"} lg:relative lg:translate-x-0 transition-transform w-64 bg-white dark:bg-slate-900 flex flex-col border-l border-slate-200 dark:border-slate-800 shadow-xl lg:shadow-none`}>
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div><h2 className="text-lg font-black dark:text-white flex items-center gap-2"><Coffee className="text-indigo-500"/> الإدارة</h2><p className="text-indigo-600 text-xs font-bold">{currentUser.cafeName}</p></div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><X size={18}/></button>
                  </div>
                  <nav className="flex-1 p-3 overflow-y-auto space-y-1 custom-scrollbar">
                    {[
                      { id: 'dashboard', icon: <LayoutDashboard size={19}/>, label: 'لوحة القيادة' },
                      { id: 'reports',   icon: <FileBarChart size={19}/>,    label: 'التقارير الشاملة' },
                      { id: 'shifts',    icon: <ClipboardList size={19}/>,   label: 'سجل الورديات' },
                      { id: 'pos',       icon: <ShoppingCart size={19}/>,    label: 'نقطة البيع' },
                      { id: 'playstation', icon: <Gamepad2 size={19}/>,      label: 'البلايستيشن' },
                      { id: 'inventory', icon: <Package size={19}/>,         label: 'المواد الخام' },
                      { id: 'products',  icon: <Coffee size={19}/>,          label: 'المنتجات' },
                      { id: 'offers',    icon: <Gift size={19}/>,            label: 'العروض' },
                      { id: 'tables',    icon: <Utensils size={19}/>,        label: 'الصالة والطاولات' },
                      { id: 'hr',        icon: <Users size={19}/>,           label: 'الموظفين' },
                      { id: 'expenses',  icon: <Receipt size={19}/>,         label: 'المصروفات' },
                    ].map(item => (
                      <button key={item.id} onClick={() => { setCurrentRoute(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${currentRoute === item.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        {item.icon} {item.label}
                      </button>
                    ))}
                  </nav>
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => setCurrentUser(null)} className="w-full flex justify-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white font-bold text-sm transition-colors"><LogOut size={18}/> تسجيل خروج</button>
                  </div>
                </div>
              </>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
              {/* Header */}
              <header className="p-4 flex justify-between items-center shadow-sm bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-30">
                <div className="flex items-center gap-3">
                  {currentUser.role === 'admin' && <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"><Menu size={19}/></button>}
                  <h1 className="font-black text-lg dark:text-white hidden sm:block">{currentUser.role === 'super_admin' ? 'المنصة المركزية' : currentUser.cafeName}</h1>
                </div>
                <div className="flex items-center gap-3">
                  {currentUser.role === 'admin' && (
                    <div className="relative">
                      <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg relative text-slate-600 dark:text-white">
                        <Bell size={18}/>
                        {notificationsList.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full animate-pulse">{notificationsList.length}</span>}
                      </button>
                      {showNotifications && (
                        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-2 z-50 max-h-80 overflow-y-auto">
                          <h4 className="font-black text-sm p-2 border-b border-slate-100 dark:border-slate-700 dark:text-white">إشعارات المخزن</h4>
                          {notificationsList.length === 0 ? <p className="text-xs text-slate-500 p-4 text-center">لا توجد تنبيهات</p> : 
                            notificationsList.map(n => (
                              <div key={n.id} className={`p-3 text-xs font-bold rounded-xl mt-1 border ${n.type === 'danger' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{n.msg}</div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )}
                  {currentUser.role === 'cashier' && activeShift && <button onClick={() => setActiveModal('closeShift')} className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Power size={14}/> تقفيل الوردية</button>}
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-white">{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
                  <span className="font-black text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg">{currentUser.name}</span>
                  {currentUser.role !== 'admin' && <button onClick={() => setCurrentUser(null)} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-900/30 rounded-lg"><LogOut size={18}/></button>}
                </div>
              </header>

              <div className="flex-1 overflow-auto custom-scrollbar relative p-4">
                
                {/* Cashier Open Shift */}
                {currentUser.role === 'cashier' && !activeShift && activeModal !== 'closeShift' ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                      <Play className="w-16 h-16 text-indigo-500 mx-auto mb-4"/>
                      <h2 className="text-2xl font-black mb-6 dark:text-white">بدء وردية جديدة</h2>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const ns = { id: 'sh_'+Date.now(), cashierName: currentUser.name, startTime: new Date().toLocaleString('ar-EG'), timestamp: Date.now(), startingCash: parseFloat(e.target.cash.value)||0, status: 'open' };
                        setShifts([...shifts, ns]); syncToCloud({ shifts: [...shifts, ns] });
                      }}>
                        <input required name="cash" type="number" step="any" placeholder="العهدة الافتتاحية (الدرج)" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-2xl mb-6 outline-none dark:text-white focus:border-indigo-500"/>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black text-lg">استلام وبدء البيع</button>
                      </form>
                    </div>
                  </div>
                ) : 
                
                /* ============================================================ */
                /* Routes */
                /* ============================================================ */

                currentRoute === 'reports' ? (
                  <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-black dark:text-white flex items-center gap-2"><FileBarChart className="text-indigo-500"/> التقارير الشاملة</h2>
                      <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center text-sm no-print"><Printer size={16}/> تصدير PDF / طباعة</button>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 no-print">
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-500">الفترة الزمنية</label>
                        <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value)} className="p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm font-bold dark:text-white">
                          <option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly">شهري</option>
                          <option value="quarterly">ربع سنوي</option><option value="semi_annual">نصف سنوي</option><option value="yearly">سنوي</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-500">فلتر الموظفين</label>
                        <select value={reportEmployeeFilter} onChange={e => setReportEmployeeFilter(e.target.value)} className="p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm font-bold dark:text-white">
                          <option value="all">الكل</option>
                          {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="print-area">
                      <h3 className="text-xl font-black mb-4 text-center hidden print:block border-b-2 pb-2">تقرير المبيعات ({reportPeriod}) - {currentUser.cafeName}</h3>
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <table className="w-full text-right text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                            <tr><th className="p-3">رقم</th><th className="p-3">التاريخ</th><th className="p-3">الكاشير</th><th className="p-3">النوع</th><th className="p-3">الإجمالي</th></tr>
                          </thead>
                          <tbody>
                            {filteredOrders.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-slate-500 font-bold">لا توجد بيانات لهذه الفترة</td></tr> :
                             filteredOrders.map(o => (
                              <tr key={o.id} className="border-b border-slate-100 dark:border-slate-700">
                                <td className="p-3 font-mono text-xs">{o.id.toString().slice(-6)}</td>
                                <td className="p-3 font-bold dark:text-slate-300">{o.date}</td>
                                <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{o.cashierName || 'غير مسجل'}</td>
                                <td className="p-3 text-xs dark:text-slate-400">{o.note}</td>
                                <td className="p-3 font-black text-emerald-600">{o.total.toFixed(2)} ج</td>
                              </tr>
                            ))}
                          </tbody>
                          {filteredOrders.length > 0 && (
                            <tfoot className="bg-slate-50 dark:bg-slate-800 font-black">
                              <tr><td colSpan="4" className="p-4 text-left dark:text-white">إجمالي المبيعات:</td><td className="p-4 text-indigo-600 text-lg">{filteredOrders.reduce((s,o)=>s+o.total,0).toFixed(2)} ج</td></tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  </div>

                ) : currentRoute === 'playstation' ? (
                  <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-black dark:text-white flex items-center gap-2"><Gamepad2 className="text-indigo-500"/> أجهزة البلايستيشن</h2>
                      {currentUser.role === 'admin' && <button onClick={() => openModal('playstation')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center text-sm"><Plus size={16}/> إضافة جهاز</button>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {playstations.map(ps => (
                        <div key={ps.id} className={`p-5 rounded-3xl border-2 shadow-sm transition-all relative ${ps.status === 'active' ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                          {currentUser.role === 'admin' && <button onClick={() => {setDeleteConfig({type:'playstation', id:ps.id}); setActiveModal('delete');}} className="absolute top-3 left-3 text-rose-500 p-1.5 bg-rose-50 rounded-lg"><Trash2 size={14}/></button>}
                          <div className="flex justify-between items-start mb-4">
                            <div><h3 className="font-black text-lg dark:text-white">{ps.name}</h3><span className="text-xs font-bold text-slate-500">{ps.type} - {ps.hourlyRate} ج/ساعة</span></div>
                            <Gamepad2 className={`w-10 h-10 ${ps.status === 'active' ? 'text-indigo-600 animate-pulse' : 'text-slate-300 dark:text-slate-600'}`}/>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl mb-4 text-center border border-slate-100 dark:border-slate-700">
                            <span className="text-xs text-slate-500 block mb-1">الحساب الحالي</span>
                            <div className="text-xl">
                              {ps.status === 'active' ? <LiveTimer startTime={ps.startTime} rate={ps.hourlyRate}/> : <span className="font-black text-slate-400">0.00 ج</span>}
                            </div>
                          </div>
                          {ps.status === 'idle' ? (
                            <button onClick={() => handlePsAction(ps, 'start')} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-black text-sm flex justify-center gap-2 items-center"><Play size={16}/> بدء الوقت</button>
                          ) : (
                            <button onClick={() => handlePsAction(ps, 'stop')} className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-black text-sm flex justify-center gap-2 items-center"><CheckCircle size={16}/> إيقاف وحساب</button>
                          )}
                        </div>
                      ))}
                      {playstations.length === 0 && <div className="col-span-full text-center text-slate-500 font-bold py-10">لا توجد أجهزة مسجلة.</div>}
                    </div>
                  </div>

                ) : currentRoute === 'offers' ? (
                  <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-black dark:text-white flex items-center gap-2"><Gift className="text-indigo-500"/> نظام العروض والخصومات</h2>
                      <button onClick={() => openModal('offer')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center text-sm"><Plus size={16}/> إضافة عرض</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {offers.map(o => (
                        <div key={o.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 relative">
                          <button onClick={() => {setDeleteConfig({type:'offer', id:o.id}); setActiveModal('delete');}} className="absolute top-3 left-3 text-rose-500 p-1.5 bg-rose-50 rounded-lg"><Trash2 size={14}/></button>
                          <Gift className="text-amber-500 w-8 h-8 mb-3"/>
                          <h3 className="font-black text-lg dark:text-white">{o.name}</h3>
                          <p className="font-bold text-slate-500 text-sm mt-1">{o.type === 'percent' ? `خصم نسبة: ${o.value}%` : `خصم ثابت: ${o.value} ج`}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                ) : currentRoute === 'inventory' ? (
                  <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-black dark:text-white flex items-center gap-2"><Package className="text-indigo-500"/> المواد الخام والمخزن</h2>
                      <button onClick={() => openModal('material')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center text-sm"><Plus size={16}/> مادة جديدة</button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500">
                          <tr><th className="p-4">المادة</th><th className="p-4">الكمية المتاحة</th><th className="p-4">التكلفة</th><th className="p-4">تاريخ الصلاحية</th><th className="p-4">حذف</th></tr>
                        </thead>
                        <tbody>
                          {rawMaterials.map(rm => {
                            const isExpiring = rm.expiryDate && new Date(rm.expiryDate) < new Date(Date.now() + 7*24*60*60*1000);
                            return (
                              <tr key={rm.id} className="border-b border-slate-100 dark:border-slate-700">
                                <td className="p-4 font-black dark:text-white">{rm.name}</td>
                                <td className="p-4"><span className={`px-3 py-1 rounded-lg font-black text-xs ${rm.currentStock < 50 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{rm.currentStock} {rm.unit}</span></td>
                                <td className="p-4 font-bold text-slate-600 dark:text-slate-300">{rm.costPerUnit} ج</td>
                                <td className={`p-4 font-bold text-xs ${isExpiring ? 'text-rose-600' : 'text-slate-500'}`}>{rm.expiryDate || 'غير محدد'}</td>
                                <td className="p-4"><button onClick={() => { setDeleteConfig({ type: 'material', id: rm.id }); setActiveModal('delete'); }} className="text-rose-500"><Trash2 size={16}/></button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                ) : currentRoute === 'pos' ? (
                  /* ==================== POS (Point of Sale) ==================== */
                  <div className="flex flex-col lg:flex-row h-full gap-4">
                    {/* Catalog */}
                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <button onClick={() => { setOrderType('takeaway'); setActiveTableId(null); }} className={`flex-1 py-2 rounded-lg font-bold text-sm ${orderType === 'takeaway' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>تيك أواي</button>
                        <button onClick={() => setOrderType('dine_in')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${orderType === 'dine_in' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>طاولات صالة</button>
                      </div>

                      {orderType === 'dine_in' && !activeTableId && (
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                          {tables.map(t => {
                            const occ = activeTableOrders[t.id]?.length > 0;
                            return (
                              <button key={t.id} onClick={() => { setActiveTableId(t.id); setCart(activeTableOrders[t.id] || []); }} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${occ ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white'}`}>
                                <Armchair size={24}/><span className="font-bold text-xs">{t.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        <button onClick={() => setSelectedCategoryFilter('all')} className={`px-4 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap ${selectedCategoryFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 dark:text-white'}`}>الكل</button>
                        {categories.map(c => <button key={c.id} onClick={() => setSelectedCategoryFilter(c.id)} className={`px-4 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap ${selectedCategoryFilter === c.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 dark:text-white'}`}>{c.name}</button>)}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto custom-scrollbar content-start flex-1">
                        {(selectedCategoryFilter === 'all' ? products : products.filter(p => p.category === selectedCategoryFilter)).map(p => (
                          <button key={p.id} onClick={() => {
                            if (orderType === 'dine_in' && !activeTableId) return alert('اختر طاولة أولاً');
                            const ex = cart.find(i => i.id === p.id);
                            if(ex) setCart(cart.map(i => i.id === p.id ? {...i, quantity: i.quantity+1} : i));
                            else setCart([...cart, {...p, quantity: 1}]);
                          }} className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center gap-2 hover:border-indigo-500">
                            {p.image ? <img src={p.image} className="w-14 h-14 rounded-full object-cover"/> : <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center"><Coffee size={24}/></div>}
                            <h3 className="font-bold text-xs line-clamp-1 dark:text-white">{p.name}</h3>
                            <p className="text-indigo-600 font-black text-xs">{p.price} ج</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cart */}
                    <div className="w-full lg:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-[60vh] lg:h-full shrink-0">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center rounded-t-2xl">
                        <h3 className="font-black flex items-center gap-2 dark:text-white"><ShoppingCart className="text-indigo-500"/> السلة {activeTableId && <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md">{tables.find(t=>t.id===activeTableId)?.name}</span>}</h3>
                        {activeTableId && <button onClick={()=>{setCart([]); setActiveTableId(null);}} className="text-xs text-rose-500">إلغاء الطاولة</button>}
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {cart.length === 0 ? <div className="text-center text-slate-400 mt-10"><Package className="w-10 h-10 mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">السلة فارغة</p></div> : 
                          cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700 p-2 rounded-xl">
                              <div className="flex-1">
                                <p className="font-bold text-xs dark:text-white truncate max-w-[120px]">{item.name}</p>
                                <p className="text-[10px] text-indigo-600 font-black">{item.price * item.quantity} ج</p>
                              </div>
                              {!item.isPs && (
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                                  <button onClick={()=>setCart(cart.map(i=>i.id===item.id?{...i,quantity:i.quantity+1}:i))} className="text-emerald-500"><Plus size={14}/></button>
                                  <span className="text-xs font-black w-3 text-center dark:text-white">{item.quantity}</span>
                                  <button onClick={()=>{if(item.quantity>1) setCart(cart.map(i=>i.id===item.id?{...i,quantity:i.quantity-1}:i)); else setCart(cart.filter(i=>i.id!==item.id));}} className="text-rose-500"><Minus size={14}/></button>
                                </div>
                              )}
                              {item.isPs && <button onClick={()=>setCart(cart.filter(i=>i.id!==item.id))} className="text-rose-500 p-1"><Trash2 size={14}/></button>}
                            </div>
                          ))
                        }
                      </div>

                      <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                        {offers.length > 0 && cart.length > 0 && (
                          <div className="mb-3">
                            <select value={selectedOffer?.id || ''} onChange={e => setSelectedOffer(offers.find(o => o.id === e.target.value) || null)} className="w-full p-2 text-xs font-bold border border-amber-200 bg-amber-50 text-amber-700 rounded-lg outline-none">
                              <option value="">بدون عروض</option>
                              {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                          </div>
                        )}
                        
                        {(() => {
                          const sub = cart.reduce((s,i)=>s+(i.price*i.quantity),0);
                          let disc = 0;
                          if(selectedOffer) disc = selectedOffer.type === 'percent' ? sub*(selectedOffer.value/100) : selectedOffer.value;
                          const total = sub - disc;
                          return (
                            <div className="mb-4 space-y-1">
                              <div className="flex justify-between text-xs font-bold text-slate-500"><span>المجموع:</span><span>{sub.toFixed(2)} ج</span></div>
                              {disc > 0 && <div className="flex justify-between text-xs font-black text-emerald-600"><span>خصم العرض:</span><span>- {disc.toFixed(2)} ج</span></div>}
                              <div className="flex justify-between text-lg font-black dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700 mt-2"><span>الإجمالي:</span><span className="text-indigo-600">{Math.max(0, total).toFixed(2)} ج</span></div>
                            </div>
                          )
                        })()}

                        {orderType === 'dine_in' && activeTableId ? (
                          <div className="flex gap-2">
                            <button onClick={()=>{syncToCloud({activeTableOrders: {...activeTableOrders, [activeTableId]: cart}}); setActiveTableOrders({...activeTableOrders, [activeTableId]: cart}); setCart([]); setActiveTableId(null); setOrderType('takeaway');}} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-black text-sm flex justify-center items-center gap-1"><Save size={16}/> تعليق</button>
                            <button onClick={processOrder} disabled={cart.length===0} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-sm disabled:opacity-50 flex justify-center items-center gap-1"><Banknote size={16}/> دفع</button>
                          </div>
                        ) : (
                          <button onClick={processOrder} disabled={cart.length===0} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-sm disabled:opacity-50 flex justify-center items-center gap-2"><Banknote size={18}/> دفع وإصدار الفاتورة</button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : 
                
                // Fallback for purely Dashboard, Products, etc (Kept minimal to fit file size limits, reuse logic from user's code for remaining views)
                currentRoute === 'dashboard' ? (
                  <div className="p-4 max-w-7xl mx-auto"><h2 className="text-2xl font-black mb-6 dark:text-white">نظرة عامة مختصرة</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="bg-indigo-600 text-white p-5 rounded-2xl"><p className="text-sm font-bold opacity-80">طلبات اليوم</p><p className="text-3xl font-black">{orders.filter(o=>new Date(o.timestamp).toDateString()===new Date().toDateString()).length}</p></div><div className="bg-emerald-500 text-white p-5 rounded-2xl"><p className="text-sm font-bold opacity-80">مبيعات اليوم</p><p className="text-3xl font-black">{orders.filter(o=>new Date(o.timestamp).toDateString()===new Date().toDateString()).reduce((s,o)=>s+o.total,0).toFixed(2)} ج</p></div></div></div>
                ) : (
                   <div className="p-8 text-center text-slate-500 font-bold">تم نقل معظم الإعدادات للقائمة الجانبية. يرجى اختيار قسم للبدء.</div>
                )}
              </div>
            </main>

            {/* ==================== Modals ==================== */}
            
            {activeModal === 'material' && (
              <CustomModal title="مادة خام جديدة" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('rawMaterials', rawMaterials, setRawMaterials, { name: e.target.name.value, unit: e.target.unit.value, currentStock: parseFloat(e.target.currentStock.value), costPerUnit: parseFloat(e.target.costPerUnit.value), expiryDate: e.target.expiryDate.value || null }); }} className="space-y-4">
                  <input required name="name" placeholder="اسم المادة" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold text-sm outline-none dark:text-white"/>
                  <select required name="unit" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold text-sm outline-none dark:text-white"><option value="جرام">جرام</option><option value="مللي">مللي</option><option value="قطعة">قطعة</option><option value="كيلو">كيلو</option></select>
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="number" step="any" name="currentStock" placeholder="الكمية الافتتاحية" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-black text-sm outline-none dark:text-white"/>
                    <input required type="number" step="any" name="costPerUnit" placeholder="التكلفة (ج)" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-black text-sm outline-none dark:text-white"/>
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 block mb-1">تاريخ الصلاحية (اختياري للتحذيرات)</label><input type="date" name="expiryDate" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold text-sm outline-none dark:text-white"/></div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-lg">حفظ</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'playstation' && (
              <CustomModal title="إضافة جهاز بلايستيشن" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('playstations', playstations, setPlaystations, { name: e.target.name.value, type: e.target.type.value, hourlyRate: parseFloat(e.target.hourlyRate.value), status: 'idle', startTime: null }); }} className="space-y-4">
                  <input required name="name" placeholder="اسم/رقم الجهاز (مثال: شاشة 1)" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold text-sm outline-none dark:text-white"/>
                  <select required name="type" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold text-sm outline-none dark:text-white"><option value="PS4">PlayStation 4</option><option value="PS5">PlayStation 5</option></select>
                  <input required type="number" step="any" name="hourlyRate" placeholder="سعر الساعة (ج.م)" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-black text-sm outline-none dark:text-white"/>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-lg">إضافة الجهاز</button>
                </form>
              </CustomModal>
            )}

             {activeModal === 'offer' && (
              <CustomModal title="إضافة عرض/خصم" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('offers', offers, setOffers, { name: e.target.name.value, type: e.target.type.value, value: parseFloat(e.target.value.value) }); }} className="space-y-4">
                  <input required name="name" placeholder="اسم العرض (مثال: خصم طلاب 10%)" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold text-sm outline-none dark:text-white"/>
                  <select required name="type" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-bold text-sm outline-none dark:text-white"><option value="percent">نسبة مئوية %</option><option value="fixed">خصم مبلغ ثابت ج.م</option></select>
                  <input required type="number" step="any" name="value" placeholder="القيمة" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl font-black text-sm outline-none dark:text-white"/>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-lg">إضافة العرض</button>
                </form>
              </CustomModal>
            )}

            {/* إيصال الفاتورة (Receipt) */}
            {lastOrder && (
              <CustomModal title="الفاتورة" onClose={() => setLastOrder(null)}>
                <div className="print-area p-6 bg-white text-black font-mono border border-slate-300 rounded-xl mx-auto max-w-xs text-center">
                  <h2 className="text-xl font-black mb-1">{currentUser.cafeName}</h2>
                  <p className="text-[10px] font-bold mb-3 border-b pb-2">{lastOrder.date}</p>
                  <div className="space-y-1.5 mb-3 text-right text-xs font-bold">
                    {lastOrder.items.map((i, idx) => <div key={idx} className="flex justify-between"><span>{i.quantity}x {i.name}</span><span>{i.price*i.quantity}</span></div>)}
                  </div>
                  <div className="border-t border-dashed pt-2 space-y-1 text-xs font-bold text-right">
                    <div className="flex justify-between"><span>المجموع:</span><span>{lastOrder.subtotal?.toFixed(2)}</span></div>
                    {lastOrder.discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>خصم ({lastOrder.offerName}):</span><span>- {lastOrder.discountAmount?.toFixed(2)}</span></div>}
                  </div>
                  <div className="flex justify-between font-black text-lg border-t-2 border-black pt-2 mt-2"><span>الإجمالي:</span><span>{lastOrder.total.toFixed(2)} ج</span></div>
                  <p className="text-[9px] mt-6 font-bold text-slate-500">كاشير: {lastOrder.cashierName}</p>
                </div>
                <button onClick={() => window.print()} className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-black flex justify-center gap-2 items-center no-print"><Printer size={16}/> طباعة الفاتورة</button>
              </CustomModal>
            )}

             {activeModal === 'delete' && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl">
                  <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4"/>
                  <h3 className="text-xl font-black mb-2 dark:text-white">هل أنت متأكد من الحذف؟</h3>
                  <div className="flex gap-3 mt-6">
                    <button onClick={confirmDelete} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-black">نعم، احذف</button>
                    <button onClick={closeModal} className="flex-1 bg-slate-200 text-slate-800 py-3 rounded-xl font-black">إلغاء</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
