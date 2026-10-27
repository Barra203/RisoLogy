export interface Product {
  id: string;
  name: string;
  category: 'Risol Mayo' | 'Risol Gurih' | 'Risol Manis' | string;
  price: number;
  stock: number;
  stockQuantity?: number;
  inStock?: boolean;
  description?: string;
  image?: string;
  imageUrl?: string;
  unitCost?: number;
  updatedAt?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string; // Deskripsi/catatan khusus pesanan per-item
  description?: string;
  subtotal: number;
  product: Product;
}

export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER';

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
  category:
    | 'Bahan Utama'
    | 'Bumbu & Saus'
    | 'Keju & Dairy'
    | 'Minyak & Gas'
    | 'Kemasan & Plastik'
    | 'Operasional'
    | string;
  quantity: number;
  unit: string; // kg, pack, pcs, liter, karton, tabung
  unitPrice: number;
  totalPrice: number;
  totalBelanja?: number;
  total?: number;
  amount?: number;
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
  tier?: 'VIP' | 'Reguler' | 'Baru' | string;
}

export interface TransactionItem {
  productId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  subtotal: number;
  note?: string; // Catatan/deskripsi khusus per-item pesanan
  description?: string;
}

export type OrderItem = TransactionItem;

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
  cashier?: string;
  pic?: string;
  shift?: string;
  cashierShift?: string;
  customerEmail?: string;
  emailSent?: boolean;
  notes?: string;
  updatedAt?: number;
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
  storeLogo?: string; // Alias sinkron untuk logoUrl (URL / base64 image string)
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

export interface CashierShiftRecord {
  id: string;
  cashierName: string;
  startedAt: number;
  endedAt?: number;
  totalOrders: number;
  totalSales: number;
  status: 'ACTIVE' | 'CLOSED';
}

export interface ShiftConfig {
  activeCashier: string;
  cashierList: string[];
  activeShiftId?: string;
  shiftStartedAt?: number;
  updatedAt?: number;
}
