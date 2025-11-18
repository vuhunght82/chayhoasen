import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Branch, MenuItem, Order, PaymentMethod, Category } from '../../types';

interface StatsTabProps {
    orders: Order[];
    menuItems: MenuItem[];
    branches: Branch[];
    categories: Category[];
}

const COLORS = ['#facc15', '#16a34a', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899'];
const PAYMENT_COLORS = { [PaymentMethod.CASH]: '#22c55e', [PaymentMethod.TRANSFER]: '#3b82f6' };


const StatsTab: React.FC<StatsTabProps> = ({ orders, menuItems, branches, categories }) => {
    const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('week');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));

    const { filteredOrders, totalRevenue, totalOrders } = useMemo(() => {
        const targetDate = new Date(selectedDate);
        targetDate.setHours(0, 0, 0, 0);

        let startDate: Date, endDate: Date;

        switch (view) {
            case 'day':
                startDate = new Date(targetDate);
                endDate = new Date(targetDate);
                endDate.setDate(endDate.getDate() + 1);
                break;
            case 'week':
                startDate = new Date(targetDate);
                startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1)); // Start of week (Monday)
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 7);
                break;
            case 'month':
                startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
                endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);
                break;
            case 'year':
                startDate = new Date(targetDate.getFullYear(), 0, 1);
                endDate = new Date(targetDate.getFullYear() + 1, 0, 1);
                break;
        }

        const filtered = orders.filter(o => o.timestamp >= startDate.getTime() && o.timestamp < endDate.getTime());
        const revenue = filtered.reduce((sum, o) => sum + o.total, 0);

        return {
            filteredOrders: filtered,
            totalRevenue: revenue,
            totalOrders: filtered.length,
        };
    }, [orders, selectedDate, view]);

    const revenueByBranch = useMemo(() => {
        const data = branches.map(branch => ({
            name: branch.name,
            revenue: filteredOrders
                .filter(o => o.branchId === branch.id)
                .reduce((sum, o) => sum + o.total, 0),
        }));
        return data.filter(d => d.revenue > 0);
    }, [filteredOrders, branches]);
    
     const revenueByPaymentMethod = useMemo(() => {
        const data = [
            { name: PaymentMethod.CASH, value: 0 },
            { name: PaymentMethod.TRANSFER, value: 0 },
        ];
        filteredOrders.forEach(order => {
            if (order.paymentMethod === PaymentMethod.CASH) {
                data[0].value += order.total;
            } else if (order.paymentMethod === PaymentMethod.TRANSFER) {
                data[1].value += order.total;
            }
        });
        return data.filter(d => d.value > 0);
    }, [filteredOrders]);
    
    const topSellingItems = useMemo(() => {
        const itemCounts: { [key: string]: number } = {};
        for (const order of filteredOrders) {
            for (const item of order.items) {
                itemCounts[item.menuItemId] = (itemCounts[item.menuItemId] || 0) + item.quantity;
            }
        }
        return Object.entries(itemCounts)
            .map(([itemId, count]) => ({
                name: menuItems.find(m => m.id === itemId)?.name || 'Unknown',
                value: count,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredOrders, menuItems]);
    
    const revenueOverTime = useMemo(() => {
        if (filteredOrders.length === 0) return [];
        
        switch (view) {
             case 'day':
                const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, revenue: 0 }));
                filteredOrders.forEach(o => {
                    const hour = new Date(o.timestamp).getHours();
                    hours[hour].revenue += o.total;
                });
                return hours;
            case 'week':
                const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const weekData = daysOfWeek.map(d => ({ name: d, revenue: 0 }));
                filteredOrders.forEach(o => {
                    const dayIndex = new Date(o.timestamp).getDay();
                    weekData[dayIndex].revenue += o.total;
                });
                 return [ ...weekData.slice(1), weekData[0]]; // Start from Monday
            case 'month':
                 const daysInMonth = new Date(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth() + 1, 0).getDate();
                 const monthData = Array.from({ length: daysInMonth }, (_, i) => ({ name: `Ngày ${i + 1}`, revenue: 0 }));
                 filteredOrders.forEach(o => {
                    const day = new Date(o.timestamp).getDate();
                    monthData[day - 1].revenue += o.total;
                 });
                 return monthData;
            case 'year':
                 const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
                 const yearData = months.map(m => ({ name: m, revenue: 0 }));
                 filteredOrders.forEach(o => {
                    const month = new Date(o.timestamp).getMonth();
                    yearData[month].revenue += o.total;
                 });
                 return yearData;
            default:
                return [];
        }

    }, [filteredOrders, view, selectedDate]);

    const ordersByHour = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, orders: 0 }));
        filteredOrders.forEach(o => {
            const hour = new Date(o.timestamp).getHours();
            hours[hour].orders += 1;
        });
        return hours.filter(h => h.orders > 0);
    }, [filteredOrders]);

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                 <h2 className="text-2xl font-bold text-accent">Thống Kê Doanh Thu</h2>
                 <div className="flex flex-wrap items-center gap-2 p-2 bg-primary-dark rounded-lg border border-accent/50">
                     <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-primary border border-accent/50 rounded-md p-1.5 text-white"/>
                     {(['day', 'week', 'month', 'year'] as const).map(v => (
                         <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-sm font-semibold rounded-md ${view === v ? 'bg-accent text-primary-dark' : 'bg-primary hover:bg-green-700'}`}>
                             {v === 'day' ? 'Ngày' : v === 'week' ? 'Tuần' : v === 'month' ? 'Tháng' : 'Năm'}
                         </button>
                     ))}
                 </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-primary-dark p-4 rounded-lg border border-accent/50 text-center">
                    <p className="text-gray-200 text-sm">TỔNG DOANH THU</p>
                    <p className="text-accent text-3xl font-bold">{totalRevenue.toLocaleString('vi-VN')}đ</p>
                </div>
                 <div className="bg-primary-dark p-4 rounded-lg border border-accent/50 text-center">
                    <p className="text-gray-200 text-sm">TỔNG SỐ ĐƠN</p>
                    <p className="text-accent text-3xl font-bold">{totalOrders}</p>
                </div>
             </div>
             
             {filteredOrders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-primary-dark p-4 rounded-lg border border-accent/50">
                        <h3 className="text-lg font-semibold text-accent mb-4">Doanh thu theo chi nhánh</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueByBranch}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(250, 204, 21, 0.2)" />
                                <XAxis dataKey="name" stroke="#e5e7eb" fontSize={12} />
                                <YAxis stroke="#e5e7eb" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`}/>
                                <Tooltip contentStyle={{ backgroundColor: '#14532d', border: '1px solid #facc15' }} formatter={(value: number) => `${value.toLocaleString('vi-VN')}đ`}/>
                                <Bar dataKey="revenue" fill="#facc15" name="Doanh thu" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="lg:col-span-2 bg-primary-dark p-4 rounded-lg border border-accent/50">
                        <h3 className="text-lg font-semibold text-accent mb-4">Doanh thu theo thanh toán</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={revenueByPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                     {revenueByPaymentMethod.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name as PaymentMethod]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#14532d', border: '1px solid #facc15' }} formatter={(value: number) => `${value.toLocaleString('vi-VN')}đ`}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="lg:col-span-3 bg-primary-dark p-4 rounded-lg border border-accent/50">
                         <h3 className="text-lg font-semibold text-accent mb-4">Top 5 món ăn bán chạy</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={topSellingItems} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                                    {topSellingItems.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#14532d', border: '1px solid #facc15' }} formatter={(value: number, name) => [`${value} lượt`, name]}/>
                                <Legend formatter={(value) => <span className="text-gray-100">{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                     <div className="lg:col-span-2 bg-primary-dark p-4 rounded-lg border border-accent/50">
                        <h3 className="text-lg font-semibold text-accent mb-4">Giờ cao điểm (Số đơn)</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={ordersByHour}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(250, 204, 21, 0.2)" />
                                <XAxis dataKey="name" stroke="#e5e7eb" fontSize={12} />
                                <YAxis stroke="#e5e7eb" fontSize={12} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#14532d', border: '1px solid #facc15' }} formatter={(value: number) => `${value} đơn`}/>
                                <Bar dataKey="orders" fill="#f97316" name="Số đơn" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>


                    <div className="lg:col-span-5 bg-primary-dark p-4 rounded-lg border border-accent/50">
                        <h3 className="text-lg font-semibold text-accent mb-4">Biểu đồ doanh thu</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueOverTime}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(250, 204, 21, 0.2)" />
                                <XAxis dataKey="name" stroke="#e5e7eb" fontSize={12} />
                                 <YAxis stroke="#e5e7eb" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`}/>
                                <Tooltip contentStyle={{ backgroundColor: '#14532d', border: '1px solid #facc15' }} formatter={(value: number) => `${value.toLocaleString('vi-VN')}đ`}/>
                                <Bar dataKey="revenue" fill="#22c55e" name="Doanh thu" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                </div>
             ) : (
                <div className="text-center py-10 text-gray-200">
                    <p>Không có dữ liệu cho khoảng thời gian được chọn.</p>
                </div>
             )}
        </div>
    );
};

export default StatsTab;