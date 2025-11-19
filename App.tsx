
import React, { useState, useEffect, createContext, useContext, useCallback, ReactNode, useMemo } from 'react';
import CustomerView from './views/CustomerView';
import AdminView from './views/AdminView';
import KitchenView from './views/KitchenView';
import { Branch, Category, MenuItem, Order, OrderStatus, PaymentMethod, PrinterSettings } from './types';
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

// Initial data for seeding the database if it's empty
const INITIAL_DATA = {
  branches: [
    { id: 'cn1', name: 'Chi nhánh Quận 1', latitude: 10.7769, longitude: 106.7009 },
    { id: 'cn2', name: 'Chi nhánh Quận 7', latitude: 10.7326, longitude: 106.7072 },
  ],
  categories: [
    { id: 'kv', name: 'Món Khai Vị' },
    { id: 'mc', name: 'Món Chính' },
    { id: 'tm', name: 'Tráng Miệng' },
    { id: 'du', name: 'Đồ Uống' },
  ],
  menuItems: [
    { id: 'm1', name: 'Gỏi Cuốn Hoa Sen', categoryId: 'kv', description: 'Gỏi cuốn thanh đạm với rau tươi và đậu hũ.', price: 45000, imageUrl: 'https://picsum.photos/seed/goicuon/540/540', isOutOfStock: false, isFeatured: true, branchIds: ['cn1', 'cn2'] },
    { id: 'm2', name: 'Chả Giò Chay', categoryId: 'kv', description: 'Chả giò giòn rụm với nhân rau củ.', price: 55000, imageUrl: 'https://picsum.photos/seed/chagio/540/540', isOutOfStock: false, isFeatured: false, branchIds: ['cn1'] },
    { id: 'm3', name: 'Cơm Hạt Sen', categoryId: 'mc', description: 'Cơm chiên với hạt sen, nấm và rau củ.', price: 85000, imageUrl: 'https://picsum.photos/seed/comhatsen/540/540', isOutOfStock: true, isFeatured: true, branchIds: ['cn2'] },
    { id: 'm4', name: 'Lẩu Nấm', categoryId: 'mc', description: 'Lẩu nấm chay ngọt thanh, bổ dưỡng.', price: 250000, imageUrl: 'https://picsum.photos/seed/launam/540/540', isOutOfStock: false, isFeatured: false, branchIds: ['cn1', 'cn2'] },
  ],
  orders: [],
  admins: {
    admin1: { username: 'admin', password: '123' }
  },
  printerSettings: {
    header: 'Nhà hàng Chay Hoa Sen\nĐịa chỉ: 123 Đường ABC, Quận 1, TPHCM\nHotline: 0123.456.789',
    footer: 'Cảm ơn quý khách! Hẹn gặp lại!',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ChayHoaSen-BankInfo',
    paperSize: '80mm' as const,
    printerName: 'Máy in mặc định'
  },
  logoUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='50' fill='%23166534'/%3E%3Cpath d='M50,30 A20,20 0 0,1 50,70 A20,20 0 0,1 50,30 M50,15 A35,35 0 0,0 50,85 A35,35 0 0,0 50,15 M30,50 A20,20 0 0,0 70,50 A20,20 0 0,0 30,50' fill='none' stroke='%23facc15' stroke-width='5'/%3E%3C/svg%3E`
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


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('customer');
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // States to hold data from Firebase
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(INITIAL_DATA.printerSettings);
  const [logoUrl, setLogoUrl] = useState<string>(INITIAL_DATA.logoUrl);
  
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
        setBranches(firebaseListToArray(data.branches));
        setCategories(firebaseListToArray(data.categories));
        setMenuItems(firebaseListToArray(data.menuItems));
        
        // Sanitize orders to ensure 'items' is always an array
        const rawOrders = firebaseListToArray<Order>(data.orders);
        const sanitizedOrders = rawOrders.map(order => ({
            ...order,
            items: firebaseListToArray(order.items) // This prevents "order.items is not iterable"
        }));
        setOrders(sanitizedOrders);
        
        if (data.printerSettings) {
            setPrinterSettings({
                ...INITIAL_DATA.printerSettings,
                ...data.printerSettings
            });
        }
        setLogoUrl(data.logoUrl || INITIAL_DATA.logoUrl);
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
    const newOrders = [order, ...orders];
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
  
  const handleSetBranches = (newBranches: Branch[] | ((prev: Branch[]) => Branch[])) => {
      const dataToSet = typeof newBranches === 'function' ? newBranches(branches) : newBranches;
      set(ref(database, 'branches'), dataToSet);
  };
  
  const handleSetPrinterSettings = (newSettings: PrinterSettings | ((prev: PrinterSettings) => PrinterSettings)) => {
      const dataToSet = typeof newSettings === 'function' ? newSettings(printerSettings) : newSettings;
      set(ref(database, 'printerSettings'), dataToSet);
  };
  
  const handleSetLogoUrl = (newUrl: string | ((prev: string) => string)) => {
      const dataToSet = typeof newUrl === 'function' ? newUrl(logoUrl) : newUrl;
      set(ref(database, 'logoUrl'), dataToSet);
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
                        addOrder={addOrder}
                        printerSettings={printerSettings}
                    />;
        case 'admin':
            return <AdminView 
                        branches={branches}
                        setBranches={handleSetBranches}
                        categories={categories}
                        setCategories={handleSetCategories}
                        menuItems={menuItems}
                        setMenuItems={handleSetMenuItems}
                        orders={orders}
                        setOrders={handleSetOrders}
                        printerSettings={printerSettings}
                        setPrinterSettings={handleSetPrinterSettings}
                        logoUrl={logoUrl}
                        setLogoUrl={handleSetLogoUrl}
                        resetAllData={resetAllData}
                        onLogout={handleLogout}
                    />;
        case 'kitchen':
            return <KitchenView 
                        orders={orders}
                        setOrders={handleSetOrders}
                        menuItems={menuItems}
                        branches={branches}
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
          <header className="bg-primary-dark shadow-lg sticky top-0 z-[40] py-1">
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
