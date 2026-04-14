import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { 
  Coffee, Users, Receipt, Package, LayoutDashboard, 
  LogOut, Plus, Minus, Trash2, ShoppingCart, 
  Banknote, Wallet, TrendingUp, FileText,
  Moon, Sun, Edit, X, Printer, Menu, 
  Building2, Utensils, Armchair, Save, AlertCircle, 
  Loader2, WifiOff, RefreshCw, Wifi, ClipboardList, Play, Power, ShieldAlert, Image as ImageIcon, Settings, Store,
  Undo, History // أيقونات جديدة للمرتجعات والسجل
} from 'lucide-react';

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
// إعداد Firebase الأساسي والنسخة الخفية
// ==========================================
let app = null, auth = null, db = null;
let secondaryApp = null, secondaryAuth = null;

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

  secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
  secondaryAuth = getAuth(secondaryApp);
} catch(e) {
  console.error("Firebase init error:", e);
}

const defaultProducts = [
  { id: 1, name: 'اسبريسو سينجل',      category: 'مشروبات ساخنة', price: 35, stock: 500, image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=200&q=80' },
  { id: 2, name: 'لاتيه',               category: 'مشروبات ساخنة', price: 55, stock: 500, image: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=200&q=80' }
];

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

export default function App() {
  const [fbUser, setFbUser]               = useState(null);
  const [isDataLoaded, setIsDataLoaded]   = useState(true);
  const [isOnline, setIsOnline]           = useState(true);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [syncStatus, setSyncStatus]       = useState('idle');
  const [syncError, setSyncError]         = useState('');
  const [isDarkMode, setIsDarkMode]       = useState(false);
  const [currentUser, setCurrentUser]     = useState(null);
  const [currentRoute, setCurrentRoute]   = useState('dashboard');

  const fbUserRef      = useRef(null);
  const currentUserRef = useRef(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // البيانات
  const [globalSettings, setGlobalSettings]         = useState({ appName: 'كوفي سحابة' });
  const [tenants, setTenants]                       = useState([]);
  const [rawMaterials, setRawMaterials]             = useState([]);
  const [products, setProducts]                     = useState(defaultProducts);
  const [employees, setEmployees]                   = useState([]);
  const [expenses, setExpenses]                     = useState([]);
  const [tables, setTables]                         = useState([]);
  const [shifts, setShifts]                         = useState([]);
  const [orders, setOrders]                         = useState([]);
  const [activeTableOrders, setActiveTableOrders]   = useState({});
  // مصفوفات جديدة للـ HR والجرد
  const [hrTransactions, setHrTransactions]         = useState([]);
  const [inventoryRecords, setInventoryRecords]     = useState([]);
  
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
  
  // الجرد
  const [stockInputs, setStockInputs]                 = useState({});

  const [discountType, setDiscountType]   = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [isHoldingTable, setIsHoldingTable] = useState(false);

  useEffect(() => { fbUserRef.current = fbUser; }, [fbUser]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return cats.map(c => ({ id: c, name: c }));
  }, [products]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUser({ 
              name: userData.name || 'مستخدم', 
              role: userData.role, 
              cafeId: userData.cafeId || null, 
              cafeName: userData.cafeName || 'المنصة' 
            });
            setCurrentRoute(userData.role === 'super_admin' ? 'saas_dashboard' : userData.role === 'cashier' ? 'pos' : 'dashboard');
          } else {
            setLoginError("حسابك غير مفعل أو ليس له صلاحيات.");
            auth.signOut();
          }
        } catch (e) { console.error("خطأ في جلب الصلاحيات:", e); }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // جلب بيانات السوبر أدمن
  useEffect(() => {
    if (!fbUser || !db || currentUser?.role !== 'super_admin') return;
    const platformRef = doc(db, 'coffee_erp_platform', 'config');
    const unsubscribe = onSnapshot(platformRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.globalSettings) setGlobalSettings(data.globalSettings);
        if (data.tenants)        setTenants(data.tenants);
      }
    });
    return () => unsubscribe();
  }, [fbUser, currentUser?.role]);

  // جلب بيانات الكافيه
  useEffect(() => {
    if (!fbUser || !db || !currentUser?.cafeId) return;

    setRawMaterials([]); setProducts(defaultProducts); setEmployees([]); setExpenses([]);
    setTables([]); setShifts([]); setOrders([]); setActiveTableOrders({});
    setHrTransactions([]); setInventoryRecords([]); setIsTaxEnabled(false);

    const cafeRef = doc(db, 'coffee_erp_cafes', currentUser.cafeId);
    const unsubscribe = onSnapshot(cafeRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.rawMaterials !== undefined)          setRawMaterials(data.rawMaterials);
        if (data.products !== undefined)              setProducts(data.products.length > 0 ? data.products : defaultProducts);
        if (data.employees !== undefined)             setEmployees(data.employees);
        if (data.expenses !== undefined)              setExpenses(data.expenses);
        if (data.tables !== undefined)                setTables(data.tables);
        if (data.shifts !== undefined)                setShifts(data.shifts);
        if (data.orders !== undefined)                setOrders(data.orders);
        if (data.activeTableOrders !== undefined)     setActiveTableOrders(data.activeTableOrders);
        if (data.hrTransactions !== undefined)        setHrTransactions(data.hrTransactions);
        if (data.inventoryRecords !== undefined)      setInventoryRecords(data.inventoryRecords);
        if (data.isTaxEnabled !== undefined)          setIsTaxEnabled(data.isTaxEnabled);
      }
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [fbUser, currentUser?.cafeId]);

  const syncPlatformToCloud = useCallback(async (newData) => {
    if (!db || !fbUserRef.current) return;
    const ref = doc(db, 'coffee_erp_platform', 'config');
    try { await setDoc(ref, { ...newData, lastUpdated: new Date().toISOString() }, { merge: true }); } catch(err) {}
  }, []);

  const syncToCloud = useCallback(async (newData) => {
    const cafeId = currentUserRef.current?.cafeId;
    if (!db || !fbUserRef.current || !cafeId) return;
    setSyncStatus('saving');
    const ref = doc(db, 'coffee_erp_cafes', cafeId);
    try {
      await setDoc(ref, { ...newData, lastUpdated: new Date().toISOString() }, { merge: true });
      setSyncStatus('success'); setSyncError('');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch(err) {
      setSyncStatus('error'); setSyncError(err.message);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoginError(''); setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoginError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    } finally { setIsLoggingIn(false); }
  };

  const handleLogout = () => { signOut(auth); setCurrentUser(null); setEmail(''); setPassword(''); };

  const activeShift = useMemo(() => {
    if (!currentUser) return null;
    return shifts.find(s => s.status === 'open' && s.cashierName === currentUser.name);
  }, [shifts, currentUser]);

  // ==========================================
  // POS & Orders
  // ==========================================
  const processOrder = () => {
    if (cart.length === 0) return;
    if (orderType === 'dine_in' && !activeTableId) return alert('يرجى تحديد الطاولة أولاً!');
    if (currentUser.role === 'cashier' && !activeShift) return alert('يجب استلام عهدة (فتح شيفت) أولاً!');

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = 0;
    if (currentUser.role === 'admin' && discountValue && parseFloat(discountValue) > 0) {
      const dv = parseFloat(discountValue);
      discountAmount = discountType === 'percent' ? Math.min(cartSubtotal, (cartSubtotal * dv) / 100) : Math.min(cartSubtotal, dv);
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
      discountAmount, discountType: discountAmount > 0 ? discountType : null, discountValue: discountAmount > 0 ? parseFloat(discountValue) : null,
      tax: cartTax, total: totalOrderAmount,
      status: 'completed', // 'completed' | 'voided'
      date: new Date().toLocaleString('ar-EG'), timestamp: Date.now(),
      note: orderType === 'takeaway' ? 'تيك أواي' : `صالة - ${tables.find(t => t.id === activeTableId)?.name}`,
      shiftId: activeShift ? activeShift.id : null, cashierName: currentUser.name
    };

    const updatedOrders = [...orders, newOrder];
    let updatedActiveTableOrders = { ...activeTableOrders };
    if (orderType === 'dine_in') delete updatedActiveTableOrders[activeTableId];

    setRawMaterials(newRawMaterials); setOrders(updatedOrders); setActiveTableOrders(updatedActiveTableOrders);
    syncToCloud({ rawMaterials: newRawMaterials, orders: updatedOrders, activeTableOrders: updatedActiveTableOrders });
    setCart([]); setLastOrder(newOrder); setOrderType('takeaway'); setActiveTableId(null); setIsMobileCartOpen(false); setDiscountValue('');
  };

  // نظام المرتجعات (Void Order) - للأدمن فقط
  const processVoidOrder = () => {
    const orderToVoid = formData.order;
    if (!orderToVoid || orderToVoid.status === 'voided') return;

    const newRawMaterials = [...rawMaterials];
    // إرجاع الخامات للمخزن
    orderToVoid.items.forEach(cartItem => {
      const product = products.find(p => p.id === cartItem.id);
      if (product?.recipe) {
        product.recipe.forEach(ingredient => {
          const idx = newRawMaterials.findIndex(rm => rm.id === ingredient.materialId);
          if (idx !== -1) newRawMaterials[idx].currentStock += (ingredient.amount * cartItem.quantity);
        });
      }
    });

    const updatedOrders = orders.map(o => o.id === orderToVoid.id ? { 
      ...o, 
      status: 'voided', 
      voidedBy: currentUser.name, 
      voidDate: new Date().toLocaleString('ar-EG') 
    } : o);

    setRawMaterials(newRawMaterials); setOrders(updatedOrders);
    syncToCloud({ rawMaterials: newRawMaterials, orders: updatedOrders });
    closeModal();
  };

  // ==========================================
  // HR & Inventory Actions
  // ==========================================
  const processHrTransaction = (e) => {
    e.preventDefault();
    const newTx = {
      id: Date.now(), empId: formData.empId, type: formData.type, 
      amount: parseFloat(formData.amount), reason: formData.reason,
      date: new Date().toLocaleString('ar-EG'), timestamp: Date.now()
    };
    const updated = [...hrTransactions, newTx];
    setHrTransactions(updated); syncToCloud({ hrTransactions: updated });
    closeModal();
  };

  const processStockTake = () => {
    if (Object.keys(stockInputs).length === 0) return alert("لم تقم بإدخال أي جرد فعلي.");
    const newRecord = { id: Date.now(), date: new Date().toLocaleString('ar-EG'), items: [], totalLoss: 0, createdBy: currentUser.name };
    const updatedMaterials = rawMaterials.map(rm => {
      const actual = stockInputs[rm.id];
      if (actual !== undefined && actual !== rm.currentStock) {
        const variance = actual - rm.currentStock;
        const loss = variance < 0 ? Math.abs(variance * rm.costPerUnit) : 0; // الخسارة تحسب فقط في حالة العجز
        newRecord.items.push({ materialId: rm.id, materialName: rm.name, expected: rm.currentStock, actual, variance, loss });
        newRecord.totalLoss += loss;
        return { ...rm, currentStock: actual };
      }
      return rm;
    });

    if (newRecord.items.length === 0) return alert("المخزون الفعلي مطابق للنظري، لا يوجد تسوية مطلوبة.");
    
    setRawMaterials(updatedMaterials); 
    const updatedRecords = [newRecord, ...inventoryRecords];
    setInventoryRecords(updatedRecords);
    syncToCloud({ rawMaterials: updatedMaterials, inventoryRecords: updatedRecords });
    setStockInputs({});
    alert(`تمت تسوية المخزون بنجاح. قيمة العجز الكلي: ${newRecord.totalLoss.toFixed(2)} ج`);
  };

  // ==========================================
  // Metrics (Dashboard & Shifts)
  // ==========================================
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
    
    // استبعاد الفواتير الملغاة من الأرباح
    const fOrders   = (orders   || []).filter(o => filterByPeriod(o.timestamp) && o.status !== 'voided');
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

  const openModal        = (type, data = {}) => { if (type === 'product' && !data.recipe) data.recipe = []; setFormData(data); setActiveModal(type); };
  const closeModal       = () => { setActiveModal(null); setFormData({}); };
  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

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

  const saveTenant = async (e) => {
    e.preventDefault();
    if (formData.isNew) {
      if (tenants.find(t => t.id === formData.id)) { alert('كود الكافيه موجود بالفعل!'); return; }
      try {
        setSyncStatus('saving');
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, formData.adminEmail, formData.adminPassword);
        await setDoc(doc(db, 'users', userCred.user.uid), { email: formData.adminEmail, name: `مدير - ${formData.name}`, role: 'admin', cafeId: formData.id, cafeName: formData.name });
        const updated = [...tenants, { id: formData.id, name: formData.name, subscriptionEnds: formData.subscriptionEnds, status: 'active' }];
        setTenants(updated); await syncPlatformToCloud({ tenants: updated });
        await signOut(secondaryAuth); closeModal(); setSyncStatus('success');
      } catch (err) { alert("خطأ: " + err.message); setSyncStatus('error'); }
    } else {
      const updated = tenants.map(t => t.id === formData.id ? { ...t, name: formData.name, subscriptionEnds: formData.subscriptionEnds } : t);
      setTenants(updated); syncPlatformToCloud({ tenants: updated }); closeModal();
    }
  };

  const saveEmployee = async (e) => {
    e.preventDefault();
    try {
      let uid = formData.id || `emp_${Date.now()}`;
      if (formData.createAuth && formData.empEmail && formData.empPassword && !formData.id) {
        setSyncStatus('saving');
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, formData.empEmail, formData.empPassword);
        uid = userCred.user.uid;
        await setDoc(doc(db, 'users', uid), { email: formData.empEmail, name: formData.name, role: 'cashier', cafeId: currentUser.cafeId, cafeName: currentUser.cafeName });
        await signOut(secondaryAuth);
      }
      genericSave('employees', employees, setEmployees, { id: uid, name: formData.name, salary: parseFloat(formData.salary), hasAuth: formData.createAuth || false });
    } catch (err) { alert("خطأ: " + err.message); setSyncStatus('error'); }
  };

  if (!isDataLoaded) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors" dir="rtl">
      <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mb-4" />
      <p className="font-black text-slate-800 dark:text-slate-300">جاري تحميل المنصة...</p>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className={isDarkMode ? 'dark' : ''}>
        <style>{`
          @media print { body * { visibility: hidden; } .print-section, .print-section * { visibility: visible; } .print-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white; color: black; } .no-print { display: none !important; } }
          input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; } .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; } .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        <div className={`fixed top-0 left-0 right-0 z-[60] text-[10px] md:text-xs font-bold py-1.5 px-3 flex justify-between items-center shadow-md transition-all duration-300 ${!isOnline ? 'bg-rose-600' : syncStatus === 'error' ? 'bg-rose-600' : syncStatus === 'saving' || isSyncing ? 'bg-amber-500' : 'bg-emerald-600'} text-white`}>
          <div className="flex items-center gap-1.5">{!isOnline ? <WifiOff size={13}/> : syncStatus === 'saving' || isSyncing ? <RefreshCw size={13} className="animate-spin"/> : syncStatus === 'error' ? <AlertCircle size={13}/> : <Wifi size={13}/>}<span>{!isOnline ? 'أوفلاين' : syncStatus === 'error' ? `خطأ: ${syncError}` : syncStatus === 'saving' || isSyncing ? 'جاري المزامنة...' : 'متصل بالسحابة'}</span></div>
        </div>

        {!currentUser ? (
          <div dir="rtl" className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 pt-10">
            <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-indigo-600">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4"><div className="bg-indigo-50 dark:bg-indigo-900/50 p-4 rounded-2xl text-indigo-600"><Coffee size={36}/></div><div><h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">{globalSettings.appName}</h1><p className="text-slate-500 font-bold text-sm">بوابة الدخول</p></div></div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-500">{isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
              </div>
              {loginError && <div className="mb-5 p-4 bg-rose-50 text-rose-600 text-sm font-bold rounded-xl flex items-center gap-2"><ShieldAlert size={18}/> {loginError}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <input required type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold text-left" dir="ltr"/>
                <input required type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold tracking-widest text-left" dir="ltr"/>
                <button type="submit" disabled={isLoggingIn} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg flex justify-center gap-2">{isLoggingIn ? <Loader2 size={20} className="animate-spin"/> : 'تسجيل الدخول'}</button>
              </form>
            </div>
          </div>
        ) : (
          <div dir="rtl" className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 overflow-hidden pt-7">
            {currentUser.role === 'admin' && (
              <>
                {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)}/>}
                <div className={`fixed inset-y-0 right-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"} lg:relative lg:translate-x-0 transition-transform duration-300 w-64 bg-white dark:bg-slate-900 flex flex-col pt-7 border-l border-slate-200 dark:border-slate-800`}>
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex justify-between items-center">
                    <div><h2 className="text-lg font-black flex items-center gap-2"><Coffee className="text-indigo-500"/> {globalSettings.appName}</h2><p className="text-indigo-600 text-xs mt-1 font-bold">{currentUser.cafeName}</p></div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><X size={18}/></button>
                  </div>
                  <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {[
                      { id: 'dashboard', icon: <LayoutDashboard size={19}/>, label: 'لوحة القيادة' },
                      { id: 'invoices',  icon: <FileText size={19}/>,        label: 'سجل الفواتير' }, // جديد
                      { id: 'shifts',    icon: <ClipboardList size={19}/>,   label: 'سجل الورديات' },
                      { id: 'inventory', icon: <Package size={19}/>,         label: 'المواد الخام' },
                      { id: 'stock_take',icon: <History size={19}/>,         label: 'جرد وتسوية المخزن' }, // جديد
                      { id: 'products',  icon: <Coffee size={19}/>,          label: 'المنتجات' },
                      { id: 'tables',    icon: <Utensils size={19}/>,        label: 'إدارة الصالة' },
                      { id: 'hr',        icon: <Users size={19}/>,           label: 'شؤون الموظفين (HR)' }, // تم تحديثه
                      { id: 'expenses',  icon: <Receipt size={19}/>,         label: 'المصروفات' },
                    ].map(item => (
                      <button key={item.id} onClick={() => { setCurrentRoute(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${currentRoute === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        {item.icon} {item.label}
                      </button>
                    ))}
                    <button onClick={() => { setCurrentRoute('pos'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold mt-4 border-2 border-indigo-100 dark:border-slate-700 text-sm ${currentRoute === 'pos' ? 'bg-indigo-600 border-indigo-600 text-white' : 'text-indigo-600 dark:text-slate-300'}`}><ShoppingCart size={19}/> نقطة البيع</button>
                  </nav>
                </div>
              </>
            )}

            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
              <header className="p-3 md:p-4 flex justify-between items-center shadow-sm bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {currentUser.role === 'admin' && <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-700"><Menu size={19}/></button>}
                  <h1 className="font-black text-sm md:text-xl truncate">{currentUser.role === 'super_admin' ? globalSettings.appName : currentUser.role === 'cashier' ? `كاشير — ${currentUser.cafeName}` : currentUser.cafeName}</h1>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  {currentUser.role === 'cashier' && activeShift && <button onClick={() => setActiveModal('closeShift')} className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Power size={14}/><span className="hidden md:inline">إنهاء الوردية</span></button>}
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">{isDarkMode ? <Sun size={17}/> : <Moon size={17}/>}</button>
                  <span className="hidden md:block text-sm font-black">{currentUser.name}</span>
                  <button onClick={handleLogout} className="p-2 bg-rose-50 text-rose-500 rounded-lg"><LogOut size={17}/></button>
                </div>
              </header>

              <div className="flex-1 overflow-auto custom-scrollbar relative">
                {currentUser.role === 'cashier' && !activeShift && activeModal !== 'closeShift' ? (
                  <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                      <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5"><Play className="w-10 h-10"/></div>
                      <h2 className="text-2xl font-black mb-2">أهلاً بك</h2><p className="text-slate-500 mb-7 font-bold text-sm">لتبدأ البيع، يجب استلام العهدة.</p>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const newShift = { id: 'sh_'+Date.now(), cashierName: currentUser.name, startTime: new Date().toLocaleString('ar-EG'), timestamp: Date.now(), startingCash: parseFloat(e.target.startingCash.value)||0, status: 'open' };
                        const updated = [...shifts, newShift]; setShifts(updated); syncToCloud({ shifts: updated });
                      }}>
                        <input required name="startingCash" type="number" min="0" step="any" placeholder="العهدة في الدرج (ج)" className="w-full p-4 mb-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 rounded-2xl text-center font-black text-2xl outline-none"/>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-lg text-lg flex items-center justify-center gap-2"><Play size={20}/> بدء الوردية</button>
                      </form>
                    </div>
                  </div>
                ) :

                currentUser.role === 'super_admin' ? (
                  // ... (Super Admin Dashboard remains the same) ...
                  <div className="p-4 md:p-8 max-w-6xl mx-auto"><div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><Building2 className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black">إدارة المنصة (SaaS)</h2></div><div className="flex gap-2"><button onClick={() => { setFormData({ isNew: true }); setActiveModal('tenant'); }} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={17}/> عميل جديد</button></div></div><div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"><table className="w-full text-right"><thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 text-slate-500 text-sm font-bold"><tr><th className="p-5">الفرع</th><th className="p-5">الاسم</th><th className="p-5 text-center">التحكم</th></tr></thead><tbody>{tenants.map(cafe => (<tr key={cafe.id} className="border-b border-slate-100 text-sm"><td className="p-5 font-black text-indigo-600">{cafe.id}</td><td className="p-5 font-bold">{cafe.name}</td><td className="p-5 text-center"><button onClick={() => { const u = tenants.map(t => t.id === cafe.id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t); setTenants(u); syncPlatformToCloud({ tenants: u }); }} className="bg-slate-200 px-4 py-1.5 rounded-xl text-xs font-bold text-slate-800 mr-2">تبديل</button></td></tr>))}</tbody></table></div></div>
                ) : currentRoute === 'pos' || currentUser.role === 'cashier' ? (
                  // ... (POS Screen remains mostly the same, removed for brevity in snippet, assumes standard rendering) ...
                  <div className="flex flex-col lg:flex-row h-full p-2 md:p-4 gap-4 relative">
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                        <button onClick={() => { setOrderType('takeaway'); setActiveTableId(null); }} className={`px-6 py-2 rounded-xl font-bold text-sm ${orderType === 'takeaway' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>تيك أواي</button>
                        <button onClick={() => setOrderType('dine_in')} className={`px-6 py-2 rounded-xl font-bold text-sm ${orderType === 'dine_in' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>صالة</button>
                      </div>
                      {orderType === 'dine_in' && !activeTableId && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {tables.map(t => { const isOcc = activeTableOrders[t.id]?.length > 0; return (<button key={t.id} onClick={() => { setActiveTableId(t.id); setCart(activeTableOrders[t.id] || []); }} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${isOcc ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}><Armchair className="w-7 h-7"/><span className="font-black text-xs">{t.name}</span></button>); })}
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1">
                        {products.map(p => (
                          <button key={p.id} onClick={() => { if (orderType === 'dine_in' && !activeTableId) return; const existing = cart.find(i => i.id === p.id); if (existing) setCart(cart.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)); else setCart([...cart, { ...p, quantity: 1 }]); }} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center gap-2"><h3 className="font-bold text-xs line-clamp-2">{p.name}</h3><p className="text-indigo-600 font-black text-xs">{p.price} ج</p></button>
                        ))}
                      </div>
                    </div>
                    <div className="w-full lg:w-[350px] bg-white rounded-3xl shadow-lg flex flex-col h-full">
                      <div className="flex-1 overflow-auto p-4 space-y-2">
                        {cart.map(item => (
                          <div key={item.id} className="bg-slate-50 p-2.5 rounded-2xl border flex justify-between items-center">
                            <div><p className="font-bold text-xs">{item.name}</p><p className="text-[10px] font-black text-indigo-600">{item.price * item.quantity} ج</p></div>
                            <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border"><button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} className="text-emerald-500 p-1"><Plus size={13}/></button><span className="font-black text-xs">{item.quantity}</span><button onClick={() => { if (item.quantity > 1) setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)); else setCart(cart.filter(i => i.id !== item.id)); }} className="text-rose-500 p-1"><Minus size={13}/></button></div>
                          </div>
                        ))}
                      </div>
                      <div className="p-5 border-t">
                        <button onClick={processOrder} disabled={cart.length === 0} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex justify-center gap-2 disabled:opacity-50"><Banknote className="w-5 h-5"/> دفع</button>
                      </div>
                    </div>
                  </div>
                ) : currentRoute === 'dashboard' ? (
                  // ... (Dashboard remains the same) ...
                  <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8"><div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"><h2 className="text-3xl font-black">الملخص العام</h2></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"><div className="bg-white p-6 rounded-3xl border shadow-sm"><p className="text-slate-500 text-sm font-bold mb-2">المبيعات (الصافية)</p><p className="text-4xl font-black text-emerald-600">{financialMetrics.totalRevenue.toFixed(2)} ج</p></div></div></div>
                ) : currentRoute === 'invoices' && currentUser.role === 'admin' ? (
                  // شاشة سجل الفواتير الجديدة
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-8"><FileText className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black">سجل الفواتير والمرتجعات</h2></div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right min-w-[700px]">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 text-slate-500 text-sm font-bold"><tr><th className="p-5">رقم الفاتورة</th><th className="p-5">التاريخ</th><th className="p-5">الكاشير</th><th className="p-5">الإجمالي</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">إجراء</th></tr></thead>
                          <tbody>{orders.slice().reverse().map(o => (
                            <tr key={o.id} className={`border-b border-slate-100 text-sm ${o.status === 'voided' ? 'opacity-60 bg-rose-50/50' : ''}`}>
                              <td className="p-5 font-black text-slate-600">#{o.id.toString().slice(-6)}</td>
                              <td className="p-5 font-bold text-slate-500">{o.date}</td>
                              <td className="p-5 font-bold">{o.cashierName || 'غير معروف'}</td>
                              <td className="p-5 font-black text-indigo-600">{o.total.toFixed(2)} ج</td>
                              <td className="p-5 text-center"><span className={`px-3 py-1 rounded-lg text-xs font-black ${o.status === 'voided' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{o.status === 'voided' ? 'مرتجع' : 'مكتمل'}</span></td>
                              <td className="p-5 text-center flex justify-center gap-2">
                                <button onClick={() => setLastOrder(o)} className="bg-slate-100 text-slate-700 p-2 rounded-xl hover:bg-slate-200"><Printer size={15}/></button>
                                {o.status !== 'voided' && <button onClick={() => { setFormData({ order: o }); setActiveModal('voidOrder'); }} className="bg-rose-100 text-rose-600 p-2 rounded-xl hover:bg-rose-200"><Undo size={15}/></button>}
                              </td>
                            </tr>
                          ))}
                          {orders.length === 0 && <tr><td colSpan="6" className="text-center p-10 font-bold text-slate-400">لا توجد فواتير مسجلة</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : currentRoute === 'hr' ? (
                  // شاشة الموظفين المطورة (HR)
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3"><Users className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black">شؤون الموظفين (HR)</h2></div>
                      <div className="flex gap-2">
                        <button onClick={() => { setFormData({ type: 'advance' }); setActiveModal('hrTransaction'); }} className="bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl font-bold flex gap-2"><Banknote size={17}/> تسجيل سلفة/خصم</button>
                        <button onClick={() => openModal('employee')} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={17}/> موظف جديد</button>
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right min-w-[700px]">
                          <thead className="bg-slate-50 border-b font-bold text-slate-500 text-sm"><tr><th className="p-5">الاسم</th><th className="p-5">الراتب الأساسي</th><th className="p-5">إجمالي السلف</th><th className="p-5">إجمالي الخصومات</th><th className="p-5 text-center">صافي الراتب المستحق</th></tr></thead>
                          <tbody>{employees.map(emp => {
                            const empAdvances = hrTransactions.filter(t => t.empId === emp.id && t.type === 'advance').reduce((s, t) => s + t.amount, 0);
                            const empDeductions = hrTransactions.filter(t => t.empId === emp.id && t.type === 'deduction').reduce((s, t) => s + t.amount, 0);
                            return (
                            <tr key={emp.id} className="border-b text-sm">
                              <td className="p-5 font-black text-base">{emp.name}</td>
                              <td className="p-5 font-bold">{emp.salary} ج</td>
                              <td className="p-5 font-bold text-amber-500">{empAdvances} ج</td>
                              <td className="p-5 font-bold text-rose-500">{empDeductions} ج</td>
                              <td className="p-5 text-center font-black text-emerald-600 text-base">{emp.salary - empAdvances - empDeductions} ج</td>
                            </tr>
                          )})}</tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : currentRoute === 'stock_take' && currentUser.role === 'admin' ? (
                  // شاشة الجرد والتسوية الجديدة
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3"><History className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black">جرد وتسوية المخزن</h2></div>
                      <button onClick={processStockTake} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex gap-2 shadow-lg"><Save size={17}/> اعتماد وتسوية الجرد</button>
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right min-w-[600px]">
                          <thead className="bg-slate-50 border-b font-bold text-slate-500 text-sm"><tr><th className="p-5">المادة الخام</th><th className="p-5">الوحدة</th><th className="p-5">الرصيد الدفتري (السيستم)</th><th className="p-5">الرصيد الفعلي (بالمخزن)</th><th className="p-5">العجز/الزيادة</th></tr></thead>
                          <tbody>{rawMaterials.map(rm => {
                            const actual = stockInputs[rm.id];
                            const diff = actual !== undefined ? actual - rm.currentStock : 0;
                            return (
                            <tr key={rm.id} className="border-b text-sm">
                              <td className="p-5 font-black">{rm.name}</td>
                              <td className="p-5 text-slate-500">{rm.unit}</td>
                              <td className="p-5 font-bold text-indigo-600">{rm.currentStock}</td>
                              <td className="p-5">
                                <input type="number" min="0" step="any" placeholder="أدخل الفعلي" value={stockInputs[rm.id] !== undefined ? stockInputs[rm.id] : ''} onChange={(e) => setStockInputs({...stockInputs, [rm.id]: e.target.value !== '' ? parseFloat(e.target.value) : undefined})} className="w-28 p-2 border-2 rounded-xl text-center font-bold outline-none focus:border-indigo-500"/>
                              </td>
                              <td className="p-5 font-black">
                                {actual === undefined ? '-' : <span className={diff < 0 ? 'text-rose-500' : diff > 0 ? 'text-emerald-500' : 'text-slate-400'}>{diff > 0 ? '+' : ''}{diff}</span>}
                              </td>
                            </tr>
                          )})}</tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Inventory & Shifts (Placeholder to say they work normally)
                  <div className="p-4 md:p-8 text-center text-slate-400 font-bold mt-20"><p>يرجى اختيار قسم من القائمة الجانبية.</p></div>
                )}
              </div>
            </main>

            {/* ==================== النوافذ المنبثقة الإضافية ==================== */}

            {activeModal === 'hrTransaction' && (
              <CustomModal title="تسجيل سلفة أو خصم" onClose={closeModal}>
                <form onSubmit={processHrTransaction} className="space-y-4">
                  <select required name="empId" value={formData.empId || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none">
                    <option value="" disabled>اختر الموظف</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <label className={`flex-1 p-3 border-2 rounded-xl font-bold text-center cursor-pointer ${formData.type === 'advance' ? 'border-amber-500 bg-amber-50 text-amber-700' : ''}`}><input type="radio" name="type" value="advance" className="hidden" onChange={handleFormChange} required/>سلفة نقدية</label>
                    <label className={`flex-1 p-3 border-2 rounded-xl font-bold text-center cursor-pointer ${formData.type === 'deduction' ? 'border-rose-500 bg-rose-50 text-rose-700' : ''}`}><input type="radio" name="type" value="deduction" className="hidden" onChange={handleFormChange} required/>خصم / جزاء</label>
                  </div>
                  <input required type="number" step="any" name="amount" placeholder="المبلغ (ج)" value={formData.amount || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-xl text-center outline-none"/>
                  <input required type="text" name="reason" placeholder="السبب / البيان" value={formData.reason || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none"/>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">حفظ المعاملة</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'voidOrder' && formData.order && (
              <CustomModal title="تأكيد مرتجع الفاتورة" onClose={closeModal}>
                <div className="text-center p-4">
                  <Undo className="w-16 h-16 text-rose-500 mx-auto mb-4"/>
                  <p className="font-bold text-lg mb-2">هل أنت متأكد من إلغاء الفاتورة رقم #{formData.order.id.toString().slice(-6)}؟</p>
                  <p className="text-sm text-slate-500 mb-6">سيتم خصم {formData.order.total} ج من المبيعات وإرجاع الخامات للمخزن.</p>
                  <div className="flex gap-3">
                    <button onClick={processVoidOrder} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-black">نعم، تأكيد المرتجع</button>
                    <button onClick={closeModal} className="flex-1 bg-slate-200 text-slate-800 py-3 rounded-xl font-black">إلغاء</button>
                  </div>
                </div>
              </CustomModal>
            )}

            {lastOrder && (
              <CustomModal title={lastOrder.status === 'voided' ? "إيصال مرتجع" : "إيصال الدفع"} onClose={() => setLastOrder(null)}>
                <div className="print-section p-8 bg-white text-black text-center font-mono border-2 border-dashed border-slate-300 rounded-2xl mx-auto max-w-xs relative overflow-hidden">
                  {lastOrder.status === 'voided' && <div className="absolute top-10 left-[-40px] bg-rose-600 text-white font-black text-xl py-1 px-12 -rotate-45 opacity-80">مرتجع</div>}
                  <Coffee className="mx-auto mb-3 text-slate-800 w-10 h-10"/>
                  <h2 className="text-2xl font-black mb-1">{currentUser.cafeName}</h2>
                  <p className="text-xs font-bold mb-4 text-slate-500">إيصال: #{lastOrder.id.toString().slice(-5)}</p>
                  <div className="space-y-2 mb-5 text-right px-2">{lastOrder.items.map((i, idx) => <div key={idx} className="flex justify-between text-sm font-bold"><span>{i.quantity}x {i.name}</span><span>{i.price * i.quantity}</span></div>)}</div>
                  <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 mb-3">
                    <div className="flex justify-between font-black text-2xl border-t-2 border-slate-800 pt-4 mt-2"><span>الإجمالي:</span><span>{lastOrder.total.toFixed(2)}</span></div>
                  </div>
                  <p className="text-[10px] mt-8 text-slate-500 font-bold">الكاشير: {lastOrder.cashierName}</p>
                </div>
                <button onClick={() => window.print()} className="w-full mt-5 bg-indigo-600 text-white py-4 rounded-2xl font-black flex justify-center gap-2"><Printer size={18}/> طباعة الإيصال</button>
              </CustomModal>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
