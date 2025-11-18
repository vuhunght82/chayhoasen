import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, MenuItem, Branch, OrderItem } from '../types';

const useTimeParts = (timestamp: number) => {
    const [parts, setParts] = useState({ minutes: 0, seconds: 0, totalSeconds: 0 });

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            const totalSeconds = Math.floor((now - timestamp) / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            setParts({ minutes, seconds, totalSeconds });
        };
        
        update();
        const intervalId = setInterval(update, 1000);

        return () => clearInterval(intervalId);
    }, [timestamp]);

    return parts;
};

const KitchenOrderTicket: React.FC<{
    order: Order;
    onComplete: (orderId: string) => void;
}> = ({ order, onComplete }) => {
    const { minutes, seconds, totalSeconds } = useTimeParts(order.timestamp);
    
    const timerColor = 
        totalSeconds > 600 ? 'bg-red-600' // > 10 minutes
      : totalSeconds > 300 ? 'bg-yellow-500' // > 5 minutes
      : 'bg-blue-500'; // < 5 minutes

    return (
        <div className="bg-gray-100 text-gray-900 rounded-lg shadow-md flex flex-col w-72 h-auto max-h-[26rem]">
            <div className="bg-gray-800 text-white p-3 rounded-t-lg flex justify-between items-center">
                <div className="font-bold text-xl">
                    <span className="text-gray-300">Bàn </span>{order.tableNumber}
                </div>
                <div className={`text-2xl font-mono px-2 rounded-md transition-colors duration-500 ${timerColor}`}>
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </div>
            </div>
            <div className="p-3 flex-grow overflow-y-auto">
                 {order.note && (
                    <div className="p-2 mb-3 bg-yellow-200 border-2 border-yellow-400 rounded-md">
                        <p className="font-bold text-yellow-900 text-sm">GHI CHÚ CHUNG:</p>
                        <p className="text-yellow-800 font-semibold">{order.note}</p>
                    </div>
                )}
                <ul className="space-y-2">
                    {order.items.map((item) => (
                        <li key={`${item.menuItemId}-${item.note || ''}`} className="border-b border-gray-300 pb-2">
                            <div className="flex items-start">
                                <span className="font-bold text-2xl mr-3">{item.quantity}x</span>
                                <span className="text-lg flex-grow">{item.name}</span>
                            </div>
                            {item.note && (
                                <div className="mt-1 ml-10 p-1.5 bg-yellow-100 border border-yellow-300 rounded-md">
                                    <p className="text-yellow-800 text-sm font-semibold">{item.note}</p>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="p-2 mt-auto">
                <button 
                    onClick={() => onComplete(order.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-xl transition-colors"
                >
                    HOÀN THÀNH
                </button>
            </div>
        </div>
    );
};


interface KitchenViewProps {
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    menuItems: MenuItem[];
    branches: Branch[];
}

const KitchenView: React.FC<KitchenViewProps> = ({ orders, setOrders, menuItems, branches }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const previousOrderCount = useRef(0);

    const newOrders = orders
        .filter(o => o.status === OrderStatus.NEW)
        .sort((a, b) => a.timestamp - b.timestamp);
    
    useEffect(() => {
        if (newOrders.length > previousOrderCount.current) {
            audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
        }
        previousOrderCount.current = newOrders.length;
    }, [newOrders.length]);

    const handleCompleteOrder = (orderId: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: OrderStatus.COMPLETED } : o));
    };
    
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" preload="auto"></audio>
            <h1 className="text-3xl font-bold text-accent mb-6">Màn hình Bếp</h1>
            {newOrders.length > 0 ? (
                <div className="flex flex-wrap gap-6">
                    {newOrders.map(order => (
                        <KitchenOrderTicket 
                            key={order.id}
                            order={order}
                            onComplete={handleCompleteOrder}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 text-gray-200">
                    <p className="text-2xl">Không có đơn hàng mới nào.</p>
                </div>
            )}
        </div>
    );
};

export default KitchenView;