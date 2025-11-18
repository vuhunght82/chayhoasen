import React, { useState, useMemo, useEffect } from 'react';
import { Order, OrderStatus, MenuItem, PrinterSettings, Branch, PaymentMethod, OrderItem } from '../../types';
import { useToast, useConfirmation } from '../../App';

// NOTE: The modals below are duplicated from OrdersTab.tsx to make this component self-contained.
// In a larger application, these would be extracted into a shared `OrderModals.tsx` file.

const OrderDetailsModal: React.FC<{
    order: Order | null;
    onClose: () => void;
    getBranchName: (branchId: string) => string;
}> = ({ order, onClose, getBranchName }) => {
    if (!order) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[80]">
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
                    <p><strong>Trạng thái:</strong> <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white bg-blue-500`}>{order.status}</span></p>
                    <p><strong>Thanh toán:</strong> {order.paymentMethod}</p>
                </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[80]">
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
                                    <td>{item.name}</td>
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

const TableDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tableNumber: number;
    tableOrders: Order[];
    onViewDetails: (order: Order) => void;
    onEditOrder: (order: Order) => void;
    onPrintBill: (order: Order) => void;
    onCreateOrder: (tableNumber: number) => void;
}> = ({ isOpen, onClose, tableNumber, tableOrders, onViewDetails, onEditOrder, onPrintBill, onCreateOrder }) => {
    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[70]">
            <div className="bg-primary-dark border-2 border-accent rounded-lg p-6 w-full max-w-lg text-white shadow-2xl flex flex-col">
                <div className="flex justify-between items-center border-b border-accent/50 pb-3 mb-4">
                    <h3 className="text-2xl font-bold text-accent">Chi tiết Bàn {tableNumber}</h3>
                    <button onClick={onClose} className="text-gray-100 hover:text-white text-3xl">&times;</button>
                </div>
                {tableOrders.length > 0 ? (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {tableOrders.map(order => (
                            <div key={order.id} className="bg-primary p-3 rounded-md">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">Đơn #{order.id.slice(0,4)} - {new Date(order.timestamp).toLocaleTimeString('vi-VN')}</p>
                                        <p className="text-sm text-gray-200">Tổng: {(order.total || 0).toLocaleString('vi-VN')}đ</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onViewDetails(order)} className="text-xs bg-gray-600 hover:bg-gray-700 p-2 rounded-md">Xem</button>
                                        <button onClick={() => onEditOrder(order)} className="text-xs bg-blue-600 hover:bg-blue-700 p-2 rounded-md">Sửa</button>
                                        <button onClick={() => onPrintBill(order)} className="text-xs bg-indigo-600 hover:bg-indigo-700 p-2 rounded-md">In</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-200 mb-4">Bàn này đang trống.</p>
                        <button onClick={() => onCreateOrder(tableNumber)} className="bg-accent hover:bg-accent-dark text-primary-dark font-bold py-2 px-6 rounded-lg">
                            Tạo Đơn hàng Mới
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

interface TableLayoutTabProps {
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    branches: Branch[];
    menuItems: MenuItem[];
    printerSettings: PrinterSettings;
}

const TableLayoutTab: React.FC<TableLayoutTabProps> = ({ orders, setOrders, branches, menuItems, printerSettings }) => {
    const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
    const { showToast } = useToast();

    // Modal States
    const [isTableDetailsModalOpen, setIsTableDetailsModalOpen] = useState(false);
    const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
    const [isBillPreviewModalOpen, setIsBillPreviewModalOpen] = useState(false);
    const [isOrderEditModalOpen, setIsOrderEditModalOpen] = useState(false);
    const [selectedTableNumber, setSelectedTableNumber] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const { tablesData, selectedBranch } = useMemo(() => {
        const branch = branches.find(b => b.id === selectedBranchId);
        if (!branch) return { tablesData: {}, selectedBranch: null };

        const activeOrders = orders.filter(o => 
            o.branchId === selectedBranchId && 
            (o.status === OrderStatus.NEW || o.status === OrderStatus.COMPLETED)
        );

        const tables: Record<number, { orders: Order[], total: number, startTime: number }> = {};
        for(const order of activeOrders) {
            if (!tables[order.tableNumber]) {
                tables[order.tableNumber] = { orders: [], total: 0, startTime: order.timestamp };
            }
            tables[order.tableNumber].orders.push(order);
            tables[order.tableNumber].total += (order.total || 0);
            if (order.timestamp < tables[order.tableNumber].startTime) {
                 tables[order.tableNumber].startTime = order.timestamp;
            }
        }
        return { tablesData: tables, selectedBranch: branch };
    }, [selectedBranchId, orders, branches]);


    const handleTableClick = (tableNumber: number) => {
        setSelectedTableNumber(tableNumber);
        setIsTableDetailsModalOpen(true);
    };

    const handleCreateNewOrder = (tableNumber: number) => {
        // This functionality would ideally open the OrderEditModal with a new order object
        // For simplicity, we'll show a toast for now. A full implementation would require deeper state management.
        showToast(`Chức năng tạo đơn cho bàn ${tableNumber} sẽ được phát triển!`, 'success');
        setIsTableDetailsModalOpen(false);
    };

    return (
        <div>
            {isTableDetailsModalOpen && (
                <TableDetailsModal 
                    isOpen={true}
                    onClose={() => setIsTableDetailsModalOpen(false)}
                    tableNumber={selectedTableNumber}
                    tableOrders={tablesData[selectedTableNumber]?.orders || []}
                    onCreateOrder={handleCreateNewOrder}
                    onViewDetails={(order) => { setSelectedOrder(order); setIsOrderDetailsModalOpen(true); }}
                    onEditOrder={(order) => { showToast('Chức năng sửa đơn từ sơ đồ bàn sẽ được phát triển!')}}
                    onPrintBill={(order) => { setSelectedOrder(order); setIsBillPreviewModalOpen(true); }}
                />
            )}
            {isOrderDetailsModalOpen && <OrderDetailsModal order={selectedOrder} onClose={() => setIsOrderDetailsModalOpen(false)} getBranchName={(id) => branches.find(b=>b.id===id)?.name || ''} />}
            {isBillPreviewModalOpen && <BillPreviewModal order={selectedOrder} settings={printerSettings} onClose={() => setIsBillPreviewModalOpen(false)} />}


            <h2 className="text-2xl font-bold text-accent mb-4">Sơ đồ bàn</h2>
            
            <div className="mb-6 max-w-xs">
                <label htmlFor="branch-select-layout" className="block text-sm font-medium text-gray-100 mb-2">Chọn chi nhánh:</label>
                <select
                  id="branch-select-layout"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full bg-primary border border-accent-dark text-white rounded-lg p-2 focus:ring-accent focus:border-accent"
                >
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {selectedBranch && Array.from({ length: selectedBranch.tableCount || 0 }, (_, i) => i + 1).map(tableNum => {
                    const tableInfo = tablesData[tableNum];
                    const isOccupied = !!tableInfo;

                    return (
                        <div 
                            key={tableNum}
                            onClick={() => handleTableClick(tableNum)}
                            className={`aspect-square rounded-lg flex flex-col justify-center items-center p-2 text-center cursor-pointer transition-all duration-200 shadow-lg hover:shadow-2xl hover:scale-105
                                ${isOccupied ? 'bg-yellow-600 border-2 border-yellow-400' : 'bg-green-700 border-2 border-green-500'}
                            `}
                        >
                            <p className="text-3xl font-bold text-white">Bàn</p>
                            <p className="text-5xl font-extrabold text-white -mt-2">{tableNum}</p>
                            {isOccupied && (
                                <div className="mt-2 text-xs text-yellow-100 font-semibold bg-black/30 px-2 py-1 rounded-md">
                                    <p>{(tableInfo.total || 0).toLocaleString('vi-VN')}đ</p>
                                    <p>{tableInfo.orders.length} đơn</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default TableLayoutTab;