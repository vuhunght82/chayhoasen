
import React, { useState, useMemo, useEffect } from 'react';
import { Branch, Category, MenuItem, CartItem, Order, OrderStatus, PrinterSettings, PaymentMethod, OrderItem } from '../types';
import { useToast } from '../App';

interface CustomerViewProps {
    branches: Branch[];
    categories: Category[];
    menuItems: MenuItem[];
    addOrder: (order: Omit<Order, 'id' | 'timestamp'>) => void;
    printerSettings: PrinterSettings;
}
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/540x540.png?text=Chay+Hoa+Sen";


const FloatingActionButtons: React.FC<{
    cartItemCount: number;
    onCartClick: () => void;
}> = ({ cartItemCount, onCartClick }) => {
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:right-5 lg:translate-x-0 z-[95]">
            {/* Cart Button - Z-index 95 to be above header (z-90) */}
            <button
                onClick={onCartClick}
                className="relative w-16 h-16 bg-accent rounded-full flex justify-center items-center text-primary-dark shadow-lg transition-transform hover:scale-110"
                aria-label={`Giỏ hàng có ${cartItemCount} món`}
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-accent">
                        {cartItemCount}
                    </span>
                )}
            </button>
        </div>
    );
};


// --- MODALS for Ordering Flow ---

const CartModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    cartTotal: number;
    tableNumber: string;
    setTableNumber: (value: string) => void;
    note: string;
    setNote: (value: string) => void;
    handleAddToCart: (item: MenuItem) => void;
    handleRemoveFromCart: (itemId: string) => void;
    onConfirm: () => void;
}> = ({ isOpen, onClose, cart, setCart, cartTotal, tableNumber, setTableNumber, note, setNote, handleAddToCart, handleRemoveFromCart, onConfirm }) => {
    if (!isOpen) return null;

    const handleItemNoteChange = (itemId: string, itemNote: string) => {
        setCart(prevCart => prevCart.map(ci => 
            ci.menuItem.id === itemId ? { ...ci, note: itemNote } : ci
        ));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100]">
            <div className="bg-primary-dark border-2 border-accent rounded-lg p-6 w-full max-w-md text-white shadow-2xl flex flex-col h-[90vh]">
                <div className="flex justify-between items-center border-b border-accent/50 pb-3 mb-4">
                    <h3 className="text-2xl font-bold text-accent">Giỏ hàng của bạn</h3>
                    <button onClick={onClose} className="text-gray-100 hover:text-white text-3xl">&times;</button>
                </div>
                {cart.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center">
                        <p className="text-gray-200">Giỏ hàng của bạn đang trống.</p>
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                        {cart.map(item => (
                            <div key={item.menuItem.id} className="bg-primary p-3 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-white">{item.menuItem.name}</p>
                                        <p className="text-sm text-gray-200">{item.menuItem.price.toLocaleString('vi-VN')}đ</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => handleRemoveFromCart(item.menuItem.id)} className="bg-gray-700 w-7 h-7 rounded-full text-white">-</button>
                                        <span className="w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => handleAddToCart(item.menuItem)} className="bg-gray-700 w-7 h-7 rounded-full text-white">+</button>
                                    </div>
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Thêm ghi chú cho món..."
                                    value={item.note || ''}
                                    onChange={(e) => handleItemNoteChange(item.menuItem.id, e.target.value)}
                                    className="w-full bg-primary-dark text-sm border border-accent/30 text-white rounded-md p-1 mt-2 focus:ring-accent focus:border-accent"
                                />
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-auto pt-4 border-t border-accent/50">
                     <div className="mb-4">
                        <label htmlFor="modal-table-number" className="block text-sm font-medium text-gray-100 mb-2">Nhập số bàn:</label>
                        <input
                            id="modal-table-number"
                            type="number"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            placeholder="Ví dụ: 5"
                            className="w-full bg-primary border border-accent/50 text-white rounded-lg p-2 focus:ring-accent focus:border-accent"
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="order-note" className="block text-sm font-medium text-gray-100 mb-2">Ghi chú chung cho đơn (ví dụ: mang về):</label>
                        <textarea
                            id="order-note"
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Yêu cầu đặc biệt..."
                            className="w-full bg-primary border border-accent/50 text-white rounded-lg p-2 focus:ring-accent focus:border-accent"
                        />
                    </div>
                    <div className="flex justify-between font-bold text-xl mb-4">
                        <span className="text-white">Tổng cộng:</span>
                        <span className="text-accent">{cartTotal.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <button onClick={onConfirm} disabled={cart.length === 0} className="w-full bg-accent hover:bg-accent-dark text-primary-dark font-bold py-3 rounded-lg text-lg transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        Xác nhận đơn
                    </button>
                </div>
            </div>
        </div>
    );
};

const PaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectPayment: (method: PaymentMethod) => void;
}> = ({ isOpen, onClose, onSelectPayment }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[110]">
            <div className="bg-primary-dark border-2 border-accent rounded-lg p-8 w-full max-w-sm text-center shadow-2xl">
                <h3 className="text-2xl font-bold text-accent mb-6">Chọn hình thức thanh toán</h3>
                <div className="space-y-4">
                    <button onClick={() => onSelectPayment(PaymentMethod.TRANSFER)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg text-lg transition-colors duration-200">
                        Chuyển khoản (QR)
                    </button>
                    <button onClick={() => onSelectPayment(PaymentMethod.CASH)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg transition-colors duration-200">
                        Tiền mặt
                    </button>
                </div>
                <button onClick={onClose} className="mt-6 text-gray-200 hover:text-white">Hủy</button>
            </div>
        </div>
    );
};

const QRCodeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    qrCodeUrl: string;
}> = ({ isOpen, onClose, qrCodeUrl }) => {
    if(!isOpen) return null;
    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[120]">
            <div className="bg-white p-6 rounded-lg text-center shadow-2xl">
                 <h3 className="text-xl font-bold text-gray-800 mb-4">Quét mã để thanh toán</h3>
                 <img src={qrCodeUrl} alt="Bank QR Code" className="mx-auto w-48 h-48 mb-4 object-contain"/>
                 <p className="text-gray-600">Vui lòng thanh toán và báo cho nhân viên.</p>
                 <button onClick={onClose} className="mt-6 w-full bg-accent hover:bg-accent-dark text-primary-dark font-bold py-3 rounded-lg text-lg transition-colors duration-200">
                    Hoàn tất
                </button>
            </div>
        </div>
    )
}

const MenuItemDetailModal: React.FC<{
    item: MenuItem | null;
    onClose: () => void;
}> = ({ item, onClose }) => {
    if (!item) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[130]">
            <div className="bg-primary-dark border-2 border-accent rounded-lg p-6 w-full max-w-lg text-white shadow-2xl flex flex-col relative max-h-[90vh]">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-300 hover:text-white text-3xl z-10">&times;</button>
                <img src={item.imageUrl || PLACEHOLDER_IMAGE} alt={item.name} className="w-full h-64 object-cover rounded-lg mb-4" />
                <h3 className="text-3xl font-bold text-accent mb-2">{item.name}</h3>
                <p className="text-gray-100 mb-4 flex-grow overflow-y-auto">{item.description}</p>
                 <div className="mt-auto pt-4 flex justify-end items-center">
                    <span className="text-2xl font-semibold text-white">{item.price.toLocaleString('vi-VN')}đ</span>
                </div>
            </div>
        </div>
    );
};

// --- END MODALS ---


const MenuItemCard: React.FC<{ 
    item: MenuItem; 
    onAddToCart: (item: MenuItem) => void;
    isAdded: boolean;
    onViewDetails: (item: MenuItem) => void;
}> = ({ item, onAddToCart, isAdded, onViewDetails }) => {
  return (
    <div className="bg-primary rounded-lg border border-accent-dark overflow-hidden shadow-lg transform hover:scale-[1.02] transition-transform duration-300 flex flex-col">
        <div onClick={() => onViewDetails(item)} className="cursor-pointer flex-grow flex flex-col relative group">
          <img className="w-full h-52 object-cover" src={item.imageUrl || PLACEHOLDER_IMAGE} alt={item.name} />
          
          {/* Name overlay with SOLID RED background */}
          <div className="absolute bottom-0 left-0 right-0 bg-red-700 py-2 px-2 border-t border-accent-dark">
             <h3 className="text-base sm:text-lg font-bold text-white text-center uppercase tracking-wide leading-tight drop-shadow-md">
                {item.name}
             </h3>
          </div>
        </div>
        
        <div className="p-3 flex flex-col flex-grow bg-primary">
            <p className="text-gray-200 text-sm line-clamp-2 italic mb-3 flex-grow h-10">{item.description}</p>
             <div className="flex justify-between items-center mt-auto border-t border-accent-dark/30 pt-2">
                <span className="text-xl font-bold text-accent">{item.price.toLocaleString('vi-VN')}đ</span>
                <button 
                    onClick={() => onAddToCart(item)} 
                    disabled={isAdded}
                    className={`font-bold py-2 px-3 rounded-full text-sm transition-colors duration-200 shadow-md ${
                        isAdded 
                        ? 'bg-green-600 text-white cursor-default' 
                        : 'bg-accent hover:bg-accent-dark text-primary-dark'
                    }`}
                >
                    {isAdded ? 'Đã thêm' : 'Thêm món'}
                </button>
            </div>
        </div>
    </div>
  );
};

const CustomerView: React.FC<CustomerViewProps> = ({ branches, categories, menuItems, addOrder, printerSettings }) => {
  const [selectedBranch, setSelectedBranch] = useState<string>(branches[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [note, setNote] = useState('');
  const { showToast } = useToast();
  
  const [currentModal, setCurrentModal] = useState<'none' | 'cart' | 'payment' | 'qr'>('none');
  const [viewingItem, setViewingItem] = useState<MenuItem | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Prevent body scroll when a modal is open
    document.body.style.overflow = currentModal !== 'none' || viewingItem ? 'hidden' : 'auto';
  }, [currentModal, viewingItem]);

  useEffect(() => {
    // Check for QR code data in URL on initial load
    const urlParams = new URLSearchParams(window.location.search);
    const branchId = urlParams.get('branchId');
    const table = urlParams.get('table');

    if (branchId && table && branches.some(b => b.id === branchId)) {
        setSelectedBranch(branchId);
        setTableNumber(table);
        showToast('Thông tin bàn đã được cập nhật từ mã QR!');
        // Clean the URL to avoid re-triggering
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [branches, showToast]);


  const handleAddToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.menuItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.menuItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prevCart, { menuItem: item, quantity: 1, note: '' }];
    });
    setRecentlyAdded(prev => [...prev, item.id]);
    setTimeout(() => {
        setRecentlyAdded(prev => prev.filter(id => id !== item.id));
    }, 1500);
  };
  
  const handleRemoveFromCart = (itemId: string) => {
     setCart(prevCart => {
        const existingItem = prevCart.find(cartItem => cartItem.menuItem.id === itemId);
        if (existingItem && existingItem.quantity > 1) {
            return prevCart.map(cartItem => 
                cartItem.menuItem.id === itemId ? {...cartItem, quantity: cartItem.quantity - 1} : cartItem
            );
        }
        return prevCart.filter(cartItem => cartItem.menuItem.id !== itemId);
     });
  };
  
  const handleConfirmOrder = () => {
    if (cart.length === 0) {
        showToast('Giỏ hàng của bạn đang trống.', 'error');
        return;
    }
    if (!selectedBranch) {
        showToast('Vui lòng chọn chi nhánh.', 'error');
        return;
    }
    if (!tableNumber || isNaN(parseInt(tableNumber)) || parseInt(tableNumber) <= 0) {
        showToast('Vui lòng nhập số bàn hợp lệ.', 'error');
        return;
    }
    setCurrentModal('payment');
  }
  
  const handleSelectPayment = (method: PaymentMethod) => {
     const newOrderItems: OrderItem[] = cart.map(cartItem => {
         const itemPayload: OrderItem = {
             menuItemId: cartItem.menuItem.id,
             quantity: cartItem.quantity,
             price: cartItem.menuItem.price,
             name: cartItem.menuItem.name,
         };
         if (cartItem.note && cartItem.note.trim()) {
             itemPayload.note = cartItem.note.trim();
         }
         return itemPayload;
     });

     const newOrder: Omit<Order, 'id' | 'timestamp'> = {
        branchId: selectedBranch,
        tableNumber: parseInt(tableNumber),
        items: newOrderItems,
        total: cartTotal,
        status: OrderStatus.NEW,
        paymentMethod: method,
    };

    if (note && note.trim()) {
        newOrder.note = note.trim();
    }
    
    addOrder(newOrder);

    if (method === PaymentMethod.TRANSFER) {
        setCurrentModal('qr');
    } else {
        showToast('Đặt món thành công! Vui lòng thanh toán tại quầy.');
        resetOrderState();
    }
  }

  const resetOrderState = () => {
    setCurrentModal('none');
    setCart([]);
    setTableNumber('');
    setNote('');
  };

  const filteredMenuItems = useMemo(() => {
    return menuItems
        .filter(item => !item.isOutOfStock)
        .filter(item => item.branchIds && item.branchIds.includes(selectedBranch))
        .filter(item => {
            if (activeCategory === 'all') return true;
            return item.categoryId === activeCategory;
        })
        .filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
  }, [menuItems, activeCategory, searchTerm, selectedBranch]);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
  }, [cart]);
  
  const totalCartItems = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);


  return (
    <>
      <FloatingActionButtons cartItemCount={totalCartItems} onCartClick={() => setCurrentModal('cart')} />
      <CartModal 
        isOpen={currentModal === 'cart'}
        onClose={() => setCurrentModal('none')}
        cart={cart}
        setCart={setCart}
        cartTotal={cartTotal}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        note={note}
        setNote={setNote}
        handleAddToCart={handleAddToCart}
        handleRemoveFromCart={handleRemoveFromCart}
        onConfirm={handleConfirmOrder}
      />
      <PaymentModal 
        isOpen={currentModal === 'payment'}
        onClose={() => setCurrentModal('cart')} // Go back to cart modal
        onSelectPayment={handleSelectPayment}
      />
      <QRCodeModal 
        isOpen={currentModal === 'qr'}
        onClose={() => {
            showToast('Đơn hàng đã được ghi nhận!');
            resetOrderState();
        }}
        qrCodeUrl={printerSettings.qrCodeUrl}
      />
      <MenuItemDetailModal 
        item={viewingItem}
        onClose={() => setViewingItem(null)}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8 flex flex-col lg:flex-row gap-8 pb-24 lg:pb-8">
        {/* Main content */}
        <div className="flex-grow lg:w-2/3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="branch-select" className="block text-sm font-medium text-gray-100 mb-1">Chọn chi nhánh:</label>
                <select
                  id="branch-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-primary border border-accent-dark text-white rounded-lg p-2 focus:ring-accent focus:border-accent"
                >
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
               <div>
                <label htmlFor="search-item" className="block text-sm font-medium text-gray-100 mb-1">Tìm kiếm món ăn:</label>
                <input
                  id="search-item"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ví dụ: Gỏi cuốn..."
                  className="w-full bg-primary border border-accent-dark text-white rounded-lg p-2 focus:ring-accent focus:border-accent"
                />
              </div>
          </div>
          
          {/* Featured Items */}
          {menuItems.some(item => item.isFeatured && !item.isOutOfStock && item.branchIds.includes(selectedBranch)) && (
            <div className="mb-6">
                <h2 className="text-lg font-bold text-accent mb-3 flex items-center gap-2">
                    <span className="text-xl">★</span> Món ăn nổi bật
                </h2>
                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
                    {menuItems
                        .filter(item => item.isFeatured && !item.isOutOfStock && item.branchIds.includes(selectedBranch))
                        .map(item => (
                            <div key={item.id} className="min-w-[260px] snap-center">
                                <MenuItemCard item={item} onAddToCart={handleAddToCart} isAdded={recentlyAdded.includes(item.id)} onViewDetails={setViewingItem} />
                            </div>
                        ))
                    }
                </div>
            </div>
          )}

          {/* Sticky Category Navigation - Updated Top Position to 60px to match smaller header */}
          <div className="sticky top-[60px] z-30 bg-primary py-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 shadow-md sm:rounded-lg border-y sm:border border-accent/30">
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                  key="all"
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 border ${
                    activeCategory === 'all'
                      ? 'bg-accent text-primary-dark font-bold border-accent shadow-sm'
                      : 'bg-primary-dark text-gray-200 border-transparent hover:bg-primary-light'
                  }`}
                >
                  Tất cả
                </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 border ${
                    activeCategory === category.id
                      ? 'bg-accent text-primary-dark font-bold border-accent shadow-sm'
                      : 'bg-primary-dark text-gray-200 border-transparent hover:bg-primary-light'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredMenuItems.length > 0 ? filteredMenuItems.map(item => (
              <MenuItemCard key={item.id} item={item} onAddToCart={handleAddToCart} isAdded={recentlyAdded.includes(item.id)} onViewDetails={setViewingItem} />
            )) : (
                <p className="text-gray-200 col-span-full text-center py-8">Không tìm thấy món ăn nào.</p>
            )}
          </div>
        </div>

        {/* Cart Sidebar - Updated Top Position to 60px */}
        <div id="cart-sidebar" className="hidden lg:block lg:w-1/3">
          <div className="sticky top-[60px] bg-primary rounded-lg border border-accent-dark shadow-lg p-6">
            <h2 className="text-2xl font-bold text-accent border-b border-accent-dark pb-3 mb-4">Giỏ Hàng</h2>
            {cart.length === 0 ? (
              <p className="text-gray-200">Giỏ hàng của bạn đang trống.</p>
            ) : (
              <>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {cart.map(item => (
                    <div key={item.menuItem.id} className="flex flex-col bg-primary-dark p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-white">{item.menuItem.name}</p>
                                <p className="text-sm text-gray-200">{item.menuItem.price.toLocaleString('vi-VN')}đ</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button onClick={() => handleRemoveFromCart(item.menuItem.id)} className="bg-gray-700 w-6 h-6 rounded-full text-white">-</button>
                                <span>{item.quantity}</span>
                                <button onClick={() => handleAddToCart(item.menuItem)} className="bg-gray-700 w-6 h-6 rounded-full text-white">+</button>
                            </div>
                        </div>
                        <input 
                            type="text"
                            placeholder="Thêm ghi chú..."
                            value={item.note || ''}
                            onChange={(e) => {
                                const newVal = e.target.value;
                                setCart(prev => prev.map(i => i.menuItem.id === item.menuItem.id ? {...i, note: newVal} : i));
                            }}
                            className="w-full bg-primary text-xs border border-accent/30 text-white rounded-md p-1 mt-2 focus:ring-accent focus:border-accent"
                        />
                    </div>
                  ))}
                </div>
                <div className="mt-6 border-t border-accent-dark pt-4">
                  <div className="flex justify-between font-bold text-xl">
                    <span className="text-white">Tổng cộng:</span>
                    <span className="text-accent">{cartTotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <button onClick={() => setCurrentModal('cart')} className="w-full mt-4 bg-accent hover:bg-accent-dark text-primary-dark font-bold py-3 rounded-lg text-lg transition-colors duration-200">
                    Đặt Món
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerView;
