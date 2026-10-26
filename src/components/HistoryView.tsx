import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { Transaction, PaymentMethod } from '../types/pos';
import { formatCurrency, formatDateTime } from '../utils/pos-logic';
import {
  Search,
  Receipt,
  FileText,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle,
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  StickyNote,
  UserCheck,
} from 'lucide-react';

interface EditFormState {
  customerName: string;
  paymentMethod: PaymentMethod;
  cashierName: string;
  cashier: string;
  status: 'PAID' | 'REFUNDED';
  notes: string;
}

const DEFAULT_TEAM_CASHIERS = ['Barra', 'Harits', 'Dimas', 'Akhyar', 'Rafi'];

export const HistoryView: React.FC = () => {
  const {
    transactions,
    viewReceipt,
    updateTransaction,
    deleteTransaction,
    cashierList,
  } = usePos();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'QRIS' | 'TRANSFER'>('ALL');

  // State Modal Edit Transaksi (Light Mode + Kasir / PIC Shift)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormState>({
    customerName: '',
    paymentMethod: 'CASH',
    cashierName: 'Harits',
    cashier: 'Harits',
    status: 'PAID',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // State Modal Konfirmasi Hapus Transaksi
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Notifikasi Umpan Balik Aksi (Light Mode Toast)
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3500);
  };

  // Gabungan daftar Kasir / PIC dari tim utama (Barra, Harits, Dimas, Akhyar, Rafi) + context cashierList
  const availableCashiers = useMemo(() => {
    const set = new Set<string>([...DEFAULT_TEAM_CASHIERS, ...(cashierList || [])]);
    if (editFormData.cashierName && editFormData.cashierName.trim()) {
      set.add(editFormData.cashierName.trim());
    }
    return Array.from(set);
  }, [cashierList, editFormData.cashierName]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = searchQuery.toLowerCase();
      const txCashier = (tx.cashierName || tx.cashier || tx.pic || '').toLowerCase();
      const matchSearch =
        tx.transactionNumber.toLowerCase().includes(q) ||
        tx.customerName.toLowerCase().includes(q) ||
        txCashier.includes(q) ||
        (tx.notes && tx.notes.toLowerCase().includes(q));
      const matchMethod = methodFilter === 'ALL' || tx.paymentMethod === methodFilter;
      return matchSearch && matchMethod;
    });
  }, [transactions, searchQuery, methodFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalRev = filteredTransactions.reduce(
      (acc, t) => acc + (t.status === 'REFUNDED' ? -t.total : t.total),
      0
    );
    const totalSub = filteredTransactions.reduce((acc, t) => acc + t.subtotal, 0);
    const totalDisc = filteredTransactions.reduce((acc, t) => acc + t.discountAmount, 0);
    return {
      revenue: totalRev,
      subtotal: totalSub,
      discount: totalDisc,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Buka Modal Edit Transaksi
  const handleOpenEditModal = (tx: Transaction) => {
    const currentCashier = tx.cashierName || tx.cashier || tx.pic || 'Harits';
    setEditingTransaction(tx);
    setEditFormData({
      customerName: tx.customerName || 'Pelanggan',
      paymentMethod: tx.paymentMethod || 'CASH',
      cashierName: currentCashier,
      cashier: currentCashier,
      status: tx.status || 'PAID',
      notes: tx.notes || '',
    });
  };

  // Simpan Perubahan Edit Transaksi (termasuk Kasir / PIC Shift) ke Cloud Firestore
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    setIsSaving(true);
    try {
      const resolvedCashier =
        (editFormData.cashierName || editFormData.cashier || '').trim() ||
        editingTransaction.cashierName ||
        'Harits';

      await updateTransaction(editingTransaction.id, {
        customerName: editFormData.customerName.trim() || 'Pelanggan',
        paymentMethod: editFormData.paymentMethod,
        cashierName: resolvedCashier,
        cashier: resolvedCashier,
        pic: resolvedCashier,
        status: editFormData.status,
        notes: editFormData.notes.trim(),
      });
      setEditingTransaction(null);
      showFeedback(
        'success',
        `Transaksi ${editingTransaction.transactionNumber} berhasil diperbarui (Kasir/PIC: ${resolvedCashier}).`
      );
    } catch (err) {
      showFeedback('error', 'Gagal memperbarui transaksi. Periksa koneksi database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Konfirmasi & Jalankan Hapus Transaksi dari Cloud Firestore
  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;

    setIsDeleting(true);
    try {
      const txNum = deletingTransaction.transactionNumber;
      await deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
      showFeedback('success', `Transaksi ${txNum} telah dihapus dari Cloud Firestore.`);
    } catch (err) {
      showFeedback('error', 'Gagal menghapus transaksi dari database.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F5F5F5]">
      {/* Header */}
      <div className="p-6 bg-white border-b border-[#E5E5E5] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#1854BA] stroke-[2]" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Riwayat Transaksi
              </h1>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Daftar seluruh transaksi kasir RisoLogy dengan manajemen edit Kasir / PIC Shift, metode bayar &amp; hapus langsung ke Cloud Firestore
            </p>
          </div>

          {/* Quick Metrics with Color Coding */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Total Transaksi */}
            <div className="px-3.5 py-2 bg-blue-50/70 border border-blue-200/80 rounded text-right shadow-xs">
              <span className="text-[10px] text-[#1854BA] uppercase tracking-wider font-semibold block">
                Total Transaksi
              </span>
              <span className="font-mono font-bold text-sm text-[#1854BA] tabular-nums">
                {stats.count} Pesanan
              </span>
            </div>

            {/* Total Diskon (MINUS = RED) */}
            {stats.discount > 0 && (
              <div className="px-3.5 py-2 bg-rose-50/70 border border-rose-200/80 rounded text-right shadow-xs">
                <span className="text-[10px] text-rose-800 uppercase tracking-wider font-semibold flex items-center justify-end gap-1">
                  <ArrowDownRight className="w-3 h-3 text-rose-600" />
                  Total Diskon (-)
                </span>
                <span className="font-mono font-bold text-sm text-rose-600 tabular-nums">
                  -{formatCurrency(stats.discount)}
                </span>
              </div>
            )}

            {/* Total Omset (PLUS = GREEN) */}
            <div className="px-4 py-2 bg-emerald-50/80 border border-emerald-200 rounded text-right shadow-xs">
              <span className="text-[10px] text-emerald-800 uppercase tracking-wider font-semibold flex items-center justify-end gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                Uang Masuk / Omset (+)
              </span>
              <span className="font-mono font-bold text-base text-emerald-600 tabular-nums">
                +{formatCurrency(stats.revenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Toast Banner (Light Mode) */}
        {feedbackMsg && (
          <div
            className={`mt-4 px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-500 hover:text-slate-800 cursor-pointer ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#F0F0F0]">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
            <input
              type="text"
              placeholder="Cari No. Transaksi (#RSL-...), Nama, Kasir/PIC, atau Catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-[#F5F5F5] border border-[#E5E5E5] text-slate-900 focus:outline-none focus:border-[#1854BA] focus:bg-white transition-colors rounded-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#888888] hover:text-black cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Method Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {(['ALL', 'CASH', 'QRIS', 'TRANSFER'] as const).map((m) => {
              const isSelected = methodFilter === m;
              const label =
                m === 'ALL'
                  ? 'Semua Metode'
                  : m === 'CASH'
                  ? 'Tunai (Cash)'
                  : m === 'QRIS'
                  ? 'QRIS'
                  : 'Transfer';
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethodFilter(m)}
                  className={`px-3 py-1.5 text-xs font-medium border cursor-pointer transition-all rounded-sm ${
                    isSelected
                      ? 'bg-[#1854BA] text-white border-[#1854BA] font-semibold shadow-xs'
                      : 'bg-white text-slate-700 border-[#E5E5E5] hover:border-[#1854BA] hover:text-[#1854BA]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTransactions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white border border-[#E5E5E5] rounded-sm">
            <Receipt className="w-9 h-9 text-[#AAAAAA] stroke-[1.5] mb-2" />
            <p className="text-sm font-semibold text-slate-900">Tidak ada transaksi ditemukan</p>
            <p className="text-xs text-[#666666] mt-1">
              Coba reset kata kunci pencarian atau lakukan transaksi baru di menu Kasir.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5E5] rounded-sm shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-slate-600 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">No. Transaksi</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Pelanggan &amp; Kasir / PIC</th>
                  <th className="py-3 px-4">Pesanan &amp; Catatan</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Diskon (-)</th>
                  <th className="py-3 px-4 text-right">Total Masuk (+)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {filteredTransactions.map((tx) => {
                  const dt = formatDateTime(tx.timestamp);
                  const isRefund = tx.status === 'REFUNDED';
                  const totalItems = tx.items.reduce((a, b) => a + b.quantity, 0);
                  const cashierPic = tx.cashierName || tx.cashier || tx.pic || 'Harits';

                  return (
                    <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* Transaction # */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-[#1854BA] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded">
                          {tx.transactionNumber}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{dt.date}</div>
                        <div className="text-[10px] font-mono text-slate-500">{dt.time}</div>
                      </td>

                      {/* Customer Name & Kasir / PIC Shift Badge */}
                      <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{tx.customerName}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded text-[10px] font-bold">
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            <span>Kasir / PIC: {cashierPic}</span>
                          </span>
                        </div>
                        {tx.customerEmail && (
                          <div className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle className="w-2.5 h-2.5 text-blue-600" />
                            <span>{tx.customerEmail}</span>
                          </div>
                        )}
                      </td>

                      {/* Items & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-semibold rounded">
                            {totalItems} item
                          </span>
                        </div>
                        <div className="space-y-1 text-slate-700 text-[11px] leading-tight">
                          {tx.items.map((i, idx) => {
                            const itemNote = i.note || i.description;
                            return (
                              <div key={`${i.productId}-${idx}`}>
                                <div className="font-medium text-slate-800">
                                  {i.name} ({i.quantity}x)
                                </div>
                                {itemNote && (
                                  <div className="text-xs text-slate-500 italic">
                                    Catatan: {itemNote}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {tx.notes && (
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[10px] font-medium max-w-full truncate">
                            <StickyNote className="w-3 h-3 shrink-0 text-amber-600" />
                            <span className="truncate">{tx.notes}</span>
                          </div>
                        )}
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.paymentMethod === 'CASH' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/90 rounded text-[11px] font-semibold">
                            <Banknote className="w-3.5 h-3.5 text-amber-700" />
                            <span>Cash</span>
                          </span>
                        ) : tx.paymentMethod === 'TRANSFER' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded text-[11px] font-semibold">
                            <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                            <span>Transfer</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#1854BA] border border-blue-200 rounded text-[11px] font-semibold">
                            <QrCode className="w-3.5 h-3.5 text-[#1854BA]" />
                            <span>QRIS</span>
                          </span>
                        )}
                      </td>

                      {/* Subtotal */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(tx.subtotal)}
                      </td>

                      {/* Discount: MINUS = RED */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {tx.discountAmount > 0 ? (
                          <span className="font-mono font-bold text-xs text-rose-600 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded tabular-nums inline-block">
                            -{formatCurrency(tx.discountAmount)}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-400 text-xs tabular-nums">
                            Rp 0
                          </span>
                        )}
                      </td>

                      {/* Total: PLUS = GREEN (or RED if refunded/minus) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isRefund ? (
                          <span className="font-mono font-bold text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded tabular-nums inline-block">
                            -{formatCurrency(tx.total)}
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded tabular-nums inline-block shadow-2xs">
                            +{formatCurrency(tx.total)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isRefund ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded text-[10px] font-bold uppercase tracking-wider">
                            Refund
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase tracking-wider">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Lunas</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons: Lihat Struk, Edit, Hapus */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Tombol Lihat Struk */}
                          <button
                            type="button"
                            onClick={() => viewReceipt(tx)}
                            title="Lihat Struk"
                            className="px-2.5 py-1.5 bg-[#1854BA] text-white hover:bg-[#12408F] text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1 rounded-sm shadow-xs active:scale-95"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Struk</span>
                          </button>

                          {/* Tombol Edit Transaksi */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(tx)}
                            title="Edit Transaksi"
                            className="px-2.5 py-1.5 bg-amber-500 text-white hover:bg-amber-600 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1 rounded-sm shadow-xs active:scale-95"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {/* Tombol Hapus Transaksi */}
                          <button
                            type="button"
                            onClick={() => setDeletingTransaction(tx)}
                            title="Hapus Transaksi"
                            className="px-2.5 py-1.5 bg-rose-600 text-white hover:bg-rose-700 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1 rounded-sm shadow-xs active:scale-95"
                          >
                            <Trash2 className="w-3 h-3" />
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
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL FORMULIR EDIT TRANSAKSI (LIGHT MODE)                            */}
      {/* ===================================================================== */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 text-slate-800">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-600" />
                  <span>Edit Transaksi {editingTransaction.transactionNumber}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbarui metode pembayaran, Kasir / PIC Shift, pelanggan, atau catatan langsung ke Firestore
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Nama Pelanggan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Pelanggan
                </label>
                <input
                  type="text"
                  value={editFormData.customerName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, customerName: e.target.value })
                  }
                  placeholder="Nama pelanggan..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Pilihan Dropdown Metode Pembayaran (Cash, QRIS, Transfer) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Metode Pembayaran
                </label>
                <select
                  value={editFormData.paymentMethod}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      paymentMethod: e.target.value as PaymentMethod,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="CASH" className="bg-white text-slate-900">
                    Cash (Tunai)
                  </option>
                  <option value="QRIS" className="bg-white text-slate-900">
                    QRIS
                  </option>
                  <option value="TRANSFER" className="bg-white text-slate-900">
                    Transfer
                  </option>
                </select>
              </div>

              {/* Pilihan Dropdown Kasir / PIC Shift */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kasir / PIC Shift
                </label>
                <select
                  value={editFormData.cashierName || editFormData.cashier || ''}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      cashierName: e.target.value,
                      cashier: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="" className="bg-white text-slate-400">
                    Pilih Kasir / PIC
                  </option>
                  {availableCashiers.map((cashierName) => (
                    <option
                      key={cashierName}
                      value={cashierName}
                      className="bg-white text-slate-900"
                    >
                      {cashierName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Transaksi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status Transaksi
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      status: e.target.value as 'PAID' | 'REFUNDED',
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="PAID" className="bg-white text-slate-900">
                    Lunas (PAID)
                  </option>
                  <option value="REFUNDED" className="bg-white text-slate-900">
                    Refund / Dibatalkan (REFUNDED)
                  </option>
                </select>
              </div>

              {/* Textarea Catatan Transaksi (notes) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catatan Transaksi (Notes)
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Tambahkan catatan transaksi (misal: pembayaran via transfer BCA, pesanan khusus, dll)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none h-24"
                />
              </div>

              {/* Tombol Aksi Bawah: Batal & Simpan */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 font-medium text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL KONFIRMASI HAPUS TRANSAKSI (LIGHT MODE)                         */}
      {/* ===================================================================== */}
      {deletingTransaction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 text-slate-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Hapus Transaksi {deletingTransaction.transactionNumber}?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus transaksi atas nama{' '}
                  <strong className="text-slate-900">{deletingTransaction.customerName}</strong>{' '}
                  senilai{' '}
                  <strong className="text-emerald-700">
                    {formatCurrency(deletingTransaction.total)}
                  </strong>
                  ? Tindakan ini akan menghapus dokumen secara permanen dari Cloud Firestore.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingTransaction(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 font-medium text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-medium text-sm transition-all shadow-md shadow-rose-500/20 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
