import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  CASHIER_LIST,
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

  // Products catalog
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

  // Categories list
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

  // Transactions list
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

  // Persistent Transaction Sequence Counter (#RSL-XXXX)
  const [transactionSequence, setTransactionSequence] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SEQUENCE);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return INITIAL_TRANSACTION_SEQUENCE;
  });

  // Discounts Presets (CRUD)
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

  // Supplier Expenses (Belanja Bahan Supplier - Starts empty as requested by user)
  const [expenses, setExpenses] = useState<SupplierExpense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // If stored data contains the old mock items (#EXP-0001, etc.), clear them out as requested
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

  // Customer Directory (Starts empty as requested by user, supports add/edit/delete)
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // If stored data has old mock seeds (cust-seed), clear them out as requested
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

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('Pelanggan');
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedDiscountPresetId, setSelectedDiscountPresetId] = useState<string | undefined>(undefined);
  const [selectedDiscountPresetName, setSelectedDiscountPresetName] = useState<string | undefined>(undefined);

  // Active modal receipt
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTH, isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    try {
      if (settings.logoUrl) localStorage.setItem('risology_permanent_logo', settings.logoUrl);
      if (settings.qrisUrl) localStorage.setItem('risology_permanent_qris', settings.qrisUrl);
      if (settings.storeName) localStorage.setItem('risology_permanent_store_name', settings.storeName);
      if (settings.brandName) localStorage.setItem('risology_permanent_brand_name', settings.brandName);
    } catch (_) {}
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SEQUENCE, transactionSequence.toString());
  }, [transactionSequence]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DISCOUNTS, JSON.stringify(discounts));
  }, [discounts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  // Next transaction number representation (#RSL-0001, etc.)
  const nextTransactionNumber = formatTransactionNumber(transactionSequence);

  // Calculations
  const subtotal = calculateSubtotal(cart);
  const discountAmount = calculateDiscount(subtotal, discountType, discountValue);
  const total = calculateTotal(subtotal, discountAmount);

  // Auth actions
  // Supports (username, password) where username is one of cashiers (Harits, Rafi, Barra, Dimas, Akhyar)
  // and password is "RisoLogyKeren" (or fallback PIN "666666" / settings.pinCode).
  const login = (usernameOrPin: string, password?: string): boolean => {
    const trimmedInput = usernameOrPin.trim();

    // Two-parameter authentication: username + password
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

    // Single-parameter fallback (PIN or direct password)
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

  // Cart actions
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

  // Discount Presets CRUD
  const addDiscount = (discount: Omit<DiscountPreset, 'id'>) => {
    const newPreset: DiscountPreset = {
      ...discount,
      id: `disc-${Date.now()}`,
    };
    setDiscounts((prev) => [...prev, newPreset]);
  };

  const updateDiscount = (id: string, updates: Partial<DiscountPreset>) => {
    setDiscounts((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDiscount = (id: string) => {
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
    if (selectedDiscountPresetId === id) {
      applyDiscountPreset(null);
    }
  };

  // Supplier Expenses CRUD
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
    return newExp;
  };

  const updateExpense = (id: string, updates: Partial<SupplierExpense>) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp))
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
  };

  // Process checkout with persistent #RSL-XXXX
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

    // Prepend to transactions list so newest is first
    setTransactions((prev) => [newTransaction, ...prev]);

    // Deduct stock if tracked
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((ci) => ci.product.id === p.id);
        if (cartItem && typeof p.stockQuantity === 'number') {
          const newQty = Math.max(0, p.stockQuantity - cartItem.quantity);
          return { ...p, stockQuantity: newQty, inStock: newQty > 0 };
        }
        return p;
      })
    );

    // Increment persistent sequence
    setTransactionSequence((prev) => prev + 1);

    // Clear cart
    clearCart();

    // Automatically record or update customer in directory if customer name is provided
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

      setCustomers((prev) => {
        const existingIdx = prev.findIndex(
          (c) => c.name.toLowerCase() === trimmedCustomer.toLowerCase()
        );
        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const newOrders = existing.totalOrders + 1;
          const newSpent = existing.totalSpent + total;
          const newAov = Math.round(newSpent / newOrders);
          const updated: CustomerRecord = {
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
          const copy = [...prev];
          copy[existingIdx] = updated;
          return copy;
        } else {
          const newCust: CustomerRecord = {
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
          return [newCust, ...prev];
        }
      });
    }

    // Set as active receipt for receipt modal
    setActiveReceipt(newTransaction);

    return newTransaction;
  };

  // Customer Directory CRUD Actions
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
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  // Send receipt email via server endpoint
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

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    try {
      if (newSettings.logoUrl) localStorage.setItem('risology_permanent_logo', newSettings.logoUrl);
      if (newSettings.qrisUrl) localStorage.setItem('risology_permanent_qris', newSettings.qrisUrl);
      if (newSettings.storeName) localStorage.setItem('risology_permanent_store_name', newSettings.storeName);
      if (newSettings.brandName) localStorage.setItem('risology_permanent_brand_name', newSettings.brandName);
    } catch (_) {}
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [...prev, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    removeFromCart(id);
  };

  const addCategory = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return false;
    }
    setCategories((prev) => [...prev, trimmed]);
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
    return true;
  };

  const deleteCategory = (name: string) => {
    const remaining = categories.filter((c) => c !== name);
    if (remaining.length === 0) {
      setCategories(['Umum']);
      setProducts((prev) =>
        prev.map((p) => (p.category === name ? { ...p, category: 'Umum' } : p))
      );
      return;
    }
    setCategories(remaining);
    const fallback = remaining[0];
    setProducts((prev) =>
      prev.map((p) => (p.category === name ? { ...p, category: fallback } : p))
    );
  };

  // Reset Data Awal: Requires security password 'AnakDajjalYangReset'
  // Strictly protects logo and QRIS image so they are NEVER wiped out
  const resetAllData = (
    verificationPassword?: string
  ): { success: boolean; message: string } => {
    if (verificationPassword?.trim() !== 'AnakDajjalYangReset') {
      return {
        success: false,
        message: 'Password verifikasi salah! Data tidak direset.',
      };
    }

    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);

    // Retain custom uploaded logo, QRIS image, and store identity on reset
    setSettings((prev) => {
      const preserved: StoreSettings = {
        ...INITIAL_STORE_SETTINGS,
        logoUrl: prev.logoUrl || INITIAL_STORE_SETTINGS.logoUrl,
        qrisUrl: prev.qrisUrl || INITIAL_STORE_SETTINGS.qrisUrl,
        storeName: prev.storeName || INITIAL_STORE_SETTINGS.storeName,
        brandName: prev.brandName || INITIAL_STORE_SETTINGS.brandName,
      };

      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(preserved));
        if (preserved.logoUrl) localStorage.setItem('risology_permanent_logo', preserved.logoUrl);
        if (preserved.qrisUrl) localStorage.setItem('risology_permanent_qris', preserved.qrisUrl);
        if (preserved.storeName) localStorage.setItem('risology_permanent_store_name', preserved.storeName);
        if (preserved.brandName) localStorage.setItem('risology_permanent_brand_name', preserved.brandName);
      } catch (err) {
        console.error('Failed to preserve brand settings', err);
      }

      return preserved;
    });

    setTransactions(INITIAL_TRANSACTIONS);
    setTransactionSequence(INITIAL_TRANSACTION_SEQUENCE);
    setDiscounts(INITIAL_DISCOUNTS);
    setExpenses(INITIAL_EXPENSES);
    setCustomers(INITIAL_CUSTOMERS);
    setActiveCashier(INITIAL_CASHIERS[0]);
    clearCart();

    return {
      success: true,
      message: 'Data berhasil direset. Logo toko dan QRIS tetap aman dipertahankan.',
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
