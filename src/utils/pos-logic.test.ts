import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSubtotal,
  calculateDiscount,
  calculateTotal,
  calculateChange,
  formatCurrency,
  formatTransactionNumber,
  parseTransactionSequence,
  generateReceiptCsv,
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
} from './pos-logic.ts';

test('calculateSubtotal sums up items correctly', () => {
  const items = [
    { product: { price: 12000 }, quantity: 2 },
    { product: { price: 10000 }, quantity: 1 },
    { product: { price: 13000 }, quantity: 3 },
  ];
  // 24000 + 10000 + 39000 = 73000
  assert.equal(calculateSubtotal(items), 73000);
});

test('calculateSubtotal handles empty or zero quantity', () => {
  assert.equal(calculateSubtotal([]), 0);
  assert.equal(calculateSubtotal([{ product: { price: 12000 }, quantity: 0 }]), 0);
});

test('calculateDiscount handles percentage and nominal values', () => {
  const subtotal = 100000;
  // 10% of 100k = 10k
  assert.equal(calculateDiscount(subtotal, 'percentage', 10), 10000);
  // Max percentage capped at 100%
  assert.equal(calculateDiscount(subtotal, 'percentage', 150), 100000);
  // Nominal discount
  assert.equal(calculateDiscount(subtotal, 'nominal', 15000), 15000);
  // Nominal cannot exceed subtotal
  assert.equal(calculateDiscount(subtotal, 'nominal', 120000), 100000);
  // Zero discount
  assert.equal(calculateDiscount(subtotal, 'percentage', 0), 0);
});

test('calculateTotal subtracts discount from subtotal', () => {
  assert.equal(calculateTotal(100000, 15000), 85000);
  assert.equal(calculateTotal(50000, 60000), 0);
});

test('calculateChange calculates cash change properly', () => {
  assert.equal(calculateChange(47000, 50000), 3000);
  assert.equal(calculateChange(50000, 50000), 0);
  assert.equal(calculateChange(50000, 40000), 0);
});

test('formatTransactionNumber creates persistent #RSL-XXXX format', () => {
  assert.equal(formatTransactionNumber(1), '#RSL-0001');
  assert.equal(formatTransactionNumber(42), '#RSL-0042');
  assert.equal(formatTransactionNumber(999), '#RSL-0999');
  assert.equal(formatTransactionNumber(1000), '#RSL-1000');
});

test('parseTransactionSequence extracts number', () => {
  assert.equal(parseTransactionSequence('#RSL-0001'), 1);
  assert.equal(parseTransactionSequence('#RSL-0420'), 420);
});

test('formatCurrency formats Rupiah numbers', () => {
  const formatted = formatCurrency(12000);
  assert.ok(formatted.includes('12.000') || formatted.includes('12000'));
});

test('Template 1: generateStockCsv and TSV', () => {
  const stockRows = [
    {
      productId: 'prod-risol-mayo',
      name: 'Risol Mayo Melt',
      category: 'Risol Mayo',
      price: 12000,
      stockQuantity: 48,
      status: 'Tersedia',
      unitCost: 5500,
      stockValue: 264000,
    },
  ];

  const csv = generateStockCsv(stockRows);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('Risol Mayo Melt'));
  assert.ok(csv.includes('264000'));

  const tsv = generateStockTsv(stockRows);
  assert.ok(tsv.includes('Risol Mayo Melt'));
  assert.ok(tsv.includes('\t'));
});

test('Template 2: generateItemSalesCsv and TSV', () => {
  const salesRows = [
    {
      id: 'prod-risol-mayo',
      name: 'Risol Mayo Melt',
      category: 'Risol Mayo',
      price: 12000,
      totalQtySold: 10,
      grossSales: 120000,
      netSales: 110000,
      salesSharePercent: 65.5,
    },
  ];

  const csv = generateItemSalesCsv(salesRows);
  assert.ok(csv.includes('Risol Mayo Melt'));
  assert.ok(csv.includes('65.5%'));

  const tsv = generateItemSalesTsv(salesRows);
  assert.ok(tsv.includes('65.5%'));
});

test('Template 3: generateCustomersCsv and TSV', () => {
  const customers = [
    {
      name: 'Kak Nadia Senopati',
      phone: '0812-9988-7711',
      totalOrders: 12,
      totalSpent: 156000,
      averageOrderValue: 13000,
      lastVisit: '15 Okt 2026',
      favoriteItem: 'Risol Mayo Melt',
      tier: 'VIP',
    },
  ];

  const csv = generateCustomersCsv(customers);
  assert.ok(csv.includes('Kak Nadia Senopati'));
  assert.ok(csv.includes('VIP'));

  const tsv = generateCustomersTsv(customers);
  assert.ok(tsv.includes('0812-9988-7711'));
});

test('Template 4: generateFinancialCsv and TSV', () => {
  const financial = [
    {
      date: '15 Okt 2026',
      totalTransactions: 25,
      grossSales: 300000,
      discounts: 25000,
      netSales: 275000,
      supplierExpenses: 120000,
      netProfit: 155000,
      cashSales: 150000,
      qrisSales: 125000,
    },
  ];

  const csv = generateFinancialCsv(financial);
  assert.ok(csv.includes('155000'));

  const tsv = generateFinancialTsv(financial);
  assert.ok(tsv.includes('155000'));
});

test('Template 5: generateExpensesCsv and TSV', () => {
  const expenses = [
    {
      expenseNumber: '#EXP-0001',
      date: '2026-10-15',
      itemName: 'Daging Smoked Beef Premium',
      category: 'Bahan Utama',
      quantity: 5,
      unit: 'kg',
      unitPrice: 85000,
      totalPrice: 425000,
      supplierName: 'CV Sumber Pangan',
      supplierLocation: 'Pasar Senen',
      cashierName: 'Harits',
    },
  ];

  const csv = generateExpensesCsv(expenses);
  assert.ok(csv.includes('#EXP-0001'));
  assert.ok(csv.includes('CV Sumber Pangan'));

  const tsv = generateExpensesTsv(expenses);
  assert.ok(tsv.includes('Harits'));
});

test('Template 6: generateTransactionsCsv and TSV', () => {
  const sampleTransactions = [
    {
      transactionNumber: '#RSL-0001',
      timestamp: 1718000000000,
      customerName: 'Budi Santoso',
      items: [
        { name: 'Risol Mayo Melt', quantity: 2, price: 12000 },
      ],
      subtotal: 24000,
      discountAmount: 2400,
      total: 21600,
      paymentMethod: 'QRIS',
      cashierName: 'Harits',
      status: 'PAID',
    },
  ];

  const csv = generateTransactionsCsv(sampleTransactions);
  assert.ok(csv.startsWith('\uFEFF')); // BOM present
  assert.ok(csv.includes('#RSL-0001'));
  assert.ok(csv.includes('Budi Santoso'));
  assert.ok(csv.includes('Harits'));

  const tsv = generateTransactionsTsv(sampleTransactions);
  assert.ok(tsv.includes('#RSL-0001'));
  assert.ok(tsv.includes('QRIS'));
});
