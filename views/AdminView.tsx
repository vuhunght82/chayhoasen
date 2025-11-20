
import React, { useState } from 'react';
import OrdersTab from './admin/OrdersTab';
import MenuTab from './admin/MenuTab';
import StatsTab from './admin/StatsTab';
import SettingsTab from './admin/SettingsTab';
import DashboardTab from './admin/DashboardTab';
import { Branch, Category, MenuItem, Order, PrinterSettings, KitchenSettings } from '../types';

type AdminTab = 'dashboard' | 'orders' | 'menu' | 'stats' | 'settings';

interface AdminViewProps {
    branches: Branch[];
    setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
    categories: Category[];
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    menuItems: MenuItem[];
    setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    printerSettings: PrinterSettings;
    setPrinterSettings: React.Dispatch<React.SetStateAction<PrinterSettings>>;
    kitchenSettings: KitchenSettings;
    setKitchenSettings: React.Dispatch<React.SetStateAction<KitchenSettings>>;
    logoUrl: string;
    setLogoUrl: React.Dispatch<React.SetStateAction<string>>;
    resetAllData: () => void;
    onLogout: () => void;
}


const AdminView: React.FC<AdminViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab orders={props.orders} menuItems={props.menuItems} />;
      case 'orders':
        return <OrdersTab orders={props.orders} setOrders={props.setOrders} menuItems={props.menuItems} branches={props.branches} printerSettings={props.printerSettings} />;
      case 'menu':
        return <MenuTab menuItems={props.menuItems} setMenuItems={props.setMenuItems} categories={props.categories} setCategories={props.setCategories} branches={props.branches} />;
      case 'stats':
        return <StatsTab orders={props.orders} menuItems={props.menuItems} branches={props.branches} categories={props.categories} />;
      case 'settings':
        return <SettingsTab 
                    branches={props.branches} 
                    setBranches={props.setBranches} 
                    printerSettings={props.printerSettings} 
                    setPrinterSettings={props.setPrinterSettings}
                    kitchenSettings={props.kitchenSettings}
                    setKitchenSettings={props.setKitchenSettings}
                    logoUrl={props.logoUrl}
                    setLogoUrl={props.setLogoUrl}
                    resetAllData={props.resetAllData}
                />;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tabName: AdminTab; label: string }> = ({ tabName, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
        activeTab === tabName
          ? 'bg-accent text-primary-dark font-bold shadow-md'
          : 'bg-primary hover:bg-green-700 text-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Sticky Tab Navigation - Adjusted Top to 60px to match smaller header */}
      <div className="sticky top-[60px] z-30 bg-primary border border-accent rounded-lg p-4 mb-6 shadow-lg">
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <TabButton tabName="dashboard" label="Bảng điều khiển" />
          <TabButton tabName="orders" label="Đơn Hàng" />
          <TabButton tabName="menu" label="Thực Đơn" />
          <TabButton tabName="stats" label="Thống Kê" />
          <TabButton tabName="settings" label="Cài Đặt" />
        </div>
      </div>

      <div className="bg-primary border border-accent rounded-lg p-6 min-h-[60vh]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminView;