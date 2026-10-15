/**
 * Pure business logic and CSV / TSV export generators for RisoLogy POS.
 * Decoupled from React UI for seamless unit testing and rock-solid reliability.
 */

export interface CartItemLike {
  product: {
    price: number;
  };
  quantity: number;
}

export interface TransactionExportItem {
  name: string;
  quantity: number;
  price: number;
}

export interface TransactionExportData {
  transactionNumber: string;
  timestamp: number | string;
  customerName: string;
  items: TransactionExportItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  cashierName?: string;
  status: string;
}

/**
 * Calculates cart subtotal from items.
 */
export function calculateSubtotal(items: CartItemLike[]): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((acc, item) => {
    const qty = Math.max(0, item.quantity || 0);
    const price = Math.max(0, item.product?.price || 0);
    return acc + qty * price;
  }, 0);
}

/**
 * Calculates discount amount based on type and value.
 */
export function calculateDiscount(
  subtotal: number,
  discountType: 'percentage' | 'nominal',
  discountValue: number
): number {
  const safeSubtotal = Math.max(0, subtotal || 0);
  const safeVal = Math.max(0, discountValue || 0);

  if (safeSubtotal === 0 || safeVal === 0) return 0;

  if (discountType === 'percentage') {
    const clampedPercent = Math.min(100, safeVal);
    return Math.round((safeSubtotal * clampedPercent) / 100);
  } else {
    return Math.min(safeSubtotal, Math.round(safeVal));
  }
}

/**
 * Calculates final total payable.
 */
export function calculateTotal(subtotal: number, discountAmount: number): number {
  const safeSubtotal = Math.max(0, subtotal || 0);
  const safeDiscount = Math.max(0, discountAmount || 0);
  return Math.max(0, safeSubtotal - safeDiscount);
}

/**
 * Calculates cash change (kembalian).
 * Returns 0 if tendered is less than total.
 */
export function calculateChange(total: number, tendered: number): number {
  const safeTotal = Math.max(0, total || 0);
  const safeTendered = Math.max(0, tendered || 0);
  if (safeTendered < safeTotal) return 0;
  return safeTendered - safeTotal;
}

/**
 * Formats a number to Indonesian Rupiah currency format.
 * Example: 12000 -> "Rp 12.000"
 */
export function formatCurrency(amount: number): string {
  const safeAmount = Math.round(amount || 0);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(safeAmount);
  return `Rp ${formatted}`;
}

/**
 * Formats sequence number to persistent transaction ID.
 * Format: #RSL-0001, #RSL-0002, etc.
 */
export function formatTransactionNumber(sequence: number): string {
  const safeSeq = Math.max(1, Math.floor(sequence || 1));
  const padded = String(safeSeq).padStart(4, '0');
  return `#RSL-${padded}`;
}

/**
 * Parses numeric sequence from transaction number.
 * Supports #RSL-0042, #RLS-0042, #MLT-0042
 */
export function parseTransactionSequence(txNumber: string): number {
  if (!txNumber) return 1;
  const match = txNumber.match(/(?:RSL|RLS|MLT)-(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 1;
}

/**
 * Formats timestamp to Indonesian localized date & time strings.
 */
export function formatDateTime(timestamp: number | string | Date): { date: string; time: string; full: string } {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) {
    return { date: '-', time: '-', full: '-' };
  }

  const dateStr = d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return {
    date: dateStr,
    time: timeStr,
    full: `${dateStr} ${timeStr}`,
  };
}

/**
 * Escapes CSV field according to RFC 4180.
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Escapes TSV field (replaces tabs with spaces).
 */
export function escapeTsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

// ==========================================
// 6 EXPORT TEMPLATES (CSV & TSV)
// ==========================================

/**
 * Template 1: Rincian Stok (Stock Detail)
 */
export interface StockExportRow {
  productId: string;
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
  status: string;
  unitCost: number;
  stockValue: number;
}

export function generateStockCsv(data: StockExportRow[]): string {
  const headers = [
    'No',
    'ID Produk',
    'Nama Menu',
    'Kategori',
    'Harga Jual (Rp)',
    'Stok Fisik',
    'Status Stok',
    'HPP Satuan (Rp)',
    'Estimasi Nilai Stok (Rp)',
  ];

  const rows = data.map((item, index) => [
    escapeCsvField(index + 1),
    escapeCsvField(item.productId),
    escapeCsvField(item.name),
    escapeCsvField(item.category),
    escapeCsvField(item.price),
    escapeCsvField(item.stockQuantity),
    escapeCsvField(item.status),
    escapeCsvField(item.unitCost),
    escapeCsvField(item.stockValue),
  ].join(','));

  return '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
}

export function generateStockTsv(data: StockExportRow[]): string {
  const headers = ['No', 'ID Produk', 'Nama Menu', 'Kategori', 'Harga Jual', 'Stok Fisik', 'Status Stok', 'HPP Satuan', 'Nilai Stok'];
  const rows = data.map((item, index) => [
    index + 1,
    item.productId,
    item.name,
    item.category,
    item.price,
    item.stockQuantity,
    item.status,
    item.unitCost,
    item.stockValue,
  ].map(escapeTsvField).join('\t'));
  return [headers.join('\t'), ...rows].join('\n');
}

/**
 * Template 2: Jumlah Pembelian (Item Sales Summary)
 */
export interface ItemSalesExportRow {
  id: string;
  name: string;
  category: string;
  price: number;
  totalQtySold: number;
  grossSales: number;
  netSales: number;
  salesSharePercent: number;
}

export function generateItemSalesCsv(data: ItemSalesExportRow[]): string {
  const headers = [
    'No',
    'ID Menu',
    'Nama Menu',
    'Kategori',
    'Harga Satuan (Rp)',
    'Jumlah Terjual (Porsi)',
    'Total Omzet Kotor (Rp)',
    'Total Omzet Bersih (Rp)',
    'Kontribusi Penjualan (%)',
  ];

  const rows = data.map((item, index) => [
    escapeCsvField(index + 1),
    escapeCsvField(item.id),
    escapeCsvField(item.name),
    escapeCsvField(item.category),
    escapeCsvField(item.price),
    escapeCsvField(item.totalQtySold),
    escapeCsvField(item.grossSales),
    escapeCsvField(item.netSales),
    escapeCsvField(item.salesSharePercent.toFixed(1) + '%'),
  ].join(','));

  return '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
}

export function generateItemSalesTsv(data: ItemSalesExportRow[]): string {
  const headers = ['No', 'ID Menu', 'Nama Menu', 'Kategori', 'Harga Satuan', 'Qty Terjual', 'Omzet Kotor', 'Omzet Bersih', 'Kontribusi %'];
  const rows = data.map((item, index) => [
    index + 1,
    item.id,
    item.name,
    item.category,
    item.price,
    item.totalQtySold,
    item.grossSales,
    item.netSales,
    item.salesSharePercent.toFixed(1) + '%',
  ].map(escapeTsvField).join('\t'));
  return [headers.join('\t'), ...rows].join('\n');
}

/**
 * Template 3: Data Pelanggan (Customer Directory)
 */
export interface CustomerExportRow {
  name: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastVisit: string;
  favoriteItem: string;
  tier: string;
}

export function generateCustomersCsv(data: CustomerExportRow[]): string {
  const headers = [
    'No',
    'Nama Pelanggan',
    'Kontak/Telepon',
    'Total Frekuensi Order',
    'Total Belanja (LTV Rp)',
    'Rata-rata Order (AOV Rp)',
    'Kunjungan Terakhir',
    'Menu Favorit',
    'Status Loyalitas',
  ];

  const rows = data.map((c, index) => [
    escapeCsvField(index + 1),
    escapeCsvField(c.name),
    escapeCsvField(c.phone || '-'),
    escapeCsvField(c.totalOrders),
    escapeCsvField(c.totalSpent),
    escapeCsvField(c.averageOrderValue),
    escapeCsvField(c.lastVisit),
    escapeCsvField(c.favoriteItem),
    escapeCsvField(c.tier),
  ].join(','));

  return '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
}

export function generateCustomersTsv(data: CustomerExportRow[]): string {
  const headers = ['No', 'Nama Pelanggan', 'Kontak', 'Total Order', 'Total Belanja (LTV)', 'Rata-rata Order (AOV)', 'Kunjungan Terakhir', 'Menu Favorit', 'Status Loyalitas'];
  const rows = data.map((c, index) => [
    index + 1,
    c.name,
    c.phone || '-',
    c.totalOrders,
    c.totalSpent,
    c.averageOrderValue,
    c.lastVisit,
    c.favoriteItem,
    c.tier,
  ].map(escapeTsvField).join('\t'));
  return [headers.join('\t'), ...rows].join('\n');
}

/**
 * Template 4: Rincian Keuangan (Financial Report / Profit & Loss)
 */
export interface FinancialExportRow {
  date: string;
  totalTransactions: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  supplierExpenses: number;
  netProfit: number;
  cashSales: number;
  qrisSales: number;
}

export function generateFinancialReportCsv(data: FinancialExportRow[]): string {
  const headers = [
    'No',
    'Tanggal / Periode',
    'Total Transaksi',
    'Penjualan Kotor (Rp)',
    'Total Diskon (Rp)',
    'Penjualan Bersih (Rp)',
    'Belanja Supplier (Rp)',
    'Laba Operasional Bersih (Rp)',
    'Pembayaran Tunai (Rp)',
    'Pembayaran QRIS (Rp)',
  ];

  const rows = data.map((row, index) => [
    escapeCsvField(index + 1),
    escapeCsvField(row.date),
    escapeCsvField(row.totalTransactions),
    escapeCsvField(row.grossSales),
    escapeCsvField(row.discounts),
    escapeCsvField(row.netSales),
    escapeCsvField(row.supplierExpenses),
    escapeCsvField(row.netProfit),
    escapeCsvField(row.cashSales),
    escapeCsvField(row.qrisSales),
  ].join(','));

  return '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
}

export function generateFinancialReportTsv(data: FinancialExportRow[]): string {
  const headers = ['No', 'Tanggal', 'Total Tx', 'Penjualan Kotor', 'Diskon', 'Penjualan Bersih', 'Belanja Supplier', 'Laba Bersih', 'Tunai', 'QRIS'];
  const rows = data.map((row, index) => [
    index + 1,
    row.date,
    row.totalTransactions,
    row.grossSales,
    row.discounts,
    row.netSales,
    row.supplierExpenses,
    row.netProfit,
    row.cashSales,
    row.qrisSales,
  ].map(escapeTsvField).join('\t'));
  return [headers.join('\t'), ...rows].join('\n');
}

/**
 * Template 5: Pengeluaran (Supplier Expenses)
 */
export interface ExpenseExportRow {
  expenseNumber: string;
  date: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  supplierName: string;
  supplierLocation: string;
  cashierName: string;
  notes?: string;
}

export function generateExpensesCsv(data: ExpenseExportRow[]): string {
  const headers = [
    'No',
    'No Pengeluaran',
    'Tanggal',
    'Nama Bahan / Item',
    'Kategori',
    'Jumlah',
    'Satuan',
    'Harga Satuan (Rp)',
    'Total Biaya (Rp)',
    'Nama Supplier',
    'Lokasi / Kontak Supplier',
    'Shift Kasir',
    'Catatan',
  ];

  const rows = data.map((exp, index) => [
    escapeCsvField(index + 1),
    escapeCsvField(exp.expenseNumber),
    escapeCsvField(exp.date),
    escapeCsvField(exp.itemName),
    escapeCsvField(exp.category),
    escapeCsvField(exp.quantity),
    escapeCsvField(exp.unit),
    escapeCsvField(exp.unitPrice),
    escapeCsvField(exp.totalPrice),
    escapeCsvField(exp.supplierName),
    escapeCsvField(exp.supplierLocation),
    escapeCsvField(exp.cashierName),
    escapeCsvField(exp.notes || '-'),
  ].join(','));

  return '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
}

export function generateExpensesTsv(data: ExpenseExportRow[]): string {
  const headers = ['No', 'No Pengeluaran', 'Tanggal', 'Nama Bahan', 'Kategori', 'Qty', 'Satuan', 'Harga Satuan', 'Total Biaya', 'Supplier', 'Lokasi Supplier', 'Shift Kasir', 'Catatan'];
  const rows = data.map((exp, index) => [
    index + 1,
    exp.expenseNumber,
    exp.date,
    exp.itemName,
    exp.category,
    exp.quantity,
    exp.unit,
    exp.unitPrice,
    exp.totalPrice,
    exp.supplierName,
    exp.supplierLocation,
    exp.cashierName,
    exp.notes || '-',
  ].map(escapeTsvField).join('\t'));
  return [headers.join('\t'), ...rows].join('\n');
}

export type AnyTransactionExport = TransactionExportData | TransactionDetailExportRow;

export function generateReceiptCsv(transactions: AnyTransactionExport[]): string {
  return generateTransactionsLedgerCsv(transactions);
}

export function generateTransactionsLedgerCsv(transactions: AnyTransactionExport[]): string {
  const headers = [
    'No Transaksi',
    'Tanggal',
    'Waktu',
    'Shift Kasir',
    'Nama Pembeli',
    'Item Pesanan',
    'Subtotal',
    'Diskon',
    'Total Pembayaran',
    'Metode Pembayaran',
    'Status',
  ];

  const rows = transactions.map((tx: any) => {
    let dateStr = '';
    let timeStr = '';
    if (tx.dateTime) {
      dateStr = tx.dateTime;
      timeStr = '';
    } else if (tx.timestamp) {
      const dt = formatDateTime(tx.timestamp);
      dateStr = dt.date;
      timeStr = dt.time;
    }

    const itemsDesc =
      tx.itemsSummary ||
      (Array.isArray(tx.items)
        ? tx.items.map((item: any) => `${item.name} (${item.quantity}x @ ${item.price})`).join('; ')
        : '-');

    return [
      escapeCsvField(tx.transactionNumber),
      escapeCsvField(dateStr),
      escapeCsvField(timeStr),
      escapeCsvField(tx.cashierName || 'Harits'),
      escapeCsvField(tx.customerName),
      escapeCsvField(itemsDesc),
      escapeCsvField(tx.subtotal),
      escapeCsvField(tx.discountAmount),
      escapeCsvField(tx.total),
      escapeCsvField(tx.paymentMethod),
      escapeCsvField(tx.status),
    ].join(',');
  });

  return '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
}

export function generateTransactionsLedgerTsv(transactions: AnyTransactionExport[]): string {
  const headers = [
    'No Transaksi',
    'Tanggal',
    'Waktu',
    'Shift Kasir',
    'Nama Pembeli',
    'Item Pesanan',
    'Subtotal',
    'Diskon',
    'Total Pembayaran',
    'Metode',
    'Status',
  ];

  const rows = transactions.map((tx: any) => {
    let dateStr = '';
    let timeStr = '';
    if (tx.dateTime) {
      dateStr = tx.dateTime;
      timeStr = '';
    } else if (tx.timestamp) {
      const dt = formatDateTime(tx.timestamp);
      dateStr = dt.date;
      timeStr = dt.time;
    }

    const itemsDesc =
      tx.itemsSummary ||
      (Array.isArray(tx.items)
        ? tx.items.map((item: any) => `${item.name} (${item.quantity}x @ ${item.price})`).join('; ')
        : '-');

    return [
      tx.transactionNumber,
      dateStr,
      timeStr,
      tx.cashierName || 'Harits',
      tx.customerName,
      itemsDesc,
      tx.subtotal,
      tx.discountAmount,
      tx.total,
      tx.paymentMethod,
      tx.status,
    ].map(escapeTsvField).join('\t');
  });

  return [headers.join('\t'), ...rows].join('\n');
}

// Convenient Aliases
export const generateFinancialCsv = generateFinancialReportCsv;
export const generateFinancialTsv = generateFinancialReportTsv;
export const generateTransactionsCsv = generateTransactionsLedgerCsv;
export const generateTransactionsTsv = generateTransactionsLedgerTsv;

export interface TransactionDetailExportRow {
  transactionNumber: string;
  dateTime: string;
  cashierName: string;
  customerName: string;
  itemsSummary: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  status: string;
}
