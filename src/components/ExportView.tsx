import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import {
  formatCurrency,
  formatDateTime,
  generateStockCsv,
  generateStockTsv,
  generateItemSalesCsv,
  generateItemSalesTsv,
  generateCustomersCsv,
  generateCustomersTsv,
  generateFinancialCsv,
  generateFinancialTsv,
  generateExpensesCsv,
  generateExpensesTsv,
  generateTransactionsCsv,
  generateTransactionsTsv,
  StockExportRow,
  ItemSalesExportRow,
  CustomerExportRow,
  FinancialExportRow,
  ExpenseExportRow,
  TransactionDetailExportRow,
} from '../utils/pos-logic';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Calendar,
  Layers,
  Package,
  ShoppingCart,
  Users,
  LineChart,
  Truck,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { RisolIcon } from './RisolIcon';

export type ExportTemplateId =
  | 'stock'
  | 'item_sales'
  | 'customers'
  | 'financial'
  | 'expenses'
  | 'transactions';

type PeriodFilter = 'TODAY' | 'MONTH' | 'ALL' | 'CUSTOM';

export const ExportView: React.FC = () => {
  const { products, transactions, customers, expenses, settings } = usePos();

  const [activeTemplate, setActiveTemplate] = useState<ExportTemplateId>('transactions');
  const [period, setPeriod] = useState<PeriodFilter>('TODAY');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');

  // Date range
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    return transactions.filter((tx) => {
      const txTime = tx.timestamp;
      if (period === 'TODAY') {
        return txTime >= startOfToday && txTime <= endOfToday;
      }
      if (period === 'MONTH') {
        return txTime >= startOfMonth && txTime <= endOfMonth;
      }
      if (period === 'CUSTOM') {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        return txTime >= start && txTime <= end;
      }
      return true; // ALL
    });
  }, [transactions, period, startDate, endDate]);

  // Filter expenses by period
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    return expenses.filter((exp) => {
      const expTime = exp.timestamp;
      if (period === 'TODAY') {
        return expTime >= startOfToday && expTime <= endOfToday;
      }
      if (period === 'MONTH') {
        return expTime >= startOfMonth && expTime <= endOfMonth;
      }
      if (period === 'CUSTOM') {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        return expTime >= start && expTime <= end;
      }
      return true;
    });
  }, [expenses, period, startDate, endDate]);

  // 1. Template: Rincian Stok
  const stockData = useMemo<StockExportRow[]>(() => {
    return products.map((p) => {
      const qty = p.stockQuantity ?? (p.inStock ? 50 : 0);
      const unitCost = p.unitCost ?? Math.round(p.price * 0.45);
      return {
        productId: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stockQuantity: qty,
        status: !p.inStock ? 'Habis' : qty < 15 ? 'Menipis' : 'Tersedia',
        unitCost,
        stockValue: qty * unitCost,
      };
    });
  }, [products]);

  // 2. Template: Jumlah Pembelian (Item Sales)
  const itemSalesData = useMemo<ItemSalesExportRow[]>(() => {
    const map = new Map<string, { id: string; name: string; category: string; price: number; qty: number; gross: number; net: number }>();

    filteredTransactions
      .filter((t) => t.status === 'PAID')
      .forEach((tx) => {
        tx.items.forEach((item) => {
          const existing = map.get(item.name) || {
            id: item.productId,
            name: item.name,
            category: item.category,
            price: item.price,
            qty: 0,
            gross: 0,
            net: 0,
          };
          existing.qty += item.quantity;
          existing.gross += item.subtotal;
          const ratio = tx.subtotal > 0 ? item.subtotal / tx.subtotal : 0;
          existing.net += Math.round(item.subtotal - tx.discountAmount * ratio);
          map.set(item.name, existing);
        });
      });

    // Also include products with 0 sales so report is complete
    products.forEach((p) => {
      if (!map.has(p.name)) {
        map.set(p.name, {
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          qty: 0,
          gross: 0,
          net: 0,
        });
      }
    });

    const list = Array.from(map.values());
    const grandNet = list.reduce((acc, i) => acc + i.net, 0);

    return list
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        totalQtySold: item.qty,
        grossSales: item.gross,
        netSales: item.net,
        salesSharePercent: grandNet > 0 ? (item.net / grandNet) * 100 : 0,
      }))
      .sort((a, b) => b.totalQtySold - a.totalQtySold);
  }, [filteredTransactions, products]);

  // 3. Template: Data Pelanggan
  const customersData = useMemo<CustomerExportRow[]>(() => {
    return customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
      averageOrderValue: c.averageOrderValue,
      lastVisit: formatDateTime(c.lastVisit).date,
      favoriteItem: c.favoriteItem,
      tier: c.loyaltyTier,
    }));
  }, [customers]);

  // 4. Template: Rincian Keuangan
  const financialData = useMemo<FinancialExportRow[]>(() => {
    // Group transactions by date string
    const dateMap = new Map<string, { txs: typeof filteredTransactions; expenses: number }>();

    filteredTransactions.forEach((tx) => {
      const d = formatDateTime(tx.timestamp).date;
      const cur = dateMap.get(d) || { txs: [], expenses: 0 };
      cur.txs.push(tx);
      dateMap.set(d, cur);
    });

    filteredExpenses.forEach((exp) => {
      const d = formatDateTime(exp.timestamp).date;
      const cur = dateMap.get(d) || { txs: [], expenses: 0 };
      cur.expenses += exp.totalPrice;
      dateMap.set(d, cur);
    });

    // If today is empty, push today with 0
    if (dateMap.size === 0) {
      dateMap.set(formatDateTime(Date.now()).date, { txs: [], expenses: 0 });
    }

    return Array.from(dateMap.entries()).map(([dateStr, record]) => {
      const count = record.txs.length;
      const grossSales = record.txs.reduce((a, t) => a + (t.status === 'PAID' ? t.subtotal : 0), 0);
      const discounts = record.txs.reduce((a, t) => a + (t.status === 'PAID' ? t.discountAmount : 0), 0);
      const netSales = record.txs.reduce((a, t) => a + (t.status === 'PAID' ? t.total : 0), 0);
      const supplierExpenses = record.expenses;
      const netProfit = netSales - supplierExpenses;
      const cashSales = record.txs
        .filter((t) => t.paymentMethod === 'CASH' && t.status === 'PAID')
        .reduce((a, t) => a + t.total, 0);
      const qrisSales = record.txs
        .filter((t) => t.paymentMethod === 'QRIS' && t.status === 'PAID')
        .reduce((a, t) => a + t.total, 0);

      return {
        date: dateStr,
        totalTransactions: count,
        grossSales,
        discounts,
        netSales,
        supplierExpenses,
        netProfit,
        cashSales,
        qrisSales,
      };
    });
  }, [filteredTransactions, filteredExpenses]);

  // 5. Template: Pengeluaran (Belanja Bahan Supplier)
  const expensesData = useMemo<ExpenseExportRow[]>(() => {
    return filteredExpenses.map((exp) => ({
      expenseNumber: exp.expenseNumber,
      date: exp.date,
      itemName: exp.itemName,
      category: exp.category,
      quantity: exp.quantity,
      unit: exp.unit,
      unitPrice: exp.unitPrice,
      totalPrice: exp.totalPrice,
      supplierName: exp.supplierName,
      supplierLocation: exp.supplierLocation,
      cashierName: exp.cashierName,
      notes: exp.notes,
    }));
  }, [filteredExpenses]);

  // 6. Template: Rincian Transaksi
  const transactionsDetailData = useMemo<TransactionDetailExportRow[]>(() => {
    return filteredTransactions.map((tx) => ({
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
  }, [filteredTransactions]);

  // Generate Current Active CSV and TSV Content
  const { currentCsv, currentTsv, fileName } = useMemo(() => {
    const periodLabel =
      period === 'TODAY'
        ? `Harian_${todayStr}`
        : period === 'MONTH'
        ? 'Bulan_Ini'
        : period === 'CUSTOM'
        ? `${startDate}_sd_${endDate}`
        : 'Semua_Waktu';

    switch (activeTemplate) {
      case 'stock':
        return {
          currentCsv: generateStockCsv(stockData),
          currentTsv: generateStockTsv(stockData),
          fileName: `RisoLogy_1_Rincian_Stok_${todayStr}.csv`,
        };
      case 'item_sales':
        return {
          currentCsv: generateItemSalesCsv(itemSalesData),
          currentTsv: generateItemSalesTsv(itemSalesData),
          fileName: `RisoLogy_2_Jumlah_Pembelian_${periodLabel}.csv`,
        };
      case 'customers':
        return {
          currentCsv: generateCustomersCsv(customersData),
          currentTsv: generateCustomersTsv(customersData),
          fileName: `RisoLogy_3_Data_Pelanggan_${todayStr}.csv`,
        };
      case 'financial':
        return {
          currentCsv: generateFinancialCsv(financialData),
          currentTsv: generateFinancialTsv(financialData),
          fileName: `RisoLogy_4_Rincian_Keuangan_${periodLabel}.csv`,
        };
      case 'expenses':
        return {
          currentCsv: generateExpensesCsv(expensesData),
          currentTsv: generateExpensesTsv(expensesData),
          fileName: `RisoLogy_5_Pengeluaran_Bahan_${periodLabel}.csv`,
        };
      case 'transactions':
      default:
        return {
          currentCsv: generateTransactionsCsv(transactionsDetailData),
          currentTsv: generateTransactionsTsv(transactionsDetailData),
          fileName: `RisoLogy_6_Rincian_Transaksi_${periodLabel}.csv`,
        };
    }
  }, [
    activeTemplate,
    period,
    todayStr,
    startDate,
    endDate,
    stockData,
    itemSalesData,
    customersData,
    financialData,
    expensesData,
    transactionsDetailData,
  ]);

  // Download CSV Action
  const handleDownloadCsv = () => {
    const blob = new Blob([currentCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy TSV Action (Direct paste to Google Sheets or Excel without comma delimiter issues)
  const handleCopyTsv = () => {
    navigator.clipboard.writeText(currentTsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Template Navigation Tabs (6 Templates as requested)
  const templateTabs: Array<{ id: ExportTemplateId; title: string; subtitle: string; icon: React.ReactNode }> = [
    {
      id: 'transactions',
      title: '6. Rincian Transaksi',
      subtitle: 'Semua struk nota kasir, menu & diskon',
      icon: <Receipt className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'financial',
      title: '4. Rincian Keuangan',
      subtitle: 'Omzet kotor, diskon, laba & kas/qris',
      icon: <LineChart className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'expenses',
      title: '5. Pengeluaran',
      subtitle: 'Belanja bahan supplier & kasir PIC',
      icon: <Truck className="w-4 h-4 text-rose-600" />,
    },
    {
      id: 'item_sales',
      title: '2. Jumlah Pembelian',
      subtitle: 'Porsi terjual, omzet & kontribusi %',
      icon: <ShoppingCart className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'stock',
      title: '1. Rincian Stok',
      subtitle: 'Fisik sisa, HPP & valuasi aset',
      icon: <Package className="w-4 h-4 text-indigo-600" />,
    },
    {
      id: 'customers',
      title: '3. Data Pelanggan',
      subtitle: 'LTV, repeat order & status loyalitas',
      icon: <Users className="w-4 h-4 text-purple-600" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F5F5F5]">
      {/* Top Header */}
      <div className="p-6 bg-white border-b border-[#E5E5E5] shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-600 stroke-[2]" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Modul Ekspor Spreadsheet (6 Template Laporan)
              </h1>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Pilih template laporan, tentukan rentang periode, download CSV UTF-8 atau salin data langsung ke Excel / Google Sheets
            </p>
          </div>

          {/* Action Download & Copy Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTsv}
              className="px-3.5 py-2.5 bg-white text-slate-800 border border-[#CCCCCC] hover:border-amber-600 hover:text-amber-700 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer rounded shadow-2xs"
              title="Salin dalam format TSV (Siap Paste ke Excel / Google Sheets)"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Salin ke Sheets/Excel</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-5 py-2.5 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-md shadow-amber-600/20 rounded"
            >
              <Download className="w-4 h-4" />
              <span>Download File CSV</span>
            </button>
          </div>
        </div>

        {/* 6 TEMPLATE SELECTOR BUTTONS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          {templateTabs.map((t) => {
            const isActive = activeTemplate === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTemplate(t.id)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  isActive
                    ? 'border-amber-600 bg-amber-50/80 shadow-xs ring-1 ring-amber-600/30'
                    : 'border-slate-200 bg-white hover:border-amber-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {t.icon}
                  <span className={`text-xs font-bold truncate ${isActive ? 'text-amber-700' : 'text-slate-800'}`}>
                    {t.title}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-1">{t.subtitle}</p>
              </button>
            );
          })}
        </div>

        {/* PERIOD SELECTOR ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1">
              Periode:
            </span>

            <button
              type="button"
              onClick={() => setPeriod('TODAY')}
              className={`px-3 py-1.5 text-xs font-semibold border cursor-pointer rounded transition-colors ${
                period === 'TODAY'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-500 hover:text-amber-700'
              }`}
            >
              Hari Ini
            </button>

            <button
              type="button"
              onClick={() => setPeriod('MONTH')}
              className={`px-3 py-1.5 text-xs font-semibold border cursor-pointer rounded transition-colors ${
                period === 'MONTH'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-500 hover:text-amber-700'
              }`}
            >
              Bulan Ini
            </button>

            <button
              type="button"
              onClick={() => setPeriod('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold border cursor-pointer rounded transition-colors ${
                period === 'ALL'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-500 hover:text-amber-700'
              }`}
            >
              Semua Waktu
            </button>

            <button
              type="button"
              onClick={() => setPeriod('CUSTOM')}
              className={`px-3 py-1.5 text-xs font-semibold border cursor-pointer rounded transition-colors ${
                period === 'CUSTOM'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-500 hover:text-amber-700'
              }`}
            >
              Kustom Tanggal
            </button>

            {period === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded font-mono bg-white"
                />
                <span className="text-xs text-slate-500">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded font-mono bg-white"
                />
              </div>
            )}
          </div>

          {/* Quick Search inside Table */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari dalam tabel preview..."
              value={searchTableQuery}
              onChange={(e) => setSearchTableQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Main Table Preview Area with Color-Coded Money (+ Green, - Red) */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          {/* Table 1: Rincian Stok */}
          {activeTemplate === 'stock' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-3">ID Produk</th>
                    <th className="py-3 px-4">Nama Menu</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3 text-right">Harga Jual</th>
                    <th className="py-3 px-3 text-right">Stok Fisik</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-right">HPP Satuan</th>
                    <th className="py-3 px-4 text-right">Nilai Stok (+ Hijau)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockData
                    .filter((r) => !searchTableQuery || r.name.toLowerCase().includes(searchTableQuery.toLowerCase()))
                    .map((row, idx) => (
                      <tr key={row.productId} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{row.productId}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{row.name}</td>
                        <td className="py-3 px-3 text-slate-600">{row.category}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(row.price)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                          {row.stockQuantity} porsi
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.status === 'Tersedia'
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.status === 'Menipis'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(row.unitCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/40">
                          +{formatCurrency(row.stockValue)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table 2: Jumlah Pembelian (Item Sales) */}
          {activeTemplate === 'item_sales' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Nama Menu</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3 text-right">Harga Satuan</th>
                    <th className="py-3 px-3 text-right">Qty Terjual</th>
                    <th className="py-3 px-4 text-right">Omzet Kotor</th>
                    <th className="py-3 px-4 text-right">Omzet Bersih (+ Hijau)</th>
                    <th className="py-3 px-3 text-right">Kontribusi %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemSalesData
                    .filter((r) => !searchTableQuery || r.name.toLowerCase().includes(searchTableQuery.toLowerCase()))
                    .map((row, idx) => (
                      <tr key={row.name} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{row.name}</td>
                        <td className="py-3 px-3 text-slate-600">{row.category}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">{formatCurrency(row.price)}</td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-900">
                          {row.totalQtySold} porsi
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">{formatCurrency(row.grossSales)}</td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/40">
                          +{formatCurrency(row.netSales)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                          {row.salesSharePercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table 3: Data Pelanggan */}
          {activeTemplate === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Nama Pelanggan</th>
                    <th className="py-3 px-3">Kontak / HP</th>
                    <th className="py-3 px-3 text-center">Tier</th>
                    <th className="py-3 px-3 text-right">Total Order</th>
                    <th className="py-3 px-4 text-right">Total Belanja LTV (+ Hijau)</th>
                    <th className="py-3 px-3 text-right">Rata-rata (AOV)</th>
                    <th className="py-3 px-4">Menu Favorit</th>
                    <th className="py-3 px-3">Kunjungan Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customersData
                    .filter((r) => !searchTableQuery || r.name.toLowerCase().includes(searchTableQuery.toLowerCase()))
                    .map((row, idx) => (
                      <tr key={row.name} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{row.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{row.phone || '-'}</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.tier === 'VIP'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : row.tier === 'Reguler'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.tier}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">{row.totalOrders}x</td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/40">
                          +{formatCurrency(row.totalSpent)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatCurrency(row.averageOrderValue)}
                        </td>
                        <td className="py-3 px-4 text-slate-800">{row.favoriteItem}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{row.lastVisit}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table 4: Rincian Keuangan (Profit & Loss) */}
          {activeTemplate === 'financial' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Tanggal Rekap</th>
                    <th className="py-3 px-3 text-center">Transaksi</th>
                    <th className="py-3 px-4 text-right">Omzet Kotor</th>
                    <th className="py-3 px-4 text-right">Diskon (- Merah)</th>
                    <th className="py-3 px-4 text-right">Omzet Bersih (+ Hijau)</th>
                    <th className="py-3 px-4 text-right">Belanja Bahan (- Merah)</th>
                    <th className="py-3 px-4 text-right">Estimasi Laba Bersih</th>
                    <th className="py-3 px-3 text-right">Cash</th>
                    <th className="py-3 px-3 text-right">QRIS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financialData.map((row) => (
                    <tr key={row.date} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">{row.date}</td>
                      <td className="py-3 px-3 text-center font-mono font-semibold">{row.totalTransactions}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">{formatCurrency(row.grossSales)}</td>

                      {/* Diskon = Minus Red */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 bg-rose-50/40">
                        {row.discounts > 0 ? `- ${formatCurrency(row.discounts)}` : 'Rp 0'}
                      </td>

                      {/* Omzet Bersih = Plus Green */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/40">
                        +{formatCurrency(row.netSales)}
                      </td>

                      {/* Belanja Bahan = Minus Red */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 bg-rose-50/40">
                        {row.supplierExpenses > 0 ? `- ${formatCurrency(row.supplierExpenses)}` : 'Rp 0'}
                      </td>

                      {/* Laba Bersih = Green if positive, Red if negative */}
                      <td
                        className={`py-3 px-4 text-right font-mono font-black ${
                          row.netProfit >= 0 ? 'text-emerald-700 bg-emerald-100/40' : 'text-rose-600 bg-rose-100/40'
                        }`}
                      >
                        {row.netProfit >= 0 ? `+ ${formatCurrency(row.netProfit)}` : formatCurrency(row.netProfit)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700">{formatCurrency(row.cashSales)}</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 font-semibold">
                        {formatCurrency(row.qrisSales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table 5: Pengeluaran (Belanja Supplier) */}
          {activeTemplate === 'expenses' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">No Bukti</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-4">Nama Bahan</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3 text-right">Kuantitas</th>
                    <th className="py-3 px-3 text-right">Harga Satuan</th>
                    <th className="py-3 px-4 text-right">Total Belanja (- Merah)</th>
                    <th className="py-3 px-4">Supplier &amp; Lokasi</th>
                    <th className="py-3 px-3">Kasir PIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expensesData
                    .filter(
                      (r) =>
                        !searchTableQuery ||
                        r.itemName.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
                        r.supplierName.toLowerCase().includes(searchTableQuery.toLowerCase())
                    )
                    .map((row) => (
                      <tr key={row.expenseNumber} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.expenseNumber}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{row.date}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.itemName}
                          {row.notes && <span className="block text-[10px] text-slate-500 font-normal italic">{row.notes}</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                            {row.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {row.quantity} {row.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(row.unitPrice)}
                        </td>

                        {/* Pengeluaran = Minus Red */}
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-rose-600 bg-rose-50/50">
                          - {formatCurrency(row.totalPrice)}
                        </td>

                        <td className="py-3 px-4 text-slate-800">
                          <span className="font-bold block">{row.supplierName}</span>
                          <span className="text-[10px] text-slate-500 truncate block max-w-[200px]">
                            {row.supplierLocation}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-800">{row.cashierName}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table 6: Rincian Transaksi */}
          {activeTemplate === 'transactions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">No Nota</th>
                    <th className="py-3 px-3">Waktu Transaksi</th>
                    <th className="py-3 px-3">Kasir Shift</th>
                    <th className="py-3 px-3">Pelanggan</th>
                    <th className="py-3 px-4">Rincian Menu</th>
                    <th className="py-3 px-3 text-right">Subtotal</th>
                    <th className="py-3 px-3 text-right">Diskon (- Merah)</th>
                    <th className="py-3 px-4 text-right">Total Akhir (+ Hijau)</th>
                    <th className="py-3 px-3 text-center">Metode</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactionsDetailData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Belum ada data transaksi pada rentang periode ini.
                      </td>
                    </tr>
                  ) : (
                    transactionsDetailData
                      .filter(
                        (r) =>
                          !searchTableQuery ||
                          r.transactionNumber.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
                          r.customerName.toLowerCase().includes(searchTableQuery.toLowerCase())
                      )
                      .map((row) => (
                        <tr key={row.transactionNumber} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.transactionNumber}</td>
                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{row.dateTime}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold rounded text-[10px] border border-amber-200">
                              {row.cashierName}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">{row.customerName}</td>
                          <td className="py-3 px-4 text-slate-700 max-w-[250px] truncate" title={row.itemsSummary}>
                            {row.itemsSummary}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(row.subtotal)}</td>

                          {/* Diskon = Red */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 bg-rose-50/40">
                            {row.discountAmount > 0 ? `- ${formatCurrency(row.discountAmount)}` : 'Rp 0'}
                          </td>

                          {/* Total Akhir = Green */}
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/40">
                            +{formatCurrency(row.total)}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.paymentMethod === 'QRIS'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {row.paymentMethod}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
