import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { SupplierExpense } from '../types/pos';
import { formatCurrency, formatDateTime } from '../utils/pos-logic';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Calendar,
  Building2,
  MapPin,
  Tag,
  Edit2,
  Trash2,
  X,
  Check,
  Download,
  AlertCircle,
  TrendingDown,
  User,
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, updateExpense, deleteExpense, activeCashier, cashierList } = usePos();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form states
  const [itemName, setItemName] = useState<string>('');
  const [category, setCategory] = useState<string>('Bahan Utama');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>('kg');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierLocation, setSupplierLocation] = useState<string>('');
  const [expenseCashier, setExpenseCashier] = useState<string>(activeCashier);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const categories = [
    'Semua',
    'Bahan Utama',
    'Bumbu & Saus',
    'Keju & Dairy',
    'Minyak & Gas',
    'Kemasan & Plastik',
    'Operasional',
  ];

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchSearch =
        exp.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.supplierLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.expenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'Semua' || exp.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [expenses, searchQuery, selectedCategory]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.totalPrice, 0);
    const invoiceCount = expenses.length;
    const avgInvoice = invoiceCount > 0 ? Math.round(totalExpenses / invoiceCount) : 0;

    // Largest category
    const catMap: Record<string, number> = {};
    expenses.forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.totalPrice;
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
  }, [expenses]);

  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    setItemName('');
    setCategory('Bahan Utama');
    setQuantity(1);
    setUnit('kg');
    setUnitPrice(0);
    setSupplierName('');
    setSupplierLocation('');
    setExpenseCashier(activeCashier);
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp: SupplierExpense) => {
    setEditingExpenseId(exp.id);
    setItemName(exp.itemName);
    setCategory(exp.category);
    setQuantity(exp.quantity);
    setUnit(exp.unit);
    setUnitPrice(exp.unitPrice);
    setSupplierName(exp.supplierName);
    setSupplierLocation(exp.supplierLocation);
    setExpenseCashier(exp.cashierName);
    setDate(exp.date);
    setNotes(exp.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setFormError('Nama bahan / barang wajib diisi');
      return;
    }
    if (quantity <= 0) {
      setFormError('Jumlah / kuantitas harus lebih dari 0');
      return;
    }
    if (unitPrice <= 0) {
      setFormError('Harga satuan wajib diisi');
      return;
    }
    if (!supplierName.trim()) {
      setFormError('Nama supplier wajib diisi');
      return;
    }

    const totalPrice = quantity * unitPrice;

    if (editingExpenseId) {
      updateExpense(editingExpenseId, {
        itemName: itemName.trim(),
        category,
        quantity,
        unit: unit.trim(),
        unitPrice,
        totalPrice,
        supplierName: supplierName.trim(),
        supplierLocation: supplierLocation.trim(),
        cashierName: expenseCashier,
        date,
        notes: notes.trim() || undefined,
      });
    } else {
      addExpense({
        itemName: itemName.trim(),
        category,
        quantity,
        unit: unit.trim(),
        unitPrice,
        totalPrice,
        supplierName: supplierName.trim(),
        supplierLocation: supplierLocation.trim(),
        cashierName: expenseCashier,
        date,
        notes: notes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const calculatedTotal = quantity * unitPrice;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F5F5F5]">
      {/* Top Header */}
      <div className="p-6 bg-white border-b border-[#E5E5E5] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#1854BA] stroke-[2]" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Pencatatan Belanja Bahan Supplier
              </h1>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Catat pengeluaran belanja bahan baku risol (daging, mayonaise, panko, kemasan) &amp; data supplier
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-[#1854BA] text-white hover:bg-[#12408F] text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Belanja Baru</span>
          </button>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#F0F0F0]">
          {/* Total Belanja (Red money) */}
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded">
            <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">
              Total Pengeluaran Bahan
            </span>
            <span className="font-mono text-xl font-extrabold text-rose-600 mt-0.5 block">
              - {formatCurrency(stats.totalExpenses)}
            </span>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
              Jumlah Faktur / Transaksi
            </span>
            <span className="font-mono text-xl font-extrabold text-blue-950 mt-0.5 block">
              {stats.invoiceCount} Transaksi
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
              Rata-rata Nota Belanja
            </span>
            <span className="font-mono text-xl font-extrabold text-amber-950 mt-0.5 block">
              {formatCurrency(stats.avgInvoice)}
            </span>
          </div>

          <div className="p-3 bg-slate-100 border border-slate-200 rounded">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
              Kategori Terbesar: {stats.topCat}
            </span>
            <span className="font-mono text-xl font-extrabold text-slate-800 mt-0.5 block">
              {formatCurrency(stats.topCatAmount)}
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama bahan, supplier, lokasi, atau #EXP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1854BA] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#1854BA] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">No &amp; Tanggal</th>
                  <th className="py-3 px-4">Nama Bahan</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3 text-right">Kuantitas</th>
                  <th className="py-3 px-3 text-right">Harga Satuan</th>
                  <th className="py-3 px-4 text-right">Total Belanja (-)</th>
                  <th className="py-3 px-4">Supplier &amp; Lokasi</th>
                  <th className="py-3 px-3">Kasir / PIC</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Belum ada data belanja bahan supplier yang tercatat.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      {/* No & Tanggal */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {exp.expenseNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {exp.date}
                        </span>
                      </td>

                      {/* Nama Bahan */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span>{exp.itemName}</span>
                        {exp.notes && (
                          <span className="block text-[10px] text-slate-500 font-normal italic">
                            {exp.notes}
                          </span>
                        )}
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]">
                          {exp.category}
                        </span>
                      </td>

                      {/* Kuantitas */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {exp.quantity} {exp.unit}
                      </td>

                      {/* Harga Satuan */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(exp.unitPrice)}
                      </td>

                      {/* Total Belanja (Minus = Red) */}
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-rose-600 bg-rose-50/30">
                        - {formatCurrency(exp.totalPrice)}
                      </td>

                      {/* Supplier & Lokasi */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-semibold text-slate-900">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{exp.supplierName}</span>
                        </div>
                        {exp.supplierLocation && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{exp.supplierLocation}</span>
                          </div>
                        )}
                      </td>

                      {/* Kasir / Shift PIC */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-bold rounded text-[10px] border border-blue-200">
                          {exp.cashierName}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded cursor-pointer"
                            title="Edit belanja"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus catatan belanja "${exp.itemName}" (${exp.expenseNumber})?`)) {
                                deleteExpense(exp.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Hapus belanja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight">
                    {editingExpenseId ? 'Edit Belanja Bahan' : 'Catat Belanja Bahan Supplier Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Input pembelian bahan baku, harga grosir, dan identitas supplier
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded">
                  {formError}
                </div>
              )}

              {/* Nama Bahan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Nama Bahan / Barang *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Daging Smoked Beef Slice Premium, Mayonaise Kewpie, dsb."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none"
                />
              </div>

              {/* Kategori & Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Kategori Pengeluaran
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none"
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tanggal Belanja
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Quantity, Unit, Unit Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Jumlah / Qty *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={quantity || ''}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Satuan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="kg / pack / pcs"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Harga Satuan (Rp) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={unitPrice || ''}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              {/* Total Belanja Preview Banner */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 uppercase">Total Belanja:</span>
                <span className="font-mono text-base font-extrabold text-rose-600">
                  - {formatCurrency(calculatedTotal)}
                </span>
              </div>

              {/* Supplier Info: Name & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nama Supplier / Toko *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Cth: CV Sumber Pangan Mandiri, Toko Kue Berkah"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Kasir Penanggung Jawab
                  </label>
                  <select
                    value={expenseCashier}
                    onChange={(e) => setExpenseCashier(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none font-semibold"
                  >
                    {cashierList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Alamat / Lokasi / Kontak Supplier
                </label>
                <input
                  type="text"
                  placeholder="Cth: Pasar Senen Blok B No. 14, Jakarta Pusat (0812-8899-1122)"
                  value={supplierLocation}
                  onChange={(e) => setSupplierLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Cth: Stok untuk kebutuhan 4 hari, grade A premium"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1854BA] hover:bg-[#12408F] rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Catatan Belanja</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
