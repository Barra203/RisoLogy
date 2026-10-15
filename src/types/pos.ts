export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'Risol Mayo' | 'Risol Gurih' | 'Risol Manis' | string;
  description?: string;
  inStock: boolean;
  stockQuantity?: number;
  unitCost?: number;
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'CASH' | 'QRIS';

export const CASHIER_LIST = ['Harits', 'Rafi', 'Barra', 'Dimas', 'Akhyar'] as const;
export type CashierName = typeof CASHIER_LIST[number] | string;

export interface DiscountPreset {
  id: string;
  name: string;
  type: 'percentage' | 'nominal';
  value: number;
  minPurchase?: number;
  description?: string;
  isActive: boolean;
}

export interface SupplierExpense {
  id: string;
  expenseNumber: string; // e.g. #EXP-0001
  date: string; // YYYY-MM-DD
  timestamp: number;
  itemName: string;
  category: 'Bahan Utama' | 'Bumbu & Saus' | 'Keju & Dairy' | 'Minyak & Gas' | 'Kemasan & Plastik' | 'Operasional' | string;
  quantity: number;
  unit: string; // kg, pack, pcs, liter, karton, tabung
  unitPrice: number;
  totalPrice: number;
  supplierName: string;
  supplierLocation: string;
  cashierName: string;
  notes?: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstVisit: number;
  lastVisit: number;
  favoriteItem: string;
  loyaltyTier: 'VIP' | 'Reguler' | 'Baru';
}

export interface TransactionItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  transactionNumber: string; // e.g. #RSL-0001
  timestamp: number;
  customerName: string;
  items: TransactionItem[];
  subtotal: number;
  discountType: 'percentage' | 'nominal';
  discountValue: number;
  discountAmount: number;
  discountPresetId?: string;
  discountPresetName?: string;
  total: number;
  paymentMethod: PaymentMethod;
  cashTendered?: number;
  cashChange?: number;
  cashierName: string; // Harits, Rafi, Barra, Dimas, Akhyar
  customerEmail?: string;
  emailSent?: boolean;
  status: 'PAID' | 'REFUNDED';
}

export interface StoreSettings {
  storeName: string;
  brandName: string;
  address: string;
  phone: string;
  email: string;
  footerText: string;
  logoUrl: string;
  qrisUrl: string;
  qrisNmid?: string;
  pinCode: string;
}

export type ActiveTab =
  | 'pos'
  | 'dashboard'
  | 'history'
  | 'customers'
  | 'expenses'
  | 'export'
  | 'settings';
