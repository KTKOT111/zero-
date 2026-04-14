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
  Undo, History
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
          <button onClick={() => window.location.reload()} className="mt-6 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">تحديث الصفحة</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  const [globalSettings, setGlobalSettings]         = useState({ appName: '0%' });
  const [tenants, setTenants]                       = useState([]);
  const [rawMaterials, setRawMaterials]             = useState([]);
  const [products, setProducts]                     = useState(defaultProducts);
  const [employees, setEmployees]                   = useState([]);
  const [expenses, setExpenses]                     = useState([]);
  const [tables, setTables]                         = useState([]);
  const [shifts, setShifts]                         = useState([]);
  const [orders, setOrders]                         = useState([]);
  const [activeTableOrders, setActiveTableOrders]   = useState({});
  const [hrTransactions, setHrTransactions]         = useState([]);
  const [inventoryRecords, setInventoryRecords]     = useState([]);
  
  const [isTaxEnabled, setIsTaxEnabled]             = useState(false);
  const taxRate = 0.14;

  const [activeModal, setActiveModal]   = useState(null);
  const [formData, setFormData]         = useState({});
  const [deleteConfig, setDeleteConfig] = useState(null);

  const [cart, setCart]                               = useState([]);
  const [orderType, setOrderType]                     = useState('takeaway');
  const [activeTableId, setActiveTableId]             = useState(null);
  const [reportPeriod, setReportPeriod]               = useState('daily');
  const [lastOrder, setLastOrder]                     = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  
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
      status: 'completed', 
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

  const processVoidOrder = () => {
    const orderToVoid = formData.order;
    if (!orderToVoid || orderToVoid.status === 'voided') return;

    const newRawMaterials = [...rawMaterials];
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
        const loss = variance < 0 ? Math.abs(variance * rm.costPerUnit) : 0; 
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

  const saveGlobalSettings = (e) => {
    e.preventDefault();
    const updated = { ...globalSettings, appName: formData.appName };
    setGlobalSettings(updated); syncPlatformToCloud({ globalSettings: updated }); closeModal();
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
      setSyncStatus('success');
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
                <button type="submit" disabled={isLoggingIn} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl shadow-lg flex justify-center gap-2">{isLoggingIn ? <Loader2 size={20} className="animate-spin"/> : 'تسجيل الدخول'}</button>
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
                      { id: 'invoices',  icon: <FileText size={19}/>,        label: 'سجل الفواتير' }, 
                      { id: 'shifts',    icon: <ClipboardList size={19}/>,   label: 'سجل الورديات' },
                      { id: 'inventory', icon: <Package size={19}/>,         label: 'المواد الخام' },
                      { id: 'stock_take',icon: <History size={19}/>,         label: 'جرد وتسوية المخزن' }, 
                      { id: 'products',  icon: <Coffee size={19}/>,          label: 'المنتجات' },
                      { id: 'tables',    icon: <Utensils size={19}/>,        label: 'إدارة الصالة' },
                      { id: 'hr',        icon: <Users size={19}/>,           label: 'شؤون الموظفين' }, 
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
                  <div className="p-4 md:p-8 max-w-6xl mx-auto"><div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><Building2 className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black">إدارة المنصة (SaaS)</h2></div><div className="flex gap-2"><button onClick={() => { setFormData(globalSettings); setActiveModal('globalSettings'); }} className="flex-1 md:flex-none justify-center bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm"><Settings size={17}/> إعدادات</button><button onClick={() => { setFormData({ isNew: true }); setActiveModal('tenant'); }} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={17}/> عميل جديد</button></div></div><div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"><table className="w-full text-right"><thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 text-slate-500 text-sm font-bold"><tr><th className="p-5">الفرع</th><th className="p-5">الاسم</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">التحكم</th></tr></thead><tbody>{tenants.map(cafe => (<tr key={cafe.id} className="border-b border-slate-100 text-sm"><td className="p-5 font-black text-indigo-600">{cafe.id}</td><td className="p-5 font-bold">{cafe.name}</td><td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-xl text-xs font-black ${cafe.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{cafe.status === 'active' ? 'نشط' : 'موقوف'}</span></td><td className="p-5 text-center flex justify-center gap-2"><button onClick={() => { const u = tenants.map(t => t.id === cafe.id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t); setTenants(u); syncPlatformToCloud({ tenants: u }); }} className="bg-slate-200 px-4 py-1.5 rounded-xl text-xs font-bold text-slate-800 mr-2">تبديل</button><button onClick={() => { setFormData(cafe); setActiveModal('tenant'); }} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-4 py-1.5 rounded-xl text-xs font-bold transition-colors">تعديل</button></td></tr>))}</tbody></table></div></div>
                ) : currentRoute === 'pos' || currentUser.role === 'cashier' ? (
                  <div className="flex flex-col lg:flex-row h-full p-2 md:p-4 gap-4 relative">
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                        <button onClick={() => { setOrderType('takeaway'); setActiveTableId(null); }} className={`px-6 py-2 rounded-xl font-bold text-sm ${orderType === 'takeaway' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>تيك أواي</button>
                        <button onClick={() => setOrderType('dine_in')} className={`px-6 py-2 rounded-xl font-bold text-sm ${orderType === 'dine_in' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>صالة</button>
                      </div>
                      {orderType === 'dine_in' && !activeTableId && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {tables.map(t => { const tableItems = activeTableOrders[t.id]; const isOcc = Array.isArray(tableItems) && tableItems.length > 0; return (<button key={t.id} onClick={() => { setActiveTableId(t.id); const savedCart = activeTableOrders[t.id]; setCart(Array.isArray(savedCart) ? savedCart : []); }} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${isOcc ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}><Armchair className="w-7 h-7"/><span className="font-black text-xs">{t.name}</span>{isOcc && <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">{tableItems.length} صنف</span>}</button>); })}
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1">
                        {(selectedCategoryFilter === 'all' ? products : products.filter(p => p.category === selectedCategoryFilter)).map(p => (
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
                        {orderType === 'dine_in' && activeTableId ? (
                          <div className="flex gap-3">
                            <button onClick={async () => {
                              if (isHoldingTable || cart.length === 0) return;
                              setIsHoldingTable(true);
                              try {
                                const cartSnapshot = [...cart];
                                const tableIdSnapshot = activeTableId;
                                if (!tableIdSnapshot || cartSnapshot.length === 0) return;
                                const updatedTableOrders = { ...activeTableOrders, [tableIdSnapshot]: cartSnapshot };
                                setActiveTableOrders(updatedTableOrders);
                                await syncToCloud({ activeTableOrders: updatedTableOrders });
                                setCart([]); setActiveTableId(null); setOrderType('takeaway'); setIsMobileCartOpen(false);
                              } finally {
                                setIsHoldingTable(false);
                              }
                            }} disabled={cart.length === 0 || isHoldingTable} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-lg text-sm ${isHoldingTable ? 'bg-amber-400 cursor-wait' : 'bg-amber-500 hover:bg-amber-600'} text-white`}>
                              {isHoldingTable ? <><RefreshCw size={15} className="animate-spin"/> حفظ...</> : <><Save size={17}/> تعليق</>}
                            </button>
                            <button onClick={processOrder} disabled={cart.length === 0} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-lg text-sm"><Banknote size={17}/> دفع وتقفيل</button>
                          </div>
                        ) : (
                          <button onClick={processOrder} disabled={cart.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-colors text-lg"><Banknote className="w-5 h-5"/> دفع وإصدار فاتورة</button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : currentRoute === 'dashboard' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8"><div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"><h2 className="text-3xl font-black">الملخص العام</h2></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"><div className="bg-white p-6 rounded-3xl border shadow-sm"><p className="text-slate-500 text-sm font-bold mb-2">المبيعات (الصافية)</p><p className="text-4xl font-black text-emerald-600">{financialMetrics.totalRevenue.toFixed(2)} ج</p></div><div className="bg-white p-6 rounded-3xl border shadow-sm"><p className="text-slate-500 text-sm font-bold mb-2">مصروفات ورواتب</p><p className="text-4xl font-black text-rose-600">{financialMetrics.totalExpenses.toFixed(2)} ج</p></div><div className="bg-white p-6 rounded-3xl border shadow-sm"><p className="text-slate-500 text-sm font-bold mb-2">تكلفة الخامات</p><p className="text-4xl font-black text-amber-500">{financialMetrics.totalCogs.toFixed(2)} ج</p></div><div className="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white"><p className="text-indigo-200 text-sm font-bold mb-2">الربح الصافي</p><p className="text-4xl font-black">{financialMetrics.netProfit.toFixed(2)} ج</p></div></div></div>
                ) : currentRoute === 'invoices' && currentUser.role === 'admin' ? (
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
                  <div className="p-4 md:p-8 text-center text-slate-400 font-bold mt-20"><p>اختر قسماً من القائمة.</p></div>
                )}
              </div>
            </main>

            {/* ==================== النوافذ المنبثقة (MODALS) ==================== */}

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
                  
                  {/* شاشة إنشاء حساب المدير - هتظهر دايما في الإضافة */}
                  {formData.isNew && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 space-y-3">
                      <p className="text-sm font-black text-indigo-800 dark:text-indigo-300">📧 بيانات دخول مدير الكافيه (مهم جداً):</p>
                      <input required type="email" name="adminEmail" placeholder="البريد الإلكتروني للمدير" value={formData.adminEmail || ''} onChange={handleFormChange} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white text-left" dir="ltr"/>
                      <input required type="text" name="adminPassword" placeholder="كلمة المرور" value={formData.adminPassword || ''} onChange={handleFormChange} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 dark:text-white text-left" dir="ltr"/>
                    </div>
                  )}

                  <button type="submit" disabled={syncStatus === 'saving'} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-xl font-black text-lg transition-colors shadow-lg mt-2 flex justify-center gap-2">
                    {syncStatus === 'saving' ? <><Loader2 className="animate-spin"/> جاري الإنشاء...</> : 'حفظ بيانات الكافيه'}
                  </button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'employee' && (
              <CustomModal title="ملف موظف جديد" onClose={closeModal}>
                <form onSubmit={saveEmployee} className="space-y-4">
                  <input required name="name" placeholder="الاسم الكامل" value={formData.name || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500"/>
                  <input required type="number" step="any" name="salary" placeholder="الراتب الأساسي الشهري" value={formData.salary || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-emerald-600 outline-none focus:border-indigo-500"/>
                  
                  {/* زرار الكاشير */}
                  <label className="flex items-center gap-3 text-sm font-black text-slate-700 cursor-pointer p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl hover:bg-slate-200 transition-colors mt-4">
                    <input type="checkbox" name="createAuth" checked={formData.createAuth || false} onChange={handleFormChange} className="w-6 h-6 accent-indigo-600 rounded"/>
                    تفعيل حساب دخول (كاشير) لهذا الموظف
                  </label>

                  {formData.createAuth && (
                    <div className="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-200 space-y-3 mt-2">
                      <p className="text-sm font-black text-indigo-800">📧 بيانات دخول الكاشير:</p>
                      <input required type="email" name="empEmail" placeholder="البريد الإلكتروني للكاشير" value={formData.empEmail || ''} onChange={handleFormChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-left outline-none focus:border-indigo-500" dir="ltr"/>
                      <input required type="text" name="empPassword" placeholder="كلمة المرور" value={formData.empPassword || ''} onChange={handleFormChange} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-left outline-none focus:border-indigo-500" dir="ltr"/>
                    </div>
                  )}

                  <button type="submit" disabled={syncStatus === 'saving'} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-lg flex justify-center gap-2 mt-4">
                     {syncStatus === 'saving' ? <><Loader2 className="animate-spin"/> جاري الإنشاء...</> : 'حفظ الموظف'}
                  </button>
                </form>
              </CustomModal>
            )}

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

            {activeModal === 'product' && (
              <CustomModal title="إضافة صنف للقائمة" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('products', products, setProducts, { name: e.target.name.value, category: e.target.category.value, price: parseFloat(e.target.price.value), image: e.target.image.value || null, recipe: formData.recipe?.filter(r => r.materialId && r.amount > 0) || [] }); }} className="space-y-4">
                  <input required name="name" value={formData.name || ''} onChange={handleFormChange} placeholder="اسم الصنف" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"/>
                  <div className="grid grid-cols-2 gap-4">
                    <input required name="category" value={formData.category || ''} onChange={handleFormChange} placeholder="القسم" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm"/>
                    <input required type="number" step="any" name="price" value={formData.price || ''} onChange={handleFormChange} placeholder="السعر (ج)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-indigo-600 text-sm"/>
                  </div>
                  <div className="relative"><ImageIcon className="absolute left-4 top-4 text-slate-400 w-4 h-4"/><input name="image" value={formData.image || ''} onChange={handleFormChange} placeholder="رابط صورة (اختياري)" className="w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none font-bold text-left text-xs" dir="ltr"/></div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4"><label className="text-sm font-black">مقادير الوصفة</label><button type="button" onClick={() => setFormData({ ...formData, recipe: [...(formData.recipe || []), { materialId: '', amount: '' }] })} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold">إضافة مكون</button></div>
                    <div className="space-y-2 max-h-40 overflow-auto custom-scrollbar">
                      {(formData.recipe || []).map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                          <select required value={item.materialId} onChange={e => { const r = [...formData.recipe]; r[idx].materialId = e.target.value; setFormData({ ...formData, recipe: r }); }} className="flex-1 p-2.5 border rounded-xl text-xs font-bold bg-slate-50 outline-none"><option value="" disabled>اختر مادة</option>{rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>)}</select>
                          <input required type="number" step="any" value={item.amount} onChange={e => { const r = [...formData.recipe]; r[idx].amount = parseFloat(e.target.value); setFormData({ ...formData, recipe: r }); }} placeholder="الكمية" className="w-24 p-2.5 border rounded-xl text-xs text-center font-bold bg-slate-50 outline-none"/>
                          <button type="button" onClick={() => { const r = [...formData.recipe]; r.splice(idx, 1); setFormData({ ...formData, recipe: r }); }} className="text-rose-500 bg-rose-50 p-2.5 rounded-xl"><Trash2 size={15}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black mt-2 shadow-lg text-lg">حفظ المنتج</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'material' && (
              <CustomModal title="مادة خام للمخزن" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('rawMaterials', rawMaterials, setRawMaterials, { name: e.target.name.value, unit: e.target.unit.value, currentStock: parseFloat(e.target.currentStock.value), costPerUnit: parseFloat(e.target.costPerUnit.value) }); }} className="space-y-4">
                  <input required name="name" placeholder="اسم المادة" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none"/>
                  <select required name="unit" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none"><option value="جرام">جرام</option><option value="مللي">مللي</option><option value="قطعة">قطعة</option><option value="كيلو">كيلو</option></select>
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="number" step="any" name="currentStock" placeholder="الكمية الافتتاحية" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-sm outline-none"/>
                    <input required type="number" step="any" name="costPerUnit" placeholder="تكلفة الوحدة (ج)" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-rose-500 text-sm outline-none"/>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg">حفظ المادة</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'table' && (
              <CustomModal title="تسجيل طاولة بالصالة" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('tables', tables, setTables, { name: e.target.name.value, capacity: parseInt(e.target.capacity.value) }); }} className="space-y-4">
                  <input required name="name" placeholder="مثال: طاولة 5" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none"/>
                  <input required type="number" name="capacity" placeholder="عدد الكراسي" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-sm outline-none"/>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg">حفظ الطاولة</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'expense' && (
              <CustomModal title="سند مصروف نثري" onClose={closeModal}>
                <form onSubmit={(e) => { e.preventDefault(); genericSave('expenses', expenses, setExpenses, { description: e.target.description.value, amount: parseFloat(e.target.amount.value), date: new Date().toISOString().split('T')[0] }); }} className="space-y-4">
                  <input required name="description" placeholder="البيان" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none"/>
                  <input required type="number" step="any" name="amount" placeholder="المبلغ (ج.م)" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-rose-500 text-sm outline-none"/>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg">سجل المصروف</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'closeShift' && activeShift && (
              <CustomModal title="تقفيل الوردية" onClose={closeModal}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const actualCash = parseFloat(e.target.actualCash.value) || 0;
                  const shiftSales = orders.filter(o => o.shiftId === activeShift.id && o.status !== 'voided').reduce((sum, o) => sum + o.total, 0);
                  const updatedShifts = shifts.map(s => s.id === activeShift.id ? { ...s, endTime: new Date().toLocaleString('ar-EG'), actualCash, totalSales: shiftSales, status: 'closed' } : s);
                  setShifts(updatedShifts); syncToCloud({ shifts: updatedShifts });
                  closeModal(); handleLogout();
                }}>
                  <div className="bg-indigo-50 p-5 rounded-2xl mb-6 border border-indigo-100">
                    <p className="text-sm font-bold text-indigo-800 flex justify-between mb-3"><span>العهدة عند الاستلام:</span><span>{activeShift.startingCash} ج</span></p>
                    <p className="text-sm font-black text-indigo-800 flex justify-between border-t border-indigo-200 pt-3"><span>مبيعات الشيفت:</span><span>{orders.filter(o => o.shiftId === activeShift.id && o.status !== 'voided').reduce((sum, o) => sum + o.total, 0).toFixed(2)} ج</span></p>
                  </div>
                  <div className="text-right mb-7">
                    <label className="block text-sm font-black mb-3">كم المبلغ الفعلي في الدرج الآن؟</label>
                    <input required name="actualCash" type="number" min="0" step="any" placeholder="المبلغ الصافي" className="w-full p-4 bg-slate-50 border-2 rounded-2xl text-center font-black text-2xl outline-none"/>
                  </div>
                  <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black shadow-lg text-lg">تأكيد التقفيل والخروج</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'delete' && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl border border-rose-100">
                  <AlertCircle className="w-20 h-20 text-rose-500 mx-auto mb-4"/>
                  <h3 className="text-2xl font-black mb-2">هل أنت متأكد؟</h3>
                  <div className="flex gap-3 mt-8">
                    <button onClick={confirmDelete} className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl font-black">نعم، احذف</button>
                    <button onClick={closeModal} className="flex-1 bg-slate-100 text-slate-800 py-3.5 rounded-xl font-black">إلغاء</button>
                  </div>
                </div>
              </div>
            )}

            {lastOrder && (
              <CustomModal title={lastOrder.status === 'voided' ? "إيصال مرتجع" : "إيصال الدفع"} onClose={() => setLastOrder(null)}>
                <div className="print-section p-8 bg-white text-black text-center font-mono border-2 border-dashed border-slate-300 rounded-2xl mx-auto max-w-xs relative overflow-hidden">
                  {lastOrder.status === 'voided' && <div className="absolute top-10 left-[-40px] bg-rose-600 text-white font-black text-xl py-1 px-12 -rotate-45 opacity-80">مرتجع</div>}
                  <Coffee className="mx-auto mb-3 text-slate-800 w-10 h-10"/>
                  <h2 className="text-2xl font-black mb-1">{currentUser.cafeName}</h2>
                  <p className="text-xs font-bold mb-4 text-slate-500">إيصال: #{lastOrder.id.toString().slice(-5)}</p>
                  <p className="text-[11px] font-bold border-y-2 border-dashed border-slate-300 py-2 mb-4">{lastOrder.date}</p>
                  <div className="space-y-2 mb-5 text-right px-2">{lastOrder.items.map((i, idx) => <div key={idx} className="flex justify-between text-sm font-bold"><span>{i.quantity}x {i.name}</span><span>{i.price * i.quantity}</span></div>)}</div>
                  <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 mb-3">
                    <div className="flex justify-between text-sm font-bold text-slate-600"><span>المجموع:</span><span>{lastOrder.subtotal?.toFixed(2)}</span></div>
                    {lastOrder.discountAmount > 0 && (
                      <div className="flex justify-between text-sm font-black text-emerald-600"><span>خصم {lastOrder.discountType === 'percent' ? `${lastOrder.discountValue}%` : 'ثابت'}:</span><span>- {lastOrder.discountAmount?.toFixed(2)}</span></div>
                    )}
                    {lastOrder.tax > 0 && <div className="flex justify-between text-sm font-bold text-slate-600"><span>ضريبة (14%):</span><span>{lastOrder.tax?.toFixed(2)}</span></div>}
                  </div>
                  <div className="flex justify-between font-black text-2xl border-t-2 border-slate-800 pt-4 mt-2"><span>الإجمالي:</span><span>{lastOrder.total.toFixed(2)}</span></div>
                  <p className="text-[10px] mt-8 text-slate-500 font-bold">الكاشير: {lastOrder.cashierName || currentUser.name}</p>
                </div>
                <button onClick={() => window.print()} className="w-full mt-5 bg-indigo-600 text-white py-4 rounded-2xl font-black flex justify-center gap-2 no-print"><Printer size={18}/> طباعة الإيصال</button>
              </CustomModal>
            )}

          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
