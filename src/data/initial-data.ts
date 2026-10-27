import { Product, StoreSettings, Transaction, DiscountPreset, SupplierExpense, CustomerRecord } from '../types/pos';

export const initialProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Risol Mix',
    category: 'Risol Gurih',
    price: 12000,
    stock: 20,
    stockQuantity: 20,
    inStock: true,
    description: 'Kombinasi risol lezat artisan krispi.',
    image: '',
  },
  {
    id: 'prod-002',
    name: 'Risol Mac-n-Cheese',
    category: 'Risol Manis',
    price: 12000,
    stock: 15,
    stockQuantity: 15,
    inStock: true,
    description: 'Isian makaroni creamy keju lumer melimpah.',
    image: '',
  },
  {
    id: 'prod-003',
    name: 'Risol Ayam Balado',
    category: 'Risol Mayo',
    price: 12000,
    stock: 20,
    stockQuantity: 20,
    inStock: true,
    description: 'Suwiran ayam gurih dengan bumbu balado pedas nikmat.',
    image: '',
  },
];

export const INITIAL_PRODUCTS: Product[] = initialProducts;

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  storeName: 'RisoLogy',
  brandName: 'RisoLogy',
  address: 'Jl. Melati No. 8, Senopati, Jakarta Selatan',
  phone: '0812-3456-7890',
  email: 'contact@risology.id',
  footerText: 'Terima kasih atas kunjungan Anda!\nFollow IG @risology.id • Have a mindful day',
  logoUrl: '/logo.png',
  storeLogo: '/logo.png',
  qrisUrl: '/assets/qris.png',
  pinCode: '666666',
};

export const INITIAL_CATEGORIES: string[] = ['Risol Mayo', 'Risol Gurih', 'Risol Manis'];

export const INITIAL_CASHIERS: string[] = ['Harits', 'Rafi', 'Barra', 'Dimas', 'Akhyar'];

export const INITIAL_DISCOUNTS: DiscountPreset[] = [
  {
    id: 'disc-jumat',
    name: 'Jumat Berkah (10%)',
    type: 'percentage',
    value: 10,
    description: 'Potongan 10% setiap hari Jumat untuk semua transaksi',
    isActive: true,
  },
  {
    id: 'disc-pelajar',
    name: 'Promo Pelajar (Rp 3.000)',
    type: 'nominal',
    value: 3000,
    description: 'Potongan Rp 3.000 khusus pelajar & mahasiswa',
    isActive: true,
  },
  {
    id: 'disc-grosir',
    name: 'Pembelian Box Grosir (Rp 5.000)',
    type: 'nominal',
    value: 5000,
    minPurchase: 50000,
    description: 'Potongan Rp 5.000 untuk pembelian minimal Rp 50.000',
    isActive: true,
  },
  {
    id: 'disc-member',
    name: 'Member Loyal RisoLogy (15%)',
    type: 'percentage',
    value: 15,
    description: 'Diskon 15% khusus member pelanggan setia',
    isActive: true,
  },
];

// Supplier expenses start empty as requested by user
export const INITIAL_EXPENSES: SupplierExpense[] = [];

// Customer directory starts empty as requested by user
export const INITIAL_CUSTOMERS: CustomerRecord[] = [];

// History starts empty as requested by user
export const INITIAL_TRANSACTIONS: Transaction[] = [];

// Persistent transaction starts from #RSL-0001
export const INITIAL_TRANSACTION_SEQUENCE = 1;
