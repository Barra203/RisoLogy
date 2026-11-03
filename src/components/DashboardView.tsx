import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { SupplierExpense } from '../types/pos';
import {
  formatCurrency,
  formatDateTime,
  generateStockCsv,
  generateItemSalesCsv,
  generateCustomersCsv,
  generateFinancialReportCsv,
  generateExpensesCsv,
  generateTransactionsLedgerCsv,
  StockExportRow,
  ItemSalesExportRow,
  CustomerExportRow,
  FinancialExportRow,
  ExpenseExportRow,
  TransactionDetailExportRow,
} from '../utils/pos-logic';
import {
  LayoutDashboard,
  Receipt,
  CheckCircle2,
  TrendingUp,
  Award,
  Wallet,
  ShoppingBag,
  Users,
  Percent,
  Package,
  Truck,
  FileSpreadsheet,
  Download,
  UserCheck,
  ShoppingCart,
  ArrowRight,
  Coins,
  Landmark,
  Edit2,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { RisolIcon } from './RisolIcon';

// Helper pembaca nominal pengeluaran bahan baku secara aman dari berbagai kemungkinan nama properti
const getExpenseNominal = (item: SupplierExpense): number => {
  const nominal =
    item.totalBelanja ??
    item.total ??
    item.amount ??
    item.totalPrice ??
    Number(item.quantity || 0) * Number(item.unitPrice || 0);
  return Number(nominal) || 0;
};

// Helper konversi tanggal pengeluaran (`YYYY-MM-DD` atau `timestamp`) ke milidetik
const getExpenseTimestamp = (item: SupplierExpense): number => {
  if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
    const [y, m, d] = item.date.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0).getTime();
  }
  return item.timestamp || 0;
};

export const DashboardView: React.FC = () => {
  const {
    transactions,
    products,
    expenses,
    customers,
    activeCashier,
    setActiveCashier,
    cashierList,
    setActiveTab,
    cart,
    subtotal,
    customerName,
    discounts,
    settings,
    updateInitialCapital,
    setActiveBatch,
    addBatch,
  } = usePos();

  // State Filter Batch & Tambah Batch Baru di Dashboard
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [isAddingBatch, setIsAddingBatch] = useState<boolean>(false);
  const [newBatchInput, setNewBatchInput] = useState<string>('');

  const availableBatches = useMemo(() => {
    const set = new Set<string>(settings.availableBatches || ['Batch 1', 'Batch 2']);
    if (settings.activeBatch) set.add(settings.activeBatch);
    transactions.forEach((tx) => {
      if (tx.batch) set.add(tx.batch);
    });
    expenses.forEach((exp) => {
      if (exp.batch) set.add(exp.batch);
    });
    return Array.from(set);
  }, [settings.availableBatches, settings.activeBatch, transactions, expenses]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newBatchInput.trim();
    if (!cleaned) return;
    await addBatch(cleaned);
    setSelectedBatch(cleaned);
    setNewBatchInput('');
    setIsAddingBatch(false);
  };

  // State Modal Awal Quick Edit Modal di Dashboard
  const [showCapitalModal, setShowCapitalModal] = useState<boolean>(false);
  const [modalAmount, setModalAmount] = useState<string>(
    String(settings.initialCapital ?? 500000)
  );
  const [modalSource, setModalSource] = useState<string>(
    settings.capitalSource || 'Modal Kelompok / Mandiri'
  );
  const [modalDate, setModalDate] = useState<string>(
    settings.capitalDate || new Date().toISOString().split('T')[0]
  );
  const [capitalFeedback, setCapitalFeedback] = useState<string>('');

  const handleOpenCapitalModal = () => {
    setModalAmount(String(settings.initialCapital ?? 500000));
    setModalSource(settings.capitalSource || 'Modal Kelompok / Mandiri');
    setModalDate(settings.capitalDate || new Date().toISOString().split('T')[0]);
    setShowCapitalModal(true);
  };

  const handleSaveModalCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Math.max(0, parseInt(modalAmount.replace(/\D/g, ''), 10) || 0);
    await updateInitialCapital(cleanAmount, modalSource, modalDate);
    setCapitalFeedback('Modal awal berhasil diperbarui!');
    setTimeout(() => {
      setCapitalFeedback('');
      setShowCapitalModal(false);
    }, 800);
  };

  // Default ke 'all' agar seluruh akumulasi transaksi dan belanja bahan langsung tampil sinkron
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string>('');

  // Helper for 1-click CSV download
  const triggerDownload = (fileName: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccessMsg(`Berhasil mengunduh: ${fileName}`);
    setTimeout(() => setDownloadSuccessMsg(''), 3000);
  };

  // Filter transactions according to selectedBatch & selected time range
  const filteredTransactions = useMemo(() => {
    const batchFiltered =
      selectedBatch === 'ALL'
        ? transactions
        : transactions.filter((t) => (t.batch || 'Batch 1') === selectedBatch);

    if (timeRange === 'all') return batchFiltered;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 86400000;
    const thirtyDaysAgo = startOfToday - 30 * 86400000;

    return batchFiltered.filter((tx) => {
      const txDateObj = new Date(tx.timestamp);
      const txDateStr = `${txDateObj.getFullYear()}-${String(txDateObj.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(txDateObj.getDate()).padStart(2, '0')}`;

      if (timeRange === 'today') return txDateStr === todayStr || tx.timestamp >= startOfToday;
      if (timeRange === '7days') return tx.timestamp >= sevenDaysAgo;
      if (timeRange === '30days') return tx.timestamp >= thirtyDaysAgo;
      return true;
    });
  }, [transactions, timeRange, selectedBatch]);

  // Filter expenses according to selectedBatch & selected time range
  const filteredExpenses = useMemo(() => {
    const batchFiltered =
      selectedBatch === 'ALL'
        ? expenses
        : expenses.filter((e) => (e.batch || 'Batch 1') === selectedBatch);

    if (timeRange === 'all') return batchFiltered;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 86400000;
    const thirtyDaysAgo = startOfToday - 30 * 86400000;

    const matched = batchFiltered.filter((exp) => {
      const expTime = getExpenseTimestamp(exp);
      if (timeRange === 'today') return exp.date === todayStr || expTime >= startOfToday;
      if (timeRange === '7days') return expTime >= sevenDaysAgo;
      if (timeRange === '30days') return expTime >= thirtyDaysAgo;
      return true;
    });

    // Jika pada filter tanggal tertentu tidak ada nota belanja hari itu padahal data belanja bahan batch tersebut ada,
    // tampilkan akumulasi data belanja bahan pada batch tersebut agar tidak menampilkan Rp 0 saat Semua Batch aktif
    if (selectedBatch !== 'ALL') return matched;
    return matched.length > 0 ? matched : batchFiltered;
  }, [expenses, timeRange, selectedBatch]);

  // Perbandingan Ringkasan Per-Batch untuk Presentasi Dosen
  const batchComparisonList = useMemo(() => {
    return availableBatches.map((batchName) => {
      const batchTxs = transactions.filter(
        (t) =>
          (t.batch || 'Batch 1') === batchName &&
          (t.status === 'PAID' || t.status === 'Lunas')
      );
      const batchExps = expenses.filter((e) => (e.batch || 'Batch 1') === batchName);
      const omzetBatch = batchTxs.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      const belanjaBatch = batchExps.reduce((sum, e) => sum + getExpenseNominal(e), 0);
      const labaBersihBatch = omzetBatch - belanjaBatch;
      return {
        batchName,
        omzetBatch,
        belanjaBatch,
        labaBersihBatch,
        orderCount: batchTxs.length,
        expenseCount: batchExps.length,
      };
    });
  }, [availableBatches, transactions, expenses]);

  // Kalkulasi Total & Jumlah Nota Belanja Bahan
  const totalBelanjaBahan = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => {
      const nominal = item.totalBelanja || item.total || item.amount || item.totalPrice || 0;
      return sum + Number(nominal);
    }, 0);
  }, [filteredExpenses]);

  const totalNotaBelanja = filteredExpenses.length;

  // Aggregate Metrics across ALL pages
  const metrics = useMemo(() => {
    // Hanya hitung transaksi yang benar-benar sudah LUNAS (PAID) untuk metrik Omzet & Penjualan
    const paidTransactions = filteredTransactions.filter(
      (t) => t.status === 'PAID' || t.status === 'Lunas'
    );

    const totalOmzet = paidTransactions.reduce(
      (sum, t) => sum + (Number(t.total) || 0),
      0
    );

    // Hitung jumlah transaksi yang masih gantung ("Belum Bayar") untuk ditampilkan di sub-info kartu jika diperlukan
    const unpaidTransactions = filteredTransactions.filter(
      (t) => t.status === 'UNPAID' || t.status === 'Belum Bayar'
    );

    const refundedList = filteredTransactions.filter(
      (t) => t.status === 'REFUNDED' || t.status === 'Refund'
    );

    // 1. Transactions & POS metrics
    const totalTransactions = filteredTransactions.length;
    const successfulTransactions = paidTransactions.length;
    const unpaidCount = unpaidTransactions.length;
    const unpaidAmount = unpaidTransactions.reduce(
      (sum, t) => sum + (Number(t.total) || 0),
      0
    );
    const refundedTransactions = refundedList.length;
    const successRate =
      totalTransactions > 0 ? Math.round((successfulTransactions / totalTransactions) * 100) : 100;

    const grossSales = paidTransactions.reduce(
      (acc, t) => acc + (Number(t.subtotal) || 0),
      0
    );
    const totalDiscount = paidTransactions.reduce(
      (acc, t) => acc + (Number(t.discountAmount) || 0),
      0
    );
    const netSales = totalOmzet;
    const totalExpenses = totalBelanjaBahan;
    const estimatedNetProfit = netSales - totalExpenses;
    const profitMargin = netSales > 0 ? Math.round((estimatedNetProfit / netSales) * 100) : 0;

    const cashSales = paidTransactions
      .filter((t) => t.paymentMethod === 'CASH')
      .reduce((acc, t) => acc + (Number(t.total) || 0), 0);
    const cashCount = paidTransactions.filter((t) => t.paymentMethod === 'CASH').length;

    const qrisSales = paidTransactions
      .filter((t) => t.paymentMethod === 'QRIS')
      .reduce((acc, t) => acc + (Number(t.total) || 0), 0);
    const qrisCount = paidTransactions.filter((t) => t.paymentMethod === 'QRIS').length;

    const avgTicket =
      successfulTransactions > 0 ? Math.round(netSales / successfulTransactions) : 0;

    // 2. Best Sellers & Item Sales
    const itemMap = new Map<
      string,
      { id: string; name: string; category: string; qty: number; gross: number; net: number }
    >();
    paidTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const existing = itemMap.get(item.name) || {
          id: item.productId,
          name: item.name,
          category: item.category,
          qty: 0,
          gross: 0,
          net: 0,
        };
        existing.qty += item.quantity;
        existing.gross += item.subtotal;
        const itemDiscountRatio = tx.subtotal > 0 ? item.subtotal / tx.subtotal : 0;
        existing.net += Math.round(item.subtotal - tx.discountAmount * itemDiscountRatio);
        itemMap.set(item.name, existing);
      });
    });

    const bestSellers = Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty);
    const totalQtySold = bestSellers.reduce((acc, i) => acc + i.qty, 0);

    // 3. Products & Stock Inventory metrics
    const totalProductsCount = products.length;
    const totalStockUnits = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
    const estimatedStockValuation = products.reduce(
      (acc, p) => acc + (p.stockQuantity || 0) * (p.unitCost || p.price * 0.5),
      0
    );
    const lowStockProducts = products.filter((p) => (p.stockQuantity || 0) <= 30);

    // 4. Customer Directory metrics
    const totalCustomersCount = customers.length;
    const vipCustomersCount = customers.filter((c) => c.loyaltyTier === 'VIP').length;
    const regularCustomersCount = customers.filter((c) => c.loyaltyTier === 'Reguler').length;
    const newCustomersCount = customers.filter((c) => c.loyaltyTier === 'Baru').length;
    const totalCustomerLtv = customers.reduce((acc, c) => acc + c.totalSpent, 0);
    const avgCustomerLtv =
      totalCustomersCount > 0 ? Math.round(totalCustomerLtv / totalCustomersCount) : 0;
    const topLoyalCustomers = [...customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 4);

    // 5. Supplier Expenses breakdown
    const totalExpenseCount = totalNotaBelanja;
    const expenseCategoryMap: Record<string, number> = {};
    filteredExpenses.forEach((exp) => {
      const nom = getExpenseNominal(exp);
      expenseCategoryMap[exp.category] = (expenseCategoryMap[exp.category] || 0) + nom;
    });

    // 6. Cashier Performance breakdown (hanya menghitung transaksi yang sudah PAID / Lunas)
    const cashierPerf: Record<string, { count: number; total: number; avg: number }> = {};
    cashierList.forEach((c) => {
      cashierPerf[c] = { count: 0, total: 0, avg: 0 };
    });
    paidTransactions.forEach((tx) => {
      const cName = tx.cashierName || 'Harits';
      if (!cashierPerf[cName]) {
        cashierPerf[cName] = { count: 0, total: 0, avg: 0 };
      }
      cashierPerf[cName].count += 1;
      cashierPerf[cName].total += Number(tx.total) || 0;
    });
    Object.keys(cashierPerf).forEach((cName) => {
      const data = cashierPerf[cName];
      data.avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
    });

    // 7. Recent Transactions (last 4)
    const recentTransactions = [...filteredTransactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 4);

    // 8. Recent Supplier Expenses (last 4)
    const recentExpenses = [...filteredExpenses]
      .sort((a, b) => getExpenseTimestamp(b) - getExpenseTimestamp(a))
      .slice(0, 4);

    return {
      totalTransactions,
      successfulTransactions,
      unpaidCount,
      unpaidAmount,
      refundedTransactions,
      successRate,
      grossSales,
      totalDiscount,
      netSales,
      totalOmzet,
      totalExpenses,
      estimatedNetProfit,
      profitMargin,
      cashSales,
      cashCount,
      qrisSales,
      qrisCount,
      avgTicket,
      bestSellers,
      totalQtySold,
      totalProductsCount,
      totalStockUnits,
      estimatedStockValuation,
      lowStockProducts,
      totalCustomersCount,
      vipCustomersCount,
      regularCustomersCount,
      newCustomersCount,
      avgCustomerLtv,
      topLoyalCustomers,
      totalExpenseCount,
      expenseCategoryMap,
      cashierPerf,
      recentTransactions,
      recentExpenses,
    };
  }, [
    filteredTransactions,
    filteredExpenses,
    totalBelanjaBahan,
    totalNotaBelanja,
    products,
    customers,
    cashierList,
  ]);

  // Hourly or Daily Trend Data for Chart (hanya transaksi PAID / Lunas)
  const trendData = useMemo(() => {
    const isPaidStatus = (s?: string) => s === 'PAID' || s === 'Lunas';
    if (timeRange === 'today') {
      const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      return hours.map((hourLabel) => {
        const targetHour = parseInt(hourLabel.split(':')[0], 10);
        let amount = 0;
        let count = 0;
        filteredTransactions.forEach((tx) => {
          if (!isPaidStatus(tx.status)) return;
          const d = new Date(tx.timestamp);
          if (Math.abs(d.getHours() - targetHour) <= 1) {
            amount += Number(tx.total) || 0;
            count += 1;
          }
        });
        return { label: hourLabel, amount, count };
      });
    } else {
      const days = ['H-6', 'H-5', 'H-4', 'H-3', 'H-2', 'Kemarin', 'Hari Ini'];
      return days.map((dayLabel, idx) => {
        const offset = 6 - idx;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - offset);
        const dayStr = targetDate.toISOString().split('T')[0];

        let amount = 0;
        let count = 0;
        filteredTransactions.forEach((tx) => {
          if (!isPaidStatus(tx.status)) return;
          const txDay = new Date(tx.timestamp).toISOString().split('T')[0];
          if (txDay === dayStr) {
            amount += Number(tx.total) || 0;
            count += 1;
          }
        });
        return { label: dayLabel, amount, count };
      });
    }
  }, [filteredTransactions, timeRange]);

  const maxTrendAmount = Math.max(...trendData.map((d) => d.amount), 0);

  // Quick export handlers
  const handleExportStock = () => {
    const rows: StockExportRow[] = products.map((p) => {
      const qty = p.stockQuantity ?? 0;
      const unitCost = p.unitCost ?? Math.round(p.price * 0.45);
      return {
        productId: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stockQuantity: qty,
        status: qty === 0 ? 'Habis' : qty <= 15 ? 'Menipis' : 'Tersedia',
        unitCost,
        stockValue: qty * unitCost,
      };
    });
    triggerDownload(
      `RisoLogy_1_Rincian_Stok_${new Date().toISOString().split('T')[0]}.csv`,
      generateStockCsv(rows)
    );
  };

  const handleExportItemSales = () => {
    const rows: ItemSalesExportRow[] = products
      .map((p) => {
        const found = metrics.bestSellers.find((b) => b.id === p.id || b.name === p.name);
        const qty = found ? found.qty : 0;
        const gross = found ? found.gross : 0;
        const net = found ? found.net : 0;
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          totalQtySold: qty,
          grossSales: gross,
          netSales: net,
          salesSharePercent: metrics.totalQtySold > 0 ? (qty / metrics.totalQtySold) * 100 : 0,
        };
      })
      .sort((a, b) => b.totalQtySold - a.totalQtySold);
    triggerDownload(`RisoLogy_2_Jumlah_Pembelian_${timeRange}.csv`, generateItemSalesCsv(rows));
  };

  const handleExportCustomers = () => {
    const rows: CustomerExportRow[] = customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
      averageOrderValue: c.averageOrderValue,
      lastVisit: formatDateTime(c.lastVisit).date,
      favoriteItem: c.favoriteItem,
      tier: c.loyaltyTier,
    }));
    triggerDownload(
      `RisoLogy_3_Data_Pelanggan_${new Date().toISOString().split('T')[0]}.csv`,
      generateCustomersCsv(rows)
    );
  };

  const handleExportFinancial = () => {
    const rows: FinancialExportRow[] = [
      {
        date: formatDateTime(Date.now()).date,
        totalTransactions: metrics.totalTransactions,
        grossSales: metrics.grossSales,
        discounts: metrics.totalDiscount,
        netSales: metrics.netSales,
        supplierExpenses: metrics.totalExpenses,
        netProfit: metrics.estimatedNetProfit,
        cashSales: metrics.cashSales,
        qrisSales: metrics.qrisSales,
      },
    ];
    triggerDownload(
      `RisoLogy_4_Rincian_Keuangan_${timeRange}.csv`,
      generateFinancialReportCsv(rows)
    );
  };

  const handleExportExpenses = () => {
    const rows: ExpenseExportRow[] = filteredExpenses.map((exp) => {
      const nominal = getExpenseNominal(exp);
      return {
        expenseNumber: exp.expenseNumber,
        date: exp.date,
        itemName: exp.itemName || exp.name || 'Belanja Bahan',
        category: exp.category,
        quantity: exp.quantity ?? 1,
        unit: exp.unit ?? 'paket',
        unitPrice: exp.unitPrice ?? nominal,
        totalPrice: nominal,
        supplierName: exp.supplierName || exp.supplier || '-',
        supplierLocation: exp.supplierLocation || '-',
        cashierName: exp.cashierName || exp.cashier || 'Kasir',
        notes: exp.notes,
      };
    });
    triggerDownload(
      `RisoLogy_5_Pengeluaran_Bahan_${timeRange}.csv`,
      generateExpensesCsv(rows)
    );
  };

  const handleExportTransactions = () => {
    const rows: TransactionDetailExportRow[] = filteredTransactions.map((tx) => ({
      transactionNumber: tx.transactionNumber,
      dateTime: formatDateTime(tx.timestamp).full,
      cashierName: tx.cashierName || 'Harits',
      customerName: tx.customerName,
      itemsSummary: tx.items.map((i) => `${i.name} (${i.quantity}x)`).join('; '),
      subtotal: tx.subtotal,
      discountAmount: tx.discountAmount,
      total: tx.total,
      paymentMethod: tx.paymentMethod,
      status: tx.status,
    }));
    triggerDownload(
      `RisoLogy_6_Rincian_Transaksi_${timeRange}.csv`,
      generateTransactionsLedgerCsv(rows)
    );
  };

  // Metrik Keuangan Terpadu & Rekonsiliasi Kas (Untuk Presentasi Dosen / Tim)
  const initialCapital = Number(settings.initialCapital ?? 500000);
  const capitalSource = settings.capitalSource || 'Modal Kelompok / Mandiri';
  const capitalDate = settings.capitalDate || '';

  const netSales = metrics.netSales; // Total omzet penjualan lunas (PAID)
  const totalExpenses = totalBelanjaBahan; // Total beban belanja bahan
  const estimatedNetProfit = netSales - totalExpenses; // Estimasi laba/rugi operasional
  const cashOnHand = initialCapital + netSales - totalExpenses; // Posisi kas riil di tangan

  const capitalAbsorption =
    initialCapital > 0 ? ((totalExpenses / initialCapital) * 100).toFixed(1) : '0';
  const roiPercentage =
    initialCapital > 0 ? ((estimatedNetProfit / initialCapital) * 100).toFixed(1) : '0';
  const isBepReached = netSales >= totalExpenses;
  const bepShortfall = Math.max(0, totalExpenses - netSales);

  return (
    <div className="flex-1 flex flex-col min-h-screen w-full bg-slate-50">
      {/* Top Header */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 shrink-0 space-y-3 w-full overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Operasional
            </h1>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-mono font-bold uppercase">
              {selectedBatch === 'ALL' ? 'Semua Batch' : selectedBatch}
            </span>
          </div>

          {/* Time range selector & Active Shift badge */}
          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1 bg-slate-100 p-1 border border-slate-200 rounded-xl shrink-0">
              {(['today', '7days', '30days', 'all'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                    timeRange === r
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                      : 'text-slate-700 hover:text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {r === 'today'
                    ? 'Hari Ini'
                    : r === '7days'
                    ? '7 Hari'
                    : r === '30days'
                    ? '30 Hari'
                    : 'Semua'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Shift: {activeCashier}</span>
            </div>
          </div>
        </div>

        {/* BARIS FILTER BATCH HORIZONTAL (Ramah Jempol Mobile: overflow-x-auto no-scrollbar) */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="overflow-x-auto no-scrollbar flex items-center gap-2 py-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Filter Batch:
            </span>
            <button
              type="button"
              onClick={() => setSelectedBatch('ALL')}
              className={`touch-manipulation px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-all shrink-0 whitespace-nowrap ${
                selectedBatch === 'ALL'
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800 border border-slate-200'
              }`}
            >
              Semua Batch
            </button>
            {availableBatches.map((batchName) => (
              <button
                key={batchName}
                type="button"
                onClick={() => setSelectedBatch(batchName)}
                className={`touch-manipulation px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  selectedBatch === batchName
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800 border border-slate-200'
                }`}
              >
                <span>{batchName}</span>
                {settings.activeBatch === batchName && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase ${
                      selectedBatch === batchName
                        ? 'bg-white/25 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Aktif
                  </span>
                )}
              </button>
            ))}

            {!isAddingBatch ? (
              <button
                type="button"
                onClick={() => setIsAddingBatch(true)}
                className="touch-manipulation px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 border-dashed rounded-xl cursor-pointer transition-colors shrink-0 whitespace-nowrap"
              >
                + Tambah Batch
              </button>
            ) : (
              <form onSubmit={handleCreateBatch} className="inline-flex items-center gap-1.5 shrink-0">
                <input
                  type="text"
                  placeholder="Cth: Batch 3"
                  value={newBatchInput}
                  onChange={(e) => setNewBatchInput(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-white border border-amber-400 rounded-lg focus:outline-none w-28 font-semibold text-slate-900"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBatch(false);
                    setNewBatchInput('');
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
              </form>
            )}
          </div>

          {/* Quick Selector Batch Aktif untuk Kasir/Belanja */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs shrink-0">
            <span className="text-[11px] font-semibold text-slate-500">
              Batch Input Aktif:
            </span>
            <select
              value={settings.activeBatch || 'Batch 1'}
              onChange={(e) => setActiveBatch(e.target.value)}
              className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold cursor-pointer focus:outline-none focus:border-amber-500"
            >
              {availableBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Download notification banner */}
        {downloadSuccessMsg && (
          <div className="mt-3 p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{downloadSuccessMsg}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area (Natural vertical scroll without nested overflow traps) */}
      <div className="flex-1 w-full p-4 sm:p-6 space-y-6">
        {/* ROW 1: REAL-TIME OVERVIEW & POS CART ALERT */}
        {cart.length > 0 && (
          <div className="w-full overflow-hidden p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 text-white rounded-lg flex items-center justify-center shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  Pesanan Sedang Berlangsung di Kasir (POS)
                </span>
                <p className="text-xs text-slate-800 font-medium">
                  Pelanggan: <strong className="text-slate-900">{customerName}</strong> •{' '}
                  {cart.length} item ({cart.reduce((a, b) => a + b.quantity, 0)} porsi) di keranjang
                  kasir
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="font-mono text-base font-bold text-emerald-700">
                {formatCurrency(subtotal)}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Lanjutkan Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ROW 1.5: REKAPITULASI & PERBANDINGAN KEUANGAN PER-BATCH PRODUKSI */}
        <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2 flex-wrap">
              <span>Rekapitulasi &amp; Perbandingan Keuangan Per-Batch Produksi</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-mono">
                Filter: {selectedBatch === 'ALL' ? 'Semua Batch Digabung' : selectedBatch}
              </span>
            </h2>
            {selectedBatch !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedBatch('ALL')}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg cursor-pointer self-start sm:self-auto"
              >
                Tampilkan Semua Batch
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {batchComparisonList.map((bItem) => {
              const isSelected = selectedBatch === bItem.batchName;
              const isActiveBatch = settings.activeBatch === bItem.batchName;
              return (
                <div
                  key={bItem.batchName}
                  onClick={() =>
                    setSelectedBatch(isSelected ? 'ALL' : bItem.batchName)
                  }
                  className={`w-full overflow-hidden rounded-2xl border p-4 shadow-sm space-y-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/70 border-2 border-amber-500 ring-2 ring-amber-500/15'
                      : 'bg-white hover:border-amber-300 border-slate-200/80'
                  }`}
                >
                  {/* Header Kartu Batch: Nama Batch, Status (Aktif/Selesai), & Jumlah Order/Belanja */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-extrabold text-sm text-slate-900 truncate">
                        {bItem.batchName}
                      </span>
                      {isActiveBatch ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase rounded-full shrink-0">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold uppercase rounded-full shrink-0">
                          Selesai
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0">
                      {bItem.orderCount} Order • {bItem.expenseCount} Belanja
                    </span>
                  </div>

                  {/* Ringkasan Esensial Vertikal/Grid Bersih */}
                  <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-100 text-xs">
                    <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                        Omzet
                      </span>
                      <span className="font-mono font-extrabold text-emerald-700 text-xs sm:text-sm tabular-nums block mt-0.5">
                        {formatCurrency(bItem.omzetBatch)}
                      </span>
                    </div>
                    <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-2">
                      <span className="text-[10px] font-bold text-rose-800 uppercase block">
                        Belanja
                      </span>
                      <span className="font-mono font-extrabold text-rose-600 text-xs sm:text-sm tabular-nums block mt-0.5">
                        {formatCurrency(bItem.belanjaBatch)}
                      </span>
                    </div>
                    <div
                      className={`rounded-xl p-2 border ${
                        bItem.labaBersihBatch >= 0
                          ? 'bg-teal-50/70 border-teal-200'
                          : 'bg-rose-50/70 border-rose-200'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold uppercase block ${
                          bItem.labaBersihBatch >= 0 ? 'text-teal-800' : 'text-rose-800'
                        }`}
                      >
                        Laba Bersih
                      </span>
                      <span
                        className={`font-mono font-extrabold text-xs sm:text-sm tabular-nums block mt-0.5 ${
                          bItem.labaBersihBatch >= 0 ? 'text-teal-700' : 'text-rose-600'
                        }`}
                      >
                        {bItem.labaBersihBatch >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(bItem.labaBersihBatch))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROW 2: PRIMARY FINANCIAL & CAPITAL RECONCILIATION KPI CARDS (5 CARDS ESENSIAL PRESENTASI DOSEN) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 w-full">
          {/* Card 1: Modal Awal Usaha */}
          <div className="w-full overflow-hidden p-4 bg-white border border-amber-200 rounded-2xl shadow-xs relative flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  1. Modal Awal Usaha
                </span>
                <button
                  type="button"
                  onClick={handleOpenCapitalModal}
                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Atur / Ubah Modal Awal"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  <span>Atur</span>
                </button>
              </div>
              <div className="font-mono text-2xl font-extrabold text-amber-900 tabular-nums">
                {formatCurrency(initialCapital)}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-amber-100 text-[11px] text-slate-600 flex flex-col gap-0.5">
              <span className="truncate font-medium" title={capitalSource}>
                Sumber: <strong className="text-slate-800">{capitalSource}</strong>
              </span>
              <span className="text-slate-600 text-[10px]">
                {capitalDate ? `Tgl: ${capitalDate}` : 'Kas Modal Awal'}
              </span>
            </div>
          </div>

          {/* Card 2: Belanja Bahan (Pengeluaran Beban) */}
          <div className="w-full overflow-hidden p-4 bg-white border border-rose-200 rounded-2xl shadow-xs relative flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                  2. Belanja Bahan
                </span>
                <ShoppingBag className="w-4 h-4 text-rose-500" />
              </div>
              <div className="font-mono text-2xl font-extrabold text-rose-600 tabular-nums">
                - {formatCurrency(totalExpenses)}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-rose-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>{totalNotaBelanja} Nota Belanja</span>
              <span className="font-bold text-rose-700 font-mono text-[10px]">
                {capitalAbsorption}% Modal
              </span>
            </div>
          </div>

          {/* Card 3: Omzet Penjualan (Pemasukan Kasir) */}
          <div className="w-full overflow-hidden p-4 bg-white border border-emerald-200 rounded-2xl shadow-xs relative flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  3. Omzet Penjualan
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="font-mono text-2xl font-extrabold text-emerald-700 tabular-nums">
                + {formatCurrency(netSales)}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-emerald-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>{metrics.successfulTransactions} Order Lunas</span>
              <span className="font-bold text-emerald-800 font-mono text-[10px]">
                {metrics.profitMargin}% Margin
              </span>
            </div>
          </div>

          {/* Card 4: Estimasi Laba Bersih & ROI */}
          <div className="w-full overflow-hidden p-4 bg-white border border-teal-200 rounded-2xl shadow-xs relative flex flex-col justify-between">
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                estimatedNetProfit >= 0 ? 'bg-teal-600' : 'bg-rose-500'
              }`}
            />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                  4. Est. Laba Bersih
                </span>
                <Award className="w-4 h-4 text-teal-600" />
              </div>
              <div
                className={`font-mono text-2xl font-extrabold tabular-nums ${
                  estimatedNetProfit >= 0 ? 'text-teal-700' : 'text-rose-600'
                }`}
              >
                {estimatedNetProfit >= 0 ? '+' : '-'} {formatCurrency(Math.abs(estimatedNetProfit))}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-teal-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>ROI Modal:</span>
              <span
                className={`font-bold font-mono text-[10px] ${
                  Number(roiPercentage) >= 0 ? 'text-teal-700' : 'text-rose-600'
                }`}
              >
                {roiPercentage}% ROI
              </span>
            </div>
          </div>

          {/* Card 5: Sisa Kas Toko (Cash on Hand) */}
          <div className="w-full overflow-hidden p-4 bg-amber-50 border-2 border-amber-400 rounded-xl shadow-xs relative flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-600" />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
                  5. Sisa Kas (Cash on Hand)
                </span>
                <Wallet className="w-4 h-4 text-amber-700" />
              </div>
              <div className="font-mono text-2xl sm:text-[25px] font-extrabold text-amber-800 tabular-nums leading-tight">
                {formatCurrency(cashOnHand)}
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-amber-200/80 text-[10px] text-amber-900 font-semibold flex items-center justify-between">
              <span>Kas Nyata di Tangan</span>
              <span className="font-mono text-[9px] text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                [Modal + Omzet - Belanja]
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2.5: TRANSPARANSI ARUS KAS PROYEK (CASHFLOW STATEMENT) & BEP STATUS */}
        <div className="w-full overflow-hidden p-4 sm:p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2 flex-wrap">
                <span>Transparansi Arus Kas Proyek (Cashflow Statement)</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                  Rekonsiliasi Laporan Dosen
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {isBepReached ? (
                <div className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>BEP TERCAPAI (Titik Impas Terlampaui)</span>
                </div>
              ) : (
                <div className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  <span>PROSES MENUJU BEP (-{formatCurrency(bepShortfall)})</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleOpenCapitalModal}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <Edit2 className="w-3 h-3" />
                <span>Atur Modal</span>
              </button>
            </div>
          </div>

          {/* Cashflow Status Summary */}
          <div
            className={`px-3.5 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 flex-wrap ${
              isBepReached
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-slate-900">
              {isBepReached ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Landmark className="w-4 h-4 text-amber-700 shrink-0" />
              )}
              <span>
                {isBepReached
                  ? `Laba Operasional Bersih: +${formatCurrency(estimatedNetProfit)} (${roiPercentage}% ROI)`
                  : `Target Menuju BEP: Kurang ${formatCurrency(bepShortfall)} (${capitalAbsorption}% Serapan Modal)`}
              </span>
            </div>
          </div>

          {/* Visual 4-Step Cashflow Statement Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Step 1: Modal Awal */}
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">
                  1. Modal Awal Disetor
                </span>
                <div className="font-mono text-lg font-extrabold text-amber-900">
                  + {formatCurrency(initialCapital)}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block truncate">
                {capitalSource}
              </span>
            </div>

            {/* Step 2: Belanja Bahan */}
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-800 uppercase block mb-1">
                  2. Serapan Belanja Bahan
                </span>
                <div className="font-mono text-lg font-extrabold text-rose-600">
                  - {formatCurrency(totalExpenses)}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">
                {totalNotaBelanja} nota transaksi supplier
              </span>
            </div>

            {/* Step 3: Omzet Penjualan */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                  3. Akumulasi Omzet Kasir
                </span>
                <div className="font-mono text-lg font-extrabold text-emerald-700">
                  + {formatCurrency(netSales)}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">
                {metrics.successfulTransactions} transaksi kasir lunas
              </span>
            </div>

            {/* Step 4: Saldo Kas Toko */}
            <div className="p-3 bg-amber-100/70 border border-amber-400 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-amber-900 uppercase block mb-1">
                  4. Saldo Kas Riil (Cash on Hand)
                </span>
                <div className="font-mono text-lg font-extrabold text-amber-900">
                  = {formatCurrency(cashOnHand)}
                </div>
              </div>
              <span className="text-[10px] text-amber-800 font-bold mt-1.5 block">
                Kas nyata &amp; rekening kasir
              </span>
            </div>
          </div>
        </div>

        {/* ROW 3: CHART TREN OMZET & BEST SELLERS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Chart Tren Omzet (2 Columns) */}
          <div className="lg:col-span-2 w-full overflow-hidden bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Grafik Tren Omzet ({timeRange === 'today' ? 'Hari Ini per Jam' : 'Tren Harian'})
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                Puncak: {formatCurrency(maxTrendAmount)}
              </span>
            </div>

            {/* SVG Visual Bar Chart */}
            <div className="pt-4 pb-2 relative">
              {maxTrendAmount === 0 && (
                <div className="absolute inset-x-0 top-16 flex items-center justify-center pointer-events-none z-10">
                  <div className="bg-slate-50/90 border border-dashed border-slate-300 px-3 py-1.5 rounded text-xs text-slate-500 font-medium shadow-2xs">
                    Belum ada transaksi pada periode ini (Puncak: Rp 0)
                  </div>
                </div>
              )}
              <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-200">
                {trendData.map((d, index) => {
                  const barHeightPercent =
                    maxTrendAmount > 0
                      ? Math.max(6, Math.round((d.amount / maxTrendAmount) * 100))
                      : 0;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center h-full justify-end group"
                    >
                      <span className="text-[10px] font-mono font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1 bg-slate-900 text-white px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
                        {formatCurrency(d.amount)} ({d.count} tx)
                      </span>
                      <div
                        style={{ height: `${barHeightPercent}%` }}
                        className={`w-full max-w-[42px] rounded-t transition-all duration-300 ${
                          d.amount > 0
                            ? 'bg-amber-600 group-hover:bg-emerald-600'
                            : barHeightPercent > 0
                            ? 'bg-slate-100'
                            : 'h-0'
                        }`}
                      />
                      <span className="text-[10px] font-medium text-slate-500 mt-2 truncate max-w-[50px] text-center">
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart footer details */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#D97706] rounded-xs" />
                  <span>Omzet Bersih</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">Total Periode:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    + {formatCurrency(metrics.netSales)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-500">Metode Bayar:</span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-[11px]">
                  Cash: {formatCurrency(metrics.cashSales)}
                </span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-mono text-[11px] border border-amber-200">
                  QRIS: {formatCurrency(metrics.qrisSales)}
                </span>
              </div>
            </div>
          </div>

          {/* List Best Seller (1 Column) */}
          <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                    Produk Terlaris (Best Seller)
                  </h3>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {metrics.totalQtySold} Porsi Terjual
                </span>
              </div>

              <div className="space-y-3">
                {metrics.bestSellers.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    Belum ada data penjualan pada rentang waktu ini.
                  </div>
                ) : (
                  metrics.bestSellers.slice(0, 4).map((item, index) => {
                    const share =
                      metrics.totalQtySold > 0
                        ? Math.round((item.qty / metrics.totalQtySold) * 100)
                        : 0;
                    return (
                      <div
                        key={item.name}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                index === 0
                                  ? 'bg-amber-400 text-amber-950 font-black shadow-xs'
                                  : index === 1
                                  ? 'bg-slate-300 text-slate-800'
                                  : index === 2
                                  ? 'bg-amber-700/30 text-amber-900'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {item.name}
                              </h4>
                              <p className="text-[10px] text-slate-500">{item.category}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-bold text-slate-900 block">
                              {item.qty} porsi
                            </span>
                            <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                              + {formatCurrency(item.net)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar of sales contribution */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            style={{ width: `${share}%` }}
                            className="bg-amber-600 h-full rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="w-full mt-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
            >
              <RisolIcon className="w-4 h-4 text-amber-200" />
              <span>Buka Kasir Pesanan Baru</span>
            </button>
          </div>
        </div>

        {/* ROW 4: INTEGRATED TABLES (PELANGGAN LOYAL & BELANJA BAHAN SUPPLIER TERBARU) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Card: Top Pelanggan Loyal (From Customers Page) */}
          <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Pelanggan Paling Loyal (Direktori Pelanggan)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('customers')}
                className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-semibold cursor-pointer"
              >
                Lihat Semua ({customers.length}) →
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Header Tabel */}
                <div className="grid grid-cols-12 gap-3 pb-3 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <div className="col-span-4">Nama Pelanggan</div>
                  <div className="col-span-2 text-center">Tier</div>
                  <div className="col-span-2 text-center">Pesanan</div>
                  <div className="col-span-2 text-right">Total LTV</div>
                  <div className="col-span-2 text-left pl-3">Menu Favorit</div>
                </div>

                {/* Baris Data Pelanggan */}
                {metrics.topLoyalCustomers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Belum ada data pelanggan tersimpan.
                  </div>
                ) : (
                  metrics.topLoyalCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="grid grid-cols-12 gap-3 py-3 border-b border-slate-100 items-center text-sm hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="col-span-4 font-semibold text-slate-800 truncate">
                        {customer.name}
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {customer.tier || customer.loyaltyTier || 'Baru'}
                        </span>
                      </div>
                      <div className="col-span-2 text-center text-slate-600 font-medium">
                        {customer.totalOrders}x
                      </div>
                      <div className="col-span-2 text-right font-bold text-emerald-600">
                        Rp {customer.totalSpent?.toLocaleString('id-ID')}
                      </div>
                      <div className="col-span-2 text-left pl-3 text-slate-600 text-xs truncate">
                        {customer.favoriteItem || '-'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Card: Belanja Bahan Supplier Terbaru (From Expenses Page) */}
          <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Pencatatan Belanja Bahan Supplier Terbaru ({totalNotaBelanja} Nota)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-semibold cursor-pointer"
              >
                Catat Belanja Bahan →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                    <th className="pb-2 pr-3">Bahan Baku</th>
                    <th className="pb-2 px-3">Supplier &amp; Lokasi</th>
                    <th className="pb-2 px-2 text-center">PIC</th>
                    <th className="pb-2 pl-3 text-right">Biaya (-)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        Belum ada belanja bahan tercatat.
                      </td>
                    </tr>
                  ) : (
                    metrics.recentExpenses.map((exp) => {
                      const nominal = getExpenseNominal(exp);
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 pr-3 font-bold text-slate-900">
                            <div>{exp.itemName || exp.name}</div>
                            <span className="text-[10px] text-slate-500 font-normal">
                              {exp.date} • {exp.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div className="font-medium text-slate-800">
                              {exp.supplierName || exp.supplier || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                            <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {exp.cashierName || exp.cashier}
                            </span>
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                            - Rp {nominal.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ROW 5: CASHIER SHIFT PERFORMANCE (Harits, Rafi, Barra, Dimas, Akhyar) */}
        <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Performa Shift Kasir (5 Anggota Tim)
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Kasir Aktif Saat Ini:</span>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full border border-amber-300">
                {activeCashier}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {cashierList.map((cashierName) => {
              const perf = metrics.cashierPerf[cashierName] || { count: 0, total: 0, avg: 0 };
              const isActive = activeCashier === cashierName;
              return (
                <div
                  key={cashierName}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900">{cashierName}</span>
                    {isActive ? (
                      <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-semibold">
                        Shift Aktif
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveCashier(cashierName)}
                        className="text-[10px] text-amber-700 hover:underline cursor-pointer font-medium"
                      >
                        Pilih Shift
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Total Transaksi:</span>
                      <span className="font-mono font-semibold text-slate-800">{perf.count} tx</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Total Omzet:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        + {formatCurrency(perf.total)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Rata-rata:</span>
                      <span className="font-mono font-medium text-slate-600">
                        {formatCurrency(perf.avg)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROW 6: MODUL EKSPOR SHORTCUTS (6 TEMPLATE 1-CLICK DOWNLOADS) */}
        <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                Pusat Unduh Laporan Cepat (6 Template Ekspor)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-semibold cursor-pointer shrink-0"
            >
              Buka Halaman Ekspor Lengkap →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Template 1: Rincian Stok */}
            <button
              type="button"
              onClick={handleExportStock}
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-left transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                  1. Rincian Stok
                </span>
                <span className="text-xs font-bold text-slate-900 block">Stok &amp; Valuasi</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {metrics.totalProductsCount} menu • {metrics.totalStockUnits} porsi
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:underline">
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV</span>
              </div>
            </button>

            {/* Template 2: Jumlah Pembelian */}
            <button
              type="button"
              onClick={handleExportItemSales}
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-left transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                  2. Jumlah Beli
                </span>
                <span className="text-xs font-bold text-slate-900 block">Volume Terjual</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {metrics.totalQtySold} porsi terjual
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:underline">
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV</span>
              </div>
            </button>

            {/* Template 3: Data Pelanggan */}
            <button
              type="button"
              onClick={handleExportCustomers}
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-left transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                  3. Pelanggan
                </span>
                <span className="text-xs font-bold text-slate-900 block">LTV &amp; Member</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {metrics.totalCustomersCount} direktori pembeli
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:underline">
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV</span>
              </div>
            </button>

            {/* Template 4: Rincian Keuangan */}
            <button
              type="button"
              onClick={handleExportFinancial}
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-left transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                  4. Keuangan
                </span>
                <span className="text-xs font-bold text-slate-900 block">Laba Rugi Toko</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Omzet vs Pengeluaran
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:underline">
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV</span>
              </div>
            </button>

            {/* Template 5: Pengeluaran Bahan */}
            <button
              type="button"
              onClick={handleExportExpenses}
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-left transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                  5. Pengeluaran
                </span>
                <span className="text-xs font-bold text-slate-900 block">Belanja Supplier</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {totalNotaBelanja} nota faktur
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:underline">
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV</span>
              </div>
            </button>

            {/* Template 6: Rincian Transaksi */}
            <button
              type="button"
              onClick={handleExportTransactions}
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl text-left transition-colors cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                  6. Transaksi
                </span>
                <span className="text-xs font-bold text-slate-900 block">Ledger Nota Kasir</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {metrics.totalTransactions} nomor nota
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:underline">
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV</span>
              </div>
            </button>
          </div>
        </div>

        {/* ROW 7: STOK MENIPIS & PROMO DISKON AKTIF (From Settings & POS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Card: Status Stok Produk (Mengikuti list menu produk) */}
          <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Status Stok Menu Produk ({metrics.totalStockUnits} Porsi Total)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-semibold cursor-pointer shrink-0"
              >
                Kelola Stok Menu →
              </button>
            </div>

            <div className="space-y-2.5">
              {products.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Belum ada menu produk terdaftar.
                </div>
              ) : (
                products.map((prod) => {
                  const stock = prod.stockQuantity ?? 0;
                  const isOutOfStock = stock === 0;
                  const isLow = stock > 0 && stock <= 15;
                  const progressPct = Math.min(100, Math.round((stock / 50) * 100));

                  return (
                    <div
                      key={prod.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {prod.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {prod.category} • Harga: {formatCurrency(prod.price)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800 border-rose-300 font-extrabold'
                                : isLow
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            {stock} porsi
                          </span>

                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isOutOfStock
                                ? 'bg-rose-600 text-white'
                                : isLow
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {isOutOfStock ? 'Habis' : isLow ? 'Menipis' : 'Tersedia'}
                          </span>
                        </div>
                      </div>

                      {/* Stock capacity bar */}
                      <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                        <div
                          style={{ width: `${progressPct}%` }}
                          className={`h-full rounded-full transition-all ${
                            isOutOfStock
                              ? 'bg-rose-500'
                              : isLow
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card: Promo Diskon Transaksi Aktif */}
          <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                    Diskon Transaksi Aktif di Kasir
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-semibold cursor-pointer"
                >
                  Gunakan di POS →
                </button>
              </div>

              <div className="space-y-2.5">
                {discounts
                  .filter((d) => d.isActive)
                  .map((disc) => (
                    <div
                      key={disc.id}
                      className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{disc.name}</div>
                        <div className="text-[10px] text-slate-600">{disc.description || '-'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-rose-600 block">
                          {disc.type === 'percentage'
                            ? `-${disc.value}%`
                            : `-${formatCurrency(disc.value)}`}
                        </span>
                        {disc.minPurchase && (
                          <span className="text-[10px] text-slate-500 block">
                            Min. {formatCurrency(disc.minPurchase)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Diskon dihitung otomatis di kasir</span>
              <span className="font-semibold text-slate-700">
                {discounts.length} Preset Tersedia
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK MODAL: Atur Modal Awal Usaha (Direct on Dashboard for Lecturer Presentation) */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E5E5] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2 text-amber-700">
                <Landmark className="w-5 h-5 stroke-[1.8]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  Atur Modal Awal Usaha
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCapitalModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {capitalFeedback && (
              <div className="p-3 mb-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-medium rounded flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{capitalFeedback}</span>
              </div>
            )}

            <form onSubmit={handleSaveModalCapital} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black uppercase tracking-wider block">
                  Nominal Modal Awal (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500 font-mono">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      modalAmount === ''
                        ? ''
                        : Number(modalAmount.replace(/\D/g, '')).toLocaleString('id-ID')
                    }
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setModalAmount(val);
                    }}
                    placeholder="500.000"
                    className="w-full pl-10 pr-3 py-2 text-xs border border-[#CCCCCC] focus:border-amber-500 bg-white font-mono font-bold text-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black uppercase tracking-wider block">
                  Sumber / Asal Modal
                </label>
                <input
                  type="text"
                  list="quick-modal-sources"
                  value={modalSource}
                  onChange={(e) => setModalSource(e.target.value)}
                  placeholder="Cth: Modal Kelompok / Mandiri"
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-amber-500 bg-white font-medium text-slate-800 focus:outline-none"
                  required
                />
                <datalist id="quick-modal-sources">
                  <option value="Modal Kelompok / Mandiri" />
                  <option value="Hibah PMW Kampus" />
                  <option value="Iuran Kas Mahasiswa" />
                  <option value="Investor / Pembina Usaha" />
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black uppercase tracking-wider block">
                  Tanggal Alokasi Modal
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-amber-500 bg-white font-medium text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCapitalModal(false)}
                  className="px-3.5 py-2 text-xs border border-[#CCCCCC] hover:border-black cursor-pointer font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  Simpan Modal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
