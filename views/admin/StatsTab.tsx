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
    const [dateRange, setDateRange] = useState(() => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 6);
        return {
            from: from.toISOString().substring(0, 10),
            to: to.toISOString().substring(0, 10),
        };
    });

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDateRange(prev => ({...prev, [name]: value}));
    };
    
    const setQuickDateRange = (period: 'today' | 'week' | 'month' | 'year') => {
        const to = new Date();
        let from = new Date();

        switch (period) {
            case 'today':
                from.setHours(0, 0, 0, 0);
                break;
            case 'week':
                from.setDate(to.getDate() - to.getDay() + (to.getDay() === 0 ? -6 : 1)); // Monday as first day
                from.setHours(0, 0, 0, 0);
                break;
            case 'month':
                from.setDate(1);
                from.setHours(0, 0, 0, 0);
                break;
            case 'year':
                from.setMonth(0, 1);
                from.setHours(0, 0, 0, 0);
                break;
        }

        setDateRange({
            from: from.toISOString().substring(0, 10),
            to: to.toISOString().substring(0, 10)
        });
    };


    const { filteredOrders, totalRevenue, totalOrders } = useMemo(() => {
        if (!dateRange.from || !dateRange.to) {
            return { filteredOrders: [], totalRevenue: 0, totalOrders: 0 };
        }
        
        const startDate = new Date(dateRange.from);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);

        const filtered = orders.filter(o => {
            const orderDate = new Date(o.timestamp);
            return orderDate >= startDate && orderDate <= endDate && o.status !== 'Đã hủy';
        });
        const revenue = filtered.reduce((sum, o) => sum + o.total, 0);

        return {
            filteredOrders: filtered,
            totalRevenue: revenue,
            totalOrders: filtered.length,
        };
    }, [orders, dateRange]);

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
        if (filteredOrders.length === 0 || !dateRange.from || !dateRange.to) return [];

        const startDate = new Date(dateRange.from);
        const endDate = new Date(dateRange.to);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        // Group by day if range is <= 90 days
        if (diffDays <= 90) {
            const data: { [key: string]: { name: string, revenue: number } } = {};
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const key = currentDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                data[key] = { name: key, revenue: 0 };
                currentDate.setDate(currentDate.getDate() + 1);
            }

            filteredOrders.forEach(o => {
                const key = new Date(o.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                if(data[key]) {
                    data[key].revenue += o.total;
                }
            });
            return Object.values(data);
        } else { // Group by month if range is > 90 days
             const data: { [key: string]: { name: string, revenue: number } } = {};
             let currentDate = new Date(startDate);
             currentDate.setDate(1); // Start from the first day of the month
             while (currentDate <= endDate) {
                 const key = currentDate.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
                 data[key] = { name: key, revenue: 0 };
                 currentDate.setMonth(currentDate.getMonth() + 1);
             }

             filteredOrders.forEach(o => {
                 const key = new Date(o.timestamp).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
                 if (data[key]) {
                    data[key].revenue += o.total;
                 }
             });
             return Object.values(data);
        }
    }, [filteredOrders, dateRange]);

    const ordersByHour = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, orders: 0 }));
        filteredOrders.forEach(o => {
            const hour = new Date(o.timestamp).getHours();
            hours[hour].orders += 1;
        });
        return hours.filter(h => h.orders > 0);
    }, [filteredOrders]);

    const handleExport = () => {
        // This function ensures that any field containing a delimiter, quote, or newline
        // is properly quoted and escaped for CSV format.
        const sanitizeCsvField = (field: any): string => {
            let str = String(field ?? ''); // Handle null or undefined
            if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                // Escape quotes by doubling them
                str = str.replace(/"/g, '""');
                // Wrap the entire field in quotes
                str = `"${str}"`;
            }
            return str;
        };
        
        const headers = [
            "Mã Đơn", "Ngày", "Giờ", "Chi Nhánh", "Bàn", "Tên Món", "Số Lượng", "Đơn Giá", "Thành Tiền", "Toppings", "Ghi Chú Món", "Phương Thức TT", "Ghi Chú Đơn"
        ];
        
        const getBranchName = (branchId: string) => branches.find(b => b.id === branchId)?.name || 'N/A';
        const csvRows: string[] = [];

        for (const order of filteredOrders) {
            const orderDate = new Date(order.timestamp);
            const date = orderDate.toLocaleDateString('vi-VN');
            const time = orderDate.toLocaleTimeString('vi-VN');
            const branchName = getBranchName(order.branchId);

            for (const item of order.items) {
                const rowData = [
                    `'${order.id}`, // The single quote helps Excel treat it as text to prevent scientific notation
                    date,
                    time,
                    branchName,
                    order.tableNumber,
                    item.name,
                    item.quantity,
                    item.price,
                    item.price * item.quantity,
                    item.selectedToppings?.map(t => t.name).join(', ') || '',
                    item.note || '',
                    order.paymentMethod,
                    order.note || ''
                ];
                
                // Sanitize each field and join with a semicolon (;) for better Excel compatibility
                csvRows.push(rowData.map(sanitizeCsvField).join(';'));
            }
        }
        
        // Use semicolon (;) as the delimiter for headers as well
        const csvContent = "data:text/csv;charset=utf-8," 
            + "\uFEFF" // BOM for UTF-8 to display Vietnamese characters correctly in Excel
            + headers.join(';') + '\n' 
            + csvRows.join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `BaoCao_ChiTiet_${dateRange.from}_den_${dateRange.to}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const QuickFilterButton: React.FC<{ period: 'today' | 'week' | 'month' | 'year', label: string }> = ({ period, label }) => (
        <button onClick={() => setQuickDateRange(period)} className="text-xs px-2 py-1 rounded-md bg-primary hover:bg-primary-light text-white transition-colors">{label}</button>
    );

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-accent">Thống Kê Doanh Thu</h2>
                 <div className="flex flex-wrap items-center gap-4 p-2 bg-primary-dark rounded-lg border border-accent/50">
                    <div className="flex items-center gap-2">
                        <label htmlFor="from-date" className="text-sm text-gray-200">Từ:</label>
                        <input 
                            type="date" 
                            id="from-date"
                            name="from"
                            value={dateRange.from} 
                            onChange={handleDateChange} 
                            className="bg-primary border border-accent/50 rounded-md p-1.5 text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="to-date" className="text-sm text-gray-200">Đến:</label>
                        <input 
                            type="date" 
                            id="to-date"
                            name="to"
                            value={dateRange.to} 
                            onChange={handleDateChange} 
                            className="bg-primary border border-accent/50 rounded-md p-1.5 text-white"
                        />
                    </div>
                    <div className="flex items-center gap-1 border-l border-accent/30 pl-2">
                        <QuickFilterButton period="today" label="Hôm nay" />
                        <QuickFilterButton period="week" label="Tuần này" />
                        <QuickFilterButton period="month" label="Tháng này" />
                        <QuickFilterButton period="year" label="Năm nay" />
                    </div>
                    <button 
                        onClick={handleExport}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
                    >
                        Xuất Excel
                    </button>
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
                        <h3 className="text-lg font-semibold text-accent mb-4">Biểu đồ doanh thu theo thời gian</h3>
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