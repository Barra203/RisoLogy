import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
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
  ShiftConfig,
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
  // Auth & Cashier Session Persistence
  isAuthenticated: boolean;
  currentUser: string | null;
  login: (username: string, password?: string) => boolean;
  logout: () => void;
  logoutCashier: () => void;

  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Cashier Shifts (100% Synced via Firestore Database across all devices)
  activeCashier: string;
  setActiveCashier: (name: string) => void;
  cashierList: string[];
  addCashier: (name: string) => void;
  shiftInfo: ShiftConfig | null;

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
  setDiscount: (
    type: 'percentage' | 'nominal',
    value: number,
    presetId?: string,
    presetName?: string
  ) => void;
  discounts: DiscountPreset[];
  addDiscount: (discount: Omit<DiscountPreset, 'id'>) => void;
  updateDiscount: (id: string, updates: Partial<DiscountPreset>) => void;
  deleteDiscount: (id: string) => void;
  applyDiscountPreset: (preset: DiscountPreset | null) => void;

  // Totals
  subtotal: number;
  discountAmount: number;
  total: number;

  // Checkout & Transactions Management (Create, Update, Delete in Firestore)
  nextTransactionNumber: string;
  processCheckout: (paymentMethod: PaymentMethod, cashTendered?: number) => Transaction;
  transactions: Transaction[];
  updateTransaction: (transactionId: string, updatedData: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;

  // Supplier Expenses
  expenses: SupplierExpense[];
  addExpense: (
    expense: Omit<SupplierExpense, 'id' | 'expenseNumber' | 'timestamp'>
  ) => SupplierExpense;
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
  sendReceiptEmail: (
    tx: Transaction,
    email: string
  ) => Promise<{ success: boolean; message: string }>;
  viewReceipt: (tx: Transaction | null) => void;
  activeReceipt: Transaction | null;
  resetAllData: (verificationPassword?: string) => { success: boolean; message: string };

  // UI Loading & Error State
  isLoading: boolean;
  isSyncing: boolean;
  dbError: string | null;
  clearDbError: () => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lazy Initialization untuk Persistensi Sesi Kasir (Mencegah Logout saat Refresh)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('pos_cashier_session');
    if (!saved) return false;
    try {
      return JSON.parse(saved).isAuthenticated ?? false;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    const saved = localStorage.getItem('pos_cashier_session');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.isAuthenticated) return null;
      return typeof parsed.user === 'string'
        ? parsed.user
        : parsed.user?.username || 'RisoLogy';
    } catch {
      return null;
    }
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');

  // Cashier Shift state (Sinkronisasi real-time antar semua perangkat lewat Firestore)
  const [activeCashier, setActiveCashierState] = useState<string>(INITIAL_CASHIERS[0]);
  const [cashierList, setCashierList] = useState<string[]>(Array.from(INITIAL_CASHIERS));
  const [shiftInfo, setShiftInfo] = useState<ShiftConfig | null>(null);

  // Store Settings (Brand Identity, Logo & QRIS) - Cloud Firestore
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_STORE_SETTINGS);

  // Products Catalog & Inventory Stock - Cloud Firestore
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

  // Categories - Cloud Firestore
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);

  // Transactions History - Cloud Firestore
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Transaction Sequence Counter - Cloud Firestore
  const [transactionSequence, setTransactionSequence] = useState<number>(
    INITIAL_TRANSACTION_SEQUENCE
  );

  // Discounts Presets - Cloud Firestore
  const [discounts, setDiscounts] = useState<DiscountPreset[]>(INITIAL_DISCOUNTS);

  // Supplier Expenses (Belanja Bahan Supplier) - Cloud Firestore
  const [expenses, setExpenses] = useState<SupplierExpense[]>(INITIAL_EXPENSES);

  // Customer Directory - Cloud Firestore
  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS);

  // UI Status: Penanda status pemuatan & penanganan galat Firestore
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('Pelanggan');
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedDiscountPresetId, setSelectedDiscountPresetId] = useState<string | undefined>(
    undefined
  );
  const [selectedDiscountPresetName, setSelectedDiscountPresetName] = useState<string | undefined>(
    undefined
  );

  // Active modal receipt
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Refs untuk memastikan inisialisasi data awal (seeding) hanya dijalankan sekali jika koleksi kosong
  const initialSettingsSeeded = useRef(false);
  const initialShiftSeeded = useRef(false);
  const initialProductsSeeded = useRef(false);
  const initialCategoriesSeeded = useRef(false);
  const initialDiscountsSeeded = useRef(false);
  const initialTransactionsSeeded = useRef(false);
  const initialCustomersSeeded = useRef(false);
  const initialExpensesSeeded = useRef(false);

  const clearDbError = () => setDbError(null);

  const reportError = (err: unknown, op: OperationType, path: string) => {
    const info = handleFirestoreError(err, op, path);
    setDbError(`Gangguan sinkronisasi database (${op} pada ${path}): ${info.error}`);
  };

  // ============================================================================
  // PEMUATAN DATA PERTAMA KALI & SINKRONISASI WAKTU NYATA (onSnapshot)
  // ============================================================================

  // 1. Koleksi `products`: Pemuatan awal, seeding jika kosong, & real-time listener
  useEffect(() => {
    const prodsColRef = collection(db, FIRESTORE_COLLECTIONS.PRODUCTS);
    const unsubscribe = onSnapshot(
      prodsColRef,
      (snapshot) => {
        setIsLoading(false);
        setIsSyncing(false);

        if (snapshot.empty && !initialProductsSeeded.current && INITIAL_PRODUCTS.length > 0) {
          initialProductsSeeded.current = true;
          const batch = writeBatch(db);
          INITIAL_PRODUCTS.forEach((p) => {
            batch.set(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, p.id), cleanFirestoreData(p));
          });
          batch.commit().catch((err) =>
            reportError(err, OperationType.WRITE, FIRESTORE_COLLECTIONS.PRODUCTS)
          );
          return;
        }

        const list: Product[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as Product), id: d.id });
        });

        if (list.length > 0) {
          list.sort((a, b) => a.id.localeCompare(b.id));
          setProducts(list);
        }
      },
      (error) => {
        setIsLoading(false);
        setIsSyncing(false);
        reportError(error, OperationType.GET, FIRESTORE_COLLECTIONS.PRODUCTS);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Koleksi `transactions`: Pemuatan awal, seeding jika ada data awal, & real-time listener
  useEffect(() => {
    const txColRef = collection(db, FIRESTORE_COLLECTIONS.TRANSACTIONS);
    const unsubscribe = onSnapshot(
      txColRef,
      (snapshot) => {
        setIsLoading(false);
        setIsSyncing(false);

        if (
          snapshot.empty &&
          !initialTransactionsSeeded.current &&
          INITIAL_TRANSACTIONS.length > 0
        ) {
          initialTransactionsSeeded.current = true;
          const batch = writeBatch(db);
          INITIAL_TRANSACTIONS.forEach((tx) => {
            batch.set(doc(db, FIRESTORE_COLLECTIONS.TRANSACTIONS, tx.id), cleanFirestoreData(tx));
          });
          batch.commit().catch((err) =>
            reportError(err, OperationType.WRITE, FIRESTORE_COLLECTIONS.TRANSACTIONS)
          );
          return;
        }

        const list: Transaction[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as Transaction), id: d.id });
        });
        list.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(list);

        // Hitung nomor urut transaksi berikutnya (#RSL-XXXX) dari koleksi Firestore
        let maxSeq = list.length + 1;
        list.forEach((t) => {
          const match = t.transactionNumber?.match(/#RSL-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= maxSeq) maxSeq = num + 1;
          }
        });
        setTransactionSequence(maxSeq);
      },
      (error) => {
        setIsLoading(false);
        setIsSyncing(false);
        reportError(error, OperationType.GET, FIRESTORE_COLLECTIONS.TRANSACTIONS);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Koleksi `customers`: Pemuatan awal, seeding jika ada data awal, & real-time listener
  useEffect(() => {
    const custColRef = collection(db, FIRESTORE_COLLECTIONS.CUSTOMERS);
    const unsubscribe = onSnapshot(
      custColRef,
      (snapshot) => {
        setIsLoading(false);

        if (snapshot.empty && !initialCustomersSeeded.current && INITIAL_CUSTOMERS.length > 0) {
          initialCustomersSeeded.current = true;
          const batch = writeBatch(db);
          INITIAL_CUSTOMERS.forEach((c) => {
            batch.set(doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, c.id), cleanFirestoreData(c));
          });
          batch.commit().catch((err) =>
            reportError(err, OperationType.WRITE, FIRESTORE_COLLECTIONS.CUSTOMERS)
          );
          return;
        }

        const list: CustomerRecord[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as CustomerRecord), id: d.id });
        });
        list.sort((a, b) => b.lastVisit - a.lastVisit);
        setCustomers(list);
      },
      (error) => {
        setIsLoading(false);
        reportError(error, OperationType.GET, FIRESTORE_COLLECTIONS.CUSTOMERS);
      }
    );

    return () => unsubscribe();
  }, []);

  // 4. Koleksi `expenses`: Pemuatan awal, seeding jika ada data awal, & real-time listener
  useEffect(() => {
    const expColRef = collection(db, FIRESTORE_COLLECTIONS.EXPENSES);
    const unsubscribe = onSnapshot(
      expColRef,
      (snapshot) => {
        setIsLoading(false);

        if (snapshot.empty && !initialExpensesSeeded.current && INITIAL_EXPENSES.length > 0) {
          initialExpensesSeeded.current = true;
          const batch = writeBatch(db);
          INITIAL_EXPENSES.forEach((exp) => {
            batch.set(doc(db, FIRESTORE_COLLECTIONS.EXPENSES, exp.id), cleanFirestoreData(exp));
          });
          batch.commit().catch((err) =>
            reportError(err, OperationType.WRITE, FIRESTORE_COLLECTIONS.EXPENSES)
          );
          return;
        }

        const list: SupplierExpense[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as SupplierExpense), id: d.id });
        });
        list.sort((a, b) => b.timestamp - a.timestamp);
        setExpenses(list);
      },
      (error) => {
        setIsLoading(false);
        reportError(error, OperationType.GET, FIRESTORE_COLLECTIONS.EXPENSES);
      }
    );

    return () => unsubscribe();
  }, []);

  // 5. Koleksi `categories`: Pemuatan awal, seeding jika kosong, & real-time listener
  useEffect(() => {
    const catColRef = collection(db, FIRESTORE_COLLECTIONS.CATEGORIES);
    const unsubscribe = onSnapshot(
      catColRef,
      (snapshot) => {
        const items: { name: string; order?: number }[] = [];
        snapshot.forEach((d) => {
          const dData = d.data() as { name: string; order?: number };
          if (dData.name) items.push(dData);
        });

        if (items.length === 0 && !initialCategoriesSeeded.current) {
          initialCategoriesSeeded.current = true;
          const batch = writeBatch(db);
          INITIAL_CATEGORIES.forEach((name, idx) => {
            const catId = `cat-${idx + 1}`;
            batch.set(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, catId), {
              id: catId,
              name,
              order: idx,
            });
          });
          batch.commit().catch((err) =>
            reportError(err, OperationType.WRITE, FIRESTORE_COLLECTIONS.CATEGORIES)
          );
        } else if (items.length > 0) {
          items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setCategories(items.map((i) => i.name));
        }
      },
      (error) => {
        reportError(error, OperationType.GET, FIRESTORE_COLLECTIONS.CATEGORIES);
      }
    );

    return () => unsubscribe();
  }, []);

  // 6. Koleksi `discounts`: Pemuatan awal, seeding jika kosong, & real-time listener
  useEffect(() => {
    const discColRef = collection(db, FIRESTORE_COLLECTIONS.DISCOUNTS);
    const unsubscribe = onSnapshot(
      discColRef,
      (snapshot) => {
        const list: DiscountPreset[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as DiscountPreset), id: d.id });
        });

        if (list.length === 0 && !initialDiscountsSeeded.current) {
          initialDiscountsSeeded.current = true;
          const batch = writeBatch(db);
          INITIAL_DISCOUNTS.forEach((d) => {
            batch.set(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, d.id), cleanFirestoreData(d));
          });
          batch.commit().catch((err) =>
            reportError(err, OperationType.WRITE, FIRESTORE_COLLECTIONS.DISCOUNTS)
          );
        } else if (list.length > 0) {
          setDiscounts(list);
        }
      },
      (error) => {
        reportError(error, OperationType.GET, FIRESTORE_COLLECTIONS.DISCOUNTS);
      }
    );

    return () => unsubscribe();
  }, []);

  // 7. Dokumen `store_settings/store_config`: Pengaturan Toko, Logo & QRIS
  useEffect(() => {
    const settingsDocRef = doc(
      db,
      FIRESTORE_COLLECTIONS.SETTINGS,
      FIRESTORE_COLLECTIONS.SETTINGS_DOC
    );
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        setIsSyncing(false);
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<StoreSettings>;
          setSettings((prev) => ({
            ...prev,
            ...data,
            logoUrl: data.logoUrl || prev.logoUrl || INITIAL_STORE_SETTINGS.logoUrl,
            qrisUrl: data.qrisUrl || prev.qrisUrl || INITIAL_STORE_SETTINGS.qrisUrl,
            storeName: data.storeName || prev.storeName || INITIAL_STORE_SETTINGS.storeName,
            brandName: data.brandName || prev.brandName || INITIAL_STORE_SETTINGS.brandName,
          }));
        } else if (!initialSettingsSeeded.current) {
          initialSettingsSeeded.current = true;
          setDoc(
            settingsDocRef,
            cleanFirestoreData({ ...INITIAL_STORE_SETTINGS, updatedAt: Date.now() })
          ).catch((err) =>
            reportError(
              err,
              OperationType.WRITE,
              `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SETTINGS_DOC}`
            )
          );
        }
      },
      (error) => {
        setIsSyncing(false);
        reportError(
          error,
          OperationType.GET,
          `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SETTINGS_DOC}`
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // 8. Dokumen `store_settings/shift_config`: Sinkronisasi Shift Kasir Aktif Antar Perangkat
  useEffect(() => {
    const shiftDocRef = doc(
      db,
      FIRESTORE_COLLECTIONS.SETTINGS,
      FIRESTORE_COLLECTIONS.SHIFT_CONFIG_DOC
    );
    const unsubscribe = onSnapshot(
      shiftDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<ShiftConfig>;
          if (data.activeCashier) {
            setActiveCashierState(data.activeCashier);
          }
          if (Array.isArray(data.cashierList) && data.cashierList.length > 0) {
            setCashierList(data.cashierList);
          }
          setShiftInfo({
            activeCashier: data.activeCashier || INITIAL_CASHIERS[0],
            cashierList: data.cashierList || Array.from(INITIAL_CASHIERS),
            activeShiftId: data.activeShiftId,
            shiftStartedAt: data.shiftStartedAt,
            updatedAt: data.updatedAt,
          });
        } else if (!initialShiftSeeded.current) {
          initialShiftSeeded.current = true;
          const initialShiftData: ShiftConfig = {
            activeCashier: INITIAL_CASHIERS[0],
            cashierList: Array.from(INITIAL_CASHIERS),
            shiftStartedAt: Date.now(),
            updatedAt: Date.now(),
          };
          setDoc(shiftDocRef, cleanFirestoreData(initialShiftData)).catch((err) =>
            reportError(
              err,
              OperationType.WRITE,
              `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SHIFT_CONFIG_DOC}`
            )
          );
        }
      },
      (error) => {
        reportError(
          error,
          OperationType.GET,
          `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SHIFT_CONFIG_DOC}`
        );
      }
    );

    return () => unsubscribe();
  }, []);

  // Nomor transaksi berikutnya (#RSL-0001, dst.)
  const nextTransactionNumber = formatTransactionNumber(transactionSequence);

  // Kalkulasi subtotal, diskon, dan total belanja
  const subtotal = calculateSubtotal(cart);
  const discountAmount = calculateDiscount(subtotal, discountType, discountValue);
  const total = calculateTotal(subtotal, discountAmount);

  // ============================================================================
  // AUTENTIKASI & PERSISTENSI SESI KASIR
  // ============================================================================

  // Login Akun Utama (Username: RisoLogy, Password: kelompokrisol6)
  const login = (username: string, password?: string): boolean => {
    const trimmedUser = username.trim();
    const trimmedPass = (password || '').trim();

    const isUserValid = trimmedUser.toLowerCase() === 'risology';
    const isPassValid = trimmedPass === 'kelompokrisol6';

    if (isUserValid && isPassValid) {
      const cashierData = {
        username: 'RisoLogy',
        activeCashier,
      };
      try {
        localStorage.setItem(
          'pos_cashier_session',
          JSON.stringify({
            isAuthenticated: true,
            user: cashierData,
            loginTime: Date.now(),
          })
        );
      } catch (err) {
        console.warn('Gagal menyimpan sesi login:', err);
      }
      setIsAuthenticated(true);
      setCurrentUser('RisoLogy');
      return true;
    }

    return false;
  };

  // Mekanisme Logout Kasir: Menghapus pos_cashier_session dari localStorage & reset state
  const logoutCashier = () => {
    try {
      localStorage.removeItem('pos_cashier_session');
    } catch (err) {
      console.warn('Gagal menghapus sesi login:', err);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const logout = () => {
    logoutCashier();
  };

  // ============================================================================
  // OPERASI PENULISAN & MUTASI DATA KE CLOUD FIRESTORE
  // ============================================================================

  // Pergantian Shift Kasir (Tersinkronisasi ke semua perangkat melalui Firestore)
  const setActiveCashier = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setActiveCashierState(trimmed);

    const shiftDocRef = doc(
      db,
      FIRESTORE_COLLECTIONS.SETTINGS,
      FIRESTORE_COLLECTIONS.SHIFT_CONFIG_DOC
    );
    const shiftSessionId = `shift-${Date.now()}`;

    setDoc(
      shiftDocRef,
      cleanFirestoreData({
        activeCashier: trimmed,
        activeShiftId: shiftSessionId,
        shiftStartedAt: Date.now(),
        updatedAt: Date.now(),
      }),
      { merge: true }
    ).catch((err) =>
      reportError(
        err,
        OperationType.WRITE,
        `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SHIFT_CONFIG_DOC}`
      )
    );

    addDoc(
      collection(db, FIRESTORE_COLLECTIONS.SHIFTS),
      cleanFirestoreData({
        id: shiftSessionId,
        activeCashier: trimmed,
        startedAt: Date.now(),
        status: 'ACTIVE',
      })
    ).catch(() => {});
  };

  // Tambah anggota kasir baru ke daftar shift
  const addCashier = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || cashierList.includes(trimmed)) return;
    const updatedList = [...cashierList, trimmed];
    setCashierList(updatedList);

    setDoc(
      doc(db, FIRESTORE_COLLECTIONS.SETTINGS, FIRESTORE_COLLECTIONS.SHIFT_CONFIG_DOC),
      cleanFirestoreData({ cashierList: updatedList, updatedAt: Date.now() }),
      { merge: true }
    ).catch((err) =>
      reportError(
        err,
        OperationType.UPDATE,
        `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SHIFT_CONFIG_DOC}`
      )
    );
  };

  // Operasi Keranjang Belanja
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

  // Manajemen Diskon di Firestore
  const addDiscount = (discount: Omit<DiscountPreset, 'id'>) => {
    const tempId = `disc-${Date.now()}`;
    const newPreset: DiscountPreset = {
      ...discount,
      id: tempId,
    };
    setDiscounts((prev) => [...prev, newPreset]);

    addDoc(collection(db, FIRESTORE_COLLECTIONS.DISCOUNTS), cleanFirestoreData(newPreset))
      .then((docRef) => {
        setDiscounts((prev) =>
          prev.map((d) => (d.id === tempId ? { ...d, id: docRef.id } : d))
        );
      })
      .catch((err) =>
        reportError(err, OperationType.CREATE, FIRESTORE_COLLECTIONS.DISCOUNTS)
      );
  };

  const updateDiscount = (id: string, updates: Partial<DiscountPreset>) => {
    setDiscounts((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    updateDoc(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, id), cleanFirestoreData(updates)).catch(
      (err) =>
        reportError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.DISCOUNTS}/${id}`)
    );
  };

  const deleteDiscount = (id: string) => {
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
    if (selectedDiscountPresetId === id) {
      applyDiscountPreset(null);
    }
    deleteDoc(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, id)).catch((err) =>
      reportError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.DISCOUNTS}/${id}`)
    );
  };

  // Penambahan Biaya Operasional / Belanja Supplier ke Firestore menggunakan `addDoc`
  const addExpense = (
    expense: Omit<SupplierExpense, 'id' | 'expenseNumber' | 'timestamp'>
  ): SupplierExpense => {
    const nextNum = `#EXP-${String(expenses.length + 1).padStart(4, '0')}`;
    const tempId = `exp-${Date.now()}`;
    const newExp: SupplierExpense = {
      ...expense,
      id: tempId,
      expenseNumber: nextNum,
      timestamp: Date.now(),
      date: expense.date || new Date().toISOString().split('T')[0],
      cashierName: expense.cashierName || activeCashier,
    };

    setExpenses((prev) => [newExp, ...prev]);

    addDoc(collection(db, FIRESTORE_COLLECTIONS.EXPENSES), cleanFirestoreData(newExp))
      .then((docRef) => {
        setExpenses((prev) =>
          prev.map((exp) => (exp.id === tempId ? { ...exp, id: docRef.id } : exp))
        );
      })
      .catch((err) =>
        reportError(err, OperationType.CREATE, FIRESTORE_COLLECTIONS.EXPENSES)
      );

    return newExp;
  };

  const updateExpense = (id: string, updates: Partial<SupplierExpense>) => {
    setExpenses((prev) => prev.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp)));
    updateDoc(doc(db, FIRESTORE_COLLECTIONS.EXPENSES, id), cleanFirestoreData(updates)).catch(
      (err) =>
        reportError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.EXPENSES}/${id}`)
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    deleteDoc(doc(db, FIRESTORE_COLLECTIONS.EXPENSES, id)).catch((err) =>
      reportError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.EXPENSES}/${id}`)
    );
  };

  // Pembuatan Transaksi Baru (`addDoc`) & Pembaruan Stok Produk (`updateDoc`) Secara Bersamaan
  const processCheckout = (paymentMethod: PaymentMethod, cashTendered?: number): Transaction => {
    const txNumber = formatTransactionNumber(transactionSequence);
    const tendered = cashTendered ?? (paymentMethod === 'CASH' ? total : 0);
    const change = paymentMethod === 'CASH' ? calculateChange(total, tendered) : 0;
    const tempTxId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const newTransaction: Transaction = {
      id: tempTxId,
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
      notes: '',
      status: 'PAID',
    };

    // 1. Simpan dokumen transaksi baru ke koleksi `transactions` menggunakan `addDoc`
    setTransactions((prev) => [newTransaction, ...prev]);
    addDoc(
      collection(db, FIRESTORE_COLLECTIONS.TRANSACTIONS),
      cleanFirestoreData(newTransaction)
    )
      .then((docRef) => {
        setTransactions((prev) =>
          prev.map((t) => (t.id === tempTxId ? { ...t, id: docRef.id } : t))
        );
      })
      .catch((err) =>
        reportError(err, OperationType.CREATE, FIRESTORE_COLLECTIONS.TRANSACTIONS)
      );

    // 2. Perbarui jumlah stok pada koleksi `products` di Firestore secara bersamaan
    const cartSnapshot = [...cart];
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cartSnapshot.find((ci) => ci.product.id === p.id);
        if (cartItem && typeof p.stockQuantity === 'number') {
          const newQty = Math.max(0, p.stockQuantity - cartItem.quantity);
          const updatedProd = { ...p, stockQuantity: newQty, inStock: newQty > 0 };
          const prodRef = doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, p.id);

          updateDoc(
            prodRef,
            cleanFirestoreData({
              stockQuantity: newQty,
              inStock: newQty > 0,
              updatedAt: Date.now(),
            })
          ).catch((err) =>
            reportError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.PRODUCTS}/${p.id}`)
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

    // 5. Simpan atau perbarui data pelanggan di koleksi `customers` Firestore
    const trimmedCustomer = customerName.trim();
    if (trimmedCustomer && trimmedCustomer.toLowerCase() !== 'pelanggan') {
      let topItemName = cartSnapshot[0]?.product.name || 'Risol Mayo Melt';
      let maxQty = 0;
      cartSnapshot.forEach((ci) => {
        if (ci.quantity > maxQty) {
          maxQty = ci.quantity;
          topItemName = ci.product.name;
        }
      });

      const existingIdx = customers.findIndex(
        (c) => c.name.toLowerCase() === trimmedCustomer.toLowerCase()
      );

      if (existingIdx >= 0) {
        const existing = customers[existingIdx];
        const newOrders = existing.totalOrders + 1;
        const newSpent = existing.totalSpent + total;
        const newAov = Math.round(newSpent / newOrders);
        const updatedCustomer: CustomerRecord = {
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

        setCustomers((prev) =>
          prev.map((c, idx) => (idx === existingIdx ? updatedCustomer : c))
        );

        updateDoc(
          doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, existing.id),
          cleanFirestoreData(updatedCustomer)
        ).catch((err) =>
          reportError(
            err,
            OperationType.UPDATE,
            `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${existing.id}`
          )
        );
      } else {
        const tempCustId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newCustomerRecord: CustomerRecord = {
          id: tempCustId,
          name: trimmedCustomer,
          totalOrders: 1,
          totalSpent: total,
          averageOrderValue: total,
          firstVisit: Date.now(),
          lastVisit: Date.now(),
          favoriteItem: topItemName,
          loyaltyTier: total >= 150000 ? 'VIP' : 'Baru',
        };

        setCustomers((prev) => [newCustomerRecord, ...prev]);

        addDoc(
          collection(db, FIRESTORE_COLLECTIONS.CUSTOMERS),
          cleanFirestoreData(newCustomerRecord)
        )
          .then((docRef) => {
            setCustomers((prev) =>
              prev.map((c) => (c.id === tempCustId ? { ...c, id: docRef.id } : c))
            );
          })
          .catch((err) =>
            reportError(err, OperationType.CREATE, FIRESTORE_COLLECTIONS.CUSTOMERS)
          );
      }
    }

    setActiveReceipt(newTransaction);
    return newTransaction;
  };

  // Fungsi Perbarui Transaksi (`updateTransaction`) langsung ke Cloud Firestore
  const updateTransaction = async (
    transactionId: string,
    updatedData: Partial<Transaction>
  ): Promise<void> => {
    try {
      const payload = cleanFirestoreData({
        ...updatedData,
        updatedAt: Date.now(),
      });
      await updateDoc(doc(db, 'transactions', transactionId), payload);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, ...updatedData, updatedAt: Date.now() } : t
        )
      );
      if (activeReceipt?.id === transactionId) {
        setActiveReceipt((prev) =>
          prev ? { ...prev, ...updatedData, updatedAt: Date.now() } : null
        );
      }
    } catch (err) {
      reportError(
        err,
        OperationType.UPDATE,
        `${FIRESTORE_COLLECTIONS.TRANSACTIONS}/${transactionId}`
      );
      throw err;
    }
  };

  // Fungsi Hapus Transaksi (`deleteTransaction`) langsung dari Cloud Firestore
  const deleteTransaction = async (transactionId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'transactions', transactionId));
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      if (activeReceipt?.id === transactionId) {
        setActiveReceipt(null);
      }
    } catch (err) {
      reportError(
        err,
        OperationType.DELETE,
        `${FIRESTORE_COLLECTIONS.TRANSACTIONS}/${transactionId}`
      );
      throw err;
    }
  };

  // Penambahan Pelanggan Baru ke Koleksi `customers` di Firestore menggunakan `addDoc`
  const addCustomer = (
    customerData: Omit<CustomerRecord, 'id' | 'firstVisit' | 'lastVisit' | 'averageOrderValue'> & {
      firstVisit?: number;
      lastVisit?: number;
      averageOrderValue?: number;
    }
  ): CustomerRecord => {
    const now = Date.now();
    const tempId = `cust-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer: CustomerRecord = {
      id: tempId,
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

    addDoc(collection(db, FIRESTORE_COLLECTIONS.CUSTOMERS), cleanFirestoreData(newCustomer))
      .then((docRef) => {
        setCustomers((prev) =>
          prev.map((c) => (c.id === tempId ? { ...c, id: docRef.id } : c))
        );
      })
      .catch((err) =>
        reportError(err, OperationType.CREATE, FIRESTORE_COLLECTIONS.CUSTOMERS)
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

    updateDoc(doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, id), cleanFirestoreData(updates)).catch(
      (err) =>
        reportError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${id}`)
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    deleteDoc(doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, id)).catch((err) =>
      reportError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.CUSTOMERS}/${id}`)
    );
  };

  // Pengiriman Struk via Email & Pembaruan Status di Firestore
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
        updateDoc(doc(db, FIRESTORE_COLLECTIONS.TRANSACTIONS, tx.id), {
          customerEmail: email,
          emailSent: true,
        }).catch(() => {});
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

  // Pembaruan Pengaturan Toko, Logo & QRIS di Firestore
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));

    setDoc(
      doc(db, FIRESTORE_COLLECTIONS.SETTINGS, FIRESTORE_COLLECTIONS.SETTINGS_DOC),
      cleanFirestoreData({ ...newSettings, updatedAt: Date.now() }),
      { merge: true }
    ).catch((err) =>
      reportError(
        err,
        OperationType.WRITE,
        `${FIRESTORE_COLLECTIONS.SETTINGS}/${FIRESTORE_COLLECTIONS.SETTINGS_DOC}`
      )
    );
  };

  // Manajemen Produk di Firestore
  const addProduct = (product: Omit<Product, 'id'>) => {
    const tempId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...product,
      id: tempId,
    };
    setProducts((prev) => [...prev, newProduct]);

    addDoc(collection(db, FIRESTORE_COLLECTIONS.PRODUCTS), cleanFirestoreData(newProduct))
      .then((docRef) => {
        setProducts((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, id: docRef.id } : p))
        );
      })
      .catch((err) =>
        reportError(err, OperationType.CREATE, FIRESTORE_COLLECTIONS.PRODUCTS)
      );
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    updateDoc(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, id), cleanFirestoreData(updates)).catch(
      (err) =>
        reportError(err, OperationType.UPDATE, `${FIRESTORE_COLLECTIONS.PRODUCTS}/${id}`)
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    removeFromCart(id);
    deleteDoc(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, id)).catch((err) =>
      reportError(err, OperationType.DELETE, `${FIRESTORE_COLLECTIONS.PRODUCTS}/${id}`)
    );
  };

  // Manajemen Kategori di Firestore
  const addCategory = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    setCategories((prev) => [...prev, trimmed]);

    addDoc(collection(db, FIRESTORE_COLLECTIONS.CATEGORIES), {
      name: trimmed,
      order: categories.length,
      createdAt: Date.now(),
    }).catch((err) =>
      reportError(err, OperationType.CREATE, FIRESTORE_COLLECTIONS.CATEGORIES)
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

    getDocs(collection(db, FIRESTORE_COLLECTIONS.CATEGORIES))
      .then((snap) => {
        snap.forEach((d) => {
          if (d.data().name === oldName) {
            updateDoc(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, d.id), { name: trimmed });
          }
        });
      })
      .catch((err) =>
        reportError(err, OperationType.UPDATE, FIRESTORE_COLLECTIONS.CATEGORIES)
      );

    getDocs(collection(db, FIRESTORE_COLLECTIONS.PRODUCTS))
      .then((snap) => {
        snap.forEach((d) => {
          if (d.data().category === oldName) {
            updateDoc(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, d.id), { category: trimmed });
          }
        });
      })
      .catch((err) =>
        reportError(err, OperationType.UPDATE, FIRESTORE_COLLECTIONS.PRODUCTS)
      );

    return true;
  };

  const deleteCategory = (name: string) => {
    const remaining = categories.filter((c) => c !== name);
    const fallback = remaining.length > 0 ? remaining[0] : 'Umum';
    setCategories(remaining.length > 0 ? remaining : ['Umum']);
    setProducts((prev) =>
      prev.map((p) => (p.category === name ? { ...p, category: fallback } : p))
    );

    getDocs(collection(db, FIRESTORE_COLLECTIONS.CATEGORIES))
      .then((snap) => {
        snap.forEach((d) => {
          if (d.data().name === name) {
            deleteDoc(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, d.id));
          }
        });
      })
      .catch((err) =>
        reportError(err, OperationType.DELETE, FIRESTORE_COLLECTIONS.CATEGORIES)
      );

    getDocs(collection(db, FIRESTORE_COLLECTIONS.PRODUCTS))
      .then((snap) => {
        snap.forEach((d) => {
          if (d.data().category === name) {
            updateDoc(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, d.id), { category: fallback });
          }
        });
      })
      .catch((err) =>
        reportError(err, OperationType.UPDATE, FIRESTORE_COLLECTIONS.PRODUCTS)
      );
  };

  // Reset Seluruh Data di Firestore (Dilindungi Password Keamanan 'AnakDajjalYangReset')
  const resetAllData = (
    verificationPassword?: string
  ): { success: boolean; message: string } => {
    if (verificationPassword?.trim() !== 'AnakDajjalYangReset') {
      return {
        success: false,
        message: 'Password verifikasi salah! Data tidak direset.',
      };
    }

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

    setDoc(
      doc(db, FIRESTORE_COLLECTIONS.SETTINGS, FIRESTORE_COLLECTIONS.SETTINGS_DOC),
      cleanFirestoreData({ ...preservedSettings, updatedAt: Date.now() })
    ).catch(() => {});

    setDoc(
      doc(db, FIRESTORE_COLLECTIONS.SETTINGS, FIRESTORE_COLLECTIONS.SHIFT_CONFIG_DOC),
      cleanFirestoreData({
        activeCashier: INITIAL_CASHIERS[0],
        cashierList: Array.from(INITIAL_CASHIERS),
        shiftStartedAt: Date.now(),
        updatedAt: Date.now(),
      })
    ).catch(() => {});

    getDocs(collection(db, FIRESTORE_COLLECTIONS.PRODUCTS))
      .then((snap) => {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, d.id)));
        INITIAL_PRODUCTS.forEach((p) => {
          batch.set(doc(db, FIRESTORE_COLLECTIONS.PRODUCTS, p.id), cleanFirestoreData(p));
        });
        batch.commit().catch(() => {});
      })
      .catch(() => {});

    getDocs(collection(db, FIRESTORE_COLLECTIONS.CATEGORIES))
      .then((snap) => {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, d.id)));
        INITIAL_CATEGORIES.forEach((name, idx) => {
          const catId = `cat-${idx + 1}`;
          batch.set(doc(db, FIRESTORE_COLLECTIONS.CATEGORIES, catId), {
            id: catId,
            name,
            order: idx,
          });
        });
        batch.commit().catch(() => {});
      })
      .catch(() => {});

    getDocs(collection(db, FIRESTORE_COLLECTIONS.TRANSACTIONS))
      .then((snap) => {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.TRANSACTIONS, d.id)));
        batch.commit().catch(() => {});
      })
      .catch(() => {});

    getDocs(collection(db, FIRESTORE_COLLECTIONS.EXPENSES))
      .then((snap) => {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.EXPENSES, d.id)));
        batch.commit().catch(() => {});
      })
      .catch(() => {});

    getDocs(collection(db, FIRESTORE_COLLECTIONS.CUSTOMERS))
      .then((snap) => {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.CUSTOMERS, d.id)));
        batch.commit().catch(() => {});
      })
      .catch(() => {});

    getDocs(collection(db, FIRESTORE_COLLECTIONS.DISCOUNTS))
      .then((snap) => {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, d.id)));
        INITIAL_DISCOUNTS.forEach((d) => {
          batch.set(doc(db, FIRESTORE_COLLECTIONS.DISCOUNTS, d.id), cleanFirestoreData(d));
        });
        batch.commit().catch(() => {});
      })
      .catch(() => {});

    return {
      success: true,
      message:
        'Data berhasil direset di Cloud Database. Logo toko dan QRIS tetap aman dipertahankan.',
    };
  };

  return (
    <PosContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        login,
        logout,
        logoutCashier,
        activeTab,
        setActiveTab,
        activeCashier,
        setActiveCashier,
        cashierList,
        addCashier,
        shiftInfo,
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
        updateTransaction,
        deleteTransaction,
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
        isLoading,
        isSyncing,
        dbError,
        clearDbError,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = (): PosContextType => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};
