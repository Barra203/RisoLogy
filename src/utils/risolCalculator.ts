import { Transaction, TransactionItem } from '../types/pos';

export interface RisolBreakdown {
  ayamBaladoPcs: number;
  macCheesePcs: number;
  unparsedMixPortions: number;
  totalPcs: number;
  totalPortions: number;
}

/**
 * Parsing catatan varian mix dari teks kasir:
 * Mendukung format:
 * - "2pcs Ayam, 1\npcs MnC"
 * - "4pcs Ayam, 2pcs Mac"
 * - "2pcs Mac, 1pcs Ayam Balado"
 * - "1pcs Ayam, 2pcs MnC"
 */
export const parseMixNotes = (
  notes: string | undefined | null,
  qtyPortion: number = 1
): { ayam: number; mac: number; isValid: boolean } => {
  const safeQty = Math.max(1, Number(qtyPortion) || 1);

  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    // Default fallback: 2 ayam, 1 mac per porsi jika catatan kosong
    return { ayam: 2 * safeQty, mac: 1 * safeQty, isValid: false };
  }

  // 1. Normalisasi string: ganti newline dan tab dengan spasi tunggal, lalu ubah ke lowercase
  const clean = notes
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // 2. Regex Ayam Balado: mendeteksi "ayam", "balado", atau "ayam balado"
  const ayamMatch =
    clean.match(/(\d+)\s*(?:pcs|pc|biji|buah)?\s*(?:ayam(?:\s+balado)?|balado)/i) ||
    clean.match(/(?:ayam(?:\s+balado)?|balado)\s*(?:pcs|pc)?\s*:?\s*(\d+)/i);

  // 3. Regex Mac-n-Cheese: tambahkan dukungan "mnc", "m&c", "mac", "cheese", "keju"
  const macMatch =
    clean.match(/(\d+)\s*(?:pcs|pc|biji|buah)?\s*(?:mnc|m&c|mac(?:\s*(?:-n-?|and)\s*cheese)?|cheese|keju)/i) ||
    clean.match(/(?:mnc|m&c|mac(?:\s*(?:-n-?|and)\s*cheese)?|cheese|keju)\s*(\d+)/i);

  let rawAyam = ayamMatch ? parseInt(ayamMatch[1], 10) : 0;
  let rawMac = macMatch ? parseInt(macMatch[1], 10) : 0;

  // Fallback: Jika kasir hanya mengetik angka tanpa label (cth: "2, 1" atau "4, 2")
  if (!ayamMatch && !macMatch) {
    const rawNumbers = clean.match(/\d+/g);
    if (rawNumbers && rawNumbers.length >= 2) {
      rawAyam = parseInt(rawNumbers[0], 10);
      rawMac = parseInt(rawNumbers[1], 10);
    }
  }

  const expectedTotalPcs = safeQty * 3;
  const parsedSum = rawAyam + rawMac;

  // Kasus A: Kasir menuliskan akumulasi total pcs (misal: "4pcs Ayam, 2pcs MnC" untuk 2 porsi)
  if (parsedSum === expectedTotalPcs) {
    return { ayam: rawAyam, mac: rawMac, isValid: true };
  }

  // Kasus B: Kasir menuliskan rasio 1 porsi (cth: "2pcs ayam, 1pcs MnC"), tetapi porsi transaksi > 1
  if (parsedSum === 3 && safeQty > 1) {
    return { ayam: rawAyam * safeQty, mac: rawMac * safeQty, isValid: true };
  }

  // Kasus C: Terdeteksi sebagian
  if (parsedSum > 0) {
    return { ayam: rawAyam, mac: rawMac, isValid: true };
  }

  // Fallback jika tidak terdeteksi sama sekali: default 2 Ayam, 1 Mac per porsi
  return { ayam: 2 * safeQty, mac: 1 * safeQty, isValid: false };
};

/**
 * Kalkulasi total produksi dapur dari daftar transaksi batch aktif
 */
export const calculateKitchenProduction = (
  transactions: (Transaction | Record<string, any>)[]
): RisolBreakdown => {
  let ayamBaladoPcs = 0;
  let macCheesePcs = 0;
  let unparsedMixPortions = 0;
  let totalPortions = 0;

  transactions.forEach((tx) => {
    const status = String(tx.status || '').toUpperCase();
    if (
      status === 'CANCELLED' ||
      status === 'BATAL' ||
      status === 'REFUNDED' ||
      status === 'REFUND'
    ) {
      return;
    }

    const items: (TransactionItem & { qty?: number; notes?: string })[] = Array.isArray(tx.items)
      ? tx.items
      : [];

    items.forEach((item) => {
      const name = String(item.name || '').toLowerCase();
      const qty = Number(item.qty ?? item.quantity) || 0;
      if (qty <= 0) return;

      totalPortions += qty;

      if (name.includes('mix')) {
        // Ambil catatan baik dari properti item.notes / item.note / item.description atau fallback ke tx.notes
        const noteText = item.notes || item.note || item.description || tx.notes || '';
        const parsed = parseMixNotes(noteText, qty);
        if (!parsed.isValid) {
          unparsedMixPortions += qty;
        }
        ayamBaladoPcs += parsed.ayam;
        macCheesePcs += parsed.mac;
      } else if (name.includes('ayam') || name.includes('balado')) {
        ayamBaladoPcs += qty * 3;
      } else if (
        name.includes('mac') ||
        name.includes('cheese') ||
        name.includes('keju') ||
        name.includes('mnc')
      ) {
        macCheesePcs += qty * 3;
      } else {
        ayamBaladoPcs += Math.ceil((qty * 3) / 2);
        macCheesePcs += Math.floor((qty * 3) / 2);
      }
    });
  });

  return {
    ayamBaladoPcs,
    macCheesePcs,
    unparsedMixPortions,
    totalPcs: ayamBaladoPcs + macCheesePcs,
    totalPortions,
  };
};
