import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { formatCurrency, formatDateTime } from '../utils/pos-logic';
import {
  Search,
  Receipt,
  FileText,
  Banknote,
  QrCode,
  Calendar,
  CheckCircle,
  TrendingUp,
  Tag,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { transactions, viewReceipt } = usePos();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'QRIS'>('ALL');

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.transactionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMethod =
        methodFilter === 'ALL' || tx.paymentMethod === methodFilter;
      return matchSearch && matchMethod;
    });
  }, [transactions, searchQuery, methodFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalRev = filteredTransactions.reduce((acc, t) => acc + (t.status === 'REFUNDED' ? -t.total : t.total), 0);
    const totalSub = filteredTransactions.reduce((acc, t) => acc + t.subtotal, 0);
    const totalDisc = filteredTransactions.reduce((acc, t) => acc + t.discountAmount, 0);
    return {
      revenue: totalRev,
      subtotal: totalSub,
      discount: totalDisc,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

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
              Daftar seluruh transaksi kasir RisoLogy dengan visualisasi uang masuk (hijau) &amp; diskon (merah)
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

        {/* Filter & Search Bar */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#F0F0F0]">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
            <input
              type="text"
              placeholder="Cari No. Transaksi (#RSL-...) atau Nama..."
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
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['ALL', 'CASH', 'QRIS'] as const).map((m) => {
              const isSelected = methodFilter === m;
              const label = m === 'ALL' ? 'Semua Metode' : m === 'CASH' ? 'Tunai (CASH)' : 'QRIS';
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
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Pesanan</th>
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

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
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

                      {/* Customer Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        <div className="font-semibold">{tx.customerName}</div>
                        {tx.customerEmail && (
                          <div className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle className="w-2.5 h-2.5 text-blue-600" />
                            <span>{tx.customerEmail}</span>
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.2 bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-semibold rounded">
                            {totalItems} item
                          </span>
                        </div>
                        <div className="truncate text-slate-700 text-[11px] leading-tight">
                          {tx.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ')}
                        </div>
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.paymentMethod === 'CASH' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/90 rounded text-[11px] font-semibold">
                            <Banknote className="w-3.5 h-3.5 text-amber-700" />
                            <span>Tunai</span>
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

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => viewReceipt(tx)}
                          className="px-3 py-1.5 bg-[#1854BA] text-white hover:bg-[#12408F] text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1.5 rounded-sm shadow-xs active:scale-95"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Lihat Struk</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
