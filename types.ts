
export interface Branch {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  imageUrl: string;
  isOutOfStock?: boolean;
  isFeatured?: boolean;
  branchIds: string[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  note?: string;
}

export enum OrderStatus {
  NEW = 'Mới',
  COMPLETED = 'Đã hoàn thành',
  PAID = 'Đã thanh toán',
  CANCELLED = 'Đã hủy',
}

export enum PaymentMethod {
    CASH = 'Tiền mặt',
    TRANSFER = 'Chuyển khoản',
}

export interface OrderItem {
    menuItemId: string;
    quantity: number;
    price: number; // Price at the time of order
    name: string; // Name at the time of order
    note?: string;
}


export interface Order {
  id: string;
  branchId: string;
  tableNumber: number;
  items: OrderItem[]; 
  total: number;
  status: OrderStatus;
  timestamp: number;
  paymentMethod: PaymentMethod;
  note?: string; // General note for the whole order
}

export interface PrinterSettings {
    header: string;
    footer: string;
    qrCodeUrl: string;
    paperSize: '80mm' | '58mm' | 'A4' | 'A5'; // Added paper size
    printerName?: string; // Added reference name
}
