import React from 'react';
import { Transaction, StoreSettings } from '../types/pos';
import { formatCurrency, formatDateTime } from '../utils/pos-logic';

interface ThermalReceiptProps {
  transaction: Transaction;
  settings: StoreSettings;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ transaction, settings }) => {
  const dt = formatDateTime(transaction.timestamp);

  return (
    <div
      id="thermal-receipt-print-area"
      className="w-[280px] sm:w-[320px] bg-white text-black p-4 font-mono text-[11px] leading-tight select-text border border-[#E5E5E5] shadow-sm print:border-none print:shadow-none print:w-[58mm] print:p-1 print:text-[10px]"
    >
      {/* Store Header */}
      <div className="text-center pb-2">
        <div className="font-bold text-sm tracking-tight uppercase">
          {settings.storeName}
        </div>
        <div className="text-[10px] text-[#555555] print:text-black mt-1 leading-snug">
          {settings.address}
        </div>
        {settings.phone && (
          <div className="text-[10px] text-[#555555] print:text-black">
            Telp: {settings.phone}
          </div>
        )}
      </div>

      {/* Dashed line */}
      <div className="border-t border-dashed border-black my-2" />

      {/* Transaction Metadata */}
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>NO. STRUK</span>
          <span className="font-bold">{transaction.transactionNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>TANGGAL</span>
          <span>{dt.date} {dt.time}</span>
        </div>
        <div className="flex justify-between">
          <span>KASIR</span>
          <span>{transaction.cashierName || 'Kasir 01'}</span>
        </div>
        <div className="flex justify-between">
          <span>PELANGGAN</span>
          <span className="font-semibold truncate max-w-[140px]">
            {transaction.customerName || 'Pelanggan'}
          </span>
        </div>
      </div>

      {/* Dashed line */}
      <div className="border-t border-dashed border-black my-2" />

      {/* Item List Header */}
      <div className="flex justify-between text-[10px] font-bold pb-1">
        <span>MENU</span>
        <span>TOTAL</span>
      </div>

      {/* Items */}
      <div className="space-y-1.5 py-1">
        {transaction.items.map((item, idx) => (
          <div key={`${item.productId}-${idx}`} className="text-[10px]">
            <div className="font-semibold text-black">{item.name}</div>
            <div className="flex justify-between text-[#444444] print:text-black pl-1">
              <span>
                {item.quantity} x {formatCurrency(item.price).replace('Rp ', '')}
              </span>
              <span className="font-mono">
                {formatCurrency(item.subtotal).replace('Rp ', '')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Dashed line */}
      <div className="border-t border-dashed border-black my-2" />

      {/* Calculation Summary */}
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span>SUBTOTAL</span>
          <span>{formatCurrency(transaction.subtotal)}</span>
        </div>
        {transaction.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>DISKON {transaction.discountType === 'percentage' ? `(${transaction.discountValue}%)` : ''}</span>
            <span>- {formatCurrency(transaction.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
          <span>TOTAL</span>
          <span>{formatCurrency(transaction.total)}</span>
        </div>

        {/* Payment info */}
        <div className="pt-1 space-y-0.5 border-t border-dashed border-[#888888]">
          <div className="flex justify-between">
            <span>METODE BAYAR</span>
            <span className="font-bold">{transaction.paymentMethod}</span>
          </div>
          {transaction.paymentMethod === 'CASH' && transaction.cashTendered !== undefined && (
            <>
              <div className="flex justify-between">
                <span>BAYAR (TUNAI)</span>
                <span>{formatCurrency(transaction.cashTendered)}</span>
              </div>
              <div className="flex justify-between">
                <span>KEMBALIAN</span>
                <span>{formatCurrency(transaction.cashChange || 0)}</span>
              </div>
            </>
          )}
          {transaction.paymentMethod === 'QRIS' && (
            <div className="flex justify-between text-[9px] text-[#555555] print:text-black">
              <span>STATUS QRIS</span>
              <span>LUNAS (VERIFIED)</span>
            </div>
          )}
        </div>
      </div>

      {/* Dashed line */}
      <div className="border-t border-dashed border-black my-2" />

      {/* Barcode simulation */}
      <div className="py-1 text-center">
        <div className="inline-block tracking-[4px] font-mono text-[9px] border-b border-black pb-0.5">
          ||||| | |||| ||| |||| | |||||
        </div>
        <div className="text-[9px] text-[#555555] print:text-black mt-0.5">
          {transaction.transactionNumber}
        </div>
      </div>

      {/* Footer Text */}
      <div className="text-center pt-2 text-[9px] text-[#444444] print:text-black whitespace-pre-line leading-relaxed">
        {settings.footerText || 'Terima kasih atas kunjungan Anda!'}
      </div>
    </div>
  );
};
