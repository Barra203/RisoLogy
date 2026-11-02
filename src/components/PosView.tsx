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

  const currentInvoiceNumber = nextTransactionNumber;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [showDiscountInput, setShowDiscountInput] = useState<boolean>(false);
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

  // Order's Summary Content shared between Desktop right panel and Mobile bottom-sheet drawer
  const renderOrderSummaryContent = (isMobileDrawer = false) => (
    <div className="flex flex-col h-full bg-white">
      {/* Header: Order's Summary & Nomor Nota */}
      <div className="p-4 border-b border-slate-200/80 bg-white shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
              <ShoppingBag className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                Order&apos;s Summary
              </h2>
              <p className="text-[11px] font-semibold text-slate-400">
                Nota: <span className="text-amber-700 font-bold font-mono">{currentInvoiceNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {totalCartQty} Item
            </span>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-semibold text-slate-400 hover:text-rose-600 cursor-pointer transition-colors px-1.5 py-1"
              >
                Kosongkan
              </button>
            )}
            {isMobileDrawer && (
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Name Input & Active Cashier */}
      <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/70 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-600" />
            <span>Nama Pelanggan</span>
          </label>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>
              Kasir: <strong className="text-slate-900">{activeCashier}</strong>
            </span>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ketik nama pelanggan..."
            className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-medium rounded-lg transition-all"
          />
          {customerName && customerName !== 'Pelanggan' && (
            <button
              type="button"
              onClick={() => setCustomerName('Pelanggan')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Reset ke Pelanggan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Customer Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {['Kak Nadia', 'Mas Dimas', 'Kak Sarah', 'Bapak Reza'].map((quickName) => (
            <button
              key={quickName}
              type="button"
              onClick={() => setCustomerName(quickName)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                customerName === quickName
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 hover:border-amber-400 hover:text-amber-700 text-slate-600'
              }`}
            >
              {quickName}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Items List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center mb-3 text-amber-600">
              <ShoppingBag className="w-5 h-5 stroke-[1.6]" />
            </div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Belum Ada Pesanan
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const cartItemId = item.id || item.product.id;
            const itemTotal = item.product.price * item.quantity;
            const productImage = item.product.image || (item.product as { imageUrl?: string }).imageUrl;

            return (
              <div
                key={cartItemId}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition-all shadow-2xs space-y-2.5"
              >
                <div className="flex items-start gap-2.5">
                  {/* 40x40px Square Thumbnail */}
                  <div className="w-10 h-10 rounded-lg bg-amber-50/80 border border-amber-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <RisolIcon className="w-5 h-5 text-amber-700 stroke-[1.8]" />
                    )}
                  </div>

                  {/* Product Title & Unit Price */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-amber-700 font-mono tabular-nums mt-0.5">
                      {formatCurrency(item.product.price)} / pcs
                    </p>
                  </div>

                  {/* Trash Delete Icon */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(cartItemId)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="Hapus item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Compact Stepper & Item Subtotal */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => updateCartQty(cartItemId, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs cursor-pointer transition-all"
                      title="Kurangi"
                    >
                      <Minus className="w-3 h-3 stroke-[2.2]" />
                    </button>
                    <span className="w-8 text-center text-xs font-mono font-extrabold text-slate-900 tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(cartItemId, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shadow-2xs cursor-pointer transition-all"
                      title="Tambah"
                    >
                      <Plus className="w-3 h-3 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="font-mono text-xs font-extrabold text-slate-900 tabular-nums">
                    {formatCurrency(itemTotal)}
                  </div>
                </div>

                {/* Item Note Input */}
                <div>
                  <input
                    type="text"
                    placeholder="Catatan item (cth: saus pisah, ekstra pedas)..."
                    value={item.note || ''}
                    onChange={(e) => updateCartItemNote(item.id || cartItemId, e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 italic placeholder:not-italic placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Summary Box */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 space-y-3 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">Subtotal Produk</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {/* Discount / Promo Row */}
          <div className="border-t border-dashed border-slate-200 pt-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="text-xs font-bold text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Diskon / Promo{' '}
                    {discountAmount > 0
                      ? `(${discountType === 'percentage' ? `${discountValue}%` : formatCurrency(discountValue)})`
                      : ''}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(true)}
                  className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md cursor-pointer font-bold"
                  title="Kelola Preset Diskon"
                >
                  Atur
                </button>
              </div>

              <span
                className={`font-mono tabular-nums font-bold ${
                  discountAmount > 0 ? 'text-rose-600' : 'text-slate-400'
                }`}
              >
                - {formatCurrency(discountAmount)}
              </span>
            </div>

            {/* Quick Discount Preset Chips */}
            {discounts.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1.5">
                {discounts.slice(0, 3).map((preset) => {
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
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full cursor-pointer transition-colors whitespace-nowrap ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                      }`}
                    >
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Manual Discount Accordion */}
            {showDiscountInput && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 mt-2 space-y-2 rounded-xl">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDiscount('percentage', discountValue)}
                    className={`flex-1 py-1 text-[11px] font-semibold border cursor-pointer rounded-lg ${
                      discountType === 'percentage'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Persentase (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscount('nominal', discountValue)}
                    className={`flex-1 py-1 text-[11px] font-semibold border cursor-pointer rounded-lg ${
                      discountType === 'nominal'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Nominal (Rp)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? 100 : subtotal}
                    value={discountValue || ''}
                    onChange={(e) => setDiscount(discountType, parseFloat(e.target.value) || 0)}
                    placeholder={discountType === 'percentage' ? 'Cth: 10' : 'Cth: 5000'}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-mono rounded-lg"
                  />
                  {discountValue > 0 && (
                    <button
                      type="button"
                      onClick={() => applyDiscountPreset(null)}
                      className="text-xs text-rose-600 hover:underline cursor-pointer px-1 font-semibold"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Total Tagihan */}
          <div className="border-t border-slate-200 pt-2.5 flex items-baseline justify-between">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Total Tagihan
            </span>
            <span className="font-mono text-xl font-extrabold text-amber-700 tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Primary CTA Button */}
        <button
          type="button"
          disabled={cart.length === 0}
          onClick={() => {
            if (isMobileDrawer) {
              setMobileCartOpen(false);
            }
            setShowPaymentModal(true);
          }}
          className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
        >
          <CreditCard className="w-4 h-4 stroke-[2.2]" />
          <span>Selesaikan Pembayaran</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row w-full min-h-full bg-slate-50">
      {/* LEFT / CENTER: Header, Queue Status Bar & Product Catalog */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar: Active Order Queue Status + Search + Category Pill Tabs */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 space-y-3.5">
          {/* Status Antrean / Transaksi Terkini & Batch Selector */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
              {/* Current Active Draft Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900 shrink-0 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-mono">{currentInvoiceNumber}</span>
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

        {/* Product Grid Section */}
        <div className="flex-1 p-4 sm:p-6">
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
        </div>
      </div>

      {/* RIGHT PANEL: Order's Summary (Desktop Only, Sticky Full-Height) */}
      <div className="hidden lg:flex lg:w-96 lg:sticky lg:top-0 lg:h-screen bg-white shrink-0 border-l border-slate-200 flex-col">
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
                {totalCartQty} Items | {customerName}
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
            {renderOrderSummaryContent(true)}
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

