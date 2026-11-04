import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { SupplierExpense } from '../types/pos';
import { formatCurrency } from '../utils/pos-logic';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useSmoothDragScroll } from '../hooks/useDragScroll';

const TEAM_PIC_LIST = ['Barra', 'Harits', 'Dimas', 'Akhyar'];

const getExpenseTotal = (exp: SupplierExpense): number => {
  return (
    Number(
      exp.total ??
        exp.totalBelanja ??
        exp.amount ??
        exp.totalPrice ??
        Number(exp.quantity || 1) * Number(exp.unitPrice || 0)
    ) || 0
  );
};

export const ExpensesView: React.FC = () => {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    activeCashier,
    cashierList,
    settings,
  } = usePos();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<SupplierExpense | null>(null);

  // Essential Form States + Batch
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Bahan Utama');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [total, setTotal] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [cashier, setCashier] = useState<string>(activeCashier || 'Barra');
  const [batch, setBatch] = useState<string>(settings.activeBatch || 'Batch 1');
  const [formError, setFormError] = useState<string>('');

  // Smooth Drag-to-Scroll untuk Tabel Belanja Bahan (Tanpa Mouse Wheel Horizontal)
  const { scrollRef, dragProps, isDragging } = useSmoothDragScroll();

  const availableBatches = useMemo(() => {
    const set = new Set<string>(settings.availableBatches || ['Batch 1', 'Batch 2']);
    if (settings.activeBatch) set.add(settings.activeBatch);
    expenses.forEach((e) => {
      if (e.batch) set.add(e.batch);
    });
    return Array.from(set);
  }, [settings.availableBatches, settings.activeBatch, expenses]);

  const categories = [
    'Semua',
    'Bahan Utama',
    'Bumbu & Saus',
    'Keju & Dairy',
    'Minyak & Gas',
    'Kemasan & Plastik',
    'Operasional',
  ];

  // Daftar Kasir / PIC (utamakan Barra, Harits, Dimas, Akhyar + kasir aktif)
  const availableCashiers = useMemo(() => {
    const set = new Set<string>([...TEAM_PIC_LIST, ...(cashierList || [])]);
    if (activeCashier && activeCashier.trim()) {
      set.add(activeCashier.trim());
    }
    if (cashier && cashier.trim()) {
      set.add(cashier.trim());
    }
    return Array.from(set);
  }, [cashierList, activeCashier, cashier]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const q = searchQuery.toLowerCase();
      const expName = (exp.itemName || exp.name || '').toLowerCase();
      const expSupplier = (exp.supplierName || exp.supplier || '').toLowerCase();
      const expNumber = (exp.expenseNumber || '').toLowerCase();
      const expCashier = (exp.cashierName || exp.cashier || '').toLowerCase();
      const expBatch = exp.batch || 'Batch 1';

      const matchSearch =
        expName.includes(q) ||
        expSupplier.includes(q) ||
        expNumber.includes(q) ||
        expCashier.includes(q) ||
        expBatch.toLowerCase().includes(q);
      const matchCategory = selectedCategory === 'Semua' || exp.category === selectedCategory;
      const matchBatch = selectedBatchFilter === 'ALL' || expBatch === selectedBatchFilter;
      return matchSearch && matchCategory && matchBatch;
    });
  }, [expenses, searchQuery, selectedCategory, selectedBatchFilter]);

  // Aggregate stats (mengikuti filter batch jika dipilih)
  const stats = useMemo(() => {
    const targetList =
      selectedBatchFilter === 'ALL'
        ? expenses
        : expenses.filter((e) => (e.batch || 'Batch 1') === selectedBatchFilter);
    const totalExpenses = targetList.reduce((acc, exp) => acc + getExpenseTotal(exp), 0);
    const invoiceCount = targetList.length;
    const avgInvoice = invoiceCount > 0 ? Math.round(totalExpenses / invoiceCount) : 0;

    // Largest category
    const catMap: Record<string, number> = {};
    targetList.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + getExpenseTotal(e);
    });

    let topCat = 'Bahan Utama';
    let topCatAmount = 0;
    Object.entries(catMap).forEach(([cat, amount]) => {
      if (amount > topCatAmount) {
        topCatAmount = amount;
        topCat = cat;
      }
    });

    return { totalExpenses, invoiceCount, avgInvoice, topCat, topCatAmount };
  }, [expenses, selectedBatchFilter]);

  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    setName('');
    setCategory('Bahan Utama');
    setDate(new Date().toISOString().split('T')[0]);
    setTotal('');
    setSupplier('');
    setCashier(activeCashier || 'Barra');
    setBatch(settings.activeBatch || 'Batch 1');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp: SupplierExpense) => {
    const resolvedNominal = getExpenseTotal(exp);
    setEditingExpenseId(exp.id);
    setName(exp.itemName || exp.name || '');
    setCategory(exp.category || 'Bahan Utama');
    setDate(exp.date || new Date().toISOString().split('T')[0]);
    setTotal(resolvedNominal > 0 ? String(resolvedNominal) : '');
    setSupplier(
      (exp.supplierName || exp.supplier || '') === '-'
        ? ''
        : exp.supplierName || exp.supplier || ''
    );
    setCashier(exp.cashierName || exp.cashier || activeCashier || 'Barra');
    setBatch(exp.batch || settings.activeBatch || 'Batch 1');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleQuickAddNominal = (amountToAdd: number) => {
    const current = Number(total) || 0;
    setTotal(String(current + amountToAdd));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const numericTotal = Number(total);

    if (!trimmedName) {
      setFormError('Nama bahan / keperluan wajib diisi');
      return;
    }
    if (!numericTotal || numericTotal <= 0) {
      setFormError('Total nominal belanja (Rp) wajib diisi dan lebih dari 0');
      return;
    }

    const resolvedSupplier = supplier.trim() || '-';
    const resolvedCashier = cashier || activeCashier || 'Kasir';
    const resolvedDate = date || new Date().toISOString().split('T')[0];
    const resolvedBatch = batch || settings.activeBatch || 'Batch 1';

    if (editingExpenseId) {
      updateExpense(editingExpenseId, {
        name: trimmedName,
        itemName: trimmedName,
        category,
        date: resolvedDate,
        total: numericTotal,
        totalBelanja: numericTotal,
        totalPrice: numericTotal,
        amount: numericTotal,
        supplier: resolvedSupplier,
        supplierName: resolvedSupplier,
        cashier: resolvedCashier,
        cashierName: resolvedCashier,
        batch: resolvedBatch,
        quantity: 1,
        unit: 'paket',
        unitPrice: numericTotal,
      });
    } else {
      addExpense({
        name: trimmedName,
        itemName: trimmedName,
        category,
        date: resolvedDate,
        total: numericTotal,
        totalBelanja: numericTotal,
        totalPrice: numericTotal,
        amount: numericTotal,
        supplier: resolvedSupplier,
        supplierName: resolvedSupplier,
        supplierLocation: '-',
        cashier: resolvedCashier,
        cashierName: resolvedCashier,
        batch: resolvedBatch,
        createdAt: new Date().toISOString(),
        quantity: 1,
        unit: 'paket',
        unitPrice: numericTotal,
      });
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingExpense) return;
    deleteExpense(deletingExpense.id);
    setDeletingExpense(null);
  };

  return (
    <div className="w-full min-h-full flex flex-col space-y-5 pb-28 md:pb-12">
      {/* Top Header */}
      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Belanja Bahan &amp; Operasional
            </h1>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold">
              Aktif: {settings.activeBatch || 'Batch 1'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="touch-manipulation px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Belanja Baru</span>
          </button>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* Total Belanja (Red money) */}
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg">
            <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">
              Total Pengeluaran Bahan
            </span>
            <span className="font-mono text-xl font-extrabold text-rose-600 mt-0.5 block tabular-nums">
              - {formatCurrency(stats.totalExpenses)}
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
              Jumlah Faktur / Transaksi
            </span>
            <span className="font-mono text-xl font-extrabold text-amber-950 mt-0.5 block tabular-nums">
              {stats.invoiceCount} Transaksi
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
              Rata-rata Nota Belanja
            </span>
            <span className="font-mono text-xl font-extrabold text-amber-950 mt-0.5 block tabular-nums">
              {formatCurrency(stats.avgInvoice)}
            </span>
          </div>

          <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
              Kategori Terbesar: {stats.topCat}
            </span>
            <span className="font-mono text-xl font-extrabold text-slate-800 mt-0.5 block tabular-nums">
              {formatCurrency(stats.topCatAmount)}
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama bahan, toko, kasir, batch, atau #EXP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
              />
            </div>

            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Semua Batch</option>
              {availableBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-amber-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table (Desktop) & Card List (Mobile) */}
      <div className="w-full">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs">
            Belum ada data belanja bahan supplier yang tercatat.
          </div>
        ) : (
          <>
            {/* ============================================================= */}
            {/* TAMPILAN MOBILE: DAFTAR KARTU BELANJA BAHAN (block md:hidden) */}
            {/* ============================================================= */}
            <div className="block md:hidden">
              {filteredExpenses.map((exp) => {
                const nominal = getExpenseTotal(exp);
                const displayName = exp.itemName || exp.name || 'Belanja Bahan';
                const displaySupplier = exp.supplierName || exp.supplier || '-';
                const displayCashier = exp.cashierName || exp.cashier || 'Kasir';
                const displayBatch = exp.batch || 'Batch 1';

                return (
                  <div
                    key={exp.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2.5 mb-3"
                  >
                    {/* Baris 1: ID Nota Belanja, Badge Kategori, Batch, dan Nama Kasir/PIC */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {exp.expenseNumber}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                          {displayBatch}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]">
                          {exp.category}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px] border border-amber-200">
                        PIC: {displayCashier}
                      </span>
                    </div>

                    {/* Baris 2: Tanggal, Nama Bahan, dan Tempat Beli / Supplier */}
                    <div className="pt-1.5 border-t border-slate-100 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{displayName}</h3>
                          {exp.notes && (
                            <p className="text-[11px] text-slate-500 italic">{exp.notes}</p>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          {exp.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium pt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{displaySupplier}</span>
                      </div>
                    </div>

                    {/* Baris 3: Total Nominal (Teks Tebal Besar) serta Tombol Aksi Sentuh */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Total Belanja
                        </span>
                        <span className="font-mono text-base font-extrabold text-rose-600 tabular-nums">
                          - {formatCurrency(nominal)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(exp)}
                          className="touch-manipulation h-8 px-3 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingExpense(exp)}
                          className="touch-manipulation h-8 px-3 bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ============================================================= */}
            {/* TAMPILAN DESKTOP: TABEL RINGKAS (hidden md:block)             */}
            {/* ============================================================= */}
            <div className="hidden md:block w-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
              <div
                ref={scrollRef}
                {...dragProps}
                className={`w-full overflow-x-auto touch-pan-x overscroll-x-contain select-none ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3.5">No &amp; Tanggal</th>
                      <th className="py-3 px-3.5">Batch</th>
                      <th className="py-3 px-3.5">Nama Bahan</th>
                      <th className="py-3 px-3.5">Kategori</th>
                      <th className="py-3 px-3.5 text-right">Total Belanja (-)</th>
                      <th className="py-3 px-3.5">Supplier</th>
                      <th className="py-3 px-3.5">Kasir / PIC</th>
                      <th className="py-3 px-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => {
                      const nominal = getExpenseTotal(exp);
                      const displayName = exp.itemName || exp.name || 'Belanja Bahan';
                      const displaySupplier = exp.supplierName || exp.supplier || '-';
                      const displayCashier = exp.cashierName || exp.cashier || 'Kasir';
                      const displayBatch = exp.batch || 'Batch 1';

                      return (
                        <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                          {/* No & Tanggal */}
                          <td className="px-3.5 py-3 text-xs md:text-sm whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 block">
                              {exp.expenseNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {exp.date}
                            </span>
                          </td>

                          {/* Batch */}
                          <td className="px-3.5 py-3 text-xs md:text-sm whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                              {displayBatch}
                            </span>
                          </td>

                          {/* Nama Bahan */}
                          <td className="px-3.5 py-3 text-xs md:text-sm font-bold text-slate-900">
                            <span>{displayName}</span>
                            {exp.notes && (
                              <span className="block text-[10px] text-slate-500 font-normal italic">
                                {exp.notes}
                              </span>
                            )}
                          </td>

                          {/* Kategori */}
                          <td className="px-3.5 py-3 text-xs md:text-sm whitespace-nowrap">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]">
                              {exp.category}
                            </span>
                          </td>

                          {/* Total Belanja (Minus = Red) */}
                          <td className="px-3.5 py-3 text-xs md:text-sm text-right font-mono font-extrabold text-rose-600 bg-rose-50/30 tabular-nums whitespace-nowrap">
                            - {formatCurrency(nominal)}
                          </td>

                          {/* Supplier */}
                          <td className="px-3.5 py-3 text-xs md:text-sm">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{displaySupplier}</span>
                            </div>
                          </td>

                          {/* Kasir / Shift PIC */}
                          <td className="px-3.5 py-3 text-xs md:text-sm whitespace-nowrap">
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded text-[10px] border border-amber-200">
                              {displayCashier}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-3.5 py-3 text-xs md:text-sm text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(exp)}
                                className="h-8 px-3 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg font-semibold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors touch-manipulation"
                                title="Edit belanja"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingExpense(exp)}
                                className="h-8 px-3 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-semibold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors touch-manipulation"
                                title="Hapus belanja"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Spacer ekstra agar baris terakhir tidak tertutup Bottom Bar di HP */}
      <div className="h-20 md:h-6 w-full shrink-0" aria-hidden="true" />

      {/* ===================================================================== */}
      {/* MODAL CATAT / EDIT BELANJA BAHAN (TABLET & MOBILE FRIENDLY)           */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-[92vw] max-w-lg max-h-[88dvh] overflow-y-auto bg-white rounded-2xl p-5 md:p-6 shadow-xl border border-slate-200 flex flex-col">
            {/* Mobile Drag Handle Indicator */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

            {/* Header */}
            <div className="pb-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {editingExpenseId ? 'Edit Belanja Bahan' : 'Catat Belanja Bahan'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="pt-4 space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
                  {formError}
                </div>
              )}

              {/* 1. Nama Bahan / Pengeluaran (Wajib) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Bahan / Keperluan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Keju, Tepung Terigu, Minyak, Box Kemasan..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>

              {/* 2. Kategori Pengeluaran, Batch, & Tanggal */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
                  >
                    <option value="Bahan Utama">Bahan Utama</option>
                    <option value="Bumbu & Saus">Bumbu &amp; Saus</option>
                    <option value="Keju & Dairy">Keju &amp; Dairy</option>
                    <option value="Minyak & Gas">Minyak &amp; Gas</option>
                    <option value="Kemasan & Plastik">Kemasan &amp; Plastik</option>
                    <option value="Operasional">Operasional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Batch Produksi
                  </label>
                  <select
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    className="w-full bg-amber-50/70 border border-amber-200 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
                  >
                    {availableBatches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {/* 3. Total Pengeluaran / Belanja (Wajib - Input Langsung + Chip Nominal Cepat) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Total Nominal Belanja (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="Cth: 25000"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-rose-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono tabular-nums"
                />

                {/* Chip Nominal Cepat */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {[
                    { label: '+10.000', value: 10000 },
                    { label: '+25.000', value: 25000 },
                    { label: '+50.000', value: 50000 },
                    { label: '+100.000', value: 100000 },
                  ].map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => handleQuickAddNominal(chip.value)}
                      className="touch-manipulation px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-200 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTotal('')}
                    className="touch-manipulation px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {Number(total) > 0 && (
                  <p className="text-[11px] font-mono text-rose-600 font-semibold mt-1.5">
                    Nominal tercatat: - {formatCurrency(Number(total))}
                  </p>
                )}
              </div>

              {/* 4. Nama Supplier / Toko (Opsional) & 5. Kasir / PIC (Dropdown) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tempat Beli / Toko (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Cth: Pasar, O Save, Shopee, Warung..."
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kasir / PIC
                  </label>
                  <select
                    value={cashier}
                    onChange={(e) => setCashier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
                  >
                    {availableCashiers.map((c) => (
                      <option key={c} value={c} className="bg-white text-slate-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Button Full-Width */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="submit"
                  className="touch-manipulation w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-700 text-white font-bold text-base rounded-xl shadow-lg shadow-amber-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <Check className="w-5 h-5" />
                  <span>Simpan Belanja</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="touch-manipulation w-full py-2.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Belanja Bahan */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-[92vw] max-w-lg max-h-[88dvh] overflow-y-auto bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-2xl space-y-5 text-slate-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Catatan Belanja {deletingExpense.expenseNumber}?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus pengeluaran{' '}
                  <strong className="text-slate-900">
                    {deletingExpense.itemName || deletingExpense.name}
                  </strong>{' '}
                  senilai{' '}
                  <strong className="text-rose-600">
                    {formatCurrency(getExpenseTotal(deletingExpense))}
                  </strong>
                  ?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
