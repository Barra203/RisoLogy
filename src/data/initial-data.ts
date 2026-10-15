import { Product, StoreSettings, Transaction, DiscountPreset, SupplierExpense, CustomerRecord } from '../types/pos';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-risol-mayo',
    name: 'Risol Mayo Melt',
    price: 12000,
    category: 'Risol Mayo',
    description: 'Kulit renyah golden breadcrumbs dengan isian smoked beef premium, telur rebus, dan lelehan creamy mayo gurih.',
    inStock: true,
    stockQuantity: 48,
    unitCost: 5500,
  },
  {
    id: 'prod-risol-ragout',
    name: 'Risol Ragout Ayam Keju',
    price: 12000,
    category: 'Risol Gurih',
    description: 'Risol gurih dengan adonan ragout ayam suwir lembut, wortel cincang, dan limpahan keju cheddar meleleh.',
    inStock: true,
    stockQuantity: 36,
    unitCost: 5200,
  },
  {
    id: 'prod-risol-choco',
    name: 'Risol Cokelat Lumer',
    price: 10000,
    category: 'Risol Manis',
    description: 'Varian manis krispi dengan cokelat Belgia pekat yang meleleh lumer seketika saat digigit hangat-hangat.',
    inStock: true,
    stockQuantity: 25,
    unitCost: 4000,
  },
  {
    id: 'prod-risol-pedas',
    name: 'Risol Spicy Bolognese',
    price: 13000,
    category: 'Risol Gurih',
    description: 'Isian daging cincang saus bolognese pedas gurih dipadu lelehan keju mozzarella kenyal.',
    inStock: true,
    stockQuantity: 30,
    unitCost: 5800,
  },
];

export const INITIAL_STORE_SETTINGS: StoreSettings = {
  storeName: 'RisoLogy',
  brandName: 'RisoLogy',
  address: 'Jl. Melati No. 8, Senopati, Jakarta Selatan',
  phone: '0812-3456-7890',
  email: 'contact@risology.id',
  footerText: 'Terima kasih atas kunjungan Anda!\nFollow IG @risology.id • Have a mindful day',
  logoUrl: '/assets/logo.png',
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
