import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, MenuItem, PrinterSettings, Branch, PaymentMethod, OrderItem } from '../../types';
import { useToast, useConfirmation } from '../../App';

const getStatusColor = (status: OrderStatus) => {
    switch (status) {
        case OrderStatus.NEW: return 'bg-blue-500';
        case OrderStatus.COMPLETED: return 'bg-green-500';
        case OrderStatus.PAID: return 'bg-yellow-600';
        case OrderStatus.CANCELLED: return 'bg-red-500';
        default: return 'bg-gray-500';
    }
}

const OrderDetailsModal: React.FC<{
    order: Order | null;
    onClose: () => void;
    getBranchName: (branchId: string) => string;
}> = ({ order, onClose, getBranchName }) => {
    if (!order) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-primary-dark border-2 border-accent rounded-lg p-6 w-full max-w-md text-white shadow-2xl flex flex-col">
                 <div className="flex justify-between items-start border-b border-accent/50 pb-3 mb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-accent">Chi tiết Đơn hàng #{order.id.slice(0, 4)}</h3>
                        <p className="text-sm text-gray-100 mt-1">Ngày đặt: {new Date(order.timestamp).toLocaleString('vi-VN')}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-100 hover:text-white text-3xl">&times;</button>
                </div>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-100 mb-4">
                    <p><strong>Chi nhánh:</strong> {getBranchName(order.branchId)}</p>
                    <p><strong>Bàn:</strong> {order.tableNumber}</p>
                    <p><strong>Trạng thái:</strong> <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${getStatusColor(order.status)}`}>{order.status}</span></p>
                    <p><strong>Thanh toán:</strong> {order.paymentMethod}</p>
                </div>
                {order.note && (
                    <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-500 rounded-lg">
                        <p className="font-semibold text-yellow-300">Ghi chú chung:</p>
                        <p className="text-white whitespace-pre-wrap">{order.note}</p>
                    </div>
                )}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                    {order.items.map((item, index) => (
                         <div key={index} className="bg-primary p-3 rounded-md">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-gray-200">{item.quantity} x {(item.price || 0).toLocaleString('vi-VN')}đ</p>
                                </div>
                                <p className="font-semibold text-accent">{((item.price || 0) * item.quantity).toLocaleString('vi-VN')}đ</p>
                            </div>
                            {item.note && (
                                <div className="mt-2 pt-2 border-t border-accent/20">
                                    <p className="text-xs text-yellow-300">Ghi chú món: <span className="text-white italic">{item.note}</span></p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t border-accent/50 text-right">
                    <p className="text-lg font-bold">Tổng cộng: <span className="text-accent">{(order.total || 0).toLocaleString('vi-VN')}đ</span></p>
                </div>
            </div>
        </div>
    );
};

const BillPreviewModal: React.FC<{ 
    order: Order | null; 
    settings: PrinterSettings;
    onClose: () => void;
}> = ({ order, settings, onClose }) => {
    if (!order) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
            <div id="bill-preview" className="bg-white text-black rounded-lg shadow-xl w-full max-w-sm p-6 relative">
                <div className="text-center font-mono text-black">
                    <pre className="whitespace-pre-wrap text-sm">{settings.header}</pre>
                    <h2 className="text-lg font-bold my-4">HÓA ĐƠN THANH TOÁN</h2>
                    <div className="text-left text-sm">
                        <p>Số HD: #{order.id.slice(-6).toUpperCase()}</p>
                        <p>Bàn: {order.tableNumber}</p>
                        <p>Ngày: {new Date(order.timestamp).toLocaleString('vi-VN')}</p>
                    </div>
                    <hr className="my-2 border-dashed border-black" />
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr>
                                <th className="font-semibold">Tên món</th>
                                <th className="font-semibold text-center">SL</th>
                                <th className="font-semibold text-right">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        {item.name}
                                        {item.note && <div className="text-xs italic text-gray-600"> - {item.note}</div>}
                                    </td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td className="text-right">{((item.price || 0) * item.quantity).toLocaleString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <hr className="my-2 border-dashed border-black" />
                    <div className="text-right font-bold text-base">
                        <p>TỔNG CỘNG: {(order.total || 0).toLocaleString('vi-VN')}đ</p>
                    </div>
                    <hr className="my-2 border-dashed border-black" />
                    <pre className="whitespace-pre-wrap text-sm">{settings.footer}</pre>
                    {settings.qrCodeUrl && <img src={settings.qrCodeUrl} alt="Bank QR" className="mx-auto mt-4 w-32 h-32 object-contain"/>}
                </div>
                <div className="mt-6 flex justify-end gap-3 no-print">
                    <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Đóng</button>
                    <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">In</button>
                </div>
            </div>
        </div>
    );
};

// --- MODALS FOR EDITING ORDER ---
const AddMenuItemModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    menuItems: MenuItem[];
    onAddItem: (item: MenuItem) => void;
    currentBranchId: string;
}> = ({ isOpen, onClose, menuItems, onAddItem, currentBranchId }) => {
    if (!isOpen) return null;
    const [searchTerm, setSearchTerm] = useState('');

    const availableMenuItems = useMemo(() => 
        menuItems.filter(item => 
            !item.isOutOfStock &&
            item.branchIds.includes(currentBranchId) &&
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        ), [menuItems, searchTerm, currentBranchId]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[70]">
            <div className="bg-primary-dark border-2 border-accent rounded-lg p-6 w-full max-w-lg text-white shadow-2xl flex flex-col h-[80vh]">
                <h3 className="text-2xl font-bold text-accent mb-4">Thêm món vào đơn</h3>
                <input 
                    type="text"
                    placeholder="Tìm kiếm món ăn..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-primary border border-accent/50 text-white rounded-lg p-2 mb-4 focus:ring-accent focus:border-accent"
                />
                <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                    {availableMenuItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-primary p-3 rounded-md">
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-gray-200">{(item.price || 0).toLocaleString('vi-VN')}đ</p>
                            </div>
                            <button onClick={() => onAddItem(item)} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-1 px-3 rounded-lg text-sm">Thêm</button>
                        </div>
                    ))}
                </div>
                <button onClick={onClose} className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Đóng</button>
            </div>
        </div>
    );
};

const OrderEditModal: React.FC<{
    order: Order | null;
    menuItems: MenuItem[];
    onClose: () => void;
    onSave: (updatedOrder: Order) => void;
}> = ({ order, menuItems, onClose, onSave }) => {
    const [editedOrder, setEditedOrder] = useState<Order | null>(order ? JSON.parse(JSON.stringify(order)) : null);
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

    useEffect(() => {
        if (!editedOrder) return;
        const newTotal = editedOrder.items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
        setEditedOrder(prev => prev ? { ...prev, total: newTotal } : null);
    }, [editedOrder?.items]);

    if (!editedOrder) return null;

    const handleItemQuantityChange = (index: number, change: 1 | -1) => {
        const newItems = [...editedOrder.items];
        const currentQuantity = newItems[index].quantity;
        const newQuantity = currentQuantity + change;

        if (newQuantity <= 0) {
            newItems.splice(index, 1);
        } else {
            newItems[index].quantity = newQuantity;
        }
        setEditedOrder({ ...editedOrder, items: newItems });
    };

    const handleItemNoteChange = (index: number, note: string) => {
        const newItems = [...editedOrder.items];
        newItems[index].note = note;
        setEditedOrder({ ...editedOrder, items: newItems });
    };
    
    const handleAddItem = (itemToAdd: MenuItem) => {
        const newItems = [...editedOrder.items];
        const existingItemIndex = newItems.findIndex(i => i.menuItemId === itemToAdd.id && !i.note); // only merge if no note
        
        if (existingItemIndex > -1) {
            newItems[existingItemIndex].quantity += 1;
        } else {
            newItems.push({
                menuItemId: itemToAdd.id,
                name: itemToAdd.name,
                price: itemToAdd.price,
                quantity: 1,
                note: ''
            });
        }
        setEditedOrder({ ...editedOrder, items: newItems });
    };

    return (
        <>
            <AddMenuItemModal 
                isOpen={isAddItemModalOpen}
                onClose={() => setIsAddItemModalOpen(false)}
                menuItems={menuItems}
                onAddItem={handleAddItem}
                currentBranchId={editedOrder.branchId}
            />
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60]">
                <div className="bg-primary-dark border-2 border-accent rounded-lg p-6 w-full max-w-xl text-white shadow-2xl flex flex-col h-[90vh]">
                    <h3 className="text-2xl font-bold text-accent mb-4">Sửa Đơn hàng #{editedOrder.id.slice(0,4)}</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-100 mb-2">Số bàn:</label>
                        <input
                            type="number"
                            value={editedOrder.tableNumber}
                            onChange={(e) => setEditedOrder({ ...editedOrder, tableNumber: parseInt(e.target.value) || 0 })}
                            className="w-full bg-primary border border-accent/50 text-white rounded-lg p-2 focus:ring-accent focus:border-accent"
                        />
                    </div>
                    <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                        {editedOrder.items.length === 0 ? (
                            <p className="text-gray-200 text-center py-4">Đơn hàng trống. Hãy thêm món.</p>
                        ) : editedOrder.items.map((item, index) => (
                            <div key={index} className="bg-primary p-3 rounded-md">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{item.name}</p>
                                        <p className="text-sm text-gray-200">{((item.price || 0) * item.quantity).toLocaleString('vi-VN')}đ</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => handleItemQuantityChange(index, -1)} className="bg-gray-700 w-7 h-7 rounded-full text-white">-</button>
                                        <span className="w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => handleItemQuantityChange(index, 1)} className="bg-gray-700 w-7 h-7 rounded-full text-white">+</button>
                                    </div>
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Thêm ghi chú cho món..."
                                    value={item.note || ''}
                                    onChange={(e) => handleItemNoteChange(index, e.target.value)}
                                    className="w-full bg-primary-dark text-sm border border-accent/30 text-white rounded-md p-1 mt-2 focus:ring-accent focus:border-accent"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-accent/50">
                        <button onClick={() => setIsAddItemModalOpen(true)} className="w-full mb-4 bg-primary-light hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Thêm món</button>
                        <div className="flex justify-between font-bold text-xl mb-4">
                            <span>Tổng cộng:</span>
                            <span className="text-accent">{(editedOrder.total || 0).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Hủy</button>
                            <button onClick={() => onSave(editedOrder)} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-4 rounded-lg">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
// --- END EDITING MODALS ---


const OrderCard: React.FC<{ 
    order: Order; 
    branchName: string;
    onStatusChange: (order: Order, status: OrderStatus) => void;
    onPrint: (order: Order) => void;
    onViewDetails: (order: Order) => void;
    onEdit: (order: Order) => void;
}> = ({ order, branchName, onStatusChange, onPrint, onViewDetails, onEdit }) => (
    <div className="bg-primary-dark border border-accent rounded-lg p-4 shadow-lg flex flex-col justify-between">
        <div onClick={() => onViewDetails(order)} className="cursor-pointer">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-accent">Bàn {order.tableNumber} - #{order.id.slice(0, 4)}</h3>
                <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                </span>
            </div>
            <p className="text-sm text-gray-200">Chi nhánh: {branchName}</p>
            <p className="text-sm text-gray-200">Thời gian: {new Date(order.timestamp).toLocaleString('vi-VN')}</p>
            <div className="flex items-center gap-2 text-sm text-gray-200 mt-1">
                 {order.paymentMethod === PaymentMethod.CASH ? '💵' : '💳'}
                 <span>{order.paymentMethod}</span>
            </div>
            <div className="border-t border-accent/30 my-2"></div>
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-100">Gồm {order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} món</p>
                {order.note && <span className="text-lg" title={`Ghi chú chung: ${order.note}`}>💬</span>}
            </div>
            <p className="font-semibold text-lg text-white mt-1">Tổng: {(order.total || 0).toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
            {order.status === OrderStatus.NEW && 
                <button onClick={() => onStatusChange(order, OrderStatus.COMPLETED)} className="flex-1 text-sm bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded-md transition-colors">Hoàn thành</button>
            }
             {order.status === OrderStatus.COMPLETED && 
                <button onClick={() => onStatusChange(order, OrderStatus.PAID)} className="flex-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-2 rounded-md transition-colors">Thanh toán</button>
            }
            {(order.status === OrderStatus.NEW || order.status === OrderStatus.COMPLETED) &&
                <button onClick={() => onEdit(order)} className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded-md transition-colors">Sửa đơn</button>
            }
            <button onClick={() => onPrint(order)} className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-2 rounded-md transition-colors">In Lại</button>
            {(order.status === OrderStatus.NEW || order.status === OrderStatus.COMPLETED) &&
                <button onClick={() => onStatusChange(order, OrderStatus.CANCELLED)} className="flex-1 text-sm bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded-md transition-colors">Hủy</button>
            }
        </div>
    </div>
)

interface OrdersTabProps {
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    menuItems: MenuItem[];
    branches: Branch[];
    printerSettings: PrinterSettings;
}

const OrdersTab: React.FC<OrdersTabProps> = ({ orders, setOrders, menuItems, branches, printerSettings }) => {
    const [isBillVisible, setIsBillVisible] = useState(false);
    const [isDetailsVisible, setIsDetailsVisible] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filtersVisible, setFiltersVisible] = useState(true);
    const { showToast } = useToast();
    const { confirm } = useConfirmation();
    
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().substring(0, 10));
    const [branchFilter, setBranchFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const { filteredOrders, dailySummary } = useMemo(() => {
        const filtered = orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            const filterDate = new Date(dateFilter);
            const isSameDay = orderDate.getFullYear() === filterDate.getFullYear() &&
                              orderDate.getMonth() === filterDate.getMonth() &&
                              orderDate.getDate() === filterDate.getDate();
            if (!isSameDay) return false;

            if (branchFilter !== 'all' && order.branchId !== branchFilter) return false;
            if (statusFilter !== 'all' && order.status !== statusFilter) return false;
            
            return true;
        }).sort((a, b) => b.timestamp - a.timestamp);

        const summary = {
            totalOrders: filtered.length,
            totalRevenue: filtered.reduce((sum, order) => order.status !== OrderStatus.CANCELLED ? sum + (order.total || 0) : sum, 0),
        };

        return { filteredOrders: filtered, dailySummary: summary };
    }, [orders, dateFilter, branchFilter, statusFilter]);

    const handleStatusChange = (order: Order, status: OrderStatus) => {
        const action = () => {
            setOrders(prevOrders => prevOrders.map(o => o.id === order.id ? { ...o, status } : o));
            showToast(`Đã cập nhật trạng thái đơn hàng thành "${status}"`);
        };

        if (status === OrderStatus.CANCELLED) {
            confirm({
                title: 'Xác nhận hủy đơn',
                description: `Bạn có chắc muốn hủy đơn hàng #${order.id.slice(0, 4)} cho bàn ${order.tableNumber}?`,
                onConfirm: action,
            });
        } else {
            action();
        }
    };

    const handlePrintBill = (order: Order) => {
        setSelectedOrder(order);
        setIsBillVisible(true);
    };
    
    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
        setIsDetailsVisible(true);
    }

    const handleEditOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsEditModalOpen(true);
    };

    const handleSaveChanges = (updatedOrder: Order) => {
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        showToast('Đã cập nhật đơn hàng thành công!');
        setIsEditModalOpen(false);
        setSelectedOrder(null);
    };
    
    const getBranchName = (branchId: string) => {
        return branches.find(b => b.id === branchId)?.name || 'Không xác định';
    }

    return (
        <div>
            {isBillVisible && <BillPreviewModal order={selectedOrder} settings={printerSettings} onClose={() => setIsBillVisible(false)} />}
            {isDetailsVisible && <OrderDetailsModal order={selectedOrder} onClose={() => setIsDetailsVisible(false)} getBranchName={getBranchName} />}
            {isEditModalOpen && <OrderEditModal order={selectedOrder} menuItems={menuItems} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveChanges} />}
            
            <h2 className="text-2xl font-bold text-accent mb-4">Quản Lý Đơn Hàng</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-primary-dark p-4 rounded-lg border border-accent/50 text-center">
                    <p className="text-gray-200 text-sm">TỔNG DOANH THU (NGÀY)</p>
                    <p className="text-accent text-2xl font-bold">{(dailySummary.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
                </div>
                 <div className="bg-primary-dark p-4 rounded-lg border border-accent/50 text-center">
                    <p className="text-gray-200 text-sm">TỔNG SỐ ĐƠN (NGÀY)</p>
                    <p className="text-accent text-2xl font-bold">{dailySummary.totalOrders}</p>
                </div>
             </div>
            
            <div className="mb-6">
                <button onClick={() => setFiltersVisible(!filtersVisible)} className="w-full text-left p-2 bg-primary-dark rounded-md border border-accent/50 text-accent font-semibold mb-2">
                    {filtersVisible ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                </button>
                {filtersVisible && (
                    <div className="flex flex-wrap gap-4 p-4 bg-primary-dark rounded-lg border border-accent/50">
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-sm text-gray-200 block">Ngày</label>
                            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white" />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-sm text-gray-200 block">Chi nhánh</label>
                            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white">
                                <option value="all">Tất cả</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                         <div className="flex-1 min-w-[150px]">
                            <label className="text-sm text-gray-200 block">Trạng thái</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white">
                                <option value="all">Tất cả</option>
                                {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {filteredOrders.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredOrders.map(order => (
                        <OrderCard 
                            key={order.id} 
                            order={order} 
                            branchName={getBranchName(order.branchId)}
                            onStatusChange={handleStatusChange} 
                            onPrint={handlePrintBill} 
                            onViewDetails={handleViewDetails}
                            onEdit={handleEditOrder}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 text-gray-200">
                    <p>Không tìm thấy đơn hàng nào phù hợp.</p>
                </div>
            )}
        </div>
    );
};

export default OrdersTab;