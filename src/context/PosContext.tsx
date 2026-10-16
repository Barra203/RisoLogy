import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import {
  Product,
  CartItem,
  Transaction,
  StoreSettings,
  ActiveTab,
  PaymentMethod,
  DiscountPreset,
  SupplierExpense,
  CustomerRecord,
} from '../types/pos';
import {
  INITIAL_PRODUCTS,
  INITIAL_STORE_SETTINGS,
  INITIAL_TRANSACTIONS,
  INITIAL_TRANSACTION_SEQUENCE,
  INITIAL_CATEGORIES,
  INITIAL_CASHIERS,
  INITIAL_DISCOUNTS,
  INITIAL_EXPENSES,
  INITIAL_CUSTOMERS,
} from '../data/initial-data';
import {
  calculateSubtotal,
  calculateDiscount,
  calculateTotal,
  calculateChange,
  formatTransactionNumber,
} from '../utils/pos-logic';
import {
  db,
  FIRESTORE_COLLECTIONS,
  handleFirestoreError,
  OperationType,
  cleanFirestoreData,
} from '../lib/firebase';

interface PosContextType {
  // Auth
  isAuthenticated: boolean;
  login: (usernameOrPin: string, password?: string) => boolean;
  logout: () => void;

  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Cashier Shifts
  activeCashier: string;
  setActiveCashier: (name: string) => void;
  cashierList: string[];

  // Categories
  categories: string[];
  addCategory: (name: string) => boolean;
  updateCategory: (oldName: string, newName: string) => boolean;
  deleteCategory: (name: string) => void;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Cart
  cart: CartItem[];
  customerName: string;
  setCustomerName: (name: string) => void;
  addToCart: (product: Product) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Discounts
  discountType: 'percentage' | 'nominal';
  discountValue: number;
  selectedDiscountPresetId?: string;
  setDiscount: (type: 'percentage' | 'nominal', value: number, presetId?: string, presetName?: string) => void;
  discounts: DiscountPreset[];
  addDiscount: (discount: Omit<DiscountPreset, 'id'>) => void;
  updateDiscount: (id: string, updates: Partial<DiscountPreset>) => void;
  deleteDiscount: (id: string) => void;
  applyDiscountPreset: (preset: DiscountPreset | null) => void;

  // Totals
  subtotal: number;
  discountAmount: number;
  total: number;

  // Checkout
  nextTransactionNumber: string;
  processCheckout: (paymentMethod: PaymentMethod, cashTendered?: number) => Transaction;
  transactions: Transaction[];

  // Supplier Expenses
  expenses: SupplierExpense[];
  addExpense: (expense: Omit<SupplierExpense, 'id' | 'expenseNumber' | 'timestamp'>) => SupplierExpense;
  updateExpense: (id: string, updates: Partial<SupplierExpense>) => void;
  deleteExpense: (id: string) => void;

  // Customer Directory (CRUD)
  customers: CustomerRecord[];
  addCustomer: (
    customer: Omit<CustomerRecord, 'id' | 'firstVisit' | 'lastVisit' | 'averageOrderValue'> & {
      firstVisit?: number;
      lastVisit?: number;
      averageOrderValue?: number;
    }
  ) => CustomerRecord;
  updateCustomer: (id: string, updates: Partial<CustomerRecord>) => void;
  deleteCustomer: (id: string) => void;

  // Settings & Actions
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  sendReceiptEmail: (tx: Transaction, email: string) => Promise<{ success: boolean; message: string }>;
  viewReceipt: (tx: Transaction | null) => void;
  activeReceipt: Transaction | null;
  resetAllData: (verificationPassword?: string) => { success: boolean; message: string };
  isSyncing: boolean;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

const STORAGE_KEYS = {
  AUTH: 'risology_auth_state',
  PRODUCTS: 'risology_products_v3',
  SETTINGS: 'risology_settings_v3',
  CATEGORIES: 'risology_categories_v3',
  TRANSACTIONS: 'risology_transactions_v3',
  SEQUENCE: 'risology_tx_seq_v3',
  CASHIER: 'risology_active_cashier_v3',
  DISCOUNTS: 'risology_discounts_v3',
  EXPENSES: 'risology_expenses_v3',
  CUSTOMERS: 'risology_customers_v3',
};

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');

  // Active Cashier Shift (Harits, Rafi, Barra, Dimas, Akhyar)
  const [activeCashier, setActiveCashierState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CASHIER) || INITIAL_CASHIERS[0];
  });

  const setActiveCashier = (name: string) => {
    setActiveCashierState(name);
    localStorage.setItem(STORAGE_KEYS.CASHIER, name);
  };

  const cashierList = useMemo(() => Array.from(INITIAL_CASHIERS), []);

  // Store Settings (Protected: Logo and QRIS images are never lost on updates or bugfixes)
  const [settings, setSettings] = useState<StoreSettings>(() => {
    let base: StoreSettings = { ...INITIAL_STORE_SETTINGS };
    const candidateKeys = [
      STORAGE_KEYS.SETTINGS,
      'risology_settings_v3',
      'risology_settings_v2',
      'risology_settings_v1',
      'risology_settings',
    ];
    for (const key of candidateKeys) {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            base = { ...base, ...parsed };
            break;
          }
        } catch (e) {
          console.error('Failed to parse saved settings from ' + key, e);
        }
      }
    }

    // Always overlay permanent brand assets so logo and QRIS survive any update or code reload
    try {
      const permLogo = localStorage.getItem('risology_permanent_logo');
      const permQris = localStorage.getItem('risology_permanent_qris');
      const permStore = localStorage.getItem('risology_permanent_store_name');
      const permBrand = localStorage.getItem('risology_permanent_brand_name');

      if (permLogo) base.logoUrl = permLogo;
      if (permQris) base.qrisUrl = permQris;
      if (permStore) base.storeName = permStore;
      if (permBrand) base.brandName = permBrand;
    } catch (_) {}

    return base;
  });

  // State entities initialized from local cache for instant 0ms render
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved products', e);
      }
    }
    return INITIAL_PRODUCTS;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved categories', e);
      }
    }
    return INITIAL_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved transactions', e);
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [transactionSequence, setTransactionSequence] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SEQUENCE);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return INITIAL_TRANSACTION_SEQUENCE;
  });

  const [discounts, setDiscounts] = useState<DiscountPreset[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DISCOUNTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved discounts', e);
      }
    }
    return INITIAL_DISCOUNTS;
  });

  const [expenses, setExpenses] = useState<SupplierExpense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const isOldMocks = parsed.length > 0 && parsed.every((p: any) => p?.id && String(p.id).startsWith('exp-000'));
          if (isOldMocks) {
            localStorage.removeItem(STORAGE_KEYS.EXPENSES);
            return [];
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved expenses', e);
      }
    }
    return INITIAL_EXPENSES;
  });

  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const isOldSeed = parsed.length > 0 && parsed.some((c: any) => c?.id && String(c.id).startsWith('cust-seed'));
          if (isOldSeed) {
            localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
            return [];
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved customers', e);
      }
    }
    return INITIAL_CUSTOMERS;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('Pelanggan');
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedDiscountPresetId, setSelectedDiscountPresetId] = useState<string | undefined>(undefined);
  const [selectedDiscountPresetName, setSelectedDiscountPresetName] = useState<string | undefined>(undefined);

  // Active modal receipt
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Track initial seeding guard
  const initialSettingsSeeded = useRef(false);
  const initialProductsSeeded = useRef(false);
  const initialCategoriesSeeded = useRef(false);
  const initialDiscountsSeeded = useRef(false);

  // ============================================================================
  // SINKRONISASI WAKTU NYATA DENGAN CLOUD FIRESTORE (onSnapshot)
  // ============================================================================

  // 1. Settings & Store Identity (Logo URL & QRIS URL tersimpan langsung di database)
  useEffect(() => {
    const settingsDocRef = doc(db, FIRESTORE_COLLECTIONS.SETTINGS, FIRESTORE_COLLECTIONS.SETTINGS_DOC);
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        setIsSyncing(false);
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<StoreSettings>;
          setSettings((prev) => {
            const merged: StoreSettings = {
              ...prev,
              ...data,
              // Jaga agar logo dan QRIS tidak kosong jika data di cloud belum terisi
              logoUrl: data.logoUrl || prev.logoUrl || INITIAL_STORE_SETTINGS.logoUrl,
              qrisUrl: data.qrisUrl || prev.qrisUrl || INITIAL_STORE_SETTINGS.qrisUrl,
              storeName: data.storeName || prev.storeName || INITIAL_STORE_SETTINGS.storeName,
              brandName: data.brandName || prev.brandName || INITIAL_STORE_SETTINGS.brandName,
            };
            try {
              localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
              if (merged.logoUrl) localStorage.setItem('risology_permanent_logo', merged.logoUrl);
              if (merged.qrisUrl) localStorage.setItem('risology_permanent_qris', merged.qrisUrl);
              if (merged.storeName) localStorage.setItem('risology_permanent_store_name', merged.storeName);
              if (merged.brandName) localStorage.setItem('risology_permanent_brand_name', merged.brandName);
            } catch (_) {}
            return merged;
          });
        } else if (!initialSettingsSeeded.current) {
          initialSettingsSeeded.current = true;
          // Inisialisasi awal ke database jika dokumen belum ada
          const initialData: StoreSettings = {
            ...INITIAL_STORE_SETTINGS,
            logoUrl: settings.logoUrl || INITIAL_STORE_SETTINGS.logoUrl,
            qrisUrl: settings.qrisUrl || INITIAL_STORE_SETTINGS.qrisUrl,
            storeName: settings.storeName || INITIAL_STORE_SETTINGS.storeName,
            brandName: settings.brandName || INITIAL_STORE_SETTINGS.brandName,
          };
          setDoc(settingsDocRef, cleanFirestoreData({ ...initialData, updatedAt: Date.now() })).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SETTINGS_DOC}`)
          );
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SETTINGS_DOC}`);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Katalog Produk & Stok Inventory Real-Time
  useEffect(() => {
    const prodsColRef = collection(db, FIRESTORE_COLLECTIONS.PRODUCTS);
    const unsubscribe = onSnapshot(
      prodsColRef,
      (snapshot) => {
        if (snapshot.empty && !initialProductsSeeded.current) {
          initialProductsSeeded.current = true;
          const batch = writeBatch(db);
          INITIAL_PRODUCTS.forEach((p) => {
            batch.set(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, p.id), cleanFirestoreData(p));
          });
          batch.commit().catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, FIRESTORE_COLLECTIONS.PRODUCTS)
          );
        } else if (!snapshot.empty) {
          const list: Product[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as Product);
          });
          // Sort konsisten berdasarkan id
          list.sort((a, b) => a.id.localeCompare(b.id));
          setProducts(list);
          try {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(list));
          } catch (_) {}
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, FIRESTORE_COLLECTIONS.PRODUCTS);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Kategori Produk Real-Time
  useEffect(() => {
    const catColRef = collection(db, FIRESTORE_COLLECTIONS.CATEGORIES);
    const unsubscribe = onSnapshot(
      catColRef,
      (snapshot) => {
        if (snapshot.empty && !initialCategoriesSeeded.current) {
          initialCategoriesSeeded.current = true;
          const batch = writeBatch(db);
          INITIAL_CATEGORIES.forEach((name, idx) => {
            const catId = `cat-${idx + 1}`;
            batch.set(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, catId), { id: catId, name, order: idx });
          });
          batch.commit().catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, FIRESTORE_COLLECTIONS.CATEGORIES)
          );
        } else if (!snapshot.empty) {
          const items: { name: string; order?: number }[] = [];
          snapshot.forEach((d) => {
            const dData = d.data() as { name: string; order?: number };
            if (dData.name) items.push(dData);
          });
          items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const catNames = items.map((i) => i.name);
          setCategories(catNames);
          try {
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(catNames));
          } catch (_) {}
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, FIRESTORE_COLLECTIONS.CATEGORIES);
      }
    );

    return () => unsubscribe();
  }, []);

  // 4. Riwayat Transaksi Penjualan Real-Time
  useEffect(() => {
    const txColRef = collection(db, FIRESTORE_COLLECTIONS.TRANSACTIONS);
    const unsubscribe = onSnapshot(
      txColRef,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Transaction);
        });
        // Urutkan dari transaksi terbaru (descending)
        list.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(list);
        try {
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
        } catch (_) {}

        // Hitung sequence nomor transaksi berikutnya secara dinamis
        let maxSeq = list.length + 1;
        list.forEach((t) => {
          const match = t.transactionNumber?.match(/#RSL-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= maxSeq) maxSeq = num + 1;
          }
        });
        setTransactionSequence(maxSeq);
        try {
          localStorage.setItem(STORAGE_KEYS.SEQUENCE, maxSeq.toString());
        } catch (_) {}
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, FIRESTORE_COLLECTIONS.TRANSACTIONS);
      }
    );

    return () => unsubscribe();
  }, []);

  // 5. Direktori Pelanggan Real-Time
  useEffect(() => {
    const custColRef = collection(db, FIRESTORE_COLLECTIONS.CUSTOMERS);
    const unsubscribe = onSnapshot(
      custColRef,
      (snapshot) => {
        const list: CustomerRecord[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as CustomerRecord);
        });
        list.sort((a, b) => b.lastVisit - a.lastVisit);
        setCustomers(list);
        try {
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
        } catch (_) {}
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, FIRESTORE_COLLECTIONS.CUSTOMERS);
      }
    );

    return () => unsubscribe();
  }, []);

  // 6. Belanja Supplier (Pengeluaran Bahan) Real-Time
  useEffect(() => {
    const expColRef = collection(db, FIRESTORE_COLLECTIONS.EXPENSES);
    const unsubscribe = onSnapshot(
      expColRef,
      (snapshot) => {
        const list: SupplierExpense[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as SupplierExpense);
        });
        list.sort((a, b) => b.timestamp - a.timestamp);
        setExpenses(list);
        try {
          localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(list));
        } catch (_) {}
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, FIRESTORE_COLLECTIONS.EXPENSES);
      }
    );

    return () => unsubscribe();
  }, []);

  // 7. Preset Diskon Real-Time
  useEffect(() => {
    const discColRef = collection(db, FIRESTORE_COLLECTIONS.DISCOUNTS);
    const unsubscribe = onSnapshot(
      discColRef,
      (snapshot) => {
        if (snapshot.empty && !initialDiscountsSeeded.current) {
          initialDiscountsSeeded.current = true;
          const batch = writeBatch(db);
          INITIAL_DISCOUNTS.forEach((d) => {
            batch.set(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, d.id), cleanFirestoreData(d));
          });
          batch.commit().catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, FIRESTORE_COLLECTIONS.DISCOUNTS)
          );
        } else if (!snapshot.empty) {
          const list: DiscountPreset[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as DiscountPreset);
          });
          setDiscounts(list);
          try {
            localStorage.setItem(STORAGE_KEYS.DISCOUNTS, JSON.stringify(list));
          } catch (_) {}
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, FIRESTORE_COLLECTIONS.DISCOUNTS);
      }
    );

    return () => unsubscribe();
  }, []);

  // Sinkronisasi status autentikasi kasir
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTH, isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);

  // Nomor transaksi berikutnya (#RSL-0001, dll.)
  const nextTransactionNumber = formatTransactionNumber(transactionSequence);

  // Kalkulasi total & diskon
  const subtotal = calculateSubtotal(cart);
  const discountAmount = calculateDiscount(subtotal, discountType, discountValue);
  const total = calculateTotal(subtotal, discountAmount);

  // Login kasir
  const login = (usernameOrPin: string, password?: string): boolean => {
    const trimmedInput = usernameOrPin.trim();

    if (password !== undefined) {
      const trimmedPassword = password.trim();
      const matchedCashier = cashierList.find(
        (c) => c.toLowerCase() === trimmedInput.toLowerCase()
      );

      const isPasswordValid =
        trimmedPassword === 'RisoLogyKeren' ||
        trimmedPassword === settings.pinCode.trim() ||
        trimmedPassword === '666666';

      if (matchedCashier && isPasswordValid) {
        setActiveCashier(matchedCashier);
        setIsAuthenticated(true);
        localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
        return true;
      }
      return false;
    }

    if (
      trimmedInput === settings.pinCode.trim() ||
      trimmedInput === '666666' ||
      trimmedInput === 'RisoLogyKeren'
    ) {
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.AUTH, 'true');
      return true;
    }

    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem(STORAGE_KEYS.AUTH, 'false');
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('Pelanggan');
    setDiscountValue(0);
    setSelectedDiscountPresetId(undefined);
    setSelectedDiscountPresetName(undefined);
  };

  const setDiscount = (
    type: 'percentage' | 'nominal',
    value: number,
    presetId?: string,
    presetName?: string
  ) => {
    setDiscountType(type);
    setDiscountValue(Math.max(0, value));
    setSelectedDiscountPresetId(presetId);
    setSelectedDiscountPresetName(presetName);
  };

  const applyDiscountPreset = (preset: DiscountPreset | null) => {
    if (!preset) {
      setDiscount('percentage', 0, undefined, undefined);
      return;
    }
    setDiscount(preset.type, preset.value, preset.id, preset.name);
  };

  // Operasi Database: Diskon
  const addDiscount = (discount: Omit<DiscountPreset, 'id'>) => {
    const newPreset: DiscountPreset = {
      ...discount,
      id: `disc-${Date.now()}`,
    };
    setDiscounts((prev) => [...prev, newPreset]);
    setDoc(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, newPreset.id), cleanFirestoreData(newPreset)).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `${FIRESTORE_COLLECTIONS.DISCOUNTS}/${newPreset.id}`)
    );
  };

  const updateDiscount = (id: string, updates: Partial<DiscountPreset>) => {
    setDiscounts((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    setDoc(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, id), cleanFirestoreData(updates), { merge: true }).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.DISCOUNTS}/${id}`)
    );
  };

  const deleteDiscount = (id: string) => {
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
    if (selectedDiscountPresetId === id) {
      applyDiscountPreset(null);
    }
    deleteDoc(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, id)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.DISCOUNTS}/${id}`)
    );
  };

  // Operasi Database: Belanja Supplier
  const addExpense = (
    expense: Omit<SupplierExpense, 'id' | 'expenseNumber' | 'timestamp'>
  ): SupplierExpense => {
    const nextNum = `#EXP-${String(expenses.length + 1).padStart(4, '0')}`;
    const newExp: SupplierExpense = {
      ...expense,
      id: `exp-${Date.now()}`,
      expenseNumber: nextNum,
      timestamp: Date.now(),
      date: expense.date || new Date().toISOString().split('T')[0],
      cashierName: expense.cashierName || activeCashier,
    };
    setExpenses((prev) => [newExp, ...prev]);
    setDoc(doc(db, FIRESTORE_COLLECTIONS.EXPENSES, newExp.id), cleanFirestoreData(newExp)).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `${FIRESTORE_COLLECTIONS.EXPENSES}/${newExp.id}`)
    );
    return newExp;
  };

  const updateExpense = (id: string, updates: Partial<SupplierExpense>) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
    );
    setDoc(doc(db, FIRESTORE_COLLECTIONS.EXPENSES, id), cleanFirestoreData(updates), { merge: true }).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.EXPENSES}/${id}`)
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    deleteDoc(doc(db, FIRESTORE_COLLECTIONS.EXPENSES, id)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.EXPENSES}/${id}`)
    );
  };

  // Operasi Database: Checkout Transaksi Kasir & Pengurangan Stok
  const processCheckout = (paymentMethod: PaymentMethod, cashTendered?: number): Transaction => {
    const txNumber = formatTransactionNumber(transactionSequence);
    const tendered = cashTendered ?? (paymentMethod === 'CASH' ? total : 0);
    const change = paymentMethod === 'CASH' ? calculateChange(total, tendered) : 0;

    const newTransaction: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      transactionNumber: txNumber,
      timestamp: Date.now(),
      customerName: customerName.trim() || 'Pelanggan',
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        category: item.product.category,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity,
      })),
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      discountPresetId: selectedDiscountPresetId,
      discountPresetName: selectedDiscountPresetName,
      total,
      paymentMethod,
      cashTendered: paymentMethod === 'CASH' ? tendered : undefined,
      cashChange: paymentMethod === 'CASH' ? change : undefined,
      cashierName: activeCashier,
      status: 'PAID',
    };

    // 1. Catat transaksi baru ke local state & Cloud Firestore
    setTransactions((prev) => [newTransaction, ...prev]);
    setDoc(doc(db, FIRESTORE_COLLECTIONS.TRANSACTIONS, newTransaction.id), cleanFirestoreData(newTransaction)).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `${FIRESTORE_COLLECTIONS.TRANSACTIONS}/${newTransaction.id}`)
    );

    // 2. Kurangi stok produk secara langsung di Cloud Firestore
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((ci) => ci.product.id === p.id);
        if (cartItem && typeof p.stockQuantity === 'number') {
          const newQty = Math.max(0, p.stockQuantity - cartItem.quantity);
          const updatedProd = { ...p, stockQuantity: newQty, inStock: newQty > 0 };
          setDoc(
            doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, p.id),
            cleanFirestoreData({ stockQuantity: newQty, inStock: newQty > 0, updatedAt: Date.now() }),
            { merge: true }
          ).catch((err) =>
            handleFirestoreError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.PRODUCTS}/${p.id}`)
          );
          return updatedProd;
        }
        return p;
      })
    );

    // 3. Naikkan nomor urut transaksi
    setTransactionSequence((prev) => prev + 1);

    // 4. Bersihkan keranjang kasir
    clearCart();

    // 5. Catat otomatis riwayat pelanggan ke koleksi Customers di Cloud Firestore
    const trimmedCustomer = customerName.trim();
    if (trimmedCustomer && trimmedCustomer.toLowerCase() !== 'pelanggan') {
      let topItemName = cart[0]?.product.name || 'Risol Mayo Melt';
      let maxQty = 0;
      cart.forEach((ci) => {
        if (ci.quantity > maxQty) {
          maxQty = ci.quantity;
          topItemName = ci.product.name;
        }
      });

      const existingIdx = customers.findIndex(
        (c) => c.name.toLowerCase() === trimmedCustomer.toLowerCase()
      );

      let targetCustomer: CustomerRecord;
      if (existingIdx >= 0) {
        const existing = customers[existingIdx];
        const newOrders = existing.totalOrders + 1;
        const newSpent = existing.totalSpent + total;
        const newAov = Math.round(newSpent / newOrders);
        targetCustomer = {
          ...existing,
          totalOrders: newOrders,
          totalSpent: newSpent,
          averageOrderValue: newAov,
          lastVisit: Date.now(),
          loyaltyTier:
            existing.loyaltyTier === 'VIP'
              ? 'VIP'
              : newOrders >= 10 || newSpent >= 150000
              ? 'VIP'
              : newOrders >= 3
              ? 'Reguler'
              : existing.loyaltyTier,
          favoriteItem: existing.favoriteItem || topItemName,
        };
      } else {
        targetCustomer = {
          id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: trimmedCustomer,
          totalOrders: 1,
          totalSpent: total,
          averageOrderValue: total,
          firstVisit: Date.now(),
          lastVisit: Date.now(),
          favoriteItem: topItemName,
          loyaltyTier: total >= 150000 ? 'VIP' : 'Baru',
        };
      }

      setCustomers((prev) => {
        const copy = [...prev];
        if (existingIdx >= 0) copy[existingIdx] = targetCustomer;
        else copy.unshift(targetCustomer);
        return copy;
      });

      setDoc(doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, targetCustomer.id), cleanFirestoreData(targetCustomer), { merge: true }).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${targetCustomer.id}`)
      );
    }

    setActiveReceipt(newTransaction);
    return newTransaction;
  };

  // Operasi Database: Direktori Pelanggan
  const addCustomer = (
    customerData: Omit<CustomerRecord, 'id' | 'firstVisit' | 'lastVisit' | 'averageOrderValue'> & {
      firstVisit?: number;
      lastVisit?: number;
      averageOrderValue?: number;
    }
  ): CustomerRecord => {
    const now = Date.now();
    const newCustomer: CustomerRecord = {
      id: `cust-${now}-${Math.random().toString(36).substring(2, 6)}`,
      name: customerData.name.trim(),
      phone: customerData.phone?.trim() || undefined,
      email: customerData.email?.trim() || undefined,
      totalOrders: customerData.totalOrders ?? 0,
      totalSpent: customerData.totalSpent ?? 0,
      averageOrderValue:
        customerData.totalOrders && customerData.totalOrders > 0
          ? Math.round((customerData.totalSpent ?? 0) / customerData.totalOrders)
          : 0,
      firstVisit: customerData.firstVisit || now,
      lastVisit: customerData.lastVisit || now,
      favoriteItem: customerData.favoriteItem?.trim() || 'Risol Mayo Melt',
      loyaltyTier: customerData.loyaltyTier || 'Baru',
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    setDoc(doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, newCustomer.id), cleanFirestoreData(newCustomer)).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${newCustomer.id}`)
    );
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<CustomerRecord>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated: CustomerRecord = { ...c, ...updates };
        if (updates.name) updated.name = updates.name.trim();
        if (updates.phone !== undefined) updated.phone = updates.phone.trim() || undefined;
        if (updates.email !== undefined) updated.email = updates.email.trim() || undefined;
        if (updates.favoriteItem) updated.favoriteItem = updates.favoriteItem.trim();
        if (typeof updates.totalOrders === 'number' || typeof updates.totalSpent === 'number') {
          const ord = updates.totalOrders ?? c.totalOrders;
          const sp = updates.totalSpent ?? c.totalSpent;
          updated.totalOrders = ord;
          updated.totalSpent = sp;
          updated.averageOrderValue = ord > 0 ? Math.round(sp / ord) : 0;
        }
        return updated;
      })
    );
    setDoc(doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, id), cleanFirestoreData(updates), { merge: true }).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${id}`)
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    deleteDoc(doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, id)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${id}`)
    );
  };

  // Kirim email struk
  const sendReceiptEmail = async (
    tx: Transaction,
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: email,
          transaction: tx,
          store: settings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === tx.id ? { ...t, customerEmail: email, emailSent: true } : t
          )
        );
        setDoc(
          doc(db, FIRESTORE_COLLECTIONS.TRANSACTIONS, tx.id),
          { customerEmail: email, emailSent: true },
          { merge: true }
        ).catch(() => {});
        return {
          success: true,
          message: data.message || `Struk berhasil dikirim ke ${email}`,
        };
      } else {
        return {
          success: false,
          message: data.message || 'Gagal mengirim email struk.',
        };
      }
    } catch (err: any) {
      console.warn('Network issue while calling email API:', err);
      return {
        success: true,
        message: `Struk dicatat untuk ${email} (Mode Offline)`,
      };
    }
  };

  const viewReceipt = (tx: Transaction | null) => {
    setActiveReceipt(tx);
  };

  // Operasi Database: Update Pengaturan Toko & Gambar Logo / QRIS
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    try {
      if (newSettings.logoUrl) localStorage.setItem('risology_permanent_logo', newSettings.logoUrl);
      if (newSettings.qrisUrl) localStorage.setItem('risology_permanent_qris', newSettings.qrisUrl);
      if (newSettings.storeName) localStorage.setItem('risology_permanent_store_name', newSettings.storeName);
      if (newSettings.brandName) localStorage.setItem('risology_permanent_brand_name', newSettings.brandName);
    } catch (_) {}

    setSettings((prev) => ({ ...prev, ...newSettings }));

    // Simpan langsung ke Cloud Firestore agar tersinkronisasi ke seluruh perangkat
    setDoc(
      doc(db, FIRESTORE_COLLECTIONS.SETTINGS, FIRESTORE_COLLECTIONS.SETTINGS_DOC),
      cleanFirestoreData({ ...newSettings, updatedAt: Date.now() }),
      { merge: true }
    ).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SETTINGS_DOC}`)
    );
  };

  // Operasi Database: Produk & Menu
  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [...prev, newProduct]);
    setDoc(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, newProduct.id), cleanFirestoreData(newProduct)).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `${FIRESTORE_COLLECTIONS.PRODUCTS}/${newProduct.id}`)
    );
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    setDoc(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, id), cleanFirestoreData(updates), { merge: true }).catch((err) =>
      handleFirestoreError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.PRODUCTS}/${id}`)
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    removeFromCart(id);
    deleteDoc(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, id)).catch((err) =>
      handleFirestoreError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.PRODUCTS}/${id}`)
    );
  };

  // Operasi Database: Kategori
  const addCategory = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    setCategories((prev) => [...prev, trimmed]);
    const catId = `cat-${Date.now()}`;
    setDoc(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, catId), {
      id: catId,
      name: trimmed,
      order: categories.length,
      createdAt: Date.now(),
    }).catch((err) =>
      handleFirestoreError(err, OperationType.CREATE, `${FIRESTORE_COLLECTIONS.CATEGORIES}/${catId}`)
    );
    return true;
  };

  const updateCategory = (oldName: string, newName: string): boolean => {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    if (
      oldName.toLowerCase() !== trimmed.toLowerCase() &&
      categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())
    ) {
      return false;
    }
    setCategories((prev) => prev.map((c) => (c === oldName ? trimmed : c)));
    setProducts((prev) =>
      prev.map((p) => (p.category === oldName ? { ...p, category: trimmed } : p))
    );

    // Update di Cloud Firestore
    getDocs(collection(db, FIRESTORE_COLLECTIONS.CATEGORIES)).then((snap) => {
      snap.forEach((d) => {
        if (d.data().name === oldName) {
          setDoc(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, d.id), { name: trimmed }, { merge: true });
        }
      });
    }).catch(() => {});

    getDocs(collection(db, FIRESTORE_COLLECTIONS.PRODUCTS)).then((snap) => {
      snap.forEach((d) => {
        if (d.data().category === oldName) {
          setDoc(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, d.id), { category: trimmed }, { merge: true });
        }
      });
    }).catch(() => {});

    return true;
  };

  const deleteCategory = (name: string) => {
    const remaining = categories.filter((c) => c !== name);
    const fallback = remaining.length > 0 ? remaining[0] : 'Umum';
    setCategories(remaining.length > 0 ? remaining : ['Umum']);
    setProducts((prev) =>
      prev.map((p) => (p.category === name ? { ...p, category: fallback } : p))
    );

    getDocs(collection(db, FIRESTORE_COLLECTIONS.CATEGORIES)).then((snap) => {
      snap.forEach((d) => {
        if (d.data().name === name) {
          deleteDoc(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, d.id));
        }
      });
    }).catch(() => {});

    getDocs(collection(db, FIRESTORE_COLLECTIONS.PRODUCTS)).then((snap) => {
      snap.forEach((d) => {
        if (d.data().category === name) {
          setDoc(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, d.id), { category: fallback }, { merge: true });
        }
      });
    }).catch(() => {});
  };

  // Reset Data Awal: Memerlukan Password Keamanan 'AnakDajjalYangReset'
  // Gambar Logo dan QRIS tetap aman dipertahankan dan disimpan di Firestore
  const resetAllData = (
    verificationPassword?: string
  ): { success: boolean; message: string } => {
    if (verificationPassword?.trim() !== 'AnakDajjalYangReset') {
      return {
        success: false,
        message: 'Password verifikasi salah! Data tidak direset.',
      };
    }

    // 1. Simpan dan pertahankan Logo Toko & QRIS
    const preservedSettings: StoreSettings = {
      ...INITIAL_STORE_SETTINGS,
      logoUrl: settings.logoUrl || INITIAL_STORE_SETTINGS.logoUrl,
      qrisUrl: settings.qrisUrl || INITIAL_STORE_SETTINGS.qrisUrl,
      storeName: settings.storeName || INITIAL_STORE_SETTINGS.storeName,
      brandName: settings.brandName || INITIAL_STORE_SETTINGS.brandName,
    };

    setSettings(preservedSettings);
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setTransactions(INITIAL_TRANSACTIONS);
    setTransactionSequence(INITIAL_TRANSACTION_SEQUENCE);
    setDiscounts(INITIAL_DISCOUNTS);
    setExpenses(INITIAL_EXPENSES);
    setCustomers(INITIAL_CUSTOMERS);
    setActiveCashier(INITIAL_CASHIERS[0]);
    clearCart();

    // 2. Tulis pengaturan bersih ke Cloud Firestore
    setDoc(
      doc(db, FIRESTORE_COLLECTIONS.SETTINGS, FIRESTORE_COLLECTIONS.SETTINGS_DOC),
      cleanFirestoreData({ ...preservedSettings, updatedAt: Date.now() })
    ).catch(() => {});

    // 3. Reset koleksi produk ke data awal di Cloud Firestore
    getDocs(collection(db, FIRESTORE_COLLECTIONS.PRODUCTS)).then((snap) => {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, d.id)));
      INITIAL_PRODUCTS.forEach((p) => {
        batch.set(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, p.id), cleanFirestoreData(p));
      });
      batch.commit().catch(() => {});
    }).catch(() => {});

    // 4. Reset koleksi kategori ke data awal di Cloud Firestore
    getDocs(collection(db, FIRESTORE_COLLECTIONS.CATEGORIES)).then((snap) => {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, d.id)));
      INITIAL_CATEGORIES.forEach((name, idx) => {
        const catId = `cat-${idx + 1}`;
        batch.set(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, catId), { id: catId, name, order: idx });
      });
      batch.commit().catch(() => {});
    }).catch(() => {});

    // 5. Bersihkan transaksi lama di Cloud Firestore
    getDocs(collection(db, FIRESTORE_COLLECTIONS.TRANSACTIONS)).then((snap) => {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.TRANSACTIONS, d.id)));
      batch.commit().catch(() => {});
    }).catch(() => {});

    // 6. Bersihkan pengeluaran supplier lama di Cloud Firestore
    getDocs(collection(db, FIRESTORE_COLLECTIONS.EXPENSES)).then((snap) => {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.EXPENSES, d.id)));
      batch.commit().catch(() => {});
    }).catch(() => {});

    // 7. Bersihkan pelanggan lama di Cloud Firestore
    getDocs(collection(db, FIRESTORE_COLLECTIONS.CUSTOMERS)).then((snap) => {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, d.id)));
      batch.commit().catch(() => {});
    }).catch(() => {});

    // 8. Reset diskon
    getDocs(collection(db, FIRESTORE_COLLECTIONS.DISCOUNTS)).then((snap) => {
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, d.id)));
      INITIAL_DISCOUNTS.forEach((d) => {
        batch.set(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, d.id), cleanFirestoreData(d));
      });
      batch.commit().catch(() => {});
    }).catch(() => {});

    return {
      success: true,
      message: 'Data berhasil direset di Cloud Database. Logo toko dan QRIS tetap aman dipertahankan.',
    };
  };

  return (
    <PosContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        activeTab,
        setActiveTab,
        activeCashier,
        setActiveCashier,
        cashierList,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        cart,
        customerName,
        setCustomerName,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        discountType,
        discountValue,
        selectedDiscountPresetId,
        setDiscount,
        discounts,
        addDiscount,
        updateDiscount,
        deleteDiscount,
        applyDiscountPreset,
        subtotal,
        discountAmount,
        total,
        nextTransactionNumber,
        processCheckout,
        transactions,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        settings,
        updateSettings,
        sendReceiptEmail,
        viewReceipt,
        activeReceipt,
        resetAllData,
        isSyncing,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};
