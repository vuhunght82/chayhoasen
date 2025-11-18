import React, { useMemo, useState } from 'react';
import { Order, OrderStatus, MenuItem } from '../../types';
import { BarChart, Bar, ResponsiveContainer, Tooltip, Cell, PieChart, Pie, XAxis, YAxis } from 'recharts';

interface DashboardTabProps {
    orders: Order[];
    menuItems: MenuItem[];
}

const COLORS = ['#fbbf24', '#16a34a', '#f97316', '#3b82f6', '#8b5cf6'];

const DashboardTab: React.FC<DashboardTabProps> = ({ orders, menuItems }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));

    const { selectedDayStats, recentNewOrders, topItemsToday } = useMemo(() => {
        const targetDate = new Date(selectedDate);
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const selectedDayOrders = orders.filter(o => o.timestamp >= targetDate.getTime() && o.timestamp < nextDay.getTime() && o.status !== OrderStatus.CANCELLED);
        
        const totalRevenue = selectedDayOrders.reduce((sum, order) => sum + order.total, 0);
        const totalOrdersCount = selectedDayOrders.length;
        const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

        const _recentNewOrders = orders
            .filter(o => o.status === OrderStatus.NEW)
            .sort((a,b) => b.timestamp - a.timestamp)
            .slice(0, 5);

        const itemCounts: { [key: string]: number } = {};
        for (const order of selectedDayOrders) {
            for (const item of order.items) {
                itemCounts[item.menuItemId] = (itemCounts[item.menuItemId] || 0) + item.quantity;
            }
        }
        const _topItemsToday = Object.entries(itemCounts)
            .map(([itemId, count]) => ({
                name: menuItems.find(m => m.id === itemId)?.name || 'Unknown',
                value: count,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);


        return {
            selectedDayStats: {
                totalRevenue,
                totalOrdersCount,
                avgOrderValue,
            },
            recentNewOrders: _recentNewOrders,
            topItemsToday: _topItemsToday,
        };

    }, [orders, menuItems, selectedDate]);
    
    const last7DaysRevenue = useMemo(() => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const dailyRevenue = orders
                .filter(o => o.timestamp >= date.getTime() && o.timestamp < nextDay.getTime() && o.status !== OrderStatus.CANCELLED)
                .reduce((sum, order) => sum + order.total, 0);

            data.push({
                name: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                revenue: dailyRevenue,
            });
        }
        return data;
    }, [orders]);

    const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
        <div className="bg-primary-dark p-6 rounded-lg border border-accent/50 text-center">
            <p className="text-gray-200 text-sm uppercase">{title}</p>
            <p className="text-accent text-3xl font-bold">{value}</p>
        </div>
    );

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-accent">Bảng điều khiển</h2>
                <div>
                     <label htmlFor="dashboard-date" className="text-sm text-gray-200 mr-2">Chọn ngày:</label>
                     <input 
                        id="dashboard-date"
                        type="date" 
                        value={selectedDate} 
                        onChange={e => setSelectedDate(e.target.value)} 
                        className="bg-primary border border-accent/50 rounded-md p-1.5 text-white"
                     />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Tổng doanh thu" value={selectedDayStats.totalRevenue.toLocaleString('vi-VN') + 'đ'} />
                <StatCard title="Tổng số đơn" value={selectedDayStats.totalOrdersCount.toString()} />
                <StatCard title="TB / Đơn hàng" value={selectedDayStats.avgOrderValue.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + 'đ'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4">Đơn hàng mới đang chờ</h3>
                    {recentNewOrders.length > 0 ? (
                        <div className="space-y-3">
                            {recentNewOrders.map(order => (
                                <div key={order.id} className="flex justify-between items-center bg-primary p-3 rounded-md">
                                    <div>
                                        <p className="font-semibold text-white">Bàn {order.tableNumber} - #{order.id.slice(0,4)}</p>
                                        <p className="text-sm text-gray-200">{new Date(order.timestamp).toLocaleTimeString('vi-VN')}</p>
                                    </div>
                                    <p className="font-semibold text-accent">{order.total.toLocaleString('vi-VN')}đ</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-200 text-center py-8">Không có đơn hàng mới nào.</p>
                    )}
                </div>
                <div className="bg-primary-dark p-6 rounded-lg border border-accent/50">
                    <h3 className="text-lg font-semibold text-accent mb-4">Món bán chạy trong ngày</h3>
                    {topItemsToday.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={topItemsToday} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                     {topItemsToday.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#14532d', border: '1px solid #f59e0b' }} formatter={(value: number) => [`${value} lượt`]}/>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-gray-200 text-center py-8">Chưa có dữ liệu cho ngày này.</p>
                    )}
                </div>
            </div>
             <div className="mt-8 bg-primary-dark p-6 rounded-lg border border-accent/50">
                <h3 className="text-lg font-semibold text-accent mb-4">Doanh thu 7 ngày qua</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={last7DaysRevenue}>
                        <XAxis dataKey="name" stroke="#e5e7eb" fontSize={12} />
                        <YAxis stroke="#e5e7eb" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`}/>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#14532d', border: '1px solid #f59e0b' }} 
                            formatter={(value: number) => [`${value.toLocaleString('vi-VN')}đ`, 'Doanh thu']}
                            cursor={{ fill: 'rgba(251, 191, 36, 0.1)' }}
                        />
                        <Bar dataKey="revenue" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default DashboardTab;