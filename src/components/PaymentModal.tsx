import React, { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { PaymentMethod } from '../types/pos';
import { formatCurrency, calculateChange } from '../utils/pos-logic';
import {
  X,
  Banknote,
  QrCode,
  Check,
  User,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen = true, onClose }) => {
  const {
    total,
    customerName,
    setCustomerName,
    nextTransactionNumber,
    processCheckout,
    settings,
  } = usePos();

  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [tenderedStr, setTenderedStr] = useState<string>(total.toString());
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sinkronisasi nilai uang diterima setiap kali modal dibuka atau total belanja berubah
  useEffect(() => {
    if (isOpen) {
      setTenderedStr(total.toString());
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const tenderedAmount = parseFloat(tenderedStr) || 0;
  const changeAmount = calculateChange(total, tenderedAmount);
  const isCashInsufficient = method === 'CASH' && tenderedAmount < total;
  const paymentValid = method === 'QRIS' || method === 'TRANSFER' || !isCashInsufficient;

  // Preset quick cash amounts
  const quickAmounts = [
    { label: 'Uang Pas', value: total },
    { label: '50.000', value: 50000 },
    { label: '100.000', value: 100000 },
    { label: '200.000', value: 200000 },
  ].filter((item) => item.value >= total || item.label === 'Uang Pas');

  const handleCompletePayment = () => {
    if (isSubmitting) return;

    if (method === 'CASH' && tenderedAmount < total) {
      setErrorMsg(`Uang diterima kurang dari ${formatCurrency(total)}`);
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      processCheckout(method, method === 'CASH' ? tenderedAmount : total);
      onClose();
    } catch (err) {
      console.error('Gagal menyelesaikan pembayaran transaksi:', err);
      setErrorMsg(
        err instanceof Error
          ? `Gagal memproses pembayaran: ${err.message}`
          : 'Terjadi kendala saat menyimpan transaksi. Silakan coba lagi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-[#E5E5E5] flex flex-col">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pb-3">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Modal Header */}
        <div className="pb-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-amber-600 text-white px-2 py-0.5 rounded">
                {nextTransactionNumber}
              </span>
              <h2 className="text-base font-bold text-black uppercase tracking-tight">
                Pembayaran Transaksi
              </h2>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Pilih metode pembayaran untuk menyelesaikan pesanan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#888888] hover:text-black hover:bg-[#F5F5F5] rounded-lg transition-colors cursor-pointer touch-manipulation"
            aria-label="Tutup"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-5 space-y-5">
          {/* Customer Name Confirmation (Mendukung input manual bebas tanpa terkunci daftar pelanggan) */}
          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <User className="w-4 h-4 text-[#666666]" />
              <span className="text-[#666666]">Nama Pembeli:</span>
            </div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Pelanggan"
              className="text-xs font-semibold text-right bg-transparent border-b border-[#CCCCCC] focus:border-amber-500 focus:outline-none px-1 py-0.5 w-44 text-slate-900"
            />
          </div>

          {/* Amount Due Display */}
          <div className="text-center p-4 bg-[#F9F9F9] border border-[#E5E5E5]">
            <span className="text-xs text-[#666666] uppercase tracking-wider block mb-1">
              Total Tagihan
            </span>
            <span className="font-mono text-3xl font-bold text-black tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>

          {/* Payment Method Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMethod('CASH');
                  setErrorMsg('');
                }}
                className={`min-h-12 p-3.5 border rounded-xl text-center transition-colors cursor-pointer flex items-center justify-center gap-2 touch-manipulation ${
                  method === 'CASH'
                    ? 'border-amber-600 bg-amber-600 text-white font-bold shadow-sm'
                    : 'border-[#E5E5E5] bg-white text-black hover:border-amber-500'
                }`}
              >
                <Banknote className="w-5 h-5 stroke-[1.75] shrink-0" />
                <span className="text-xs tracking-wider uppercase font-bold">Tunai (CASH)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('QRIS');
                  setErrorMsg('');
                }}
                className={`min-h-12 p-3.5 border rounded-xl text-center transition-colors cursor-pointer flex items-center justify-center gap-2 touch-manipulation ${
                  method === 'QRIS'
                    ? 'border-amber-600 bg-amber-600 text-white font-bold shadow-sm'
                    : 'border-[#E5E5E5] bg-white text-black hover:border-amber-500'
                }`}
              >
                <QrCode className="w-5 h-5 stroke-[1.75] shrink-0" />
                <span className="text-xs tracking-wider uppercase font-bold">QRIS Digital</span>
              </button>
            </div>
          </div>

          {/* Method Details */}
          {method === 'CASH' ? (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-black uppercase tracking-wider mb-1.5">
                  Uang Diterima (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  value={tenderedStr}
                  onChange={(e) => {
                    setTenderedStr(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full p-3 font-mono text-lg font-bold border border-[#CCCCCC] focus:border-black focus:outline-none bg-white text-black"
                  placeholder="0"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => {
                      setTenderedStr(q.value.toString());
                      setErrorMsg('');
                    }}
                    className="px-3 py-1.5 text-xs font-mono font-medium border border-[#E5E5E5] bg-[#F5F5F5] hover:bg-black hover:text-white transition-colors cursor-pointer"
                  >
                    {q.label === 'Uang Pas' ? 'Uang Pas' : formatCurrency(q.value)}
                  </button>
                ))}
              </div>

              {/* Kembalian (Change) */}
              <div className="p-3.5 border border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#666666] block">Kembalian:</span>
                  {isCashInsufficient && (
                    <span className="text-[11px] text-red-600 font-medium">Uang belum mencukupi</span>
                  )}
                </div>
                <div
                  className={`font-mono text-lg font-bold tabular-nums ${
                    isCashInsufficient ? 'text-[#999999]' : 'text-black'
                  }`}
                >
                  {formatCurrency(changeAmount)}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-white border border-[#E5E5E5] shadow-sm">
                <img
                  src={settings.qrisUrl || '/assets/qris.png'}
                  alt="QRIS Code"
                  className="w-48 h-48 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/qris.png';
                  }}
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-black uppercase tracking-wider">
                  {settings.storeName}
                </div>
                <p className="text-[11px] text-[#666666] max-w-xs mt-1">
                  Pindai QRIS menggunakan BCA Mobile, GoPay, OVO, Dana, ShopeePay, atau m-Banking lainnya.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-[#E5E5E5] bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-12 h-12 px-4 text-xs font-semibold text-[#666666] hover:text-black border border-[#E5E5E5] hover:border-black rounded-xl transition-colors cursor-pointer uppercase tracking-wider disabled:opacity-40 touch-manipulation"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleCompletePayment}
            disabled={isSubmitting || !paymentValid}
            className="flex-1 min-h-12 h-12 px-5 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-amber-600/25 touch-manipulation"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2]" />
                <span>Selesaikan Pembayaran</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
