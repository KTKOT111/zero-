import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc, enableIndexedDbPersistence } from 'firebase/firestore';
import {
  Coffee, Users, Receipt, Package, LayoutDashboard,
  LogOut, Plus, Minus, Trash2, ShoppingCart,
  Banknote, Wallet, TrendingUp, FileText,
  Moon, Sun, X, Printer, Menu,
  Building2, Utensils, Armchair, Save, AlertCircle,
  Loader2, WifiOff, RefreshCw, Wifi, ClipboardList, Play, Power, ShieldAlert, Image as ImageIcon, Settings,
  Undo, History, Gamepad2, Gift, Bell, BarChart, Clock, Download, AlertTriangle
} from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("App Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center" dir="rtl">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
          <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">عذراً، حدث خطأ!</h1>
          <pre className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow border border-rose-100 dark:border-rose-900 text-left text-xs overflow-auto max-w-2xl w-full text-rose-600 dark:text-rose-400" dir="ltr">{String(this.state.error.message || this.state.error)}</pre>
          <button onClick={() => window.location.reload()} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold">تحديث</button>
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

  try {
    enableIndexedDbPersistence(db).catch(() => {});
  } catch (e) {}

  secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
  secondaryAuth = getAuth(secondaryApp);
} catch (e) {
  console.error("Firebase init error:", e);
}

const defaultProducts = [
  { id: 1, name: 'اسبريسو', category: 'مشروبات', price: 35, stock: 500, image: '' }
];

const CustomModal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all print:hidden">
    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{title}</h3>
        {onClose && <button type="button" onClick={onClose} className="text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg"><X size={20} /></button>}
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const fbUserRef = useRef(null);
  const currentUserRef = useRef(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Collections
  const [globalSettings, setGlobalSettings] = useState({ appName: '0%' });
  const [tenants, setTenants] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [products, setProducts] = useState(defaultProducts);
  const [employees, setEmployees] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tables, setTables] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTableOrders, setActiveTableOrders] = useState({});
  const [hrTransactions, setHrTransactions] = useState([]);
  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [psDevices, setPsDevices] = useState([]);
  const [offers, setOffers] = useState([]);
  const [isTaxEnabled, setIsTaxEnabled] = useState(false);
  const taxRate = 0.14;

  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteConfig, setDeleteConfig] = useState(null);

  // POS State
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('takeaway');
  const [activeTableId, setActiveTableId] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('daily');
  const [lastOrder, setLastOrder] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [stockInputs, setStockInputs] = useState({});
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [isHoldingTable, setIsHoldingTable] = useState(false);

  useEffect(() => { fbUserRef.current = fbUser; currentUserRef.current = currentUser; }, [fbUser, currentUser]);
  
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
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUser({ name: userData.name || 'مستخدم', role: userData.role, cafeId: userData.cafeId || null, cafeName: userData.cafeName || 'المنصة' });
            setCurrentRoute(userData.role === 'super_admin' ? 'saas_dashboard' : userData.role === 'cashier' ? 'pos' : 'dashboard');
          } else {
            auth.signOut();
          }
        } catch (e) { console.error(e); }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!fbUser || !db || currentUser?.role !== 'super_admin') return;
    const unsub = onSnapshot(doc(db, 'coffee_erp_platform', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.globalSettings) setGlobalSettings(data.globalSettings);
        if (data.tenants) setTenants(data.tenants);
      }
    });
    return () => unsub();
  }, [fbUser, currentUser?.role]);

  useEffect(() => {
    if (!fbUser || !db || !currentUser?.cafeId) return;

    setRawMaterials([]); setProducts(defaultProducts); setEmployees([]); setExpenses([]);
    setTables([]); setShifts([]); setOrders([]); setActiveTableOrders({});
    setHrTransactions([]); setInventoryRecords([]); setIsTaxEnabled(false);

    const cafeRef = doc(db, 'coffee_erp_cafes', currentUser.cafeId);
    const unsub = onSnapshot(cafeRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.rawMaterials) setRawMaterials(data.rawMaterials);
        if (data.products) setProducts(data.products.length > 0 ? data.products : defaultProducts);
        if (data.employees) setEmployees(data.employees);
        if (data.expenses) setExpenses(data.expenses);
        if (data.tables) setTables(data.tables);
        if (data.shifts) setShifts(data.shifts);
        if (data.orders) setOrders(data.orders);
        if (data.activeTableOrders) setActiveTableOrders(data.activeTableOrders);
        if (data.hrTransactions) setHrTransactions(data.hrTransactions);
        if (data.inventoryRecords) setInventoryRecords(data.inventoryRecords);
        if (data.psDevices) setPsDevices(data.psDevices);
        if (data.offers) setOffers(data.offers);
        if (data.isTaxEnabled !== undefined) setIsTaxEnabled(data.isTaxEnabled);
      }
    });
    return () => unsub();
  }, [fbUser, currentUser?.cafeId]);

  const syncPlatformToCloud = useCallback(async (newData) => {
    if (!db || !fbUserRef.current) return;
    try { await setDoc(doc(db, 'coffee_erp_platform', 'config'), { ...newData, lastUpdated: new Date().toISOString() }, { merge: true }); } catch (err) {}
  }, []);

  const syncToCloud = useCallback(async (newData) => {
    const cafeId = currentUserRef.current?.cafeId;
    if (!db || !fbUserRef.current || !cafeId) return;
    setSyncStatus('saving');
    try {
      await setDoc(doc(db, 'coffee_erp_cafes', cafeId), { ...newData, lastUpdated: new Date().toISOString() }, { merge: true });
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      setSyncStatus('error');
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

  const notifications = useMemo(() => {
    let alerts = [];
    rawMaterials.forEach(rm => {
      if (rm.currentStock <= 5) alerts.push({ id: `stk_${rm.id}`, msg: `نواقص: ${rm.name} رصيده ${rm.currentStock} فقط!`, type: 'stock' });
      if (rm.expiryDate) {
        const daysLeft = Math.floor((new Date(rm.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7 && daysLeft >= 0) alerts.push({ id: `exp_${rm.id}`, msg: `صلاحية ${rm.name} تنتهي خلال ${daysLeft} أيام!`, type: 'exp' });
        else if (daysLeft < 0) alerts.push({ id: `exp_${rm.id}`, msg: `منتهي الصلاحية: ${rm.name} انتهى منذ ${Math.abs(daysLeft)} أيام!`, type: 'exp_danger' });
      }
    });
    return alerts;
  }, [rawMaterials]);

  const activeShift = useMemo(() => {
    if (!currentUser) return null;
    return shifts.find(s => s.status === 'open' && s.cashierName === currentUser.name);
  }, [shifts, currentUser]);

  const processOrder = () => {
    if (cart.length === 0) return;
    if (orderType === 'dine_in' && !activeTableId) return alert('حدد الطاولة!');
    if (currentUser.role === 'cashier' && !activeShift) return alert('افتح شيفت أولاً!');

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = 0;

    if (selectedOfferId) {
      const offer = offers.find(o => o.id === selectedOfferId);
      if (offer) discountAmount = offer.discountType === 'percent' ? (cartSubtotal * offer.discountValue) / 100 : offer.discountValue;
    } else if (currentUser.role === 'admin' && discountValue) {
      const dv = parseFloat(discountValue);
      discountAmount = discountType === 'percent' ? (cartSubtotal * dv) / 100 : dv;
    }
    discountAmount = Math.min(cartSubtotal, discountAmount);

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
      discountAmount, tax: cartTax, total: totalOrderAmount, status: 'completed',
      date: new Date().toLocaleString('ar-EG'), timestamp: Date.now(),
      note: orderType === 'takeaway' ? 'تيك أواي' : `صالة - ${tables.find(t => t.id === activeTableId)?.name}`,
      shiftId: activeShift ? activeShift.id : null, cashierName: currentUser.name
    };

    const updatedOrders = [...orders, newOrder];
    let updatedActiveTableOrders = { ...activeTableOrders };
    if (orderType === 'dine_in') delete updatedActiveTableOrders[activeTableId];

    setRawMaterials(newRawMaterials); setOrders(updatedOrders); setActiveTableOrders(updatedActiveTableOrders);
    syncToCloud({ rawMaterials: newRawMaterials, orders: updatedOrders, activeTableOrders: updatedActiveTableOrders });
    setCart([]); setLastOrder(newOrder); setOrderType('takeaway'); setActiveTableId(null); setIsMobileCartOpen(false); setDiscountValue(''); setSelectedOfferId('');
  };

  const processVoidOrder = () => {
    const orderToVoid = formData.order;
    if (!orderToVoid || orderToVoid.status === 'voided') return;

    const newRawMaterials = [...rawMaterials];
    orderToVoid.items.forEach(cartItem => {
      const product = products.find(p => p.id === cartItem.id);
      if (product?.recipe) {
        product.recipe.forEach(ing => {
          const idx = newRawMaterials.findIndex(rm => rm.id === ing.materialId);
          if (idx !== -1) newRawMaterials[idx].currentStock += (ing.amount * cartItem.quantity);
        });
      }
    });

    const updatedOrders = orders.map(o => o.id === orderToVoid.id ? { ...o, status: 'voided', voidedBy: currentUser.name, voidDate: new Date().toLocaleString('ar-EG') } : o);
    setRawMaterials(newRawMaterials); setOrders(updatedOrders);
    syncToCloud({ rawMaterials: newRawMaterials, orders: updatedOrders });
    closeModal();
  };

  const handlePsAction = (device) => {
    if (device.status === 'available') {
      const updated = psDevices.map(d => d.id === device.id ? { ...d, status: 'playing', startTime: Date.now() } : d);
      setPsDevices(updated); syncToCloud({ psDevices: updated });
    } else {
      const hours = (Date.now() - device.startTime) / (1000 * 60 * 60);
      const cost = Math.max(hours * device.hourlyRate, 5);
      setFormData({ device, cost: cost.toFixed(2) });
      setActiveModal('psCheckout');
    }
  };

  const confirmPsCheckout = (e) => {
    e.preventDefault();
    const cost = parseFloat(formData.cost);
    const newOrder = {
      id: Date.now(), items: [{ id: `ps_${formData.device.id}`, name: `بلايستيشن - ${formData.device.name}`, price: cost, quantity: 1 }],
      subtotal: cost, discountAmount: 0, tax: 0, total: cost, status: 'completed',
      date: new Date().toLocaleString('ar-EG'), timestamp: Date.now(),
      note: `جلسة بلايستيشن`, shiftId: activeShift ? activeShift.id : null, cashierName: currentUser.name
    };
    const updatedOrders = [...orders, newOrder];
    const updatedPs = psDevices.map(d => d.id === formData.device.id ? { ...d, status: 'available', startTime: null } : d);
    setOrders(updatedOrders); setPsDevices(updatedPs); syncToCloud({ orders: updatedOrders, psDevices: updatedPs });
    closeModal(); setLastOrder(newOrder);
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
      if (reportPeriod === 'daily') return date.toDateString() === now.toDateString();
      if (reportPeriod === 'weekly') return (now - date) <= 7 * 24 * 60 * 60 * 1000;
      if (reportPeriod === 'monthly') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      if (reportPeriod === 'quarterly') return Math.floor(now.getMonth() / 3) === Math.floor(date.getMonth() / 3) && date.getFullYear() === now.getFullYear();
      if (reportPeriod === 'semi') return (now - date) <= 182 * 24 * 60 * 60 * 1000;
      if (reportPeriod === 'yearly') return date.getFullYear() === now.getFullYear();
      return true;
    };

    const fOrders = (orders || []).filter(o => filterByPeriod(o.timestamp) && o.status !== 'voided');
    const fExpenses = (expenses || []).filter(e => filterByPeriod(new Date(e.date).getTime()));
    const totalRevenue = fOrders.reduce((sum, o) => sum + o.total, 0);
    const totalExp = fExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    let totalCogs = 0;
    fOrders.forEach(order => {
      order.items.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product?.recipe) {
          product.recipe.forEach(ingredient => {
            const rawMat = rawMaterials.find(rm => rm.id === ingredient.materialId);
            if (rawMat) totalCogs += (ingredient.amount * item.quantity * rawMat.costPerUnit);
          });
        }
      });
    });
    
    return { 
      totalRevenue, 
      totalExpenses: totalExp, 
      totalCogs, 
      netProfit: totalRevenue - (totalExp + totalCogs), 
      filteredOrders: fOrders, 
      filteredExpenses: fExpenses 
    };
  }, [orders, expenses, rawMaterials, products, reportPeriod]);

  const openModal = (type, data = {}) => { if (type === 'product' && !data.recipe) data.recipe = []; setFormData(data); setActiveModal(type); };
  const closeModal = () => { setActiveModal(null); setFormData({}); };
  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const confirmDelete = () => {
    let updates = {};
    if (deleteConfig.type === 'tenant') {
      const u = tenants.filter(t => t.id !== deleteConfig.id);
      setTenants(u);
      syncPlatformToCloud({ tenants: u });
    } else {
      if (deleteConfig.type === 'material') { const u = rawMaterials.filter(rm => rm.id !== deleteConfig.id); setRawMaterials(u); updates.rawMaterials = u; }
      if (deleteConfig.type === 'product') { const u = products.filter(p => p.id !== deleteConfig.id); setProducts(u); updates.products = u; }
      if (deleteConfig.type === 'employee') { const u = employees.filter(e => e.id !== deleteConfig.id); setEmployees(u); updates.employees = u; }
      if (deleteConfig.type === 'table') { const u = tables.filter(t => t.id !== deleteConfig.id); setTables(u); updates.tables = u; }
      if (deleteConfig.type === 'expense') { const u = expenses.filter(ex => ex.id !== deleteConfig.id); setExpenses(u); updates.expenses = u; }
      if (deleteConfig.type === 'ps') { const u = psDevices.filter(d => d.id !== deleteConfig.id); setPsDevices(u); updates.psDevices = u; }
      if (deleteConfig.type === 'offer') { const u = offers.filter(o => o.id !== deleteConfig.id); setOffers(u); updates.offers = u; }
      syncToCloud(updates);
    }
    closeModal();
  };

  const genericSave = (collectionName, stateArray, setterFunc, extraFormat = {}) => {
    const updated = formData.id 
      ? stateArray.map(item => item.id === formData.id ? { ...item, ...formData, ...extraFormat } : item) 
      : [...stateArray, { ...formData, ...extraFormat, id: `${collectionName}_${Date.now()}` }];
    setterFunc(updated); 
    syncToCloud({ [collectionName]: updated }); 
    closeModal();
  };

  const saveTenant = async (e) => {
    e.preventDefault();
    if (formData.isNew) {
      if (tenants.find(t => t.id === formData.id)) { alert('الكود مستخدم!'); return; }
      try {
        setSyncStatus('saving');
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, formData.adminEmail, formData.adminPassword);
        await setDoc(doc(db, 'users', userCred.user.uid), { email: formData.adminEmail, name: `مدير - ${formData.name}`, role: 'admin', cafeId: formData.id, cafeName: formData.name });
        const updated = [...tenants, { id: formData.id, name: formData.name, subscriptionEnds: formData.subscriptionEnds, status: 'active' }];
        setTenants(updated); 
        await syncPlatformToCloud({ tenants: updated });
        await signOut(secondaryAuth); 
        closeModal(); 
        setSyncStatus('success');
      } catch (err) { alert("خطأ: " + err.message); setSyncStatus('error'); }
    } else {
      const updated = tenants.map(t => t.id === formData.id ? { ...t, name: formData.name, subscriptionEnds: formData.subscriptionEnds } : t);
      setTenants(updated); 
      syncPlatformToCloud({ tenants: updated }); 
      closeModal();
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
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <Loader2 className="w-16 h-16 animate-spin text-indigo-600 mb-4" />
      <p className="font-black dark:text-slate-300">جاري التحميل...</p>
    </div>
  );

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
          input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } 
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; } 
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; } 
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        {/* Sync Banner */}
        <div className={`fixed top-0 left-0 right-0 z-[60] text-[10px] md:text-xs font-bold py-1.5 px-3 flex justify-between items-center shadow-md transition-all duration-300 ${!isOnline ? 'bg-rose-600' : syncStatus === 'error' ? 'bg-rose-600' : syncStatus === 'saving' || isSyncing ? 'bg-amber-500' : 'bg-emerald-600'} text-white`}>
          <div className="flex items-center gap-1.5">
            {!isOnline ? <WifiOff size={13} /> : syncStatus === 'saving' || isSyncing ? <RefreshCw size={13} className="animate-spin" /> : syncStatus === 'error' ? <AlertCircle size={13} /> : <Wifi size={13} />}
            <span>{!isOnline ? 'أوفلاين' : syncStatus === 'error' ? `خطأ: ${syncError}` : syncStatus === 'saving' ? 'جاري المزامنة...' : 'متصل'}</span>
          </div>
        </div>

        {/* LOGIN SCREEN */}
        {!currentUser ? (
          <div dir="rtl" className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 pt-10">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-indigo-600">
              <div className="flex justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 dark:bg-indigo-900/50 p-4 rounded-2xl text-indigo-600"><Coffee size={36} /></div>
                  <div><h1 className="text-3xl font-black dark:text-white">{globalSettings.appName || '0%'}</h1></div>
                </div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl dark:text-white">
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
              {loginError && <div className="mb-5 p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 font-bold rounded-xl flex gap-2"><ShieldAlert size={18} /> {loginError}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <input required type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold dark:text-white" dir="ltr" />
                <input required type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 font-bold tracking-widest dark:text-white" dir="ltr" />
                <button type="submit" disabled={isLoggingIn} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg flex justify-center gap-2">
                  {isLoggingIn ? <Loader2 size={20} className="animate-spin" /> : 'تسجيل الدخول'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div dir="rtl" className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200 overflow-hidden pt-7">
            
            {/* SIDEBAR FOR ADMIN */}
            {currentUser.role === 'admin' && (
              <>
                {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
                <div className={`fixed inset-y-0 right-0 z-50 transform ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"} lg:relative lg:translate-x-0 transition-transform duration-300 w-64 bg-white dark:bg-slate-900 flex flex-col pt-7 border-l border-slate-200 dark:border-slate-800`}>
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-black dark:text-white flex items-center gap-2"><Coffee className="text-indigo-500" /> {globalSettings.appName || '0%'}</h2>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><X size={18} /></button>
                  </div>
                  <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
                    {[
                      { id: 'dashboard', icon: <LayoutDashboard size={19} />, label: 'لوحة القيادة' },
                      { id: 'reports', icon: <BarChart size={19} />, label: 'التقارير المجمعة' },
                      { id: 'invoices', icon: <FileText size={19} />, label: 'سجل الفواتير' },
                      { id: 'shifts', icon: <ClipboardList size={19} />, label: 'سجل الورديات' },
                      { id: 'inventory', icon: <Package size={19} />, label: 'المواد الخام' },
                      { id: 'stock_take', icon: <History size={19} />, label: 'جرد وتسوية' },
                      { id: 'products', icon: <Coffee size={19} />, label: 'المنتجات' },
                      { id: 'tables', icon: <Utensils size={19} />, label: 'إدارة الصالة' },
                      { id: 'playstation', icon: <Gamepad2 size={19} />, label: 'البلايستيشن' },
                      { id: 'offers', icon: <Gift size={19} />, label: 'إدارة العروض' },
                      { id: 'hr', icon: <Users size={19} />, label: 'شؤون الموظفين' },
                      { id: 'expenses', icon: <Receipt size={19} />, label: 'المصروفات' }
                    ].map(item => (
                      <button key={item.id} onClick={() => { setCurrentRoute(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold text-sm ${currentRoute === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        {item.icon} {item.label}
                      </button>
                    ))}
                    <button onClick={() => { setCurrentRoute('pos'); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl font-bold mt-4 border-2 border-indigo-100 dark:border-slate-700 text-indigo-600 dark:text-slate-300">
                      <ShoppingCart size={19} /> نقطة البيع
                    </button>
                  </nav>
                </div>
              </>
            )}

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
              <header className="p-3 md:p-4 flex justify-between items-center shadow-sm bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 print:hidden">
                <div className="flex items-center gap-2">
                  {currentUser.role === 'admin' && <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white"><Menu size={19} /></button>}
                  <h1 className="font-black text-sm md:text-xl truncate dark:text-white">{currentUser.cafeName}</h1>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  {currentUser.role === 'admin' && (
                    <button onClick={() => setActiveModal('notifications')} className="relative p-2 bg-slate-100 dark:bg-slate-700 rounded-lg dark:text-white">
                      <Bell size={17} />
                      {notifications.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>}
                    </button>
                  )}
                  {currentUser.role === 'cashier' && activeShift && (
                    <button onClick={() => setActiveModal('closeShift')} className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1">
                      <Power size={14} /><span className="hidden md:inline">إنهاء الوردية</span>
                    </button>
                  )}
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 dark:text-white">
                    {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
                  </button>
                  <span className="hidden md:block text-sm font-black dark:text-white">{currentUser.name}</span>
                  <button onClick={handleLogout} className="p-2 bg-rose-50 text-rose-500 rounded-lg"><LogOut size={17} /></button>
                </div>
              </header>

              <div className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50 dark:bg-slate-900">
                
                {/* 1. START SHIFT (CASHIER) */}
                {currentUser.role === 'cashier' && !activeShift && activeModal !== 'closeShift' ? (
                  <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center border border-slate-200 dark:border-slate-700">
                      <Play className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                      <h2 className="text-2xl font-black dark:text-white mb-6">استلام العهدة</h2>
                      <form onSubmit={e => { 
                        e.preventDefault(); 
                        setShifts([...shifts, { id: 'sh_' + Date.now(), cashierName: currentUser.name, startTime: new Date().toLocaleString('ar-EG'), timestamp: Date.now(), startingCash: parseFloat(e.target.startingCash.value) || 0, status: 'open' }]); 
                        syncToCloud({ shifts }); 
                      }}>
                        <input required name="startingCash" type="number" min="0" step="any" placeholder="المبلغ (ج)" className="w-full p-4 mb-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-center font-black text-2xl dark:text-white outline-none" />
                        <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg">بدء الوردية</button>
                      </form>
                    </div>
                  </div>
                ) :

                /* 2. SUPER ADMIN DASHBOARD */
                currentUser.role === 'super_admin' ? (
                  <div className="p-4 md:p-8 max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3"><Building2 className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black dark:text-white">إدارة المنصة (SaaS)</h2></div>
                      <div className="flex gap-2">
                        <button onClick={() => { setFormData({ appName: globalSettings.appName }); setActiveModal('globalSettings'); }} className="bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-bold flex gap-2"><Settings size={17} /> إعدادات</button>
                        <button onClick={() => { setFormData({ isNew: true }); setActiveModal('tenant'); }} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={17} /> عميل جديد</button>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <table className="w-full text-right">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 dark:text-slate-400">
                          <tr><th className="p-5">الفرع</th><th className="p-5">الاسم</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">التحكم</th></tr>
                        </thead>
                        <tbody>
                          {tenants.map(cafe => (
                            <tr key={cafe.id} className="border-b border-slate-100 dark:border-slate-700 text-sm">
                              <td className="p-5 font-black text-indigo-600">{cafe.id}</td>
                              <td className="p-5 font-bold dark:text-white">{cafe.name}</td>
                              <td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-xl text-xs font-black ${cafe.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{cafe.status === 'active' ? 'نشط' : 'موقوف'}</span></td>
                              <td className="p-5 text-center flex justify-center gap-2">
                                <button onClick={() => { const u = tenants.map(t => t.id === cafe.id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t); setTenants(u); syncPlatformToCloud({ tenants: u }); }} className="bg-slate-200 dark:bg-slate-700 px-4 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-white">تبديل</button>
                                <button onClick={() => { setFormData(cafe); setActiveModal('tenant'); }} className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-xl text-xs font-bold">تعديل</button>
                                <button onClick={() => { setDeleteConfig({ type: 'tenant', id: cafe.id }); setActiveModal('delete'); }} className="bg-rose-100 text-rose-700 px-4 py-1.5 rounded-xl text-xs font-bold">حذف</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : 
                
                /* 3. POS SCREEN */
                currentRoute === 'pos' || currentUser.role === 'cashier' ? (
                  <div className="flex flex-col lg:flex-row h-full p-2 md:p-4 gap-4 relative">
                    {/* POS Left (Products/Tables) */}
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                      <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border dark:border-slate-700 w-fit">
                        <button onClick={() => { setOrderType('takeaway'); setActiveTableId(null); }} className={`px-6 py-2 rounded-xl font-bold text-sm ${orderType === 'takeaway' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>تيك أواي</button>
                        <button onClick={() => setOrderType('dine_in')} className={`px-6 py-2 rounded-xl font-bold text-sm ${orderType === 'dine_in' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>صالة</button>
                      </div>
                      
                      {orderType === 'dine_in' && !activeTableId && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          <div className="col-span-full font-bold dark:text-white mb-2">الطاولات المتاحة:</div>
                          {tables.map(t => { 
                            const isOcc = activeTableOrders[t.id]?.length > 0; 
                            return (
                              <button key={t.id} onClick={() => { setActiveTableId(t.id); setCart(activeTableOrders[t.id] || []); }} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${isOcc ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700'}`}>
                                <Armchair className={isOcc ? 'text-amber-600' : 'text-slate-400'} />
                                <span className="font-black text-xs dark:text-white">{t.name}</span>
                                {isOcc && <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full">{activeTableOrders[t.id].length} صنف</span>}
                              </button>
                            ); 
                          })}
                        </div>
                      )}

                      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        <button onClick={() => setSelectedCategoryFilter('all')} className={`px-5 py-2 rounded-xl font-bold text-sm whitespace-nowrap ${selectedCategoryFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>الكل</button>
                        {categories.map(c => <button key={c.id} onClick={() => setSelectedCategoryFilter(c.id)} className={`px-5 py-2 rounded-xl font-bold text-sm whitespace-nowrap ${selectedCategoryFilter === c.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{c.name}</button>)}
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto custom-scrollbar">
                        {(selectedCategoryFilter === 'all' ? products : products.filter(p => p.category === selectedCategoryFilter)).map(p => (
                          <button key={p.id} onClick={() => { 
                            if (orderType === 'dine_in' && !activeTableId) return alert('حدد الطاولة!'); 
                            const ex = cart.find(i => i.id === p.id); 
                            if (ex) setCart(cart.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)); 
                            else setCart([...cart, { ...p, quantity: 1 }]); 
                          }} className="bg-white dark:bg-slate-800 p-3 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center text-center gap-2 hover:border-indigo-500">
                            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 rounded-full flex items-center justify-center"><Coffee size={20} /></div>
                            <h3 className="font-bold text-xs dark:text-white">{p.name}</h3>
                            <p className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{p.price} ج</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* POS Right (Cart) */}
                    <div className="w-full lg:w-[350px] bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex flex-col h-full border border-slate-200 dark:border-slate-700">
                      <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-3xl">
                        <h3 className="font-black flex items-center gap-2 dark:text-white"><ShoppingCart className="w-5 h-5 text-indigo-500" /> السلة</h3>
                        {activeTableId && <button onClick={() => { setCart([]); setActiveTableId(null); }} className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">إلغاء الطاولة</button>}
                      </div>
                      <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                        {cart.map(item => (
                          <div key={item.id} className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl border dark:border-slate-700 flex justify-between items-center shadow-sm">
                            <div>
                              <p className="font-bold text-xs dark:text-white">{item.name}</p>
                              <p className="text-[10px] font-black text-indigo-600 mt-1">{item.price * item.quantity} ج</p>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl">
                              <button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))} className="text-emerald-500 p-1"><Plus size={14} /></button>
                              <span className="font-black text-xs w-5 text-center dark:text-white">{item.quantity}</span>
                              <button onClick={() => { if (item.quantity > 1) setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)); else setCart(cart.filter(i => i.id !== item.id)); }} className="text-rose-500 p-1"><Minus size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border-t dark:border-slate-700">
                        {offers.filter(o => o.active).length > 0 && (
                          <select value={selectedOfferId} onChange={e => setSelectedOfferId(e.target.value)} className="w-full mb-3 p-2 border rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 outline-none">
                            <option value="">بدون عروض</option>
                            {offers.filter(o => o.active).map(o => <option key={o.id} value={o.id}>{o.name} ({o.discountType === 'percent' ? o.discountValue + '%' : o.discountValue + 'ج'})</option>)}
                          </select>
                        )}
                        {(() => {
                          const sub = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
                          let disc = 0; 
                          if (selectedOfferId) { const off = offers.find(o => o.id === selectedOfferId); if (off) disc = off.discountType === 'percent' ? sub * off.discountValue / 100 : off.discountValue; }
                          disc = Math.min(sub, disc); 
                          const tot = sub - disc + (isTaxEnabled ? (sub - disc) * taxRate : 0);
                          return (
                            <div className="mb-4 space-y-1">
                              <div className="flex justify-between text-sm font-bold text-slate-500"><span>المجموع:</span><span>{sub.toFixed(2)}</span></div>
                              {disc > 0 && <div className="flex justify-between text-sm font-black text-emerald-600"><span>الخصم:</span><span>-{disc.toFixed(2)}</span></div>}
                              <div className="flex justify-between font-black text-xl border-t dark:border-slate-700 pt-2 dark:text-white"><span>الإجمالي:</span><span className="text-indigo-600">{tot.toFixed(2)} ج</span></div>
                            </div>
                          );
                        })()}
                        {orderType === 'dine_in' && activeTableId ? (
                          <div className="flex gap-2">
                            <button onClick={() => { setActiveTableOrders({ ...activeTableOrders, [activeTableId]: cart }); syncToCloud({ activeTableOrders: { ...activeTableOrders, [activeTableId]: cart } }); setCart([]); setActiveTableId(null); setOrderType('takeaway'); }} disabled={cart.length === 0} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold text-sm">تعليق</button>
                            <button onClick={processOrder} disabled={cart.length === 0} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm">تقفيل والدفع</button>
                          </div>
                        ) : (
                          <button onClick={processOrder} disabled={cart.length === 0} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg shadow-lg">دفع وإصدار فاتورة</button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : 
                
                /* 4. DASHBOARD */
                currentRoute === 'dashboard' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <h2 className="text-3xl font-black dark:text-white">الملخص العام</h2>
                      <div className="flex gap-1.5 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto no-scrollbar w-fit">
                        {['daily', 'monthly', 'quarterly', 'yearly', 'all'].map(p => (
                          <button key={p} onClick={() => setReportPeriod(p)} className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap ${reportPeriod === p ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                            {p === 'daily' ? 'يوم' : p === 'monthly' ? 'شهر' : p === 'quarterly' ? 'ربع سنوي' : p === 'yearly' ? 'سنة' : 'الكل'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden"><div className="absolute -left-4 -top-4 text-emerald-50 dark:text-emerald-900/10"><TrendingUp size={100} /></div><div className="relative z-10"><p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">المبيعات</p><p className="text-4xl font-black text-emerald-600">{financialMetrics.totalRevenue.toFixed(2)} ج</p></div></div>
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm"><p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">المصروفات</p><p className="text-4xl font-black text-rose-600">{financialMetrics.totalExpenses.toFixed(2)} ج</p></div>
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm"><p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">تكلفة الخامات</p><p className="text-4xl font-black text-amber-500">{financialMetrics.totalCogs.toFixed(2)} ج</p></div>
                      <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg text-white"><p className="text-indigo-200 text-sm font-bold mb-2">الربح الصافي</p><p className="text-4xl font-black">{financialMetrics.netProfit.toFixed(2)} ج</p></div>
                    </div>
                  </div>
                ) : 
                
                /* 5. PDF REPORTS */
                currentRoute === 'reports' && currentUser.role === 'admin' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 print:hidden">
                      <div className="flex items-center gap-3"><BarChart className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black dark:text-white">التقارير الشاملة</h2></div>
                      <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex gap-2 shadow-md"><Download size={18} /> تصدير PDF</button>
                    </div>
                    <div className="mb-6 flex gap-2 overflow-x-auto print:hidden">
                      {[{ id: 'daily', n: 'اليوم' }, { id: 'weekly', n: 'أسبوع' }, { id: 'monthly', n: 'شهر' }, { id: 'quarterly', n: 'ربع سنوي' }, { id: 'semi', n: 'نصف سنوي' }, { id: 'yearly', n: 'سنة' }, { id: 'all', n: 'الكل' }].map(p => (
                        <button key={p.id} onClick={() => setReportPeriod(p.id)} className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap ${reportPeriod === p.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border'}`}>{p.n}</button>
                      ))}
                    </div>
                    <div className="print-section bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                      <div className="hidden print:block text-center mb-8 border-b pb-4"><h1 className="text-3xl font-black text-black">{currentUser.cafeName}</h1><p className="text-lg font-bold text-slate-500 mt-2">تقرير مالي ({reportPeriod})</p></div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 bg-slate-50 rounded-2xl border"><p className="text-sm font-bold text-slate-500">المبيعات</p><p className="text-2xl font-black text-emerald-600">{financialMetrics.totalRevenue.toFixed(2)} ج</p></div>
                        <div className="p-4 bg-slate-50 rounded-2xl border"><p className="text-sm font-bold text-slate-500">المصروفات</p><p className="text-2xl font-black text-rose-600">{financialMetrics.totalExpenses.toFixed(2)} ج</p></div>
                        <div className="p-4 bg-slate-50 rounded-2xl border"><p className="text-sm font-bold text-slate-500">الخامات المستهلكة</p><p className="text-2xl font-black text-amber-500">{financialMetrics.totalCogs.toFixed(2)} ج</p></div>
                        <div className="p-4 bg-slate-800 rounded-2xl border"><p className="text-sm font-bold text-slate-300">الربح الصافي</p><p className="text-2xl font-black text-white">{financialMetrics.netProfit.toFixed(2)} ج</p></div>
                      </div>
                      <h3 className="font-black text-lg mb-4 text-black">تفاصيل المعاملات:</h3>
                      <table className="w-full text-right text-sm border-collapse text-black">
                        <thead><tr className="bg-slate-100 border-b border-slate-300"><th className="p-3">النوع</th><th className="p-3">التاريخ</th><th className="p-3">البيان/الفاتورة</th><th className="p-3">المبلغ</th></tr></thead>
                        <tbody>
                          {financialMetrics.filteredOrders.map(o => <tr key={'o' + o.id} className="border-b"><td className="p-3 font-bold text-emerald-600">مبيعات</td><td className="p-3 text-slate-500">{o.date}</td><td className="p-3">فاتورة #{o.id.toString().slice(-5)}</td><td className="p-3 font-black">+{o.total.toFixed(2)}</td></tr>)}
                          {financialMetrics.filteredExpenses.map(e => <tr key={'e' + e.id} className="border-b"><td className="p-3 font-bold text-rose-600">مصروفات</td><td className="p-3 text-slate-500">{e.date}</td><td className="p-3">{e.description}</td><td className="p-3 font-black">-{e.amount.toFixed(2)}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : 
                
                /* 6. PLAYSTATION */
                currentRoute === 'playstation' && currentUser.role === 'admin' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3"><Gamepad2 className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black dark:text-white">أجهزة البلايستيشن</h2></div>
                      <button onClick={() => openModal('psDevice')} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={17} /> جهاز جديد</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {psDevices.map(d => {
                        const isPlaying = d.status === 'playing';
                        const elapsedMins = isPlaying ? Math.floor((currentTime - d.startTime) / 60000) : 0;
                        const currentCost = isPlaying ? Math.max((elapsedMins / 60) * d.hourlyRate, 5).toFixed(2) : 0;
                        return (
                          <div key={d.id} className={`p-5 rounded-3xl border-2 relative overflow-hidden ${isPlaying ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                            <button onClick={() => { setDeleteConfig({ type: 'ps', id: d.id }); setActiveModal('delete'); }} className="absolute top-3 left-3 text-rose-500 bg-white/50 p-1.5 rounded-lg hover:bg-rose-100"><Trash2 size={14} /></button>
                            <h3 className="font-black text-xl mb-1 dark:text-white">{d.name}</h3><p className="text-sm font-bold text-slate-500 mb-4">{d.hourlyRate} ج/ساعة</p>
                            {isPlaying ? (
                              <div className="space-y-3">
                                <div className="flex justify-between font-bold text-sm"><span className="text-amber-700">الوقت:</span><span className="text-amber-700 flex gap-1 items-center"><Clock size={14} /> {Math.floor(elapsedMins / 60)}س {elapsedMins % 60}د</span></div>
                                <div className="flex justify-between font-black text-lg"><span className="text-amber-800">الحساب:</span><span className="text-amber-800">{currentCost} ج</span></div>
                                <button onClick={() => handlePsAction(d)} className="w-full py-3 bg-amber-600 text-white rounded-xl font-black shadow-lg">إنهاء ودفع</button>
                              </div>
                            ) : (
                              <div className="pt-4"><button onClick={() => handlePsAction(d)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg">بدء جلسة</button></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : 
                
                /* 7. OFFERS */
                currentRoute === 'offers' && currentUser.role === 'admin' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><Gift className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black dark:text-white">العروض والخصومات</h2></div><button onClick={() => openModal('offer')} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={17} /> عرض جديد</button></div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden"><table className="w-full text-right"><thead className="bg-slate-50 dark:bg-slate-800/80 border-b text-sm font-bold text-slate-500"><tr><th className="p-5">اسم العرض</th><th className="p-5">القيمة</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">حذف</th></tr></thead><tbody>
                      {offers.map(o => (<tr key={o.id} className="border-b dark:border-slate-700 text-sm"><td className="p-5 font-black dark:text-white">{o.name}</td><td className="p-5 font-bold text-indigo-600">{o.discountType === 'percent' ? `${o.discountValue}%` : `${o.discountValue} ج`}</td><td className="p-5 text-center"><button onClick={() => { const u = offers.map(off => off.id === o.id ? { ...off, active: !off.active } : off); setOffers(u); syncToCloud({ offers: u }); }} className={`px-4 py-1.5 rounded-xl font-bold text-xs ${o.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{o.active ? 'فعال' : 'موقوف'}</button></td><td className="p-5 text-center"><button onClick={() => { setDeleteConfig({ type: 'offer', id: o.id }); setActiveModal('delete'); }} className="text-rose-500 p-2 bg-rose-50 rounded-xl"><Trash2 size={15} /></button></td></tr>))}
                    </tbody></table></div>
                  </div>
                ) : 
                
                /* 8. HR */
                currentRoute === 'hr' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><Users className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black dark:text-white">شؤون الموظفين</h2></div><div className="flex gap-2"><button onClick={() => { setFormData({ type: 'advance' }); setActiveModal('hrTransaction'); }} className="bg-amber-100 text-amber-700 px-4 py-2.5 rounded-xl font-bold flex gap-2"><Banknote size={17} /> سلفة/خصم</button><button onClick={() => openModal('employee')} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={17} /> موظف</button></div></div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden"><table className="w-full text-right"><thead className="bg-slate-50 dark:bg-slate-800/80 border-b text-sm font-bold text-slate-500"><tr><th className="p-5">الاسم</th><th className="p-5">الراتب</th><th className="p-5 text-center">الصافي</th><th className="p-5 text-center">كشف الحساب</th><th className="p-5 text-center">إجراء</th></tr></thead><tbody>{employees.map(emp => { const empAdv = hrTransactions.filter(t => t.empId === emp.id && t.type === 'advance').reduce((s, t) => s + t.amount, 0); const empDed = hrTransactions.filter(t => t.empId === emp.id && t.type === 'deduction').reduce((s, t) => s + t.amount, 0); return (<tr key={emp.id} className="border-b dark:border-slate-700 text-sm"><td className="p-5 font-black dark:text-white">{emp.name}</td><td className="p-5 font-bold dark:text-slate-300">{emp.salary}</td><td className="p-5 font-black text-emerald-600">{emp.salary - empAdv - empDed}</td><td className="p-5 text-center"><button onClick={() => { setFormData({ employee: emp }); setActiveModal('empHistory'); }} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white px-4 py-1.5 rounded-xl font-bold text-xs">عرض السجل</button></td><td className="p-5 text-center"><button onClick={() => { setDeleteConfig({ type: 'employee', id: emp.id }); setActiveModal('delete'); }} className="text-rose-500 p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl"><Trash2 size={15} /></button></td></tr>); })}</tbody></table></div>
                  </div>
                ) : 
                
                /* 9. INVENTORY */
                currentRoute === 'inventory' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><Package className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black dark:text-white">المواد الخام</h2></div><button onClick={() => openModal('material')} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex gap-2"><Plus size={17} /> مادة جديدة</button></div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden"><table className="w-full text-right"><thead className="bg-slate-50 dark:bg-slate-800/80 border-b text-sm font-bold text-slate-500"><tr><th className="p-5">المادة</th><th className="p-5">الكمية</th><th className="p-5">التكلفة</th><th className="p-5 text-center">الصلاحية</th><th className="p-5 text-center">إجراء</th></tr></thead><tbody>{rawMaterials.map(rm => { const isExp = rm.expiryDate && new Date(rm.expiryDate) < new Date(); return (<tr key={rm.id} className="border-b dark:border-slate-700 text-sm"><td className="p-5 font-black dark:text-white">{rm.name}</td><td className="p-5"><span className={`px-3 py-1 rounded-xl font-black text-xs ${rm.currentStock <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{rm.currentStock} {rm.unit}</span></td><td className="p-5 font-bold dark:text-slate-300">{rm.costPerUnit} ج</td><td className="p-5 text-center"><span className={`px-3 py-1 rounded-xl text-xs font-bold ${isExp ? 'bg-rose-600 text-white' : rm.expiryDate ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>{rm.expiryDate || '---'}</span></td><td className="p-5 text-center"><button onClick={() => { setDeleteConfig({ type: 'material', id: rm.id }); setActiveModal('delete'); }} className="text-rose-500 p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl"><Trash2 size={15} /></button></td></tr>); })}</tbody></table></div>
                  </div>
                ) : 
                
                /* 10. STOCK TAKE */
                currentRoute === 'stock_take' && currentUser.role === 'admin' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto"><div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><History className="text-indigo-600 w-8 h-8" /><h2 className="text-3xl font-black dark:text-white">جرد وتسوية</h2></div><button onClick={processStockTake} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex gap-2"><Save size={17} /> اعتماد الجرد</button></div><div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden"><table className="w-full text-right"><thead className="bg-slate-50 dark:bg-slate-800/80 border-b text-sm font-bold text-slate-500"><tr><th className="p-5">المادة</th><th className="p-5">الرصيد الدفتري</th><th className="p-5">الرصيد الفعلي</th><th className="p-5">العجز/الزيادة</th></tr></thead><tbody>{rawMaterials.map(rm => { const actual = stockInputs[rm.id]; const diff = actual !== undefined ? actual - rm.currentStock : 0; return (<tr key={rm.id} className="border-b dark:border-slate-700 text-sm"><td className="p-5 font-black dark:text-white">{rm.name}</td><td className="p-5 font-bold text-indigo-600">{rm.currentStock} {rm.unit}</td><td className="p-5"><input type="number" min="0" step="any" value={actual !== undefined ? actual : ''} onChange={(e) => setStockInputs({ ...stockInputs, [rm.id]: e.target.value !== '' ? parseFloat(e.target.value) : undefined })} className="w-28 p-2 border-2 rounded-xl text-center font-bold outline-none dark:bg-slate-900 dark:text-white dark:border-slate-600" /></td><td className="p-5 font-black">{actual === undefined ? '-' : <span className={diff < 0 ? 'text-rose-500' : diff > 0 ? 'text-emerald-500' : 'text-slate-400'}>{diff}</span>}</td></tr>); })}</tbody></table></div></div>
                ) : 
                
                /* OTHER STANDARD ROUTES (PRODUCTS, SHIFTS, TABLES, INVOICES, EXPENSES) */
                currentRoute === 'products' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto"><div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><Coffee className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black dark:text-white">المنتجات والوصفات</h2></div><button onClick={() => openModal('product')} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex gap-2"><Plus size={17}/> منتج جديد</button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{products.map(p => (<div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm"><div className="flex justify-between mb-4"><h3 className="font-black text-base dark:text-white">{p.name}</h3><span className="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-xl font-black text-sm">{p.price} ج</span></div><div className="space-y-1.5 mb-4">{p.recipe?.map((r, i) => <div key={i} className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 p-2.5 rounded-xl flex justify-between border border-slate-200 dark:border-slate-600"><span>{rawMaterials.find(rm => rm.id === r.materialId)?.name}</span><span className="text-indigo-600">{r.amount}</span></div>)}</div><button onClick={() => { setDeleteConfig({ type: 'product', id: p.id }); setActiveModal('delete'); }} className="w-full text-rose-500 bg-rose-50 dark:bg-rose-900/30 p-2.5 rounded-xl flex justify-center"><Trash2 size={15}/></button></div>))}</div></div>
                ) : currentRoute === 'shifts' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto"><div className="flex items-center gap-3 mb-8"><ClipboardList className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black dark:text-white">سجل الورديات</h2></div><div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-right min-w-[900px]"><thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-500 text-sm"><tr><th className="p-5">الموظف</th><th className="p-5">البداية</th><th className="p-5">النهاية</th><th className="p-5 text-center">العهدة</th><th className="p-5 text-center">المبيعات</th><th className="p-5 text-center">الدرج الفعلي</th><th className="p-5 text-center">الحالة</th></tr></thead><tbody>{[...(shifts || [])].reverse().map(shift => { const shiftSales = orders.filter(o => o.shiftId === shift.id && o.status !== 'voided').reduce((sum, o) => sum + o.total, 0); return (<tr key={shift.id} className="border-b dark:border-slate-700 text-sm"><td className="p-5 font-bold dark:text-white">{shift.cashierName}</td><td className="p-5 text-xs text-slate-600 dark:text-slate-400">{shift.startTime}</td><td className="p-5 text-xs text-slate-600 dark:text-slate-400">{shift.endTime || '---'}</td><td className="p-5 text-center font-bold dark:text-slate-300">{shift.startingCash}</td><td className="p-5 text-center font-black text-indigo-600">{shiftSales.toFixed(2)}</td><td className="p-5 text-center font-bold dark:text-slate-300">{shift.actualCash || '---'}</td><td className="p-5 text-center"><span className={`px-3 py-1.5 rounded-lg text-xs font-black ${shift.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{shift.status === 'open' ? 'مفتوح' : 'مغلق'}</span></td></tr>);})}</tbody></table></div></div></div>
                ) : currentRoute === 'tables' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto"><div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-black dark:text-white flex items-center gap-3"><Utensils className="text-indigo-500 w-8 h-8"/> إدارة الصالة</h2><button onClick={() => openModal('table')} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex gap-2"><Plus size={17}/> طاولة جديدة</button></div><div className="grid grid-cols-2 md:grid-cols-5 gap-5">{tables.map(t => (<div key={t.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col items-center shadow-sm relative group"><Armchair className="text-slate-300 dark:text-slate-600 mb-3 w-14 h-14"/><h3 className="font-black text-base dark:text-white">{t.name}</h3><p className="text-sm font-bold text-indigo-500">{t.capacity} كراسي</p><button onClick={() => { setDeleteConfig({ type: 'table', id: t.id }); setActiveModal('delete'); }} className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 text-rose-500 bg-rose-50 p-1.5 rounded-xl"><Trash2 size={13}/></button></div>))}</div></div>
                ) : currentRoute === 'expenses' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto"><div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-black dark:text-white flex items-center gap-3"><Receipt className="text-indigo-500 w-8 h-8"/> المصروفات</h2><button onClick={() => openModal('expense')} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold flex gap-2"><Plus size={17}/> تسجيل مصروف</button></div><div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden"><table className="w-full text-right"><thead className="bg-slate-50 dark:bg-slate-800/80 border-b text-sm font-bold text-slate-500"><tr><th className="p-5">التاريخ</th><th className="p-5">البيان</th><th className="p-5">المبلغ</th><th className="p-5 text-center">حذف</th></tr></thead><tbody>{expenses.map(ex => <tr key={ex.id} className="border-b dark:border-slate-700 text-sm"><td className="p-5 font-bold text-slate-500">{ex.date}</td><td className="p-5 font-black dark:text-white">{ex.description}</td><td className="p-5 font-black text-rose-500">{ex.amount} ج</td><td className="p-5 text-center"><button onClick={() => { setDeleteConfig({ type: 'expense', id: ex.id }); setActiveModal('delete'); }} className="text-rose-500 p-2 bg-rose-50 rounded-xl"><Trash2 size={15}/></button></td></tr>)}</tbody></table></div></div>
                ) : currentRoute === 'invoices' && currentUser.role === 'admin' ? (
                  <div className="p-4 md:p-8 max-w-7xl mx-auto"><div className="flex items-center gap-3 mb-8"><FileText className="text-indigo-600 w-8 h-8"/><h2 className="text-3xl font-black dark:text-white">سجل الفواتير</h2></div><div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden"><table className="w-full text-right"><thead className="bg-slate-50 dark:bg-slate-800/80 border-b text-sm font-bold text-slate-500"><tr><th className="p-5">الفاتورة</th><th className="p-5">التاريخ</th><th className="p-5">الكاشير</th><th className="p-5">الإجمالي</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">إجراء</th></tr></thead><tbody>{orders.slice().reverse().map(o => (<tr key={o.id} className={`border-b dark:border-slate-700 text-sm ${o.status === 'voided' ? 'opacity-60' : ''}`}><td className="p-5 font-black text-slate-600 dark:text-slate-400">#{o.id.toString().slice(-6)}</td><td className="p-5 font-bold text-slate-500">{o.date}</td><td className="p-5 font-bold dark:text-white">{o.cashierName}</td><td className="p-5 font-black text-indigo-600">{o.total.toFixed(2)}</td><td className="p-5 text-center"><span className={`px-3 py-1 rounded-lg text-xs font-black ${o.status === 'voided' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{o.status === 'voided' ? 'مرتجع' : 'مكتمل'}</span></td><td className="p-5 text-center flex justify-center gap-2"><button onClick={() => setLastOrder(o)} className="bg-slate-100 text-slate-700 p-2 rounded-xl"><Printer size={15}/></button>{o.status !== 'voided' && <button onClick={() => { setFormData({ order: o }); setActiveModal('voidOrder'); }} className="bg-rose-100 text-rose-600 p-2 rounded-xl"><Undo size={15}/></button>}</td></tr>))}</tbody></table></div></div>
                ) : null}
              </div>
            </main>

            {/* Modals Data Processing */}
            {activeModal === 'psDevice' && (
              <CustomModal title="جهاز بلايستيشن جديد" onClose={closeModal}>
                <form onSubmit={e => { e.preventDefault(); genericSave('psDevices', psDevices, setPsDevices, { name: e.target.name.value, hourlyRate: parseFloat(e.target.hourlyRate.value), status: 'available' }); }} className="space-y-4">
                  <input required name="name" placeholder="اسم الجهاز" className="w-full p-4 border rounded-2xl font-bold dark:bg-slate-900 outline-none dark:text-white"/>
                  <input required type="number" step="any" name="hourlyRate" placeholder="سعر الساعة (ج)" className="w-full p-4 border rounded-2xl font-black dark:bg-slate-900 outline-none dark:text-white"/>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">حفظ الجهاز</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'psCheckout' && formData.device && (
              <CustomModal title={`دفع حساب - ${formData.device.name}`} onClose={closeModal}>
                <div className="text-center p-4">
                  <Gamepad2 className="w-16 h-16 text-indigo-600 mx-auto mb-4"/>
                  <h3 className="text-2xl font-black mb-4 dark:text-white">إجمالي الحساب: {formData.cost} ج</h3>
                  <button onClick={confirmPsCheckout} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-lg">إصدار الفاتورة</button>
                </div>
              </CustomModal>
            )}

            {activeModal === 'offer' && (
              <CustomModal title="إضافة عرض / خصم" onClose={closeModal}>
                <form onSubmit={e => { e.preventDefault(); genericSave('offers', offers, setOffers, { name: e.target.name.value, discountType: e.target.discountType.value, discountValue: parseFloat(e.target.discountValue.value), active: true }); }} className="space-y-4">
                  <input required name="name" placeholder="اسم العرض" className="w-full p-4 border rounded-2xl font-bold dark:bg-slate-900 outline-none dark:text-white"/>
                  <div className="flex gap-4">
                    <select name="discountType" className="p-4 border rounded-2xl font-bold dark:bg-slate-900 outline-none dark:text-white"><option value="percent">نسبة مئوية (%)</option><option value="fixed">مبلغ ثابت (ج)</option></select>
                    <input required type="number" step="any" name="discountValue" placeholder="القيمة" className="w-full p-4 border rounded-2xl font-black dark:bg-slate-900 outline-none dark:text-white"/>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">حفظ العرض</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'material' && (
              <CustomModal title="مادة خام جديدة" onClose={closeModal}>
                <form onSubmit={e => { e.preventDefault(); genericSave('rawMaterials', rawMaterials, setRawMaterials, { name: e.target.name.value, unit: e.target.unit.value, currentStock: parseFloat(e.target.currentStock.value), costPerUnit: parseFloat(e.target.costPerUnit.value), expiryDate: e.target.expiryDate.value || null }); }} className="space-y-4">
                  <input required name="name" placeholder="الاسم" className="w-full p-4 border rounded-2xl font-bold dark:bg-slate-900 outline-none dark:text-white"/>
                  <select required name="unit" className="w-full p-4 border rounded-2xl font-bold dark:bg-slate-900 outline-none dark:text-white"><option value="جرام">جرام</option><option value="مللي">مللي</option><option value="قطعة">قطعة</option><option value="كيلو">كيلو</option></select>
                  <div className="flex gap-4"><input required type="number" step="any" name="currentStock" placeholder="الرصيد الافتتاحي" className="flex-1 p-4 border rounded-2xl font-black dark:bg-slate-900 outline-none dark:text-white"/><input required type="number" step="any" name="costPerUnit" placeholder="التكلفة (ج)" className="flex-1 p-4 border rounded-2xl font-black dark:bg-slate-900 outline-none dark:text-white"/></div>
                  <div className="pt-2"><label className="block text-sm font-bold mb-2 dark:text-white">تاريخ انتهاء الصلاحية (اختياري)</label><input type="date" name="expiryDate" className="w-full p-4 border rounded-2xl font-bold dark:bg-slate-900 outline-none dark:text-white"/></div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">حفظ</button>
                </form>
              </CustomModal>
            )}

            {activeModal === 'empHistory' && formData.employee && (
              <CustomModal title={`سجل الموظف: ${formData.employee.name}`} onClose={closeModal}>
                <div className="space-y-6">
                  <div><h4 className="font-black border-b pb-2 mb-3 dark:text-white">السلف والخصومات</h4>{hrTransactions.filter(t => t.empId === formData.employee.id).length === 0 ? <p className="text-sm text-slate-500">لا يوجد سجل</p> : hrTransactions.filter(t => t.empId === formData.employee.id).map(t => <div key={t.id} className="flex justify-between text-sm p-2 border-b dark:border-slate-700"><span className="dark:text-slate-300">{t.date.split(',')[0]} - {t.reason}</span><span className={t.type==='advance' ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold'}>{t.type==='advance'?'سلفة':'خصم'} ({t.amount} ج)</span></div>)}</div>
                  {formData.employee.hasAuth && <div><h4 className="font-black border-b pb-2 mb-3 dark:text-white">الورديات اللي قفلها</h4>{shifts.filter(s => s.cashierName === formData.employee.name && s.status === 'closed').length === 0 ? <p className="text-sm text-slate-500">لم يقفل أي وردية</p> : shifts.filter(s => s.cashierName === formData.employee.name && s.status === 'closed').slice(-5).map(s => <div key={s.id} className="flex justify-between text-sm p-2 border-b dark:border-slate-700"><span className="dark:text-slate-300">{s.startTime.split(',')[0]}</span><span className="font-bold text-indigo-600 dark:text-indigo-400">مبيعات: {s.totalSales} ج</span></div>)}</div>}
                </div>
              </CustomModal>
            )}

            {activeModal === 'notifications' && (
              <CustomModal title="إشعارات النظام والمخزن" onClose={closeModal}>
                <div className="space-y-3">{notifications.length === 0 ? <p className="text-center font-bold text-slate-500 py-10">لا توجد إشعارات أو نواقص حالياً.</p> : notifications.map(n => <div key={n.id} className={`p-4 rounded-xl border flex gap-3 items-center font-bold text-sm ${n.type==='exp_danger'?'bg-rose-100 text-rose-800 border-rose-300': n.type==='exp'?'bg-amber-100 text-amber-800 border-amber-300':'bg-slate-100 text-slate-800'}`}><AlertTriangle size={18}/><span>{n.msg}</span></div>)}</div>
              </CustomModal>
            )}

            {activeModal === 'product' && (<CustomModal title="إضافة صنف" onClose={closeModal}><form onSubmit={(e) => { e.preventDefault(); genericSave('products', products, setProducts, { name: e.target.name.value, category: e.target.category.value, price: parseFloat(e.target.price.value), image: e.target.image.value || null, recipe: formData.recipe?.filter(r => r.materialId && r.amount > 0) || [] }); }} className="space-y-4"><input required name="name" value={formData.name || ''} onChange={handleFormChange} placeholder="اسم الصنف" className="w-full p-4 border rounded-2xl outline-none font-bold text-sm dark:bg-slate-900 dark:text-white"/><div className="grid grid-cols-2 gap-4"><input required name="category" value={formData.category || ''} onChange={handleFormChange} placeholder="القسم" className="w-full p-4 border rounded-2xl outline-none font-bold text-sm dark:bg-slate-900 dark:text-white"/><input required type="number" step="any" name="price" value={formData.price || ''} onChange={handleFormChange} placeholder="السعر (ج)" className="w-full p-4 border rounded-2xl outline-none font-black text-indigo-600 text-sm dark:bg-slate-900"/></div><div className="border-t pt-4"><div className="flex justify-between mb-4"><label className="text-sm font-black dark:text-white">مقادير الوصفة</label><button type="button" onClick={() => setFormData({ ...formData, recipe: [...(formData.recipe || []), { materialId: '', amount: '' }] })} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold">إضافة مكون</button></div>{(formData.recipe || []).map((item, idx) => (<div key={idx} className="flex gap-2 mb-2"><select required value={item.materialId} onChange={e => { const r = [...formData.recipe]; r[idx].materialId = e.target.value; setFormData({ ...formData, recipe: r }); }} className="flex-1 p-2.5 border rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 dark:text-white outline-none"><option value="" disabled>اختر مادة</option>{rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}</select><input required type="number" step="any" value={item.amount} onChange={e => { const r = [...formData.recipe]; r[idx].amount = parseFloat(e.target.value); setFormData({ ...formData, recipe: r }); }} placeholder="الكمية" className="w-24 p-2.5 border rounded-xl text-center font-bold bg-slate-50 dark:bg-slate-900 dark:text-white"/><button type="button" onClick={() => { const r = [...formData.recipe]; r.splice(idx, 1); setFormData({ ...formData, recipe: r }); }} className="text-rose-500 bg-rose-50 dark:bg-rose-900/30 p-2.5 rounded-xl"><Trash2 size={15}/></button></div>))}</div><button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black mt-2">حفظ المنتج</button></form></CustomModal>)}

            {activeModal === 'globalSettings' && (<CustomModal title="إعدادات المنصة" onClose={closeModal}><form onSubmit={saveGlobalSettings} className="space-y-4"><div><label className="block text-sm font-black mb-2 dark:text-white">اسم المنصة</label><input required name="appName" value={formData.appName || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 rounded-xl outline-none focus:border-indigo-500 font-bold dark:text-white"/></div><button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg">حفظ التغييرات</button></form></CustomModal>)}
            
            {activeModal === 'tenant' && (<CustomModal title={formData.id && !formData.isNew ? "تعديل الكافيه" : "إضافة كافيه"} onClose={closeModal}><form onSubmit={saveTenant} className="space-y-4">{formData.isNew && <div><label className="block text-sm font-black mb-2 dark:text-white">كود الكافيه</label><input required name="id" placeholder="مثال: c2" value={formData.id || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl outline-none font-bold dark:text-white"/></div>}<div><label className="block text-sm font-black mb-2 dark:text-white">اسم الكافيه</label><input required name="name" value={formData.name || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl outline-none font-bold dark:text-white"/></div><div><label className="block text-sm font-black mb-2 dark:text-white">تاريخ الانتهاء</label><input required type="date" name="subscriptionEnds" value={formData.subscriptionEnds || ''} onChange={handleFormChange} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl outline-none font-bold dark:text-white"/></div>{formData.isNew && (<div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 space-y-3"><p className="text-sm font-black text-indigo-800 dark:text-indigo-300">بيانات دخول المدير:</p><input required type="email" name="adminEmail" placeholder="البريد الإلكتروني" value={formData.adminEmail || ''} onChange={handleFormChange} className="w-full p-3 bg-white dark:bg-slate-900 border rounded-xl outline-none font-bold dark:text-white" dir="ltr"/><input required type="text" name="adminPassword" placeholder="كلمة المرور" value={formData.adminPassword || ''} onChange={handleFormChange} className="w-full p-3 bg-white dark:bg-slate-900 border rounded-xl outline-none font-bold dark:text-white" dir="ltr"/></div>)}<button type="submit" disabled={syncStatus === 'saving'} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-lg mt-2">{syncStatus === 'saving' ? 'جاري الإنشاء...' : 'حفظ بيانات الكافيه'}</button></form></CustomModal>)}

            {activeModal === 'employee' && (<CustomModal title="ملف موظف" onClose={closeModal}><form onSubmit={saveEmployee} className="space-y-4"><input required name="name" placeholder="الاسم الكامل" value={formData.name || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl font-bold outline-none dark:text-white"/><input required type="number" step="any" name="salary" placeholder="الراتب الأساسي" value={formData.salary || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl font-black text-emerald-600 outline-none"/><label className="flex items-center gap-3 text-sm font-black text-slate-700 dark:text-slate-300 cursor-pointer p-4 bg-slate-100 dark:bg-slate-800 border-2 rounded-2xl mt-4"><input type="checkbox" name="createAuth" checked={formData.createAuth || false} onChange={handleFormChange} className="w-6 h-6 accent-indigo-600 rounded"/> تفعيل حساب دخول للكاشير</label>{formData.createAuth && (<div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 space-y-3 mt-2"><p className="text-sm font-black text-indigo-800 dark:text-indigo-300">بيانات الدخول:</p><input required type="email" name="empEmail" placeholder="البريد الإلكتروني" value={formData.empEmail || ''} onChange={handleFormChange} className="w-full p-3 bg-white dark:bg-slate-900 border rounded-xl font-bold outline-none dark:text-white" dir="ltr"/><input required type="text" name="empPassword" placeholder="كلمة المرور" value={formData.empPassword || ''} onChange={handleFormChange} className="w-full p-3 bg-white dark:bg-slate-900 border rounded-xl font-bold outline-none dark:text-white" dir="ltr"/></div>)}<button type="submit" disabled={syncStatus === 'saving'} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg flex justify-center gap-2 mt-4">{syncStatus === 'saving' ? 'جاري الإنشاء...' : 'حفظ الموظف'}</button></form></CustomModal>)}

            {activeModal === 'hrTransaction' && (<CustomModal title="سلفة أو خصم" onClose={closeModal}><form onSubmit={processHrTransaction} className="space-y-4"><select required name="empId" value={formData.empId || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl font-bold outline-none dark:text-white"><option value="" disabled>اختر الموظف</option>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select><div className="flex gap-2"><label className={`flex-1 p-3 border-2 rounded-xl font-bold text-center cursor-pointer ${formData.type === 'advance' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'dark:text-slate-300'}`}><input type="radio" name="type" value="advance" className="hidden" onChange={handleFormChange} required/>سلفة نقدية</label><label className={`flex-1 p-3 border-2 rounded-xl font-bold text-center cursor-pointer ${formData.type === 'deduction' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'dark:text-slate-300'}`}><input type="radio" name="type" value="deduction" className="hidden" onChange={handleFormChange} required/>خصم / جزاء</label></div><input required type="number" step="any" name="amount" placeholder="المبلغ (ج)" value={formData.amount || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl font-black text-xl text-center outline-none dark:text-white"/><input required type="text" name="reason" placeholder="السبب" value={formData.reason || ''} onChange={handleFormChange} className="w-full p-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl font-bold outline-none dark:text-white"/><button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">حفظ المعاملة</button></form></CustomModal>)}

            {activeModal === 'voidOrder' && formData.order && (<CustomModal title="تأكيد المرتجع" onClose={closeModal}><div className="text-center p-4"><Undo className="w-16 h-16 text-rose-500 mx-auto mb-4"/><p className="font-bold text-lg mb-2 dark:text-white">هل تريد إلغاء الفاتورة #{formData.order.id.toString().slice(-6)}؟</p><p className="text-sm text-slate-500 mb-6">سيتم خصم {formData.order.total.toFixed(2)} ج وإرجاع الخامات.</p><div className="flex gap-3"><button onClick={processVoidOrder} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-black">تأكيد المرتجع</button><button onClick={closeModal} className="flex-1 bg-slate-200 text-slate-800 py-3 rounded-xl font-black">إلغاء</button></div></div></CustomModal>)}

            {activeModal === 'table' && (<CustomModal title="طاولة جديدة" onClose={closeModal}><form onSubmit={e => { e.preventDefault(); genericSave('tables', tables, setTables, { name: e.target.name.value, capacity: parseInt(e.target.capacity.value) }); }} className="space-y-4"><input required name="name" placeholder="الاسم" className="w-full p-4 border dark:bg-slate-900 rounded-2xl font-bold dark:text-white outline-none"/><input required type="number" name="capacity" placeholder="الكراسي" className="w-full p-4 border dark:bg-slate-900 rounded-2xl font-black dark:text-white outline-none"/><button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">حفظ</button></form></CustomModal>)}

            {activeModal === 'expense' && (<CustomModal title="سند مصروف" onClose={closeModal}><form onSubmit={e => { e.preventDefault(); genericSave('expenses', expenses, setExpenses, { description: e.target.description.value, amount: parseFloat(e.target.amount.value), date: new Date().toISOString().split('T')[0] }); }} className="space-y-4"><input required name="description" placeholder="البيان" className="w-full p-4 border dark:bg-slate-900 rounded-2xl font-bold dark:text-white outline-none"/><input required type="number" step="any" name="amount" placeholder="المبلغ (ج)" className="w-full p-4 border dark:bg-slate-900 rounded-2xl font-black text-rose-500 outline-none"/><button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">سجل المصروف</button></form></CustomModal>)}

            {activeModal === 'delete' && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"><div className="bg-white dark:bg-slate-800 p-8 rounded-3xl w-full max-w-sm text-center"><AlertCircle className="w-20 h-20 text-rose-500 mx-auto mb-4"/><h3 className="text-2xl font-black mb-2 dark:text-white">تأكيد الحذف</h3><div className="flex gap-3 mt-8"><button onClick={confirmDelete} className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl font-black">حذف</button><button onClick={closeModal} className="flex-1 bg-slate-100 text-slate-800 py-3.5 rounded-xl font-black">إلغاء</button></div></div></div>)}

            {lastOrder && (
              <CustomModal title={lastOrder.status === 'voided' ? "مرتجع" : "إيصال دفع"} onClose={() => setLastOrder(null)}>
                <div className="print-section p-8 bg-white text-black text-center font-mono border-2 border-dashed border-slate-300 rounded-2xl mx-auto max-w-xs relative overflow-hidden">
                  {lastOrder.status === 'voided' && <div className="absolute top-10 left-[-40px] bg-rose-600 text-white font-black text-xl py-1 px-12 -rotate-45">مرتجع</div>}
                  <Coffee className="mx-auto mb-3 text-slate-800 w-10 h-10"/>
                  <h2 className="text-2xl font-black mb-1">{currentUser.cafeName}</h2>
                  <p className="text-xs font-bold mb-4 text-slate-500">إيصال: #{lastOrder.id.toString().slice(-5)}</p>
                  <p className="text-[11px] font-bold border-y-2 border-dashed py-2 mb-4">{lastOrder.date}</p>
                  <div className="space-y-2 mb-5 text-right px-2">{lastOrder.items.map((i, idx) => <div key={idx} className="flex justify-between text-sm font-bold"><span>{i.quantity}x {i.name}</span><span>{i.price * i.quantity}</span></div>)}</div>
                  <div className="border-t border-dashed pt-3 space-y-1.5 mb-3">
                    <div className="flex justify-between text-sm font-bold text-slate-600"><span>المجموع:</span><span>{lastOrder.subtotal?.toFixed(2)}</span></div>
                    {lastOrder.discountAmount > 0 && <div className="flex justify-between text-sm font-black text-emerald-600"><span>خصم:</span><span>- {lastOrder.discountAmount?.toFixed(2)}</span></div>}
                    {lastOrder.tax > 0 && <div className="flex justify-between text-sm font-bold text-slate-600"><span>ضريبة (14%):</span><span>{lastOrder.tax?.toFixed(2)}</span></div>}
                  </div>
                  <div className="flex justify-between font-black text-2xl border-t-2 border-slate-800 pt-4 mt-2"><span>الإجمالي:</span><span>{lastOrder.total.toFixed(2)}</span></div>
                  <p className="text-[10px] mt-8 text-slate-500 font-bold">الكاشير: {lastOrder.cashierName}</p>
                </div>
                <button onClick={() => window.print()} className="w-full mt-5 bg-indigo-600 text-white py-4 rounded-2xl font-black flex justify-center gap-2 no-print"><Printer size={18}/> طباعة</button>
              </CustomModal>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
