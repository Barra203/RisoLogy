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
  Users,
  Clock,
  AlertTriangle,
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
    setActiveCashier,
    cashierList,
  } = usePos();

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
    if (cat.includes('signature') || cat.includes('spesial')) {
      return <Sparkles className="w-5 h-5 text-amber-600 stroke-[1.5]" />;
    }
    return <RisolIcon className="w-5 h-5 text-black stroke-[1.8]" />;
  };

  const totalCartQty = cart.reduce((a, b) => a + b.quantity, 0);

  // Cart Content Component shared between Desktop right sidebar and Mobile drawer
  const renderCartContent = (isMobileDrawer = false) => (
    <div className="flex flex-col h-full bg-white">
      {/* Cart Header */}
      <div className="p-4 border-b border-[#E5E5E5] bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-amber-600 stroke-[1.8]" />
          <h2 className="text-sm font-bold tracking-tight text-black uppercase">
            Pesanan ({totalCartQty})
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-[#666666] bg-slate-100 px-2 py-0.5 rounded">
            {nextTransactionNumber}
          </span>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-[#888888] hover:text-black hover:underline cursor-pointer transition-colors"
            >
              Kosongkan
            </button>
          )}
          {isMobileDrawer && (
            <button
              type="button"
              onClick={() => setMobileCartOpen(false)}
              className="p-1 text-[#888888] hover:text-black ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Customer Name Input & Shift Indicator */}
      <div className="p-4 border-b border-[#E5E5E5] bg-[#FAFAFA] shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[#666666] uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Nama Pelanggan</span>
          </label>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
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
            className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-[#CCCCCC] text-black focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-medium rounded-sm transition-all"
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
        <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5">
          {['Kak Nadia', 'Mas Dimas', 'Kak Sarah', 'Bapak Reza'].map((quickName) => (
            <button
              key={quickName}
              type="button"
              onClick={() => setCustomerName(quickName)}
              className="px-2 py-0.5 text-[10px] font-medium bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-600 text-slate-600 rounded-full whitespace-nowrap cursor-pointer transition-colors"
            >
              +{quickName}
            </button>
          ))}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full border border-dashed border-[#CCCCCC] flex items-center justify-center mb-3 text-[#999999]">
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="text-xs font-semibold text-black uppercase tracking-wider">
              Keranjang Kosong
            </p>
            <p className="text-[11px] text-[#666666] mt-1 max-w-[200px]">
              Silakan klik menu risol pada katalog untuk menambahkan pesanan.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const cartItemId = item.id || item.product.id;
            const itemTotal = item.product.price * item.quantity;
            return (
              <div
                key={cartItemId}
                className="p-3 border border-[#E5E5E5] bg-white flex flex-col justify-between rounded-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-black truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-[11px] text-[#666666] font-mono tabular-nums">
                      {formatCurrency(item.product.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(cartItemId)}
                    className="text-[#999999] hover:text-rose-600 p-1 transition-colors cursor-pointer"
                    title="Hapus menu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quantity Stepper & Item Subtotal */}
                <div className="flex items-center justify-between pt-2 border-t border-[#F5F5F5]">
                  <div className="flex items-center border border-[#E5E5E5] rounded-xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => updateCartQty(cartItemId, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center text-black hover:bg-[#F5F5F5] cursor-pointer"
                      title="Kurangi"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-mono font-bold text-black tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(cartItemId, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white cursor-pointer transition-colors"
                      title="Tambah"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="font-mono text-xs font-bold text-black tabular-nums">
                    {formatCurrency(itemTotal)}
                  </div>
                </div>

                {/* Input Catatan / Deskripsi Khusus Pesanan Per-Item */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tambah catatan (cth: jangan terlalu pedas, bungkus pisah)..."
                    value={item.note || ''}
                    onChange={(e) => updateCartItemNote(item.id || cartItemId, e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Financial Summary & Discounts */}
      <div className="p-4 border-t border-[#E5E5E5] bg-[#FAFAFA] space-y-3 shrink-0">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-xs text-[#666666]">
          <span>Subtotal:</span>
          <span className="font-mono tabular-nums text-black font-semibold">
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Discount Section with CRUD & Presets */}
        <div className="border-t border-dashed border-[#E5E5E5] pt-2">
          <div className="flex justify-between items-center text-xs mb-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowDiscountInput(!showDiscountInput)}
                className="text-xs font-bold text-amber-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                <span>
                  Diskon Transaksi{' '}
                  {discountAmount > 0
                    ? `(${discountType === 'percentage' ? `${discountValue}%` : formatCurrency(discountValue)})`
                    : ''}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowDiscountModal(true)}
                className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-1.5 py-0.5 rounded cursor-pointer font-semibold"
                title="Kelola & Tambah Preset Diskon (CRUD)"
              >
                CRUD
              </button>
            </div>

            {/* Discount amount is colored RED (-) as requested */}
            <span
              className={`font-mono tabular-nums font-bold ${
                discountAmount > 0 ? 'text-rose-600' : 'text-slate-500'
              }`}
            >
              {discountAmount > 0 ? `- ${formatCurrency(discountAmount)}` : 'Rp 0'}
            </span>
          </div>

          {/* Quick Preset Badges */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
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
                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:border-rose-400'
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          {/* Manual Discount Input (Accordion) */}
          {showDiscountInput && (
            <div className="p-2.5 bg-white border border-[#E5E5E5] mt-2 space-y-2 rounded-sm shadow-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDiscount('percentage', discountValue)}
                  className={`flex-1 py-1 text-[11px] font-semibold border cursor-pointer rounded-xs ${
                    discountType === 'percentage'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-black border-[#E5E5E5]'
                  }`}
                >
                  Persentase (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscount('nominal', discountValue)}
                  className={`flex-1 py-1 text-[11px] font-semibold border cursor-pointer rounded-xs ${
                    discountType === 'nominal'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-black border-[#E5E5E5]'
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
                  className="flex-1 px-2.5 py-1 text-xs border border-[#CCCCCC] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-mono rounded-xs"
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

        {/* Final Total (Green money +) */}
        <div className="border-t border-[#E5E5E5] pt-3 flex justify-between items-baseline">
          <span className="text-sm font-bold text-black uppercase tracking-tight">
            Total Bayar:
          </span>
          <span className="font-mono text-xl font-extrabold text-emerald-700 tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>

        {/* Checkout Button */}
        <button
          type="button"
          disabled={cart.length === 0}
          onClick={() => setShowPaymentModal(true)}
          className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-600/25 rounded-sm"
        >
          <CreditCard className="w-4 h-4 stroke-[2]" />
          <span>Bayar Sekarang ({totalCartQty})</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-screen overflow-hidden bg-[#F5F5F5]">
      {/* LEFT/CENTER: Product Catalog Section */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-[#E5E5E5]">
        {/* Top Shift & Search Bar */}
        <div className="p-4 bg-white border-b border-[#E5E5E5] shrink-0 space-y-3">
          {/* Shift Kasir Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                Shift Kasir:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded">
                {cashierList.map((cashier) => (
                  <button
                    key={cashier}
                    type="button"
                    onClick={() => setActiveCashier(cashier)}
                    className={`px-2.5 py-0.5 text-xs font-bold rounded cursor-pointer transition-colors ${
                      activeCashier === cashier
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cashier}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Nomor Nota:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {nextTransactionNumber}
              </span>
            </div>
          </div>

          {/* Search bar & quick category creation */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari menu risol lezat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDiscountModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Kelola Diskon</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {categoriesList.map((category) => {
              const isSelected = selectedCategory.toLowerCase() === category.toLowerCase();
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors rounded ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {category}
                </button>
              );
            })}

            {/* Quick add category toggle */}
            {!showQuickAddCat ? (
              <button
                type="button"
                onClick={() => setShowQuickAddCat(true)}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-amber-600 border border-dashed border-slate-300 hover:border-amber-500 rounded whitespace-nowrap cursor-pointer flex items-center gap-1"
                title="Tambah kategori baru"
              >
                <Plus className="w-3 h-3" />
                <span>Kategori</span>
              </button>
            ) : (
              <form onSubmit={handleQuickAddCat} className="flex items-center gap-1 shrink-0">
                <input
                  type="text"
                  placeholder="Kategori baru..."
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  className="px-2 py-1 text-xs border border-amber-500 rounded bg-white w-28 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded"
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
          {catError && <p className="text-[11px] text-rose-600">{catError}</p>}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 rounded-full border border-dashed border-[#CCCCCC] flex items-center justify-center mb-3 text-slate-400">
                <RisolIcon className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Menu Tidak Ditemukan
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Tidak ada menu yang sesuai dengan filter pencarian "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                const stock = product.stockQuantity ?? 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock < 5;

                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(product)}
                    className={`p-4 border rounded-lg transition-all text-left flex flex-col justify-between cursor-pointer group relative overflow-hidden ${
                      isOutOfStock
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : isLowStock
                        ? 'bg-amber-50/40 border-amber-400 hover:border-amber-600 hover:shadow-sm'
                        : 'bg-white border-slate-200 hover:border-amber-500 hover:shadow-sm'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 bg-amber-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-xs">
                        {inCart.quantity}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
                          {getProductIcon(product.category)}
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700 border-rose-300'
                              : isLowStock
                              ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isOutOfStock
                            ? 'Stok Habis'
                            : isLowStock
                            ? `Sisa ${stock} (Restock!)`
                            : `Stok: ${stock}`}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                        {product.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors mt-0.5 line-clamp-1">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                      {isLowStock && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-rose-600">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Stok menipis (&lt; 5 buah)!</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-mono text-sm font-extrabold text-emerald-700">
                        {formatCurrency(product.price)}
                      </span>
                      <span className="text-[11px] font-bold text-amber-600 group-hover:underline">
                        {isOutOfStock ? 'Habis' : '+ Tambah'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Desktop Cart View */}
      <div className="hidden lg:flex w-88 flex-col h-full bg-white shrink-0">
        {renderCartContent()}
      </div>

      {/* MOBILE FLOATING CART BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-[#E5E5E5] shadow-lg flex items-center justify-between z-30">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="flex items-center gap-2 text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded bg-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-amber-600/20">
            {totalCartQty}
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Total ({customerName})</span>
            <span className="font-mono font-extrabold text-sm text-emerald-700">
              {formatCurrency(total)}
            </span>
          </div>
        </button>

        <button
          type="button"
          disabled={cart.length === 0}
          onClick={() => setShowPaymentModal(true)}
          className="px-4 py-2 bg-amber-600 text-white text-xs font-bold uppercase rounded hover:bg-amber-700 active:scale-[0.98] shadow-md shadow-amber-600/20 disabled:opacity-40 cursor-pointer"
        >
          Bayar
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 flex flex-col justify-end">
          <div className="bg-white rounded-t-xl max-h-[85vh] h-[85vh] flex flex-col overflow-hidden">
            {renderCartContent(true)}
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
