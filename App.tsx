import React, { useState, useEffect, createContext, useContext, useCallback, ReactNode, useMemo } from 'react';
import CustomerView from './views/CustomerView';
import AdminView from './views/AdminView';
import KitchenView from './views/KitchenView';
import { Branch, Category, MenuItem, Order, OrderStatus, PaymentMethod, PrinterSettings, KitchenSettings, SavedSound, Topping, ToppingGroup } from './types';
import { database } from './firebase';
import { ref, onValue, set, get, child } from 'firebase/database';

// --- Toast Notification System ---
interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-2xl text-white font-semibold animate-fade-in-out text-sm ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
       <style>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 3s ease-in-out forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
// --- End Toast Notification System ---

// --- Confirmation Modal System ---
interface ConfirmationOptions {
    title: string;
    description: string;
    onConfirm: () => void;
}

interface ConfirmationContextType {
    confirm: (options: ConfirmationOptions) => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [options, setOptions] = useState<ConfirmationOptions | null>(null);

    const confirm = (newOptions: ConfirmationOptions) => {
        setOptions(newOptions);
    };

    const handleClose = () => {
        setOptions(null);
    };

    const handleConfirm = () => {
        if (options) {
            options.onConfirm();
        }
        handleClose();
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            {options && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[190]">
                    <div className="bg-primary-dark border-2 border-accent rounded-lg p-8 w-full max-w-sm text-center shadow-2xl">
                        <h3 className="text-2xl font-bold text-accent mb-4">{options.title}</h3>
                        <p className="text-gray-100 mb-6">{options.description}</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={handleClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Hủy</button>
                            <button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmationContext.Provider>
    );
};

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
};
// --- End Confirmation Modal System ---

type View = 'customer' | 'admin' | 'kitchen';

const DEFAULT_KITCHEN_SOUNDS: SavedSound[] = [
    { id: 's1', name: 'Chuông ngắn (Mặc định)', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
    { id: 's2', name: 'Đồng hồ điện tử', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
    { id: 's3', name: 'Kèn hiệu', url: 'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg' },
    { id: 's4', name: 'Chuông tam giác', url: 'https://actions.google.com/sounds/v1/alarms/dinner_bell_triangle.ogg' },
    { id: 's5', name: 'Đồng hồ cơ', url: 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg' }
];

const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
    header: 'Nhà hàng Chay Hoa Sen\nĐịa chỉ: [Địa chỉ chi nhánh]\nHotline: [Số điện thoại]',
    footer: 'Cảm ơn quý khách! Hẹn gặp lại!',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ChayHoaSen-DefaultBank',
    paperSize: '80mm' as const,
    printerName: 'Máy in mặc định'
};

// Initial data for seeding the database if it's empty
const INITIAL_DATA = {
  branches: [
    { 
        id: 'cn1', 
        name: 'Chi nhánh Quận 1', 
        latitude: 10.7769, 
        longitude: 106.7009, 
        allowedDistance: 100,
        printerSettings: {
            ...DEFAULT_PRINTER_SETTINGS,
            header: 'Nhà hàng Chay Hoa Sen\nChi nhánh Quận 1\nĐịa chỉ: 123 Đường ABC, Q.1, TPHCM\nHotline: 0123.456.789'
        }
    },
    { 
        id: 'cn2', 
        name: 'Chi nhánh Quận 7', 
        latitude: 10.7326, 
        longitude: 106.7072, 
        allowedDistance: 150,
        printerSettings: {
            ...DEFAULT_PRINTER_SETTINGS,
            header: 'Nhà hàng Chay Hoa Sen\nChi nhánh Quận 7\nĐịa chỉ: 456 Đường XYZ, Q.7, TPHCM\nHotline: 0987.654.321'
        }
    },
  ],
  categories: [
    { id: 'kv', name: 'Món Khai Vị' },
    { id: 'mc', name: 'Món Chính' },
    { id: 'tm', name: 'Tráng Miệng' },
    { id: 'du', name: 'Đồ Uống' },
  ],
  toppings: [
    { id: 't1', name: 'Size S', price: 0 },
    { id: 't2', name: 'Size M', price: 5000 },
    { id: 't3', name: 'Size L', price: 10000 },
    { id: 't4', name: 'Trân châu đen', price: 5000 },
    { id: 't5', name: 'Thạch trái cây', price: 7000 },
  ],
  toppingGroups: [
    { id: 'tg1', name: 'Chọn Size', minSelection: 1, maxSelection: 1, toppingIds: ['t1', 't2', 't3'] },
    { id: 'tg2', name: 'Món Thêm', minSelection: 0, maxSelection: 3, toppingIds: ['t4', 't5'] },
  ],
  menuItems: [
    { id: 'm1', name: 'Gỏi Cuốn Hoa Sen', categoryId: 'kv', description: 'Gỏi cuốn thanh đạm với rau tươi và đậu hũ.', price: 45000, imageUrl: 'https://picsum.photos/seed/goicuon/540/540', isOutOfStock: false, isFeatured: true, branchIds: ['cn1', 'cn2'] },
    { id: 'm2', name: 'Chả Giò Chay', categoryId: 'kv', description: 'Chả giò giòn rụm với nhân rau củ.', price: 55000, imageUrl: 'https://picsum.photos/seed/chagio/540/540', isOutOfStock: false, isFeatured: false, branchIds: ['cn1'] },
    { id: 'm3', name: 'Cơm Hạt Sen', categoryId: 'mc', description: 'Cơm chiên với hạt sen, nấm và rau củ.', price: 85000, imageUrl: 'https://picsum.photos/seed/comhatsen/540/540', isOutOfStock: true, isFeatured: true, branchIds: ['cn2'] },
    { id: 'm4', name: 'Lẩu Nấm', categoryId: 'mc', description: 'Lẩu nấm chay ngọt thanh, bổ dưỡng.', price: 250000, imageUrl: 'https://picsum.photos/seed/launam/540/540', isOutOfStock: false, isFeatured: false, branchIds: ['cn1', 'cn2'] },
    { id: 'm5', name: 'Trà Sữa Trân Châu', categoryId: 'du', description: 'Trà sữa Đài Loan đậm vị trà.', price: 35000, imageUrl: 'https://picsum.photos/seed/trasua/540/540', isOutOfStock: false, isFeatured: true, branchIds: ['cn1', 'cn2'], toppingGroupIds: ['tg1', 'tg2'] },
  ],
  orders: [],
  admins: {
    admin1: { username: 'admin', password: '123' }
  },
  kitchenSettings: {
    notificationSoundUrl: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    notificationRepeatCount: 3,
    savedSounds: DEFAULT_KITCHEN_SOUNDS
  },
  logoUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='50' fill='%23166534'/%3E%3Cpath d='M50,30 A20,20 0 0,1 50,70 A20,20 0 0,1 50,30 M50,15 A35,35 0 0,0 50,85 A35,35 0 0,0 50,15 M30,50 A20,20 0 0,0 70,50 A20,20 0 0,0 30,50' fill='none' stroke='%23facc15' stroke-width='5'/%3E%3C/svg%3E`,
  themeColor: '#15803d' // Default green
};

// Helper function to safely convert Firebase list data (which can be an object) to an array.
const firebaseListToArray = <T,>(data: Record<string, T> | T[] | undefined | null): T[] => {
    if (!data) {
        return [];
    }
    // If it's already an array, filter out potential nulls from sparse arrays
    if (Array.isArray(data)) {
        return data.filter(item => item != null);
    }
    // If it's an object, convert its values to an array
    return Object.values(data);
};

// --- Color Utils ---
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const adjustBrightness = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (
        0x1000000 + 
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + 
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + 
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
};


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('customer');
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // States to hold data from Firebase
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [toppingGroups, setToppingGroups] = useState<ToppingGroup[]>([]);
  const [kitchenSettings, setKitchenSettings] = useState<KitchenSettings>(INITIAL_DATA.kitchenSettings);
  const [logoUrl, setLogoUrl] = useState<string>(INITIAL_DATA.logoUrl);
  const [themeColor, setThemeColor] = useState<string>(INITIAL_DATA.themeColor);
  
  // Check for existing session
  useEffect(() => {
    const session = sessionStorage.getItem('chayhoasen_session');
    if (session === 'active') {
        setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = () => {
      setIsLoggedIn(true);
      sessionStorage.setItem('chayhoasen_session', 'active');
      setCurrentView('admin'); // Default to admin after login
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      sessionStorage.removeItem('chayhoasen_session');
      setCurrentView('customer');
  }

  // --- Theme Application Logic ---
  useEffect(() => {
      const applyTheme = (color: string) => {
          const rgb = hexToRgb(color);
          if (rgb) {
              const darkHex = adjustBrightness(color, -15); // Darken by 15%
              const lightHex = adjustBrightness(color, 20); // Lighten by 20%
              
              const darkRgb = hexToRgb(darkHex);
              const lightRgb = hexToRgb(lightHex);

              if (darkRgb && lightRgb) {
                  document.documentElement.style.setProperty('--color-primary', `${rgb.r} ${rgb.g} ${rgb.b}`);
                  document.documentElement.style.setProperty('--color-primary-dark', `${darkRgb.r} ${darkRgb.g} ${darkRgb.b}`);
                  document.documentElement.style.setProperty('--color-primary-light', `${lightRgb.r} ${lightRgb.g} ${lightRgb.b}`);
              }
          }
      };
      
      applyTheme(themeColor);
  }, [themeColor]);


  // --- Firebase Data Synchronization ---
  useEffect(() => {
    const dbRef = ref(database);

    // One-time check to seed data if database is empty
    get(child(dbRef, '/')).then((snapshot) => {
      if (!snapshot.exists()) {
        console.log("No data found, seeding initial data...");
        set(dbRef, INITIAL_DATA);
      } else {
         // Check specifically for admins in case it was added later
         get(child(dbRef, 'admins')).then(adminSnap => {
            if (!adminSnap.exists()) {
                console.log("No admins found, seeding default admin...");
                set(child(dbRef, 'admins'), INITIAL_DATA.admins);
            }
         });
      }
    }).catch(console.error);
    
    // Set up real-time listener
    const unsubscribe = onValue(ref(database), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Sanitize branches to ensure printerSettings exists
        const rawBranches = firebaseListToArray<Branch>(data.branches);
        const sanitizedBranches = rawBranches.map(branch => ({
            ...branch,
            printerSettings: { ...DEFAULT_PRINTER_SETTINGS, ...branch.printerSettings }
        }));
        setBranches(sanitizedBranches);

        setCategories(firebaseListToArray(data.categories));
        setToppings(firebaseListToArray(data.toppings));

        // Sanitize menuItems to ensure branchIds and toppingGroupIds are always arrays
        const rawMenuItems = firebaseListToArray<MenuItem>(data.menuItems);
        const sanitizedMenuItems = rawMenuItems.map(item => ({
            ...item,
            branchIds: item.branchIds || [],
            toppingGroupIds: item.toppingGroupIds || []
        }));
        setMenuItems(sanitizedMenuItems);
        
        // Sanitize toppingGroups to ensure toppingIds is always an array
        const rawToppingGroups = firebaseListToArray<ToppingGroup>(data.toppingGroups);
        const sanitizedToppingGroups = rawToppingGroups.map(group => ({
            ...group,
            toppingIds: group.toppingIds || []
        }));
        setToppingGroups(sanitizedToppingGroups);
        
        // Sanitize orders to ensure 'items' is always an array
        const rawOrders = firebaseListToArray<Order>(data.orders);
        const sanitizedOrders = rawOrders.map(order => ({
            ...order,
            items: firebaseListToArray(order.items) // This prevents "order.items is not iterable"
        }));
        setOrders(sanitizedOrders);
        
        if (data.kitchenSettings) {
             const savedSounds = data.kitchenSettings.savedSounds 
                ? firebaseListToArray<SavedSound>(data.kitchenSettings.savedSounds)
                : DEFAULT_KITCHEN_SOUNDS;
                
            setKitchenSettings({
                ...INITIAL_DATA.kitchenSettings,
                ...data.kitchenSettings,
                savedSounds
            });
        }
        setLogoUrl(data.logoUrl || INITIAL_DATA.logoUrl);
        setThemeColor(data.themeColor || INITIAL_DATA.themeColor);
      }
      setLoading(false);
    });
    
    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // --- Firebase Write Functions ---
  const addOrder = (newOrder: Omit<Order, 'id' | 'timestamp'>) => {
    const order: Order = {
      ...newOrder,
      id: `o${Date.now()}`,
      timestamp: Date.now(),
    };
    // The CustomerView now provides a full order object including the generated ID and timestamp
    const fullOrder = newOrder as Order;
    const newOrders = [fullOrder, ...orders];
    set(ref(database, 'orders'), newOrders);
  };
  
  const handleSetOrders = (newOrders: Order[] | ((prev: Order[]) => Order[])) => {
    const dataToSet = typeof newOrders === 'function' ? newOrders(orders) : newOrders;
    set(ref(database, 'orders'), dataToSet);
  };
  
  const handleSetMenuItems = (newItems: MenuItem[] | ((prev: MenuItem[]) => MenuItem[])) => {
      const dataToSet = typeof newItems === 'function' ? newItems(menuItems) : newItems;
      set(ref(database, 'menuItems'), dataToSet);
  };
  
  const handleSetCategories = (newCategories: Category[] | ((prev: Category[]) => Category[])) => {
      const dataToSet = typeof newCategories === 'function' ? newCategories(categories) : newCategories;
      set(ref(database, 'categories'), dataToSet);
  };

  const handleSetToppings = (newToppings: Topping[] | ((prev: Topping[]) => Topping[])) => {
      const dataToSet = typeof newToppings === 'function' ? newToppings(toppings) : newToppings;
      set(ref(database, 'toppings'), dataToSet);
  };
  
  const handleSetToppingGroups = (newToppingGroups: ToppingGroup[] | ((prev: ToppingGroup[]) => ToppingGroup[])) => {
      const dataToSet = typeof newToppingGroups === 'function' ? newToppingGroups(toppingGroups) : newToppingGroups;
      set(ref(database, 'toppingGroups'), dataToSet);
  };
  
  const handleSetBranches = (newBranches: Branch[] | ((prev: Branch[]) => Branch[])) => {
      const dataToSet = typeof newBranches === 'function' ? newBranches(branches) : newBranches;
      set(ref(database, 'branches'), dataToSet);
  };
  
  const handleSetKitchenSettings = (newSettings: KitchenSettings | ((prev: KitchenSettings) => KitchenSettings)) => {
      const dataToSet = typeof newSettings === 'function' ? newSettings(kitchenSettings) : newSettings;
      set(ref(database, 'kitchenSettings'), dataToSet);
  };
  
  const handleSetLogoUrl = (newUrl: string | ((prev: string) => string)) => {
      const dataToSet = typeof newUrl === 'function' ? newUrl(logoUrl) : newUrl;
      set(ref(database, 'logoUrl'), dataToSet);
  };

  const handleSetThemeColor = (newColor: string | ((prev: string) => string)) => {
      const dataToSet = typeof newColor === 'function' ? newColor(themeColor) : newColor;
      set(ref(database, 'themeColor'), dataToSet);
  };
  
  const resetAllData = () => {
    set(ref(database), { ...INITIAL_DATA, orders: [] });
  }

  const newOrdersCount = useMemo(() => {
    return orders.filter(order => order.status === OrderStatus.NEW).length;
  }, [orders]);

  const NavButton: React.FC<{ view: View; label: string; notificationCount?: number }> = ({ view, label, notificationCount }) => (
    <div className="relative">
        <button
            onClick={() => setCurrentView(view)}
            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                currentView === view
                ? 'bg-accent text-primary-dark font-bold'
                : 'text-gray-200 hover:bg-primary-light hover:text-white'
            }`}
        >
            {label}
        </button>
        {notificationCount && notificationCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-yellow-300 text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-primary-dark">
                {notificationCount}
            </span>
        )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }
  
  // Auth Login Component
  const LoginView = React.lazy(() => import('./views/LoginView'));

  const renderCurrentView = () => {
    if ((currentView === 'admin' || currentView === 'kitchen') && !isLoggedIn) {
         return <React.Suspense fallback={<div>Loading...</div>}>
             <LoginView onLoginSuccess={handleLoginSuccess} />
         </React.Suspense>
    }

    switch (currentView) {
        case 'customer':
            return <CustomerView 
                        branches={branches}
                        categories={categories}
                        menuItems={menuItems}
                        toppings={toppings}
                        toppingGroups={toppingGroups}
                        addOrder={addOrder}
                        orders={orders}
                    />;
        case 'admin':
            return <AdminView 
                        branches={branches}
                        setBranches={handleSetBranches}
                        categories={categories}
                        setCategories={handleSetCategories}
                        menuItems={menuItems}
                        setMenuItems={handleSetMenuItems}
                        toppings={toppings}
                        setToppings={handleSetToppings}
                        toppingGroups={toppingGroups}
                        setToppingGroups={handleSetToppingGroups}
                        orders={orders}
                        setOrders={handleSetOrders}
                        kitchenSettings={kitchenSettings}
                        setKitchenSettings={handleSetKitchenSettings}
                        logoUrl={logoUrl}
                        setLogoUrl={handleSetLogoUrl}
                        themeColor={themeColor}
                        setThemeColor={handleSetThemeColor}
                        resetAllData={resetAllData}
                        onLogout={handleLogout}
                    />;
        case 'kitchen':
            return <KitchenView 
                        orders={orders}
                        setOrders={handleSetOrders}
                        menuItems={menuItems}
                        branches={branches}
                        kitchenSettings={kitchenSettings}
                    />;
        default:
            return null;
    }
  };


  return (
    <ToastProvider>
      <ConfirmationProvider>
        <div className="min-h-screen font-sans">
          {/* Header - Compact, Flex Row, Lower Z-index */}
          <header className="bg-primary-dark shadow-lg sticky top-0 z-[40] py-1 transition-colors duration-500">
            <div className="container mx-auto px-2 sm:px-4 flex flex-row items-center justify-between gap-2">
              {/* Logo - Left */}
              <div className="flex items-center gap-2">
                   <div className="w-10 h-10 lg:w-14 lg:h-14 bg-primary p-0.5 lg:p-1 rounded-full border-2 border-accent-dark shadow-lg flex justify-center items-center relative z-10 flex-shrink-0">
                      <div className="w-full h-full rounded-full relative overflow-hidden">
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover"/>
                      </div>
                  </div>
                  <div className="hidden sm:block text-lg lg:text-xl font-bold text-accent uppercase tracking-wide">Chay Hoa Sen</div>
              </div>
              
              {/* Navigation - Right */}
              <div className="flex items-center gap-2">
                <nav className="flex items-center space-x-1">
                  <NavButton view="customer" label="Đặt Món" />
                  
                  {/* Only show Admin/Kitchen if logged in */}
                  {isLoggedIn && (
                    <>
                        <NavButton view="kitchen" label="Bếp" notificationCount={newOrdersCount} />
                        <NavButton view="admin" label="Quản Lý" notificationCount={newOrdersCount} />
                    </>
                  )}
                </nav>

                {isLoggedIn ? (
                    <div className="flex items-center gap-2 border-l border-accent/30 pl-2 ml-1">
                        <button
                            onClick={handleLogout}
                            className="px-2 py-1 rounded-md text-xs font-bold bg-red-600 text-white hover:bg-red-500 shadow-sm transition-all duration-200 whitespace-nowrap"
                        >
                            Thoát
                        </button>
                    </div>
                ) : (
                     // Login button for staff
                    <div className="flex items-center gap-2 border-l border-accent/30 pl-2 ml-1">
                         <button
                            onClick={() => setCurrentView('admin')} // Trigger login view
                            className="p-2 rounded-full text-accent hover:bg-primary-light transition-colors"
                            title="Đăng nhập Quản trị"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </button>
                    </div>
                )}
              </div>
            </div>
          </header>

          <main>
            {renderCurrentView()}
          </main>
        </div>
      </ConfirmationProvider>
    </ToastProvider>
  );
};

export default App;