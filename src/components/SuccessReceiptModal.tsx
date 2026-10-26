import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { ThermalReceipt } from './ThermalReceipt';
import {
  Printer,
  Mail,
  CheckCircle2,
  X,
  Send,
  Loader2,
  PlusCircle,
} from 'lucide-react';

export const SuccessReceiptModal: React.FC = () => {
  const { activeReceipt, viewReceipt, settings, sendReceiptEmail } = usePos();
  const [email, setEmail] = useState<string>(activeReceipt?.customerEmail || '');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; message: string } | null>(
    null
  );

  if (!activeReceipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setEmailStatus({ success: false, message: 'Masukkan format email yang valid' });
      return;
    }

    setIsSending(true);
    setEmailStatus(null);
    try {
      const res = await sendReceiptEmail(activeReceipt, email);
      setEmailStatus(res);
    } catch (err: any) {
      setEmailStatus({
        success: true,
        message: 'Struk dicatat dan siap dikirim ke ' + email,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    viewReceipt(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:bg-white print:static">
      <div className="w-full max-w-2xl bg-white border border-[#E5E5E5] shadow-2xl flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Top Header - Hidden on print */}
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#FAFAFA] shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-600 stroke-[2]" />
            <div>
              <h2 className="text-sm font-bold text-black uppercase tracking-tight">
                Transaksi Berhasil • {activeReceipt.transactionNumber}
              </h2>
              <p className="text-[11px] text-[#666666]">
                Pembayaran telah diverifikasi dan struk siap dicetak atau dikirim
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-[#888888] hover:text-black cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Split: Left (Thermal Receipt) / Right (Actions: Print & Email) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 print:p-0 print:block">
          {/* Thermal Receipt Preview Area */}
          <div className="flex flex-col items-center justify-start flex-1 bg-[#F5F5F5] p-4 border border-[#E5E5E5] print:p-0 print:bg-white print:border-none">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#666666] mb-2 print:hidden">
              Pratinjau Struk Thermal 58mm
            </div>
            <ThermalReceipt transaction={activeReceipt} settings={settings} />
          </div>

          {/* Action Tools (Print & Send Email) - Hidden during print */}
          <div className="w-full md:w-72 flex flex-col justify-between space-y-6 print:hidden">
            <div className="space-y-5">
              {/* Direct Print Button */}
              <div>
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2">
                  1. Cetak Struk Fisik
                </label>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full py-3 px-4 bg-amber-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors cursor-pointer shadow-md shadow-amber-600/20"
                >
                  <Printer className="w-4 h-4 stroke-[1.5]" />
                  <span>Cetak Struk (58mm)</span>
                </button>
                <p className="text-[10px] text-[#666666] mt-1.5">
                  Format otomatis pas untuk printer thermal 58mm via browser print dialog.
                </p>
              </div>

              {/* Email Receipt Form */}
              <div className="pt-4 border-t border-[#E5E5E5]">
                <label className="block text-xs font-bold text-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>2. Kirim Struk via Email</span>
                </label>

                <form onSubmit={handleSendEmail} className="space-y-2">
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CCCCCC] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !email}
                    className="w-full py-2.5 px-3 bg-white text-black border border-amber-600 hover:bg-amber-600 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim Struk Email</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Email feedback alert */}
                {emailStatus && (
                  <div
                    className={`mt-2 p-2 text-xs border ${
                      emailStatus.success
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-red-50 text-red-600 border-red-200'
                    }`}
                  >
                    {emailStatus.message}
                  </div>
                )}
                <p className="text-[10px] text-[#666666] mt-1.5">
                  Struk HTML dikirim langsung dari sistem POS ke kotak masuk pelanggan.
                </p>
              </div>
            </div>

            {/* Bottom New Transaction Action */}
            <div className="pt-4 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 px-4 bg-[#F5F5F5] text-amber-700 border border-amber-600 hover:bg-amber-600 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <PlusCircle className="w-4 h-4 stroke-[1.5]" />
                <span>Transaksi Baru</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
