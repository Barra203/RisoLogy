import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { formatCurrency } from '../utils/pos-logic';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Tag,
  CreditCard,
  User,
  ShoppingBag,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import { RisolIcon } from './RisolIcon';
import { PaymentModal } from './PaymentModal';
import { DiscountModal } from './DiscountModal';

export const PosView: React.FC = () => {
  const {
    products,
    categories: storeCategories,
    addCategory,
    cart,
    addToCart,
    updateCartQty,
    updateCartItemNote,
    removeFromCart,
    clearCart,
    customerName,
    setCustomerName,
    discountType,
    discountValue,
    selectedDiscountPresetId,
    setDiscount,
    discounts,
    applyDiscountPreset,
    subtotal,
    discountAmount,
    total,
    nextTransactionNumber,
    activeCashier,
    settings,
    setActiveBatch,
    transactions,
  } = usePos();

  const currentInvoiceNumber = nextTransactionNumber.replace(/^#/, '');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [mobileCartOpen, setMobileCartOpen] = useState<boolean>(false);
  const [showQuickAddCat, setShowQuickAddCat] = useState<boolean>(false);
  const [newCatInput, setNewCatInput] = useState<string>('');
  const [catError, setCatError] = useState<string>('');

  // Extract categories from context
  const categoriesList = useMemo(() => {
    return ['Semua', ...storeCategories];
  }, [storeCategories]);

  // Recent transactions for Top Status / Queue Bar
  const recentOrders = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [transactions]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        selectedCategory === 'Semua' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleQuickAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatInput.trim()) return;
    const ok = addCategory(newCatInput.trim());
    if (ok) {
      setSelectedCategory(newCatInput.trim());
      setNewCatInput('');
      setCatError('');
      setShowQuickAddCat(false);
    } else {
      setCatError('Kategori sudah terdaftar.');
    }
  };

  // Food icon representing Risol for menu items
  const getProductIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('signature') || cat.includes('spesial') || cat.includes('mix')) {
      return <Sparkles className="w-6 h-6 text-amber-600 stroke-[1.6]" />;
    }
    return <RisolIcon className="w-6 h-6 text-amber-700 stroke-[1.8]" />;
  };

  const totalCartQty = cart.reduce((a, b) => a + b.quantity, 0);

  // Mapped cart items and helpers for Order's Summary
  const cartItems = useMemo(
    () =>
      cart.map((item) => ({
        id: item.id || item.product.id,
        name: item.product.name,
        price: item.product.price,
        qty: item.quantity,
        notes: item.note || '',
      })),
    [cart]
  );

  const removeItem = (id: string) => {
    removeFromCart(id);
  };

  const decreaseQty = (id: string) => {
    const found = cart.find((i) => (i.id || i.product.id) === id);
    if (found) {
      updateCartQty(id, found.quantity - 1);
    }
  };

  const increaseQty = (id: string) => {
    const found = cart.find((i) => (i.id || i.product.id) === id);
    if (found) {
      updateCartQty(id, found.quantity + 1);
    }
  };

  const updateItemNotes = (id: string, note: string) => {
    updateCartItemNote(id, note);
  };

  const applyQuickDiscount = (nominal: number) => {
    if (discountType === 'nominal' && discountValue === nominal) {
      applyDiscountPreset(null);
    } else {
      setDiscount('nominal', nominal);
    }
  };

  const applyPercentDiscount = (percent: number) => {
    if (discountType === 'percentage' && discountValue === percent) {
      applyDiscountPreset(null);
    } else {
      setDiscount('percentage', percent);
    }
  };

  const finalTotal = total;

  // Order's Summary Content (3-Part Flex Column Lock)
  const renderOrderSummaryContent = (isMobileDrawer = false) => (
    <div className="w-full h-full flex flex-col bg-white shrink-0 select-none overflow-hidden">
      {/* =========================================================
          BAGIAN 1: HEADER & INPUT PELANGGAN (TERKUNCI / SHRINK-0)
          ========================================================= */}
      <div className="p-4 border-b border-slate-200 bg-white shrink-0 space-y-3">
        {/* Baris Judul & Nomor Nota */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Order&apos;s Summary
              </h2>
              <p className="text-[11px] font-semibold text-amber-700 font-mono">
                Nota: #{currentInvoiceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              {cartItems.length} Item
            </span>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Kosongkan
              </button>
            )}
            {isMobileDrawer && (
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Input Nama Pelanggan & Chip Cepat */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              👤 Nama Pelanggan
            </span>
            <span className="text-slate-500">
              Kasir: <strong className="text-slate-700">{activeCashier}</strong>
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ketik nama pelanggan..."
              className="w-full pl-3 pr-7 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-800"
            />
            {customerName && (
              <button
                type="button"
                onClick={() => setCustomerName('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Customer Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {['Kak Nadia', 'Mas Dimas', 'Kak Sarah', 'Bapak Reza'].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCustomerName(name)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  customerName === name
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================
          BAGIAN 2: DAFTAR ITEM KERANJANG (SCROLLABLE AREA)
          Hanya bagian ini yang boleh memiliki scrollbar vertikal!
          ========================================================= */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 divide-y-0">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-300 text-xl">
              🛒
            </div>
            <p className="text-xs font-medium text-slate-500">Keranjang masih kosong</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pilih varian risol dari menu di sebelah kiri
            </p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                  <p className="text-[11px] font-semibold text-amber-700 font-mono">
                    Rp {item.price.toLocaleString('id-ID')} / pcs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                  title="Hapus item"
                >
                  🗑
                </button>
              </div>

              {/* Kontrol Kuantitas & Subtotal Item */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-0.5 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => decreaseQty(item.id)}
                    className="w-6 h-6 rounded-md bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-slate-800 w-5 text-center font-mono">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => increaseQty(item.id)}
                    className="w-6 h-6 rounded-md bg-amber-600 text-white hover:bg-amber-700 font-bold text-xs flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <span className="text-xs font-bold text-slate-900 font-mono">
                  Rp {(item.price * item.qty).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Input Catatan Item Ringkas */}
              <input
                type="text"
                value={item.notes || ''}
                onChange={(e) => updateItemNotes(item.id, e.target.value)}
                placeholder="Cth: 2pcs Ayam, 1pcs Mac..."
                className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
              />
            </div>
          ))
        )}
      </div>

      {/* =========================================================
          BAGIAN 3: FOOTER TOTAL & TOMBOL KONFIRMASI (TERKUNCI / SHRINK-0)
          Bagian ini wajib selalu terlihat di dasar layar tanpa perlu scroll!
          ========================================================= */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] space-y-3">
        {/* Rincian Kalkulasi Ringkas */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Subtotal Produk</span>
            <span className="font-bold text-slate-900 font-mono">
              Rp {subtotal.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Baris Diskon / Promo */}
          <div className="space-y-1.5 pt-1 border-t border-dashed border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-amber-800 flex items-center gap-1">
                  🏷 Diskon / Promo
                </span>
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(true)}
                  className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 cursor-pointer"
                >
                  Atur
                </button>
              </div>
              <span className="font-bold text-slate-500 font-mono">
                - Rp {discountAmount.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Quick Promo Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => applyQuickDiscount(5000)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors shrink-0 cursor-pointer ${
                  discountType === 'nominal' && discountValue === 5000
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-600 border border-slate-200'
                }`}
              >
                Grosir (-5k)
              </button>
              <button
                type="button"
                onClick={() => applyPercentDiscount(10)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors shrink-0 cursor-pointer ${
                  discountType === 'percentage' && discountValue === 10
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-600 border border-slate-200'
                }`}
              >
                Jumat Berkah (10%)
              </button>
              {discounts
                .filter(
                  (preset) =>
                    preset.name.toLowerCase() !== 'grosir (-5k)' &&
                    preset.name.toLowerCase() !== 'jumat berkah (10%)'
                )
                .map((preset) => {
                  const isSelected = selectedDiscountPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          applyDiscountPreset(null);
                        } else {
                          applyDiscountPreset(preset);
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Total Pembayaran
            </span>
            <span className="text-lg font-extrabold text-amber-700 font-mono">
              Rp {finalTotal.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* TOMBOL UTAMA: KONFIRMASI PESANAN / BAYAR */}
        <button
          type="button"
          disabled={cartItems.length === 0}
          onClick={() => {
            if (isMobileDrawer) {
              setMobileCartOpen(false);
            }
            setShowPaymentModal(true);
          }}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
            cartItems.length === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white shadow-amber-600/20 hover:shadow-md cursor-pointer'
          }`}
        >
          <span>Konfirmasi Pesanan</span>
          <span className="text-base leading-none">→</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 w-full overflow-hidden bg-slate-50">
      {/* LEFT / CENTER: Header, Queue Status Bar & Product Catalog (Scrollable Independently) */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden">
        {/* Top Bar: Active Order Queue Status + Search + Category Tabs */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 space-y-3.5 shrink-0">
          {/* Status Antrean / Transaksi Terkini & Batch Selector */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
              {/* Current Active Draft Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900 shrink-0 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-mono">#{currentInvoiceNumber}</span>
                <span className="text-amber-300">|</span>
                <span>{totalCartQty} Items</span>
                <span className="text-amber-300">|</span>
                <span className="text-amber-700">Aktif</span>
              </div>

              {/* Recent Transactions Strip */}
              {recentOrders.map((tx) => {
                const itemCount = tx.items.reduce((acc, i) => acc + i.quantity, 0);
                const isUnpaid = tx.status === 'UNPAID';
                const isRefunded = tx.status === 'REFUNDED';
                return (
                  <div
                    key={tx.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold shrink-0 ${
                      isUnpaid
                        ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                        : isRefunded
                        ? 'bg-rose-50/70 border-rose-200 text-rose-700'
                        : 'bg-slate-50 border-slate-200/90 text-slate-600'
                    }`}
                  >
                    <Receipt className="w-3 h-3 text-slate-400" />
                    <span className="font-mono font-bold text-slate-800">
                      {tx.transactionNumber}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>{itemCount} Items</span>
                    <span className="text-slate-300">|</span>
                    {isUnpaid ? (
                      <span className="text-amber-700 font-bold">Belum Bayar</span>
                    ) : isRefunded ? (
                      <span className="text-rose-600 font-bold">Refund</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Selesai
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Batch Selector & Discount Preset Manager */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                  Batch:
                </span>
                <select
                  value={settings.activeBatch || 'Batch 1'}
                  onChange={(e) => setActiveBatch(e.target.value)}
                  className="text-xs font-extrabold text-amber-900 bg-transparent focus:outline-none cursor-pointer"
                  aria-label="Pilih Batch Penjualan Aktif"
                >
                  {(settings.availableBatches || ['Batch 1', 'Batch 2']).map((b) => (
                    <option key={b} value={b} className="bg-white text-slate-900">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowDiscountModal(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-200 transition-colors"
              >
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Promo</span>
              </button>
            </div>
          </div>

          {/* Search Input & Category Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category Tabs */}
            <div className="flex items-center overflow-x-auto no-scrollbar gap-2 py-0.5">
              {categoriesList.map((category) => {
                const isSelected = selectedCategory.toLowerCase() === category.toLowerCase();
                const label = category === 'Semua' ? 'Semua Menu' : category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3.5 py-2 text-xs rounded-lg whitespace-nowrap cursor-pointer transition-all touch-manipulation ${
                      isSelected
                        ? 'bg-amber-600 text-white font-semibold shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}

              {/* Quick Add Category */}
              {!showQuickAddCat ? (
                <button
                  type="button"
                  onClick={() => setShowQuickAddCat(true)}
                  className="px-3 py-2 text-xs text-slate-500 hover:text-amber-700 border border-dashed border-slate-300 hover:border-amber-500 rounded-lg whitespace-nowrap cursor-pointer flex items-center gap-1 transition-colors"
                  title="Tambah kategori baru"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Kategori</span>
                </button>
              ) : (
                <form onSubmit={handleQuickAddCat} className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="text"
                    placeholder="Kategori baru..."
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-amber-500 rounded-lg bg-white w-32 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickAddCat(false);
                      setNewCatInput('');
                      setCatError('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari menu RisoLogy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {catError && <p className="text-[11px] text-rose-600">{catError}</p>}
        </div>

        {/* Product Grid Section (Independent Vertical Scroll) */}
        <div className="flex-1 h-full min-h-0 overflow-y-auto p-4 sm:p-6 safe-bottom-clearance lg:pb-6">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center text-center p-10 my-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 text-amber-600">
                <RisolIcon className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Menu Tidak Ditemukan
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Tidak ada produk yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                const cartItemId = inCart ? inCart.id || inCart.product.id : product.id;
                const stock = Number(product.stock ?? product.stockQuantity ?? 0);
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock < 5;
                const productImage =
                  product.image || (product as { imageUrl?: string }).imageUrl;

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (!isOutOfStock && !inCart) {
                        addToCart(product);
                      }
                    }}
                    className={`bg-white rounded-xl border p-3 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group relative overflow-hidden ${
                      isOutOfStock
                        ? 'border-slate-200 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'border-amber-500 ring-2 ring-amber-500/15'
                        : 'border-slate-200 hover:border-amber-400 cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Top Visual / Image Container (Aspect 4:3) */}
                      <div className="aspect-[4/3] w-full rounded-lg bg-amber-50/50 overflow-hidden relative mb-2.5 flex items-center justify-center border border-amber-100/80">
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-2">
                            <div className="w-11 h-11 rounded-xl bg-white/90 shadow-2xs border border-amber-200/60 flex items-center justify-center mb-1.5">
                              {getProductIcon(product.category)}
                            </div>
                            <span className="text-[10px] font-extrabold tracking-widest uppercase text-amber-800/70">
                              RisoLogy
                            </span>
                          </div>
                        )}

                        {/* Stock Badge in Top-Right Corner */}
                        <span
                          className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm shadow-xs ${
                            isOutOfStock
                              ? 'bg-rose-600/95 text-white'
                              : isLowStock
                              ? 'bg-rose-500/95 text-white animate-pulse'
                              : 'bg-white/90 text-slate-800'
                          }`}
                        >
                          {isOutOfStock
                            ? 'Habis'
                            : isLowStock
                            ? `Sisa: ${stock}`
                            : `Stok: ${stock}`}
                        </span>

                        {/* Selected Quantity Badge in Top-Left Corner */}
                        {inCart && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-600 text-white shadow-xs">
                            {inCart.quantity}x dipilih
                          </span>
                        )}
                      </div>

                      {/* Category & Product Name */}
                      <div className="space-y-0.5 px-0.5">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                          {product.category}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-xs font-extrabold text-amber-700 font-mono tabular-nums pt-0.5">
                          Rp {product.price.toLocaleString('id-ID')}
                        </p>
                      </div>

                      {isLowStock && (
                        <div className="mt-1.5 px-0.5 flex items-center gap-1 text-[10px] font-bold text-rose-600">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Stok menipis!</span>
                        </div>
                      )}
                    </div>

                    {/* Dynamic Action Button / Quantity Stepper */}
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      {inCart ? (
                        <div
                          className="flex items-center justify-between bg-slate-100 rounded-lg p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => updateCartQty(cartItemId, inCart.quantity - 1)}
                            className="w-8 h-8 rounded-md bg-white text-slate-700 shadow-xs flex items-center justify-center font-bold hover:bg-slate-50 active:scale-95 cursor-pointer touch-manipulation transition-all"
                            aria-label="Kurangi jumlah"
                          >
                            -
                          </button>
                          <span className="text-xs font-extrabold text-slate-900 font-mono tabular-nums px-2">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(cartItemId, inCart.quantity + 1)}
                            className="w-8 h-8 rounded-md bg-amber-600 text-white shadow-xs flex items-center justify-center font-bold hover:bg-amber-700 active:scale-95 cursor-pointer touch-manipulation transition-all"
                            aria-label="Tambah jumlah"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                          className={`w-full py-2 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all touch-manipulation ${
                            isOutOfStock
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-98'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isOutOfStock ? 'Stok Habis' : 'Tambah'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Spacer ekstra agar baris terakhir tidak tertutup Bottom Bar di HP */}
          <div className="h-20 md:h-6 w-full shrink-0" aria-hidden="true" />
        </div>
      </div>

      {/* RIGHT PANEL: Order's Summary (Desktop Locked Full-Height Column) */}
      <div className="hidden lg:flex w-full lg:w-[400px] xl:w-[420px] h-full flex-col bg-white border-l border-slate-200 shrink-0 select-none overflow-hidden">
        {renderOrderSummaryContent(false)}
      </div>

      {/* MOBILE FLOATING BOTTOM BAR (Shown when cart has items, above Bottom Nav) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-20 left-3 right-3 z-30 bg-slate-900 text-white p-2.5 pl-4 rounded-xl shadow-xl border border-slate-700 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer touch-manipulation"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-mono font-extrabold text-sm shrink-0">
              {totalCartQty}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-amber-300 font-semibold block truncate">
                {totalCartQty} Items | {customerName || 'Pelanggan'}
              </span>
              <span className="font-mono font-extrabold text-base text-white block tabular-nums">
                {formatCurrency(total)}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-medium text-xs py-3 px-4 rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer touch-manipulation transition-all"
          >
            <span>Lihat Pesanan &amp; Bayar</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* MOBILE BOTTOM-SHEET MODAL (Order's Summary Drawer) */}
      {mobileCartOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end"
          onClick={() => setMobileCartOpen(false)}
        >
          <div
            className="bg-white rounded-t-xl max-h-[88vh] h-[85vh] flex flex-col overflow-hidden shadow-2xl border-t border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-2.5 pb-1 bg-white flex justify-center shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-300" />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {renderOrderSummaryContent(true)}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />

      {/* DISCOUNT CRUD MODAL */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onSelectPreset={(preset) => applyDiscountPreset(preset)}
      />
    </div>
  );
};

