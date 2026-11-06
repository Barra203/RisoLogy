/**
 * Memformat angka menjadi mata uang Rupiah atau menyensornya saat Privacy Mode aktif
 * @param amount - Nilai angka rupiah
 * @param isPrivacy - Status mode privasi (true = sensor, false = tampilkan angka)
 * @param mask - Karakter sensor (default: '••••••')
 */
export const formatCurrency = (
  amount: number | undefined | null,
  isPrivacy: boolean = false,
  mask: string = '••••••'
): string => {
  if (isPrivacy) {
    return `Rp ${mask}`;
  }
  const num = Number(amount) || 0;
  return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};
