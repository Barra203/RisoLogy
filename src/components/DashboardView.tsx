import React, { useMemo, useState } from 'react';
import { usePos } from '../context/PosContext';
import { SupplierExpense, Transaction } from '../types/pos';
import {
  Wallet,
  TrendingUp,
  Truck,
  Landmark,
  Plus,
  Check,
  X,
  Edit2,
  ArrowUpRight,
} from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';
import { formatCurrency } from '../utils/formatters';
import { calculateKitchenProduction } from '../utils/risolCalculator';

// Helper untuk mengekstrak nominal pengeluaran secara konsisten
const getExpenseNominal = (item: SupplierExpense): number => {
  const nominal =
    item.total ??
    item.amount ??
    item.totalPrice ??
    Number(item.quantity || 0) * Number(item.unitPrice || 0);
  return Number(nominal) || 0;
};

// Helper mengecek apakah transaksi berstatus Lunas
const isTransactionPaid = (tx: Transaction): boolean => {
  if (!tx.status) return true;
  return tx.status === 'Lunas' || tx.status === 'PAID';
};

// Helper konversi tanggal pengeluaran (`YYYY-MM-DD` atau `timestamp`) ke milidetik
const getExpenseTimestamp = (item: SupplierExpense): number => {
  if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
    const [y, m, d] = item.date.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0).getTime();
  }
  return item.timestamp || 0;
};

// Ikon Risol Bulat Keemasan Tanpa Border Hitam untuk Daftar Menu Terlaris
const GoldenRisolThumbnail: React.FC<{ index: number }> = ({ index }) => {
  const bgTones = [
    'bg-amber-100 text-amber-700',
    'bg-amber-50 text-amber-600',
    'bg-orange-50 text-orange-600',
  ];
  const tone = bgTones[index % bgTones.length];
  return (
    <div
      className={`w-10 h-10 rounded-full ${tone} flex items-center justify-center shrink-0 select-none`}
    >
      <svg viewBox="0 0 36 36" className="w-6 h-6" fill="none">
        <rect
          x="5"
          y="10"
          width="26"
          height="16"
          rx="8"
          fill="#F59E0B"
        />
        <rect
          x="7"
          y="12"
          width="22"
          height="12"
          rx="6"
          fill="#D97706"
        />
        <circle cx="13" cy="17" r="1.5" fill="#FEF3C7" />
        <circle cx="18" cy="19" r="1.5" fill="#FEF3C7" />
        <circle cx="23" cy="16.5" r="1.5" fill="#FEF3C7" />
      </svg>
    </div>
  );
};

export const DashboardView: React.FC = () => {
  const {
    transactions,
    products,
    expenses,
    settings,
    availableBatches: contextBatches,
    updateInitialCapital,
    setActiveBatch,
    addBatch,
    setActiveTab,
    viewReceipt,
    isPrivacyMode,
  } = usePos();

  // Filter Periode: 'today' | '7days' | '30days' | 'all'
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('all');

  // Filter Batch Produksi
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [isAddingBatch, setIsAddingBatch] = useState<boolean>(false);
  const [newBatchInput, setNewBatchInput] = useState<string>('');

  // Modal Edit Cepat Modal Awal Usaha
  const [showCapitalModal, setShowCapitalModal] = useState<boolean>(false);
  const [modalAmount, setModalAmount] = useState<string>(
    String(settings.initialCapital ?? 250000)
  );
  const [modalSource, setModalSource] = useState<string>(
    settings.capitalSource || 'Iuran Kelompok'
  );
  const [modalBatch, setModalBatch] = useState<string>(
    settings.capitalBatch || 'Testing'
  );
  const [modalDate, setModalDate] = useState<string>(
    settings.capitalDate || new Date().toISOString().split('T')[0]
  );

  // Smooth Drag-to-Scroll untuk Tabel Transaksi Terbaru (Touch & Wheel Pass-Through)
  const tableScrollRef = useDragScroll<HTMLDivElement>();

  const availableBatches = useMemo(() => {
    const set = new Set<string>(
      contextBatches && contextBatches.length > 0
        ? contextBatches
        : settings.availableBatches || ['Testing', 'Batch 1', 'Batch 2']
    );
    if (settings.capitalBatch) set.add(settings.capitalBatch);
    if (settings.activeBatch) set.add(settings.activeBatch);
    transactions.forEach((tx) => {
      if (tx.batch) set.add(tx.batch);
    });
    expenses.forEach((exp) => {
      if (exp.batch) set.add(exp.batch);
    });
    return Array.from(set);
  }, [
    contextBatches,
    settings.availableBatches,
    settings.capitalBatch,
    settings.activeBatch,
    transactions,
    expenses,
  ]);

  const capitalBatchOptions = useMemo(() => {
    const set = new Set<string>(['Testing', ...availableBatches]);
    return Array.from(set);
  }, [availableBatches]);

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newBatchInput.trim();
    if (!cleaned) return;
    addBatch(cleaned);
    setSelectedBatch(cleaned);
    setNewBatchInput('');
    setIsAddingBatch(false);
  };

  const handleOpenCapitalModal = () => {
    setModalAmount(String(settings.initialCapital ?? 250000));
    setModalSource(
      settings.capitalSource && settings.capitalSource !== 'Modal Kelompok / Mandiri'
        ? settings.capitalSource
        : 'Iuran Kelompok'
    );
    setModalBatch(settings.capitalBatch || 'Testing');
    setModalDate(settings.capitalDate || new Date().toISOString().split('T')[0]);
    setShowCapitalModal(true);
  };

  const handleSaveModalCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Math.max(0, parseInt(modalAmount.replace(/\D/g, ''), 10) || 0);
    await updateInitialCapital(
      cleanAmount,
      modalSource.trim() || 'Iuran Kelompok',
      modalBatch || 'Testing',
      modalDate
    );
    setShowCapitalModal(false);
  };

  // Filter Transaksi berdasarkan Batch & Periode
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

    return batchFiltered.filter((t) => {
      if (timeRange === 'today') {
        const d = new Date(t.timestamp);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        return dStr === todayStr || t.timestamp >= startOfToday;
      }
      if (timeRange === '7days') return t.timestamp >= sevenDaysAgo;
      if (timeRange === '30days') return t.timestamp >= thirtyDaysAgo;
      return true;
    });
  }, [transactions, selectedBatch, timeRange]);

  // Filter Belanja Bahan berdasarkan Batch & Periode
  const filteredExpenses = useMemo(() => {
    const batchFiltered =
      selectedBatch === 'ALL'
        ? expenses
        : expenses.filter((exp) => (exp.batch || 'Batch 1') === selectedBatch);

    if (timeRange === 'all') return batchFiltered;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 86400000;
    const thirtyDaysAgo = startOfToday - 30 * 86400000;

    return batchFiltered.filter((exp) => {
      const ts = getExpenseTimestamp(exp);
      if (timeRange === 'today') {
        return exp.date === todayStr || ts >= startOfToday;
      }
      if (timeRange === '7days') return ts >= sevenDaysAgo;
      if (timeRange === '30days') return ts >= thirtyDaysAgo;
      return true;
    });
  }, [expenses, selectedBatch, timeRange]);

  // Transaksi Lunas Aktif berdasarkan filter Batch & Periode
  const activePaidTransactions = useMemo(() => {
    return filteredTransactions.filter(
      (t) =>
        !t.status ||
        (t.status || '').toUpperCase() === 'PAID' ||
        (t.status || '').toLowerCase() === 'lunas'
    );
  }, [filteredTransactions]);

  // Kalkulasi Dinamis Metode Pembayaran (Hanya QRIS & Tunai/Cash)
  const paymentSummary = useMemo(() => {
    let qrisTotal = 0;
    let qrisCount = 0;
    let cashTotal = 0;
    let cashCount = 0;

    activePaidTransactions.forEach((t) => {
      const method = (t.paymentMethod || '').toUpperCase();
      const amount = Number(t.total) || 0;

      if (method.includes('QRIS')) {
        qrisTotal += amount;
        qrisCount += 1;
      } else {
        // Default / Tunai / Cash
        cashTotal += amount;
        cashCount += 1;
      }
    });

    const grandTotal = qrisTotal + cashTotal;
    const qrisPercent = grandTotal > 0 ? Math.round((qrisTotal / grandTotal) * 100) : 0;
    const cashPercent = grandTotal > 0 ? 100 - qrisPercent : 0;

    return {
      qrisTotal,
      qrisCount,
      qrisPercent,
      cashTotal,
      cashCount,
      cashPercent,
      grandTotal,
      totalCount: activePaidTransactions.length,
    };
  }, [activePaidTransactions]);

  // 1. Tentukan modal awal untuk batch yang sedang aktif dilihat
  const activeInitialCapital = useMemo(() => {
    const designatedBatch = settings?.capitalBatch || 'Testing';
    if (selectedBatch === 'ALL' || selectedBatch === designatedBatch) {
      return Number(settings?.initialCapital) || 0;
    }
    return 0; // Batch lain tidak menerima injeksi modal baru
  }, [selectedBatch, settings?.capitalBatch, settings?.initialCapital]);

  // 2. Akumulasi pemasukan dan pengeluaran batch terpilih (hanya transaksi PAID)
  const batchRevenue = useMemo(() => {
    return filteredTransactions
      .filter(
        (t) =>
          (t.status || '').toUpperCase() === 'PAID' ||
          (t.status || '').toLowerCase() === 'lunas'
      )
      .reduce((sum, t) => sum + (Number(t.total) || 0), 0);
  }, [filteredTransactions]);

  const batchExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + getExpenseNominal(e), 0);
  }, [filteredExpenses]);

  // 3. Estimasi Sisa Kas Akurat (Modal Aktif + Omzet Masuk - Pengeluaran)
  const cashOnHand = activeInitialCapital + batchRevenue - batchExpenses;

  // 4. Rekap Kebutuhan Produksi Dapur (Kitchen Prep List) berdasarkan transaksi terfilter
  const productionData = useMemo(() => {
    return calculateKitchenProduction(filteredTransactions);
  }, [filteredTransactions]);

  // Kalkulasi Metrik Keuangan Utama
  const metrics = useMemo(() => {
    const netSales = batchRevenue;
    const totalExpenses = batchExpenses;
    const designatedBatch = settings?.capitalBatch || 'Testing';
    const capitalSourceLabel =
      !settings.capitalSource || settings.capitalSource === 'Modal Kelompok / Mandiri'
        ? 'Iuran Kelompok'
        : settings.capitalSource;

    const estimatedRemainingCash = cashOnHand;

    // Hitung Menu Terlaris dari transaksi riil
    const itemSalesMap: Record<
      string,
      { name: string; qty: number; revenue: number }
    > = {};

    activePaidTransactions.forEach((t) => {
      t.items.forEach((item) => {
        const itemName = item.name || 'Risol Mix';
        const itemPrice = Number(item.price) || 12000;
        const itemQty = Number(item.quantity) || 0;
        if (!itemSalesMap[itemName]) {
          itemSalesMap[itemName] = {
            name: itemName,
            qty: 0,
            revenue: 0,
          };
        }
        itemSalesMap[itemName].qty += itemQty;
        itemSalesMap[itemName].revenue += item.subtotal ?? itemPrice * itemQty;
      });
    });

    let bestSellers = Object.values(itemSalesMap).sort((a, b) => b.qty - a.qty);

    // Jika belum ada item terjual pada filter aktif, tampilkan katalog menu dengan 0 porsi terjual
    if (bestSellers.length === 0) {
      const baseCatalog =
        products.length > 0
          ? products.slice(0, 3)
          : [
              { name: 'Risol Mix', price: 12000 },
              { name: 'Risol Mac-n-Cheese', price: 12000 },
              { name: 'Risol Ayam Balado', price: 12000 },
            ];
      bestSellers = baseCatalog.map((prod) => ({
        name: prod.name,
        qty: 0,
        revenue: 0,
      }));
    }

    return {
      initialCapital: activeInitialCapital,
      designatedBatch,
      capitalSourceLabel,
      netSales,
      paidCount: activePaidTransactions.length,
      totalTxCount: filteredTransactions.length,
      totalExpenses,
      expenseNotaCount: filteredExpenses.length,
      estimatedRemainingCash,
      bestSellers: bestSellers.slice(0, 3),
    };
  }, [
    activeInitialCapital,
    batchRevenue,
    batchExpenses,
    cashOnHand,
    activePaidTransactions,
    filteredTransactions.length,
    filteredExpenses.length,
    settings?.capitalBatch,
    settings.capitalSource,
    products,
  ]);

  // Geometri SVG Donut Chart 2 Segmen (QRIS & Cash)
  const donutChartGeometry = useMemo(() => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const qrisArcLength = (paymentSummary.qrisPercent / 100) * circumference;
    const cashArcLength = (paymentSummary.cashPercent / 100) * circumference;

    return {
      radius,
      circumference,
      qrisStrokeDasharray: `${qrisArcLength} ${circumference}`,
      cashStrokeDasharray: `${cashArcLength} ${circumference}`,
      cashStrokeDashoffset: -qrisArcLength,
    };
  }, [paymentSummary.qrisPercent, paymentSummary.cashPercent]);

  // Helper untuk mendapatkan rentang hari Senin s/d Minggu minggu ini dari transaksi riil
  const weeklySalesData = useMemo(() => {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Ambil tanggal awal minggu ini (Senin)
    const now = new Date();
    const currentDayIndex = now.getDay(); // 0 = Minggu, 1 = Senin, ...
    const distanceToMonday = (currentDayIndex + 6) % 7;

    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    // Siapkan map penampung total per hari
    const dayTotals: { [key: string]: number } = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    // Hanya proses transaksi lunas yang lolos filter batch
    const paidTx = filteredTransactions.filter((tx) => {
      const st = (tx.status || 'PAID').toUpperCase();
      return st === 'PAID' || st === 'LUNAS';
    });

    paidTx.forEach((tx) => {
      let txDate: Date | null = null;
      const rawTx = tx as Transaction & {
        createdAt?: { toDate?: () => Date } | string | number;
        date?: string | number;
      };

      // Parse tanggal transaksi (baik Timestamp Firestore, string ISO, string tanggal, atau timestamp)
      if (
        rawTx.createdAt &&
        typeof rawTx.createdAt === 'object' &&
        typeof rawTx.createdAt.toDate === 'function'
      ) {
        txDate = rawTx.createdAt.toDate();
      } else if (rawTx.createdAt) {
        txDate = new Date(rawTx.createdAt as string | number);
      } else if (rawTx.date) {
        txDate = new Date(rawTx.date);
      } else if (rawTx.timestamp) {
        txDate = new Date(rawTx.timestamp);
      }

      if (txDate && !isNaN(txDate.getTime())) {
        // Hitung selisih hari dari Senin minggu ini
        const diffTime = txDate.getTime() - monday.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Masuk dalam rentang 7 hari (Senin = 0 s/d Minggu = 6)
        if (diffDays >= 0 && diffDays < 7) {
          const dayKey = daysOfWeek[diffDays];
          dayTotals[dayKey] += Number(tx.total) || 0;
        }
      }
    });

    // Susun array final untuk grafik
    const result = daysOfWeek.map((day) => ({
      day,
      amount: dayTotals[day],
      formattedLabel:
        dayTotals[day] > 0
          ? `Rp ${(dayTotals[day] / 1000).toLocaleString('id-ID')}k`
          : 'Rp 0',
    }));

    const maxAmount = Math.max(...result.map((d) => d.amount), 1);

    return { sales: result, maxAmount };
  }, [filteredTransactions]);

  // Daftar Transaksi Terbaru (5 Baris Teratas dari Transaksi Riil)
  const recentTransactionsList = useMemo(() => {
    const sorted = [...filteredTransactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

    return sorted.map((tx) => {
      const d = new Date(tx.timestamp);
      const dateFormatted = d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const itemSummary = tx.items
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(', ');
      return {
        id: tx.id,
        transactionNumber: tx.transactionNumber,
        customerName: tx.customerName || 'Pelanggan Umum',
        itemSummary: itemSummary || 'Risol Mix',
        dateFormatted,
        paymentMethod: tx.paymentMethod,
        total: tx.total,
        isPaid: isTransactionPaid(tx),
        rawTx: tx as Transaction | null,
      };
    });
  }, [filteredTransactions]);

  const activeBatchName = settings.activeBatch || 'Batch 1';

  return (
    <div className="bg-slate-50 h-full min-h-0 overflow-hidden flex flex-col w-full">
      {/* Kontainer Independen yang Dapat Di-scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 safe-bottom-clearance md:pb-8 space-y-5">
        {/* === 1. HEADER BAR: JUDUL BERSIH, FILTER PERIODE & SELEKTOR BATCH === */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Dashboard Operasional
          </h1>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Periode: Hari Ini | 7 Hari | 30 Hari | Semua */}
            <div className="inline-flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-200/80">
              {(
                [
                  { id: 'today', label: 'Hari Ini' },
                  { id: '7days', label: '7 Hari' },
                  { id: '30days', label: '30 Hari' },
                  { id: 'all', label: 'Semua' },
                ] as const
              ).map((tab) => {
                const isActive = timeRange === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTimeRange(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Selektor Batch Produksi: Semua | Batch 1 (Aktif) | Batch 2 | + Tambah Batch */}
            <div className="inline-flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedBatch('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  selectedBatch === 'ALL'
                    ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200/80'
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
                }`}
              >
                Semua Batch
              </button>

              {availableBatches.map((batchName) => {
                const isCurrentActive = batchName === activeBatchName;
                const isSelected = selectedBatch === batchName;
                return (
                  <button
                    key={batchName}
                    type="button"
                    onClick={() => {
                      setSelectedBatch(batchName);
                      setActiveBatch(batchName);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-amber-50 text-amber-800 border border-amber-300 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    {batchName}
                    {isCurrentActive ? ' (Aktif)' : ''}
                  </button>
                );
              })}

              {!isAddingBatch ? (
                <button
                  type="button"
                  onClick={() => setIsAddingBatch(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#D97706] hover:bg-amber-50 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Batch</span>
                </button>
              ) : (
                <form onSubmit={handleCreateBatch} className="inline-flex items-center gap-1 px-1">
                  <input
                    type="text"
                    value={newBatchInput}
                    onChange={(e) => setNewBatchInput(e.target.value)}
                    placeholder="Batch 3..."
                    autoFocus
                    className="w-24 px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-amber-600 text-slate-900"
                  />
                  <button
                    type="submit"
                    className="p-1 bg-[#D97706] text-white rounded-md hover:bg-amber-700 cursor-pointer"
                    title="Simpan Batch"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingBatch(false);
                      setNewBatchInput('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Batal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* === 2. EMPAT KARTU METRIK UTAMA (FLAT, NON-GRADIENT, 12PX RADIUS) === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Kartu 1: Modal Awal Usaha */}
          <div className="rounded-xl border border-slate-200/80 shadow-sm bg-white p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">
                    Modal Awal Usaha
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenCapitalModal}
                    className="text-slate-400 hover:text-[#D97706] transition-colors cursor-pointer"
                    title="Ubah Modal Awal Usaha"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                  {formatCurrency(activeInitialCapital, isPrivacyMode)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center text-[#D97706] shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            {activeInitialCapital > 0 ? (
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 font-medium">
                <span className="truncate">Dari: {metrics.capitalSourceLabel}</span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold shrink-0">
                  {settings?.capitalBatch || 'Testing'}
                </span>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-500 font-medium truncate">
                {`Teralokasi di Batch ${settings?.capitalBatch || 'Testing'}`}
              </div>
            )}
          </div>

          {/* Kartu 2: Uang Masuk / Omset */}
          <div className="rounded-xl border border-slate-200/80 shadow-sm bg-white p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 block">
                  Uang Masuk / Omset
                </span>
                <div className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                  {formatCurrency(metrics.netSales, isPrivacyMode)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium tabular-nums">
              {metrics.paidCount} Pesanan Sukses
            </div>
          </div>

          {/* Kartu 3: Belanja Bahan / Kas Keluar */}
          <div className="rounded-xl border border-slate-200/80 shadow-sm bg-white p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 block">
                  Belanja Bahan / Kas Keluar
                </span>
                <div className="text-2xl font-bold text-rose-600 tabular-nums tracking-tight">
                  - {formatCurrency(metrics.totalExpenses, isPrivacyMode)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200/70 flex items-center justify-center text-rose-600 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium tabular-nums">
              {metrics.expenseNotaCount} Nota Terbayar
            </div>
          </div>

          {/* Kartu 4: Estimasi Sisa Kas */}
          <div className="rounded-xl border border-slate-200/80 shadow-sm bg-white p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 block">
                  Estimasi Sisa Kas
                </span>
                <div className="text-2xl font-extrabold text-amber-600 tabular-nums tracking-tight">
                  {formatCurrency(metrics.estimatedRemainingCash, isPrivacyMode)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600 shrink-0">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium">
              Kas Akhir + Modal Aktif
            </div>
          </div>
        </div>

        {/* WIDGET KEBUTUHAN PRODUKSI DAPUR */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-4">
          {/* Header: Judul & Rekap Total */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                  Kebutuhan Produksi
                </h3>
                <span className="text-[11px] font-medium text-slate-400 mt-0.5 inline-block">
                  Batch: {selectedBatch === 'ALL' ? 'Semua Batch' : selectedBatch}
                </span>
              </div>
            </div>

            {/* Metric Total Badge */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <span className="text-slate-900 font-bold">{productionData.totalPcs}</span> Pcs
                <span className="text-slate-300 mx-1.5">|</span>
                <span className="text-slate-900 font-bold">{productionData.totalPortions}</span> Porsi
              </div>
            </div>
          </div>

          {/* Kartu Metrik Per Varian */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Varian 1: Ayam Balado */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Ayam Balado
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  {productionData.totalPcs > 0
                    ? Math.round((productionData.ayamBaladoPcs / productionData.totalPcs) * 100)
                    : 0}%
                </span>
              </div>

              <div className="my-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {productionData.ayamBaladoPcs}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">Pcs</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Konversi Porsi</span>
                <span className="font-semibold text-slate-700">
                  {(productionData.ayamBaladoPcs / 3).toFixed(1)} Porsi
                </span>
              </div>
            </div>

            {/* Varian 2: Mac-n-Cheese */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Mac-n-Cheese
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  {productionData.totalPcs > 0
                    ? Math.round((productionData.macCheesePcs / productionData.totalPcs) * 100)
                    : 0}%
                </span>
              </div>

              <div className="my-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {productionData.macCheesePcs}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase">Pcs</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Konversi Porsi</span>
                <span className="font-semibold text-slate-700">
                  {(productionData.macCheesePcs / 3).toFixed(1)} Porsi
                </span>
              </div>
            </div>
          </div>

          {/* Split Ratio Bar */}
          {productionData.totalPcs > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${(productionData.ayamBaladoPcs / productionData.totalPcs) * 100}%`,
                  }}
                  className="bg-amber-600 transition-all duration-300"
                  title={`Ayam Balado: ${productionData.ayamBaladoPcs} Pcs`}
                />
                <div
                  style={{
                    width: `${(productionData.macCheesePcs / productionData.totalPcs) * 100}%`,
                  }}
                  className="bg-amber-400 transition-all duration-300"
                  title={`Mac-n-Cheese: ${productionData.macCheesePcs} Pcs`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                  Ayam Balado ({productionData.ayamBaladoPcs} pcs)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Mac-n-Cheese ({productionData.macCheesePcs} pcs)
                </span>
              </div>
            </div>
          )}

          {/* System Status: Anomali Format Mix (Minimal Alert) */}
          {productionData.unparsedMixPortions > 0 && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 font-medium">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  {productionData.unparsedMixPortions} porsi menu mix tidak memiliki catatan terstruktur (menggunakan rasio default 2:1).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="font-semibold underline cursor-pointer shrink-0 text-amber-800 hover:text-amber-950 ml-2"
              >
                Cek Riwayat
              </button>
            </div>
          )}
        </div>

        {/* === 3. GRAFIK & ANALISIS DATA (2 KOLOM SEJAJAR) === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Kiri: Metode Pembayaran (Transaksi) */}
          <div className="rounded-xl border border-slate-200/80 shadow-sm bg-white p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Metode Pembayaran (Transaksi)
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 my-auto py-2">
              {/* Grafik Doughnut SVG (2 Segmen: QRIS & Cash) */}
              <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={donutChartGeometry.radius}
                    fill="transparent"
                    className="stroke-slate-200"
                    strokeWidth="16"
                  />
                  {paymentSummary.grandTotal > 0 && (
                    <>
                      {paymentSummary.qrisPercent > 0 && (
                        <circle
                          cx="70"
                          cy="70"
                          r={donutChartGeometry.radius}
                          fill="transparent"
                          stroke="#D97706"
                          strokeWidth="16"
                          strokeDasharray={donutChartGeometry.qrisStrokeDasharray}
                          strokeDashoffset={0}
                          strokeLinecap="butt"
                        />
                      )}
                      {paymentSummary.cashPercent > 0 && (
                        <circle
                          cx="70"
                          cy="70"
                          r={donutChartGeometry.radius}
                          fill="transparent"
                          stroke="#F59E0B"
                          strokeWidth="16"
                          strokeDasharray={donutChartGeometry.cashStrokeDasharray}
                          strokeDashoffset={donutChartGeometry.cashStrokeDashoffset}
                          strokeLinecap="butt"
                        />
                      )}
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                  <span className="text-sm font-extrabold text-slate-900 tabular-nums leading-tight">
                    {formatCurrency(paymentSummary.grandTotal, isPrivacyMode)}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 tabular-nums mt-0.5">
                    {`${paymentSummary.totalCount} Transaksi`}
                  </span>
                </div>
              </div>

              {/* Daftar Legenda di Sebelah Kanan Grafik (HANYA 2 BARIS: QRIS & Tunai) */}
              <div className="space-y-3 flex-1 w-full">
                {/* Baris 1: QRIS */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-600 shrink-0" />
                    <span className="font-medium text-slate-700">QRIS Digital</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatCurrency(paymentSummary.qrisTotal, isPrivacyMode)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 w-9 text-right tabular-nums">
                      {paymentSummary.qrisPercent}%
                    </span>
                  </div>
                </div>

                {/* Baris 2: Tunai (Cash) */}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-400 shrink-0" />
                    <span className="font-medium text-slate-700">Tunai (Cash)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatCurrency(paymentSummary.cashTotal, isPrivacyMode)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 w-9 text-right tabular-nums">
                      {paymentSummary.cashPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kanan: Penjualan Sepekan (Hari) */}
          <div className="rounded-xl border border-slate-200/80 shadow-sm bg-white p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Penjualan Sepekan (Hari)
              </h2>
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
                Senin – Minggu Ini
              </span>
            </div>

            {/* Grafik Batang Vertikal Dinamis 7 Hari (Mon - Sun) */}
            <div className="h-56 flex items-end justify-between gap-2 pt-8 pb-2 px-2">
              {weeklySalesData.sales.map((item) => {
                const heightPercent =
                  item.amount > 0
                    ? Math.max((item.amount / weeklySalesData.maxAmount) * 100, 14)
                    : 6;

                return (
                  <div
                    key={item.day}
                    className="flex-1 flex flex-col items-center h-full justify-end group"
                  >
                    {/* Label Angka Nominal */}
                    <span className="text-[11px] font-bold text-slate-700 mb-1.5 transition-all group-hover:text-amber-600 tabular-nums whitespace-nowrap">
                      {isPrivacyMode ? '***' : item.formattedLabel}
                    </span>

                    {/* Batang Bar */}
                    <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          item.amount > 0
                            ? 'bg-amber-600 group-hover:bg-amber-700'
                            : 'bg-amber-600/20'
                        }`}
                      />
                    </div>

                    {/* Label Nama Hari */}
                    <span className="text-xs font-semibold text-slate-500 mt-2">
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* === 4. TRANSAKSI TERBARU & MENU TERLARIS (3 KOLOM) === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Kiri: Transaksi Terbaru (2 dari 3 kolom) */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200/80 shadow-sm bg-white p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Transaksi Terbaru
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-semibold text-[#D97706] hover:text-amber-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Lihat Semua</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                ref={tableScrollRef}
                className="w-full overflow-x-auto overflow-y-visible touch-auto cursor-grab select-none no-scrollbar"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <table className="w-full text-left border-collapse min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2.5 pr-3">ID Nota</th>
                      <th className="pb-2.5 px-3">Pelanggan</th>
                      <th className="pb-2.5 px-3 hidden sm:table-cell">Pesanan</th>
                      <th className="pb-2.5 px-3 text-right">Nominal</th>
                      <th className="pb-2.5 pl-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactionsList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-xs font-medium text-slate-400"
                        >
                          Belum ada transaksi pada filter ini.
                        </td>
                      </tr>
                    ) : (
                      recentTransactionsList.map((tx) => (
                        <tr
                          key={tx.id}
                          onClick={() => {
                            if (tx.rawTx) viewReceipt(tx.rawTx);
                          }}
                          className={`transition-colors ${
                            tx.rawTx ? 'hover:bg-slate-50 cursor-pointer' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="py-3 pr-3 text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                            {tx.transactionNumber}
                          </td>
                          <td className="py-3 px-3 text-sm font-semibold text-slate-800 whitespace-nowrap">
                            {tx.customerName}
                          </td>
                          <td className="py-3 px-3 text-xs font-medium text-slate-600 hidden sm:table-cell max-w-[220px] truncate">
                            {tx.itemSummary}
                          </td>
                          <td className="py-3 px-3 text-sm font-semibold text-slate-800 text-right tabular-nums whitespace-nowrap">
                            {formatCurrency(tx.total, isPrivacyMode)}
                          </td>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">
                            {tx.isPaid ? (
                              <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md text-xs inline-block">
                                Lunas
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 border border-amber-300 font-semibold px-2 py-0.5 rounded-md text-xs inline-block">
                                Belum Bayar
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Kanan: Menu Terlaris (1 dari 3 kolom) */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200/80 shadow-sm bg-white p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Menu Terlaris
                </h2>
              </div>

              <div className="divide-y divide-slate-100">
                {metrics.bestSellers.map((item, idx) => (
                  <div
                    key={item.name}
                    className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <GoldenRisolThumbnail index={idx} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">
                          {item.name}
                        </div>
                        <div className="text-xs font-medium text-slate-500 tabular-nums mt-0.5">
                          {item.qty} Porsi Terjual
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                      {formatCurrency(item.revenue, isPrivacyMode)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className="w-full mt-5 py-2.5 bg-[#D97706] hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Buka Kasir POS
            </button>
          </div>
        </div>

        {/* Spacer ekstra agar baris terakhir tidak tertutup Bottom Bar di HP */}
        <div className="h-20 md:h-6 w-full shrink-0" aria-hidden="true" />
      </div>

      {/* Modal Edit Cepat Modal Awal Usaha */}
      {showCapitalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-[92vw] max-w-lg max-h-[88dvh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-5 md:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Atur Modal Awal Usaha
              </h3>
              <button
                type="button"
                onClick={() => setShowCapitalModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalCapital} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Nominal Modal Awal (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    modalAmount === ''
                      ? ''
                      : parseInt(modalAmount.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID')
                  }
                  onChange={(e) => setModalAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600 tabular-nums"
                  placeholder="500.000"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Sumber Dana Modal
                </label>
                <input
                  type="text"
                  value={modalSource}
                  onChange={(e) => setModalSource(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  placeholder="Iuran Kelompok"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alokasikan Modal Pada Batch
                </label>
                <select
                  value={modalBatch}
                  onChange={(e) => setModalBatch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {(capitalBatchOptions || ['Testing', 'Batch 1', 'Batch 2']).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCapitalModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#D97706] hover:bg-amber-700 rounded-lg cursor-pointer"
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
