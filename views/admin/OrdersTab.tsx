
import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, MenuItem, PrinterSettings, Branch, PaymentMethod, OrderItem, PrintStation, PrintJob } from '../../types';
import { useToast, useConfirmation } from '../../App';
import { ref, push, set } from 'firebase/database';
import { database } from '../../firebase';


const getStatusColor = (status: OrderStatus) => {
    switch (status) {
        case OrderStatus.NEW: return 'bg-blue-500';
        case OrderStatus.COMPLETED: return 'bg-green-500';
        case OrderStatus.PAID: return 'bg-yellow-600';
        case OrderStatus.CANCELLED: return 'bg-red-500';
        default: return 'bg-gray-500';
    }
}

// --- Custom Date Picker Component ---
const CustomDatePicker: React.FC<{
    selectedDate: string;
    onDateChange: (date: string) => void;
    orderCounts: Record<string, number>;
}> = ({ selectedDate, onDateChange, orderCounts }) => {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));
    const [isOpen, setIsOpen] = useState(false);

    const changeMonth = (amount: number) => {
        setViewDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };
    
    const selectDate = (day: number) => {
        const newDate = new Date(viewDate);
        newDate.setDate(day);
        onDateChange(newDate.toISOString().substring(0, 10));
        setIsOpen(false);
    };

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay(); // Sunday - 0, Monday - 1

    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="p-1"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const isSelected = dateStr === selectedDate;
        const orderCount = orderCounts[dateStr] || 0;
        
        calendarDays.push(
            <div key={day} className="p-1">
                <button
                    onClick={() => selectDate(day)}
                    className={`w-full h-full flex flex-col items-center justify-center rounded-lg transition-colors duration-200 aspect-square ${
                        isSelected 
                            ? 'bg-accent text-primary-dark font-bold' 
                            : 'text-white hover:bg-primary-light'
                    }`}
                >
                    <span>{day}</span>
                    {orderCount > 0 && (
                         <span className={`text-xs mt-0.5 px-1 rounded-full ${isSelected ? 'bg-primary-dark/20' : 'bg-primary-light/50 text-gray-200'}`}>
                            {orderCount}
                        </span>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="relative">
            <input 
                type="text" 
                value={new Date(selectedDate).toLocaleDateString('vi-VN')}
                readOnly
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white cursor-pointer"
            />
            {isOpen && (
                 <div className="absolute top-full mt-2 w-full max-w-xs bg-primary-dark border border-accent/50 rounded-lg p-3 shadow-2xl z-20">
                    <div className="flex justify-between items-center mb-2">
                        <button onClick={() => changeMonth(-1)} className="font-bold text-accent p-2 rounded-full hover:bg-primary-light">‹</button>
                        <span className="font-semibold text-white">
                            Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}
                        </span>
                        <button onClick={() => changeMonth(1)} className="font-bold text-accent p-2 rounded-full hover:bg-primary-light">›</button>
                    </div>
                    <div className="grid grid-cols-7 text-center text-xs text-gray-300 mb-1">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7">
                        {calendarDays}
                    </div>
                     <div className="flex justify-between mt-2 pt-2 border-t border-accent/30 text-sm">
                        <button onClick={() => {
                            const today = new Date();
                            setViewDate(today);
                            onDateChange(today.toISOString().substring(0, 10));
                            setIsOpen(false);
                        }} className="text-accent hover:underline">Hôm nay</button>
                         <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">Đóng</button>
                    </div>
                </div>
            )}
        </div>
    );
};


const OrderDetailsModal: React.FC<{
    order: Order | null;
    onClose: () => void;
    getBranchName: (branchId: string) => string;
}> = ({ order, onClose, getBranchName }) => {
    if (!order) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-primary-dark border-2 border-accent rounded-lg p-6 w-full max-w-md text-white shadow-2xl flex flex-col max-h-[90vh]">
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
                <div className="space-y-3 flex-grow overflow-y-auto pr-2">
                    {order.items.map((item, index) => (
                         <div key={index} className="bg-primary p-3 rounded-md">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">{item.quantity}x {item.name}</p>
                                    {item.selectedToppings && item.selectedToppings.length > 0 && (
                                        <ul className="text-xs text-gray-300 pl-4 list-disc mt-1">
                                            {item.selectedToppings.map(t => <li key={t.id}>{t.name} (+{t.price.toLocaleString('vi-VN')}đ)</li>)}
                                        </ul>
                                    )}
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
        // This relies on the @media print styles in index.html to format the output.
        // It's the most compatible way for both desktop and mobile (AirPrint).
        window.print();
    };
    
    // Determine preview width based on paper size
    const getPreviewWidthClass = () => {
        switch (settings.paperSize) {
            case '58mm': return 'w-[58mm]';
            case '80mm': return 'w-[80mm]';
            case 'A5': return 'w-[148mm]';
            case 'A4': return 'w-[210mm]';
            default: return 'w-full max-w-sm';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-start pt-10 z-[100] overflow-y-auto no-print">
            <div className="flex flex-col items-center my-10">
                <h3 className="text-white font-bold mb-4 text-xl">Xem trước bản in</h3>
                 <div className={`bg-white text-black rounded-sm shadow-2xl p-4 mb-6 ${getPreviewWidthClass()} min-h-[300px]`}>
                    {/* The content for printing is now separate and hidden by default, shown only by print CSS */}
                 </div>
                <div className="flex gap-4 pb-10 sticky bottom-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105">Đóng</button>
                    <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        In Hóa Đơn
                    </button>
                </div>
            </div>
        </div>
    );
};

const BillForPrinting: React.FC<{ order: Order, settings: PrinterSettings }> = ({ order, settings }) => {
    return (
         <div id="bill-preview" className="text-black">
            <div className="text-center font-mono text-xs text-black leading-relaxed">
                <pre className="whitespace-pre-wrap text-black font-sans text-sm font-semibold mb-2">{settings.header}</pre>
                <h2 className="text-lg font-bold my-2 text-black uppercase border-b-2 border-black pb-1 inline-block">HÓA ĐƠN THANH TOÁN</h2>
                <div className="text-left text-black mt-2 mb-2 text-sm">
                    <p>Số HD: <span className="font-bold">#{order.id.slice(-6).toUpperCase()}</span></p>
                    <p>Bàn: <span className="font-bold">{order.tableNumber}</span></p>
                    <p>Ngày: {new Date(order.timestamp).toLocaleString('vi-VN')}</p>
                </div>
                <hr className="my-2 border-dashed border-black" />
                <table className="w-full text-left text-black text-sm">
                    <thead>
                        <tr className="border-b border-black border-dashed">
                            <th className="font-bold py-1">Món</th>
                            <th className="font-bold text-center py-1 w-8">SL</th>
                            <th className="font-bold text-right py-1">Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <React.Fragment key={index}>
                                <tr>
                                    <td className="py-1 pr-1 align-top font-semibold">{item.name}</td>
                                    <td className="text-center py-1 align-top">{item.quantity}</td>
                                    <td className="text-right py-1 align-top font-medium">{((item.price || 0) * item.quantity).toLocaleString('vi-VN')}</td>
                                </tr>
                                {item.selectedToppings && item.selectedToppings.length > 0 && (
                                    <tr>
                                        <td colSpan={3} className="pt-0 pb-1 pl-4">
                                            <div className="text-[10px] italic text-gray-800">
                                                + {item.selectedToppings.map(t => `${t.name} (${t.price.toLocaleString('vi-VN')})`).join(', ')}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {item.note && (
                                     <tr>
                                        <td colSpan={3} className="pt-0 pb-1 pl-4">
                                            <div className="text-[10px] italic text-gray-800">- Ghi chú: {item.note}</div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
                <hr className="my-2 border-t-2 border-black" />
                <div className="text-right font-bold text-lg text-black">
                    <p>TỔNG: {(order.total || 0).toLocaleString('vi-VN')}đ</p>
                </div>
                <hr className="my-2 border-dashed border-black" />
                <pre className="whitespace-pre-wrap text-black font-sans mt-4">{settings.footer}</pre>
                {settings.qrCodeUrl && (
                    <div className="mt-4 flex flex-col items-center">
                        <img src={settings.qrCodeUrl} alt="Bank QR" className="w-32 h-32 object-contain border border-black"/>
                        <p className="text-[10px] mt-1">Quét mã để thanh toán</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const PrintSelectionModal: React.FC<{
    order: Order | null;
    printStations: PrintStation[];
    branchSettings?: PrinterSettings;
    branchName: string;
    onClose: () => void;
}> = ({ order, printStations, branchSettings, branchName, onClose }) => {
    const { showToast } = useToast();

    if (!order || !branchSettings) return null;

    const handleCloudPrint = (stationId: string) => {
        const job: PrintJob = {
            id: `job-${Date.now()}`,
            stationId,
            order,
            printerSettings: branchSettings,
            branchName,
            timestamp: Date.now(),
        };

        const printQueueRef = ref(database, 'printQueue');
        const newJobRef = push(printQueueRef); // push() generates a unique key
        set(newJobRef, job)
            .then(() => {
                showToast(`Đã gửi lệnh in đến "${printStations.find(ps => ps.id === stationId)?.name}".`, 'success');
                onClose();
            })
            .catch(err => {
                console.error("Failed to send print job:", err);
                showToast('Gửi lệnh in thất bại.', 'error');
            });
    };

    const handleBrowserPrint = () => {
        // This relies on the @media print styles in index.html to format the output.
        // It's the most compatible way for mobile (AirPrint) and basic desktop printing.
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100]">
            <div className="bg-primary-dark border-2 border-accent rounded-lg p-6 w-full max-w-sm text-white shadow-2xl">
                <h3 className="text-xl font-bold text-accent mb-4">Chọn phương thức in</h3>
                
                <div className="mb-4">
                    <button 
                        onClick={handleBrowserPrint}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        In qua Trình duyệt (AirPrint/PDF)
                    </button>
                    <p className="text-xs text-gray-300 mt-1 text-center">Dùng cho máy in AirPrint (iPad) hoặc in ra file PDF.</p>
                </div>
                
                <div className="border-t border-accent/50 pt-4">
                    <h4 className="font-semibold text-gray-100 mb-2">In trực tiếp đến Trạm In:</h4>
                    {printStations.length > 0 ? (
                        <div className="space-y-2">
                            {printStations.map(station => (
                                <button
                                    key={station.id}
                                    onClick={() => handleCloudPrint(station.id)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                                >
                                    {station.name}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center p-2 bg-primary rounded-md">Chưa có Trạm In nào được cài đặt.</p>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg">Đóng</button>
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
                                <p className="text-sm text-gray-200">{item.price.toLocaleString('vi-VN')}đ</p>
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
    const { showToast } = useToast();

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
        const existingItemIndex = newItems.findIndex(i => i.menuItemId === itemToAdd.id && !i.note && !i.selectedToppings); // only merge if no note/toppings
        
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
        showToast('Đã thêm món vào đơn!', 'success');
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
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{item.name}</p>
                                        {item.selectedToppings && item.selectedToppings.length > 0 && (
                                            <ul className="text-xs text-gray-300 pl-4 list-disc mt-1">
                                                {item.selectedToppings.map(t => <li key={t.id}>{t.name}</li>)}
                                            </ul>
                                        )}
                                        <p className="text-sm text-gray-200 mt-1">{((item.price || 0)).toLocaleString('vi-VN')}đ</p>
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
    <div className="bg-primary-dark border border-accent rounded-lg p-4 shadow-lg flex flex-col justify-between transform transition hover:scale-[1.02]">
        <div onClick={() => onViewDetails(order)} className="cursor-pointer">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-accent">Bàn {order.tableNumber} - #{order.id.slice(0, 4)}</h3>
                <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                </span>
            </div>
            <p className="text-sm text-gray-200 truncate">CN: {branchName}</p>
            <p className="text-sm text-gray-200">{new Date(order.timestamp).toLocaleString('vi-VN')}</p>
            <div className="flex items-center gap-2 text-sm text-gray-200 mt-1">
                 {order.paymentMethod === PaymentMethod.CASH ? '💵' : '💳'}
                 <span>{order.paymentMethod}</span>
            </div>
            <div className="border-t border-accent/30 my-2"></div>
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-100">Gồm {order.items.reduce((sum, item) => sum + item.quantity, 0)} món</p>
                {order.note && <span className="text-lg" title={`Ghi chú chung: ${order.note}`}>💬</span>}
            </div>
            <p className="font-semibold text-lg text-white mt-1">Tổng: {(order.total || 0).toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
            {order.status === OrderStatus.NEW && 
                <button onClick={() => onStatusChange(order, OrderStatus.COMPLETED)} className="flex-1 text-xs font-bold bg-green-600 hover:bg-green-700 text-white py-2 px-2 rounded-md transition-colors">Hoàn thành</button>
            }
             {order.status === OrderStatus.COMPLETED && 
                <button onClick={() => onStatusChange(order, OrderStatus.PAID)} className="flex-1 text-xs font-bold bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-2 rounded-md transition-colors">Thanh toán</button>
            }
            {(order.status === OrderStatus.NEW || order.status === OrderStatus.COMPLETED) &&
                <button onClick={() => onEdit(order)} className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white py-2 px-2 rounded-md transition-colors">Sửa</button>
            }
            <button onClick={() => onPrint(order)} className="flex-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-2 rounded-md transition-colors flex justify-center items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                In Lại
            </button>
            {(order.status === OrderStatus.NEW || order.status === OrderStatus.COMPLETED) &&
                <button onClick={() => onStatusChange(order, OrderStatus.CANCELLED)} className="flex-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white py-2 px-2 rounded-md transition-colors">Hủy</button>
            }
        </div>
    </div>
)

interface OrdersTabProps {
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    menuItems: MenuItem[];
    branches: Branch[];
    printStations: PrintStation[];
}

const OrdersTab: React.FC<OrdersTabProps> = ({ orders, setOrders, menuItems, branches, printStations }) => {
    const [currentModal, setCurrentModal] = useState<'none' | 'details' | 'edit' | 'print_selection'>('none');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filtersVisible, setFiltersVisible] = useState(true);
    const { showToast } = useToast();
    const { confirm } = useConfirmation();
    
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().substring(0, 10));
    const [branchFilter, setBranchFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const orderCountsPerDay = useMemo(() => {
        const counts: Record<string, number> = {};
        orders.forEach(order => {
            const dateStr = new Date(order.timestamp).toISOString().substring(0, 10);
            counts[dateStr] = (counts[dateStr] || 0) + 1;
        });
        return counts;
    }, [orders]);

    const { filteredOrders, dailySummary } = useMemo(() => {
        const filterDate = new Date(dateFilter);
        filterDate.setHours(0,0,0,0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const filtered = orders.filter(order => {
            const orderTimestamp = order.timestamp;
            if (orderTimestamp < filterDate.getTime() || orderTimestamp >= nextDay.getTime()) {
                return false;
            }
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

    const handlePrintRequest = (order: Order) => {
        setSelectedOrder(order);
        setCurrentModal('print_selection');
    };
    
    const handleViewDetails = (order: Order) => {
        setSelectedOrder(order);
        setCurrentModal('details');
    }

    const handleEditOrder = (order: Order) => {
        setSelectedOrder(order);
        setCurrentModal('edit');
    };

    const handleSaveChanges = (updatedOrder: Order) => {
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        showToast('Đã cập nhật đơn hàng thành công!');
        setCurrentModal('none');
        setSelectedOrder(null);
    };
    
    const getBranchName = (branchId: string) => {
        return branches.find(b => b.id === branchId)?.name || 'Không xác định';
    }

    const selectedOrderBranchSettings = useMemo(() => {
        if (!selectedOrder) return undefined;
        const branch = branches.find(b => b.id === selectedOrder.branchId);
        return branch?.printerSettings;
    }, [selectedOrder, branches]);

    return (
        <div>
            {currentModal === 'details' && <OrderDetailsModal order={selectedOrder} onClose={() => setCurrentModal('none')} getBranchName={getBranchName} />}
            {currentModal === 'edit' && <OrderEditModal order={selectedOrder} menuItems={menuItems} onClose={() => setCurrentModal('none')} onSave={handleSaveChanges} />}
            
            {/* The actual printable bill content, hidden by default */}
            {selectedOrder && selectedOrderBranchSettings && (
                 <BillForPrinting order={selectedOrder} settings={selectedOrderBranchSettings} />
            )}

            {currentModal === 'print_selection' && (
                <PrintSelectionModal
                    order={selectedOrder}
                    printStations={printStations}
                    branchSettings={selectedOrderBranchSettings}
                    branchName={getBranchName(selectedOrder?.branchId || '')}
                    onClose={() => setCurrentModal('none')}
                />
            )}
            
            <h2 className="text-2xl font-bold text-accent mb-4">Quản Lý Đơn Hàng</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-primary-dark p-4 rounded-lg border border-accent/50 text-center">
                    <p className="text-gray-200 text-sm">TỔNG DOANH THU (NGÀY)</p>
                    <p className="text-accent text-2xl font-bold">{dailySummary.totalRevenue.toLocaleString('vi-VN')}đ</p>
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
                            <label className="text-sm text-gray-200 block mb-1">Ngày</label>
                             <CustomDatePicker
                                selectedDate={dateFilter}
                                onDateChange={setDateFilter}
                                orderCounts={orderCountsPerDay}
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-sm text-gray-200 block mb-1">Chi nhánh</label>
                            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="w-full bg-primary border border-accent/50 rounded-md p-2 text-white">
                                <option value="all">Tất cả</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                         <div className="flex-1 min-w-[150px]">
                            <label className="text-sm text-gray-200 block mb-1">Trạng thái</label>
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
                            onPrint={handlePrintRequest} 
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