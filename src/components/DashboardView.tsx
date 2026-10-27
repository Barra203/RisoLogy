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
  } = usePos();

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

  // Filter transactions according to selected time range
  const filteredTransactions = useMemo(() => {
    if (timeRange === 'all') return transactions;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 86400000;
    const thirtyDaysAgo = startOfToday - 30 * 86400000;

    return transactions.filter((tx) => {
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
  }, [transactions, timeRange]);

  // Filter expenses according to selected time range (dengan pencocokan `exp.date` YYYY-MM-DD & fallback ke seluruh `expenses` jika rentang kosong)
  const filteredExpenses = useMemo(() => {
    if (timeRange === 'all') return expenses;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 86400000;
    const thirtyDaysAgo = startOfToday - 30 * 86400000;

    const matched = expenses.filter((exp) => {
      const expTime = getExpenseTimestamp(exp);
      if (timeRange === 'today') return exp.date === todayStr || expTime >= startOfToday;
      if (timeRange === '7days') return expTime >= sevenDaysAgo;
      if (timeRange === '30days') return expTime >= thirtyDaysAgo;
      return true;
    });

    // Jika pada filter tanggal tertentu tidak ada nota belanja hari itu padahal data belanja bahan ada,
    // tampilkan akumulasi data belanja bahan yang tersimpan agar tidak menampilkan Rp 0
    return matched.length > 0 ? matched : expenses;
  }, [expenses, timeRange]);

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
    // 1. Transactions & POS metrics
    const totalTransactions = filteredTransactions.length;
    const successfulTransactions = filteredTransactions.filter((t) => t.status === 'PAID').length;
    const refundedTransactions = filteredTransactions.filter((t) => t.status === 'REFUNDED').length;
    const successRate =
      totalTransactions > 0 ? Math.round((successfulTransactions / totalTransactions) * 100) : 100;

    const grossSales = filteredTransactions.reduce(
      (acc, t) => acc + (t.status === 'PAID' ? t.subtotal : 0),
      0
    );
    const totalDiscount = filteredTransactions.reduce(
      (acc, t) => acc + (t.status === 'PAID' ? t.discountAmount : 0),
      0
    );
    const netSales = filteredTransactions.reduce(
      (acc, t) => acc + (t.status === 'PAID' ? t.total : 0),
      0
    );
    const totalExpenses = totalBelanjaBahan;
    const estimatedNetProfit = netSales - totalExpenses;
    const profitMargin = netSales > 0 ? Math.round((estimatedNetProfit / netSales) * 100) : 0;

    const cashSales = filteredTransactions
      .filter((t) => t.paymentMethod === 'CASH' && t.status === 'PAID')
      .reduce((acc, t) => acc + t.total, 0);
    const cashCount = filteredTransactions.filter(
      (t) => t.paymentMethod === 'CASH' && t.status === 'PAID'
    ).length;

    const qrisSales = filteredTransactions
      .filter((t) => t.paymentMethod === 'QRIS' && t.status === 'PAID')
      .reduce((acc, t) => acc + t.total, 0);
    const qrisCount = filteredTransactions.filter(
      (t) => t.paymentMethod === 'QRIS' && t.status === 'PAID'
    ).length;

    const avgTicket =
      successfulTransactions > 0 ? Math.round(netSales / successfulTransactions) : 0;

    // 2. Best Sellers & Item Sales
    const itemMap = new Map<
      string,
      { id: string; name: string; category: string; qty: number; gross: number; net: number }
    >();
    filteredTransactions
      .filter((t) => t.status === 'PAID')
      .forEach((tx) => {
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

    // 6. Cashier Performance breakdown
    const cashierPerf: Record<string, { count: number; total: number; avg: number }> = {};
    cashierList.forEach((c) => {
      cashierPerf[c] = { count: 0, total: 0, avg: 0 };
    });
    filteredTransactions
      .filter((t) => t.status === 'PAID')
      .forEach((tx) => {
        const cName = tx.cashierName || 'Harits';
        if (!cashierPerf[cName]) {
          cashierPerf[cName] = { count: 0, total: 0, avg: 0 };
        }
        cashierPerf[cName].count += 1;
        cashierPerf[cName].total += tx.total;
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
      refundedTransactions,
      successRate,
      grossSales,
      totalDiscount,
      netSales,
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

  // Hourly or Daily Trend Data for Chart
  const trendData = useMemo(() => {
    if (timeRange === 'today') {
      const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      return hours.map((hourLabel) => {
        const targetHour = parseInt(hourLabel.split(':')[0], 10);
        let amount = 0;
        let count = 0;
        filteredTransactions.forEach((tx) => {
          if (tx.status !== 'PAID') return;
          const d = new Date(tx.timestamp);
          if (Math.abs(d.getHours() - targetHour) <= 1) {
            amount += tx.total;
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
        transactions.forEach((tx) => {
          if (tx.status !== 'PAID') return;
          const txDay = new Date(tx.timestamp).toISOString().split('T')[0];
          if (txDay === dayStr) {
            amount += tx.total;
            count += 1;
          }
        });
        return { label: dayLabel, amount, count };
      });
    }
  }, [filteredTransactions, transactions, timeRange]);

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
    const rows: ExpenseExportRow[] = filteredExpenses.map((exp) => ({
      expenseNumber: exp.expenseNumber,
      date: exp.date,
      itemName: exp.itemName,
      category: exp.category,
      quantity: exp.quantity,
      unit: exp.unit,
      unitPrice: exp.unitPrice,
      totalPrice: getExpenseNominal(exp),
      supplierName: exp.supplierName,
      supplierLocation: exp.supplierLocation,
      cashierName: exp.cashierName,
      notes: exp.notes,
    }));
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

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F5F5F5]">
      {/* Top Header */}
      <div className="p-5 sm:p-6 bg-white border-b border-[#E5E5E5] shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <LayoutDashboard className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Dashboard Operasional Terpadu</span>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Semua Halaman
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Agregasi otomatis dari Kasir, Riwayat Transaksi, Menu/Stok, Pelanggan, Belanja Bahan &amp; Ekspor
                </p>
              </div>
            </div>
          </div>

          {/* Time range selector & Active Shift badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-[#F5F5F5] p-1 border border-[#E5E5E5] rounded-md">
              {(['today', '7days', '30days', 'all'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
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

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Shift: {activeCashier}</span>
            </div>
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ROW 1: REAL-TIME OVERVIEW & POS CART ALERT */}
        {cart.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <div className="flex items-center gap-3">
              <span className="font-mono text-base font-bold text-emerald-700">
                {formatCurrency(subtotal)}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Lanjutkan Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ROW 2: PRIMARY FINANCIAL & TRANSACTION KPI CARDS (4 CARDS ESENSIAL) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Jumlah Transaksi & AOV */}
          <div className="p-4 bg-white border border-amber-200 rounded-lg shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-600" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Jumlah Transaksi
              </span>
              <Receipt className="w-4 h-4 text-amber-600" />
            </div>
            <div className="font-mono text-3xl font-extrabold text-slate-900 tabular-nums">
              {metrics.totalTransactions}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Rata-rata Order (AOV):</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatCurrency(metrics.avgTicket)}
              </span>
            </div>
          </div>

          {/* Card 2: Transaksi Berhasil & Success Rate */}
          <div className="p-4 bg-white border border-emerald-200 rounded-lg shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Transaksi Berhasil
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="font-mono text-3xl font-extrabold text-emerald-700 tabular-nums">
                {metrics.successfulTransactions}
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                {metrics.successRate}% Sukses
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Refund/Batal:</span>
              <span className="font-semibold text-rose-600 font-mono">
                {metrics.refundedTransactions} pesanan
              </span>
            </div>
          </div>

          {/* Card 3: Omzet Bersih Penjualan (+ Hijau) */}
          <div className="p-4 bg-white border border-teal-200 rounded-lg shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-teal-600" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                Omzet Bersih Penjualan
              </span>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <div className="font-mono text-2xl font-extrabold text-emerald-700 tabular-nums">
              + {formatCurrency(metrics.netSales)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Total Diskon (-)</span>
              <span className="font-semibold text-rose-600 font-mono">
                - {formatCurrency(metrics.totalDiscount)}
              </span>
            </div>
          </div>

          {/* Card 4: Belanja Supplier & Estimasi Laba Bersih */}
          <div className="p-4 bg-white border border-amber-200 rounded-lg shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                Belanja Bahan &amp; Laba
              </span>
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Belanja Supplier:</span>
                <span className="font-mono text-sm font-bold text-rose-600">
                  - Rp {totalBelanjaBahan.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Est. Laba Bersih:</span>
                <span
                  className={`font-mono text-base font-extrabold ${
                    metrics.estimatedNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {formatCurrency(metrics.estimatedNetProfit)}
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>Margin Bersih ({totalNotaBelanja} Nota):</span>
              <span className="font-mono font-bold text-slate-800">{metrics.profitMargin}%</span>
            </div>
          </div>
        </div>

        {/* ROW 3: CHART TREN OMZET & BEST SELLERS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Tren Omzet (2 Columns) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
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
                            ? 'bg-gradient-to-t from-[#D97706] to-amber-400 group-hover:from-emerald-600 group-hover:to-emerald-400'
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

              <div className="flex items-center gap-2">
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
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
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
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200"
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
              className="w-full mt-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
            >
              <RisolIcon className="w-4 h-4 text-amber-200" />
              <span>Buka Kasir Pesanan Baru</span>
            </button>
          </div>
        </div>

        {/* ROW 4: INTEGRATED TABLES (PELANGGAN LOYAL & BELANJA BAHAN SUPPLIER TERBARU) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Top Pelanggan Loyal (From Customers Page) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
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
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
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
                            <div>{exp.itemName}</div>
                            <span className="text-[10px] text-slate-500 font-normal">
                              {exp.date} • {exp.quantity} {exp.unit} @{' '}
                              {formatCurrency(exp.unitPrice)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div className="font-medium text-slate-800">{exp.supplierName}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {exp.supplierLocation}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-medium text-slate-700">
                            <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {exp.cashierName}
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
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
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
                  className={`p-3.5 rounded-lg border transition-all ${
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
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Pusat Unduh Laporan Cepat (6 Template Ekspor)
                </h3>
                <p className="text-xs text-slate-500">
                  Unduh langsung file CSV dari dashboard atau buka Modul Ekspor untuk pratinjau tabel lengkap
                </p>
              </div>
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
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-lg text-left transition-colors cursor-pointer group flex flex-col justify-between"
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
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-lg text-left transition-colors cursor-pointer group flex flex-col justify-between"
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
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-lg text-left transition-colors cursor-pointer group flex flex-col justify-between"
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
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-lg text-left transition-colors cursor-pointer group flex flex-col justify-between"
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
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-lg text-left transition-colors cursor-pointer group flex flex-col justify-between"
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
              className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-lg text-left transition-colors cursor-pointer group flex flex-col justify-between"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Status Stok Produk (Mengikuti list menu produk) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                    Status Stok Menu Produk ({metrics.totalStockUnits} Porsi Total)
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {metrics.totalProductsCount} menu terdaftar di katalog
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-semibold cursor-pointer shrink-0"
              >
                Kelola Stok Menu →
              </button>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
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
                      className="p-3 bg-slate-50 rounded border border-slate-200 hover:border-slate-300 transition-colors"
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
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
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
                      className="p-3 bg-amber-50/50 rounded border border-amber-200 flex items-center justify-between"
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
    </div>
  );
};
