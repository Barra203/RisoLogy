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
import { useSmoothDragScroll } from '../hooks/useDragScroll';

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
  const [period, setPeriod] = useState<PeriodFilter>('ALL');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedRekap, setCopiedRekap] = useState<boolean>(false);
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Smooth Drag-to-Scroll untuk Tabel Preview Ekspor (Tanpa Mouse Wheel Horizontal)
  const { scrollRef, dragProps, isDragging } = useSmoothDragScroll();

  // Date range
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Helper client-side CSV download dengan UTF-8 BOM (\uFEFF) & pemisah titik koma (;) agar kompatibel Excel & Google Sheets
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const BOM = '\uFEFF'; // Agar Excel membaca encoding UTF-8 dengan benar
    const csvContent = [
      headers.join(';'),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
      ),
    ].join('\r\n');

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateSuffix = new Date().toISOString().split('T')[0];
    const cleanName = filename.replace(/\.csv$/i, '');
    const finalFilename = cleanName.endsWith(dateSuffix)
      ? `${cleanName}.csv`
      : `${cleanName}_${dateSuffix}.csv`;
    link.setAttribute('download', finalFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

    return expenses.filter((exp: any) => {
      let expTime = Number(exp.timestamp) || 0;
      if (exp.date && /^\d{4}-\d{2}-\d{2}$/.test(String(exp.date))) {
        const [y, m, d] = String(exp.date).split('-').map(Number);
        expTime = new Date(y, m - 1, d, 12, 0, 0).getTime();
      } else if (!expTime && exp.createdAt?.toDate) {
        expTime = exp.createdAt.toDate().getTime();
      } else if (!expTime && exp.createdAt) {
        const parsed = new Date(exp.createdAt).getTime();
        if (!isNaN(parsed)) expTime = parsed;
      }

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

  // Fitur 1: Ekspor Riwayat Transaksi (Download CSV Transaksi)
  const handleExportTransactions = () => {
    const sourceTransactions =
      filteredTransactions.length > 0 ? filteredTransactions : transactions;
    const headers = [
      'No Transaksi',
      'Tanggal',
      'Waktu',
      'Nama Pelanggan',
      'Kasir',
      'Batch',
      'Metode Pembayaran',
      'Status',
      'Total Belanja',
      'Rincian Pesanan',
      'Catatan',
    ];
    const rows = sourceTransactions.map((t: any) => {
      const dt = formatDateTime(t.timestamp);
      return [
        t.transactionNumber || t.id,
        t.date || dt.date || '-',
        t.time || dt.time || '-',
        t.customerName || 'Umum',
        t.cashierName || t.cashier || '-',
        t.batch || 'Batch 1',
        t.paymentMethod === 'CASH' ? 'Tunai' : t.paymentMethod || 'Tunai',
        t.status || 'PAID',
        t.total || 0,
        (t.items || [])
          .map((i: any) => `${String(i.name || '').replace(/Rlsol/gi, 'Risol')} (${i.quantity ?? i.qty ?? 1}x)`)
          .join(', '),
        t.notes || '-',
      ];
    });
    exportToCSV('Laporan_Transaksi_RisoLogy', headers, rows);
  };

  // Fitur 2: Ekspor Belanja Bahan / Pengeluaran Supplier (Download CSV Pengeluaran)
  const handleExportExpenses = () => {
    if (!expenses || expenses.length === 0) {
      setExportNotice('Belum ada data belanja bahan / pengeluaran untuk diekspor.');
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    const sourceExpenses = filteredExpenses.length > 0 ? filteredExpenses : expenses;

    const headers = [
      'No',
      'Tanggal Belanja',
      'Kategori',
      'Nama Bahan / Keperluan',
      'Tempat Beli / Supplier',
      'Kasir / PIC',
      'Batch',
      'Total Biaya (Rp)',
    ];

    const rows = sourceExpenses.map((exp: any, index: number) => {
      // Ambil tanggal dari berbagai kemungkinan field (date, createdAt, timestamp)
      let formattedDate = '-';
      if (exp.date) {
        formattedDate = exp.date;
      } else if (exp.createdAt?.toDate) {
        formattedDate = exp.createdAt.toDate().toLocaleDateString('id-ID');
      } else if (exp.createdAt) {
        formattedDate = new Date(exp.createdAt).toLocaleDateString('id-ID');
      } else if (exp.timestamp) {
        formattedDate = new Date(exp.timestamp).toLocaleDateString('id-ID');
      }

      // Ambil nama item, supplier, PIC, dan nominal dari field yang tersedia di objek expense
      const itemName = exp.name || exp.itemName || exp.description || '-';
      const category = exp.category || 'Bahan Utama';
      const supplier = exp.supplier || exp.supplierName || exp.store || '-';
      const pic = exp.cashier || exp.cashierName || exp.pic || '-';
      const batch = exp.batch || 'Batch 1';
      const totalAmount = Number(
        exp.total ?? exp.amount ?? exp.unitPrice ?? exp.totalBelanja ?? exp.totalPrice ?? 0
      );

      return [
        index + 1,
        formattedDate,
        category,
        itemName,
        supplier,
        pic,
        batch,
        totalAmount,
      ];
    });

    exportToCSV('Laporan_Pengeluaran_Supplier_RisoLogy', headers, rows);
  };

  // Fitur 3: Salin Rekap ke Clipboard (Excel Ready - berpemisah tab \t)
  const handleCopyRekapClipboard = () => {
    const isPaid = (s?: string) => {
      const u = (s || 'PAID').toUpperCase();
      return u === 'PAID' || u === 'LUNAS';
    };

    const paidTxs = filteredTransactions.filter((t) => isPaid(t.status));
    const totalOmzet = paidTxs.reduce((acc, t) => acc + (Number(t.total) || 0), 0);
    const totalPengeluaran = filteredExpenses.reduce(
      (acc, e) => acc + (Number(e.total ?? e.totalBelanja ?? e.amount ?? e.totalPrice) || 0),
      0
    );
    const labaBersih = totalOmzet - totalPengeluaran;

    // Rincian per Batch
    const batchMap = new Map<
      string,
      { txCount: number; omzet: number; pengeluaran: number }
    >();

    paidTxs.forEach((t) => {
      const b = t.batch || 'Batch 1';
      const cur = batchMap.get(b) || { txCount: 0, omzet: 0, pengeluaran: 0 };
      cur.txCount += 1;
      cur.omzet += Number(t.total) || 0;
      batchMap.set(b, cur);
    });

    filteredExpenses.forEach((e) => {
      const b = e.batch || 'Batch 1';
      const cur = batchMap.get(b) || { txCount: 0, omzet: 0, pengeluaran: 0 };
      cur.pengeluaran += Number(e.total ?? e.totalBelanja ?? e.amount ?? e.totalPrice) || 0;
      batchMap.set(b, cur);
    });

    const lines: string[] = [
      ['REKAP LAPORAN KEUANGAN RISOLOGY', new Date().toISOString().slice(0, 10)].join('\t'),
      ['Metrik', 'Nilai (Rp)', 'Keterangan'].join('\t'),
      ['Total Omzet Masuk (Lunas)', String(totalOmzet), `${paidTxs.length} Transaksi`].join('\t'),
      ['Total Pengeluaran Bahan', String(totalPengeluaran), `${filteredExpenses.length} Catatan Belanja`].join('\t'),
      ['Estimasi Laba Bersih', String(labaBersih), labaBersih >= 0 ? 'Surplus' : 'Defisit'].join('\t'),
      '',
      ['RINCIAN REKAP PER BATCH'].join('\t'),
      ['Nama Batch', 'Jumlah Transaksi', 'Omzet Masuk (Rp)', 'Pengeluaran Bahan (Rp)', 'Laba Bersih Batch (Rp)'].join('\t'),
      ...Array.from(batchMap.entries()).map(([batchName, stat]) =>
        [
          batchName,
          String(stat.txCount),
          String(stat.omzet),
          String(stat.pengeluaran),
          String(stat.omzet - stat.pengeluaran),
        ].join('\t')
      ),
    ];

    navigator.clipboard.writeText(lines.join('\r\n')).then(() => {
      setCopiedRekap(true);
      setTimeout(() => setCopiedRekap(false), 2200);
    });
  };

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
      .filter((t) => t.status === 'PAID' || t.status === 'Lunas')
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
      cur.expenses += Number(exp.total ?? exp.totalBelanja ?? exp.amount ?? exp.totalPrice) || 0;
      dateMap.set(d, cur);
    });

    // If today is empty, push today with 0
    if (dateMap.size === 0) {
      dateMap.set(formatDateTime(Date.now()).date, { txs: [], expenses: 0 });
    }

    const isPaid = (s?: string) => s === 'PAID' || s === 'Lunas';

    return Array.from(dateMap.entries()).map(([dateStr, record]) => {
      const count = record.txs.length;
      const grossSales = record.txs.reduce((a, t) => a + (isPaid(t.status) ? t.subtotal : 0), 0);
      const discounts = record.txs.reduce((a, t) => a + (isPaid(t.status) ? t.discountAmount : 0), 0);
      const netSales = record.txs.reduce((a, t) => a + (isPaid(t.status) ? t.total : 0), 0);
      const supplierExpenses = record.expenses;
      const netProfit = netSales - supplierExpenses;
      const cashSales = record.txs
        .filter((t) => t.paymentMethod === 'CASH' && isPaid(t.status))
        .reduce((a, t) => a + t.total, 0);
      const qrisSales = record.txs
        .filter((t) => t.paymentMethod === 'QRIS' && isPaid(t.status))
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
    const source = filteredExpenses.length > 0 ? filteredExpenses : expenses;
    return source.map((exp: any, index: number) => {
      let formattedDate = '-';
      if (exp.date) {
        formattedDate = exp.date;
      } else if (exp.createdAt?.toDate) {
        formattedDate = exp.createdAt.toDate().toLocaleDateString('id-ID');
      } else if (exp.createdAt) {
        formattedDate = new Date(exp.createdAt).toLocaleDateString('id-ID');
      } else if (exp.timestamp) {
        formattedDate = new Date(exp.timestamp).toLocaleDateString('id-ID');
      }

      const resolvedTotal = Number(
        exp.total ?? exp.amount ?? exp.unitPrice ?? exp.totalBelanja ?? exp.totalPrice ?? 0
      );
      return {
        expenseNumber: exp.expenseNumber || `#EXP-${String(index + 1).padStart(4, '0')}`,
        date: formattedDate,
        itemName: exp.name || exp.itemName || exp.description || '-',
        category: exp.category || 'Bahan Utama',
        quantity: exp.quantity ?? 1,
        unit: exp.unit ?? 'paket',
        unitPrice: exp.unitPrice ?? resolvedTotal,
        totalPrice: resolvedTotal,
        supplierName: exp.supplier || exp.supplierName || exp.store || '-',
        supplierLocation: exp.supplierLocation || exp.batch || 'Batch 1',
        cashierName: exp.cashier || exp.cashierName || exp.pic || '-',
        notes: exp.notes,
      };
    });
  }, [filteredExpenses, expenses]);

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

  // Download Active Template CSV Action (menggunakan UTF-8 BOM & semicolon format)
  const handleDownloadCsv = () => {
    if (activeTemplate === 'transactions') {
      handleExportTransactions();
      return;
    }
    if (activeTemplate === 'expenses') {
      handleExportExpenses();
      return;
    }
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + currentCsv], { type: 'text/csv;charset=utf-8;' });
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
    <div className="flex-1 flex flex-col min-h-screen w-full bg-[#F5F5F5]">
      {/* Top Header */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 shrink-0 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ekspor Laporan</h1>
          </div>

          {/* Primary Real Export Action Buttons (CSV Transaksi, CSV Pengeluaran, Salin Rekap Clipboard) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportTransactions}
              className="px-3.5 py-2 bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV Transaksi</span>
            </button>

            <button
              type="button"
              onClick={handleExportExpenses}
              className="px-3.5 py-2 bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-amber-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs rounded-lg"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>Download CSV Pengeluaran</span>
            </button>

            <button
              type="button"
              onClick={handleCopyRekapClipboard}
              className="px-3.5 py-2 bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-amber-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs rounded-lg"
              title="Salin ringkasan keuangan & rekap per batch berpemisah Tab untuk di-paste ke Excel / Google Sheets"
            >
              {copiedRekap ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Rekap Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-600" />
                  <span>Salin Rekap ke Clipboard (Excel Ready)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyTsv}
              className="px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer rounded-lg"
              title="Salin tabel preview aktif ke Clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Tabel Tersalin!</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Tabel Aktif</span>
                </>
              )}
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
        {exportNotice && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center justify-between">
            <span>{exportNotice}</span>
            <button
              type="button"
              onClick={() => setExportNotice(null)}
              className="text-amber-600 hover:text-amber-900 ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div
            ref={scrollRef}
            {...dragProps}
            className={`w-full overflow-x-auto select-none scroll-smooth transition-all ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ scrollbarWidth: 'thin' }}
          >
          {/* Table 1: Rincian Stok */}
          {activeTemplate === 'stock' && (
            <div>
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
                                row.status === 'PAID' || row.status === 'Lunas'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : row.status === 'UNPAID' || row.status === 'Belum Bayar'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-300'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {row.status === 'UNPAID' || row.status === 'Belum Bayar'
                                ? 'Belum Bayar'
                                : row.status === 'REFUNDED' || row.status === 'Refund'
                                ? 'Refund'
                                : 'Lunas'}
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
    </div>
  );
};
