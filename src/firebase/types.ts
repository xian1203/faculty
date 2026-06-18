import { Timestamp } from 'firebase/firestore';

// User Roles
export type UserRole = 'admin' | 'faculty' | 'kiosk' | 'user';

export type PaymentMethod = 'cash' | 'gcash' | 'debt';
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'processing';
export type OrderStatus = 'completed' | 'pending' | 'cancelled';

// User Interface
export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  rfidUid?: string;
  photoURL?: string;
  phoneNumber?: string;
  isActive: boolean;
  balance: number; // User's current balance
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLogin?: Timestamp;
  currentDebt?: number;
  creditLimit?: number;
}

// Product/Item Interface
export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  stock: number;
  sku: string;
  rfidSku?: string;
  imageUrl?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  reorderLevel: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// Order Item Interface
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

// Order/Transaction Interface - Represents kiosk "orders" collection
// Maps from Firestore structure: { orderId, createdAt, userName, items[], totalAmount, paymentDetails: { paymentMethod }, status }
export interface Order {
  id: string; // Firestore document ID
  orderId: string; // Kiosk order ID (e.g., OR-00004)
  userId: string; // User/RFID UID
  userName: string; // User display name
  userEmail?: string; // Optional user email
  rfidUid?: string; // RFID tag identifier
  userPhotoURL?: string; // Optional user photo (maps from photoURL field)
  items: OrderItem[]; // Order line items
  subtotal: number; // Subtotal before tax
  totalAmount: number; // Total order amount
  paymentMethod: string; // Payment method (cash, gcash_qr, paylater - from paymentDetails.paymentMethod)
  paymentStatus: string; // Order status (pending, processing, paid - from status field)
  orderStatus: string; // Placeholder for UI compatibility
  notes?: string; // Optional notes
  createdAt: Date; // Order creation time (converted from Timestamp)
  updatedAt: Date; // Last update time (converted from Timestamp)
  completedAt?: Date; // Optional completion time (converted from Timestamp)
}

// Debt Record Interface - Represents 'debt' collection
// Maps from Firestore structure: { userId, userName, amount, orderId, items[], status, paymentMethod, rfidUid, department, createdAt }
export interface DebtRecord {
  id: string; // Firestore document ID
  userId: string; // User UID
  userName: string; // User display name
  rfidUid?: string; // RFID tag identifier
  department?: string; // User department
  amount: number; // Debt amount
  orderId: string; // Associated order ID (e.g., OR-00001)
  items: OrderItem[]; // Items purchased (maps from order)
  paymentMethod: string; // Payment method (cash, paylater, etc.)
  status: 'unpaid' | 'paid' | 'partial' | 'overdue'; // Debt status
  dueDate?: Date; // Optional due date
  paidDate?: Date; // Optional payment date
  createdAt: Date; // Debt creation time (converted from Timestamp)
  updatedAt?: Date; // Last update time (converted from Timestamp)
}

// Debt Transaction Interface
export interface DebtTransaction {
  id: string;
  userId: string;
  amount: number; // positive for charge, negative for payment
  type: 'charge' | 'payment' | 'adjustment';
  description: string;
  createdAt: Timestamp;
  createdBy?: string;
}


// Analytics Interface
export interface Analytics {
  id: string;
  date: string; // Format: YYYY-MM-DD
  dailySales: number;
  totalOrders: number;
  totalUsers: number;
  totalDebt: number;
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  paymentMethodBreakdown: {
    cash: number;
    gcash: number;
    debt: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Activity Log Interface
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: 'user' | 'product' | 'order' | 'settings';
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}

// System Settings Interface
export interface SystemSettings {
  id: string;
  storeId: string;
  storeName: string;
  currency: string;
  timezone: string;
  taxRate: number;
  debtLimit: number;
  debtDueDays: number;
  rfidEnabled: boolean;
  maintenanceMode: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
}

// Input types for creation (without generated fields)
export type CreateUserInput = Omit<User, 'uid' | 'createdAt' | 'updatedAt' | 'lastLogin'>;
export type UpdateUserInput = Partial<Omit<User, 'uid' | 'createdAt' | 'email'>>;

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductInput = Partial<Omit<Product, 'id' | 'createdAt' | 'createdBy'>>;

export type CreateOrderInput = Omit<Order, 'id' | 'orderId' | 'createdAt' | 'updatedAt' | 'completedAt'>;
export type UpdateOrderInput = Partial<Omit<Order, 'id' | 'orderId' | 'createdAt' | 'userId'>>;

// Top-up Interface
export interface Topup {
  id: string;
  userId: string;
  userName: string;
  rfidUid: string;
  photoURL?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  source?: 'kiosk' | 'admin';
  method?: 'kiosk_request' | 'admin_topup';
  note?: string;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  processedByName?: string;
}

export type CreateTopupInput = Omit<Topup, 'id' | 'createdAt' | 'processedAt' | 'processedBy' | 'processedByName'>;
export type UpdateTopupInput = Partial<Omit<Topup, 'id' | 'userId' | 'createdAt'>>;

// In-Memory Notification Interface
export interface AppNotification {
  id: string; // The doc.id to prevent duplicates
  title: string;
  message: string;
  type: 'topup' | 'order';
  status: 'pending' | 'approved' | 'rejected' | 'new';
  createdAt: Date;
  isRead: boolean;
}

// Honesty System Settings Interface
export interface HonestySetting {
  maxDebtLimit: number;
  settlementDeadlineDays: number;
  autoBlockOverdueAccounts: boolean;
  creditEligibility: string[]; // Array of eligible roles (e.g., ['Faculty'])
  updatedAt: Timestamp;
}
