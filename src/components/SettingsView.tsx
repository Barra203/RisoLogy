import React, { useState, useRef } from 'react';
import { usePos } from '../context/PosContext';
import { Product } from '../types/pos';
import { formatCurrency } from '../utils/pos-logic';
import {
  Store,
  QrCode,
  Lock,
  Save,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Image as ImageIcon,
  Layers,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { RisolIcon } from './RisolIcon';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    products,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    resetAllData,
  } = usePos();

  // Local form state for Store Settings
  const [storeName, setStoreName] = useState(settings.storeName);
  const [brandName, setBrandName] = useState(settings.brandName || 'RisoLogy');
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [footerText, setFooterText] = useState(settings.footerText);
  const [qrisUrl, setQrisUrl] = useState(settings.qrisUrl);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);

  // Sync state with real-time Firestore settings
  React.useEffect(() => {
    setStoreName(settings.storeName);
    setBrandName(settings.brandName || 'RisoLogy');
    setAddress(settings.address);
    setPhone(settings.phone);
    setEmail(settings.email);
    setFooterText(settings.footerText);
    setQrisUrl(settings.qrisUrl);
    setLogoUrl(settings.logoUrl);
  }, [settings]);

  // Hidden file input refs for direct uploads
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const qrisFileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const editProductFileInputRef = useRef<HTMLInputElement>(null);

  // Security / PIN change
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Save feedback
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Category management state
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<{ oldName: string; newName: string } | null>(null);
  const [catFeedback, setCatFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Product modal & deletion state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState(categories[0] || 'Risol Mayo');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('30');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImage, setNewProdImage] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Reset data confirmation state & verification password
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');

  // Direct File Reader helper with auto-resizing for safe Firestore database storage
  const readFileAsDataUrl = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const rawResult = reader.result;
        // If image is large (> 400KB), resize via canvas to fit safely under 1MB Firestore doc limits
        if (file.size > 400 * 1024) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDimension = 800;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/jpeg', 0.85);
              callback(compressed);
              return;
            }
            callback(rawResult);
          };
          img.onerror = () => callback(rawResult);
          img.src = rawResult;
        } else {
          callback(rawResult);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload Logo directly from browser
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFileAsDataUrl(file, (dataUrl) => {
        setLogoUrl(dataUrl);
        updateSettings({ logoUrl: dataUrl, storeLogo: dataUrl });
      });
    }
  };

  // Upload QRIS image directly from browser
  const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFileAsDataUrl(file, (dataUrl) => {
        setQrisUrl(dataUrl);
        updateSettings({ qrisUrl: dataUrl });
      });
    }
  };

  // Save general store settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName,
      brandName,
      address,
      phone,
      email,
      footerText,
      qrisUrl,
      logoUrl,
      storeLogo: logoUrl,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Change PIN
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPin !== settings.pinCode) {
      setPinMessage({ success: false, text: 'PIN lama tidak sesuai.' });
      return;
    }
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setPinMessage({ success: false, text: 'PIN baru harus 6 digit angka.' });
      return;
    }

    updateSettings({ pinCode: newPin });
    setPinMessage({ success: true, text: 'PIN berhasil diubah menjadi: ' + newPin });
    setOldPin('');
    setNewPin('');
    setTimeout(() => setPinMessage(null), 4000);
  };

  // Categories CRUD
  const handleAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setCatFeedback({ type: 'error', text: 'Nama kategori tidak boleh kosong.' });
      return;
    }
    const ok = addCategory(trimmed);
    if (ok) {
      setNewCatName('');
      setCatFeedback({ type: 'success', text: `Kategori "${trimmed}" berhasil ditambahkan.` });
      setTimeout(() => setCatFeedback(null), 3000);
    } else {
      setCatFeedback({ type: 'error', text: `Kategori "${trimmed}" sudah terdaftar.` });
      setTimeout(() => setCatFeedback(null), 3000);
    }
  };

  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.newName.trim()) return;
    const ok = updateCategory(editingCat.oldName, editingCat.newName.trim());
    if (ok) {
      setCatFeedback({ type: 'success', text: `Kategori berhasil diubah menjadi "${editingCat.newName.trim()}".` });
      setEditingCat(null);
      setTimeout(() => setCatFeedback(null), 3000);
    } else {
      setCatFeedback({ type: 'error', text: 'Nama kategori sudah digunakan.' });
      setTimeout(() => setCatFeedback(null), 3000);
    }
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const catName = categoryToDelete;
    deleteCategory(catName);
    setCategoryToDelete(null);
    setCatFeedback({ type: 'success', text: `Kategori "${catName}" berhasil dihapus.` });
    setTimeout(() => setCatFeedback(null), 3000);
  };

  // Add Product Submit
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice) return;

    const stockQty = Math.max(0, parseInt(newProdStock, 10) || 0);

    addProduct({
      name: newProdName.trim(),
      category: newProdCategory,
      price: Math.max(0, parseInt(newProdPrice, 10) || 0),
      description: newProdDesc.trim(),
      imageUrl: newProdImage || undefined,
      stockQuantity: stockQty,
      inStock: stockQty > 0,
    });

    setNewProdName('');
    setNewProdPrice('');
    setNewProdDesc('');
    setNewProdImage('');
    setNewProdStock('30');
    setShowAddProduct(false);
  };

  // Edit Product Submit
  const handleSaveEditedProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    const stockQty = Math.max(0, Number(editingProduct.stockQuantity) || 0);

    updateProduct(editingProduct.id, {
      name: editingProduct.name.trim(),
      category: editingProduct.category,
      price: Math.max(0, Number(editingProduct.price) || 0),
      description: editingProduct.description?.trim(),
      imageUrl: editingProduct.imageUrl,
      stockQuantity: stockQty,
      inStock: stockQty > 0,
    });

    setEditingProduct(null);
  };

  // Quick adjust stock directly from product list (+/-)
  const handleQuickAdjustStock = (product: Product, delta: number) => {
    const current = product.stockQuantity || 0;
    const nextStock = Math.max(0, current + delta);
    updateProduct(product.id, {
      stockQuantity: nextStock,
      inStock: nextStock > 0,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F5F5F5]">
      {/* Top Header */}
      <div className="p-6 bg-white border-b border-[#E5E5E5] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-black">
              Pengaturan Toko & POS
            </h1>
            <p className="text-xs text-[#666666] mt-0.5">
              Kelola logo toko, gambar QRIS, kategori menu, produk kasir, dan keamanan PIN
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-semibold text-[#1854BA] bg-[#1854BA]/10 px-3 py-1 flex items-center gap-1.5 border border-[#1854BA]">
                <Check className="w-3.5 h-3.5" />
                <span>Pengaturan Tersimpan</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-2.5 bg-[#1854BA] text-white hover:bg-[#12408F] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl">
        {/* Section 1: Logo Toko & Identitas Brand (Direct Upload Logo) */}
        <div className="bg-white border border-[#E5E5E5] p-6">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#E5E5E5]">
            <Store className="w-4 h-4 text-[#1854BA] stroke-[1.5]" />
            <h2 className="text-sm font-bold text-black uppercase tracking-wider">
              1. Identitas Brand & Upload Logo Toko
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Preview & Upload Button */}
            <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">
                Logo Toko
              </span>
              <div className="w-24 h-24 rounded-full border border-black/10 overflow-hidden bg-white p-1 mb-3 shadow-inner flex items-center justify-center">
                <img
                  src={logoUrl || '/assets/logo.png'}
                  alt="Logo Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/logo.png';
                  }}
                />
              </div>

              {/* Hidden File Input for Logo */}
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <div className="flex flex-col gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-full px-3 py-2 bg-[#1854BA] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#12408F] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah / Ganti Logo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl('/assets/logo.png');
                    updateSettings({ logoUrl: '/assets/logo.png' });
                  }}
                  className="text-[11px] text-[#666666] hover:text-black py-1 cursor-pointer underline"
                >
                  Gunakan Logo Default
                </button>
              </div>
            </div>

            {/* Store Information Form Fields */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#666666] uppercase mb-1">
                  Nama Toko
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-[#1854BA] font-semibold text-black bg-white"
                  placeholder="RisoLogy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#666666] uppercase mb-1">
                  Brand / Tagline
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-[#1854BA] font-semibold text-black bg-white"
                  placeholder="RisoLogy"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#666666] uppercase mb-1">
                  Alamat Toko
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-[#1854BA] text-black bg-white"
                  placeholder="Jl. Melati No. 8, Senopati, Jakarta"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#666666] uppercase mb-1">
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-[#1854BA] text-black bg-white font-mono"
                  placeholder="0812-3456-7890"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#666666] uppercase mb-1">
                  Email Toko
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-[#1854BA] text-black bg-white"
                  placeholder="contact@risology.id"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#666666] uppercase mb-1">
                  Teks Footer Struk (Thermal 58mm & Email)
                </label>
                <textarea
                  rows={2}
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-[#1854BA] text-black bg-white font-mono"
                  placeholder="Terima kasih atas kunjungan Anda!..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: QRIS Digital & Upload Gambar QRIS Langsung (NMID REMOVED) */}
        <div className="bg-white border border-[#E5E5E5] p-6">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#E5E5E5]">
            <QrCode className="w-4 h-4 text-[#1854BA] stroke-[1.5]" />
            <h2 className="text-sm font-bold text-black uppercase tracking-wider">
              2. Konfigurasi & Upload Gambar QRIS Toko
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* QRIS Preview & Upload Action */}
            <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider mb-2">
                Pratinjau QRIS
              </span>
              <div className="w-40 h-40 bg-white border border-[#E5E5E5] p-2 mb-3 shadow-sm flex items-center justify-center">
                <img
                  src={qrisUrl || '/assets/qris.png'}
                  alt="QRIS Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/qris.png';
                  }}
                />
              </div>

              {/* Hidden File Input for QRIS */}
              <input
                ref={qrisFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleQrisUpload}
                className="hidden"
              />

              <div className="flex flex-col gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => qrisFileInputRef.current?.click()}
                  className="w-full px-3 py-2 bg-[#1854BA] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#12408F] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Gambar QRIS</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQrisUrl('/assets/qris.png');
                    updateSettings({ qrisUrl: '/assets/qris.png' });
                  }}
                  className="text-[11px] text-[#666666] hover:text-black py-1 cursor-pointer underline"
                >
                  Gunakan QRIS Default
                </button>
              </div>
            </div>

            {/* QRIS Description & Guidance */}
            <div className="md:col-span-2 space-y-3">
              <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] text-xs text-[#444444] leading-relaxed">
                <strong className="text-black text-sm block mb-1">Kemudahan Pembayaran QRIS:</strong>
                <p className="mb-2">
                  Anda dapat langsung mengunggah foto atau screenshot kode QRIS resmi toko Anda (BCA, Mandiri, GoPay, OVO, ShopeePay, DANA, dsb).
                </p>
                <p className="text-[#666666]">
                  Gambar QRIS ini akan otomatis tampil berukuran penuh dan tajam di layar kasir ketika kasir memilih metode pembayaran <strong>QRIS</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-[#F0F5FF] border border-[#1854BA]/30 text-xs text-[#1854BA]">
                <Check className="w-4 h-4 shrink-0" />
                <span>Gambar QRIS otomatis tersimpan secara persistent di browser kasir Anda.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Manajemen Kategori Menu (Tambah, Ubah, Hapus) */}
        <div className="bg-white border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1854BA] stroke-[1.5]" />
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">
                3. Manajemen Kategori Menu Kasir ({categories.length})
              </h2>
            </div>
          </div>

          {/* Inline Feedback Banner */}
          {catFeedback && (
            <div
              className={`p-3 mb-4 text-xs border flex items-center justify-between ${
                catFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {catFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="font-medium">{catFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setCatFeedback(null)}
                className="text-xs hover:underline cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Tambah kategori baru (cth: Pastry, Tea, Snack, Dessert)..."
              className="flex-1 px-3 py-2 text-xs border border-[#CCCCCC] focus:border-[#1854BA] bg-white font-medium focus:outline-none"
            />
            <button
              type="submit"
              onClick={() => handleAddCategory()}
              className="px-4 py-2 bg-[#1854BA] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#12408F] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Kategori</span>
            </button>
          </form>

          {/* Edit Category Inline Bar */}
          {editingCat && (
            <form onSubmit={handleSaveEditCategory} className="p-3 bg-[#F0F5FF] border border-[#1854BA] mb-4 flex items-center gap-2">
              <span className="text-xs font-semibold text-black">Ubah Kategori "{editingCat.oldName}":</span>
              <input
                type="text"
                value={editingCat.newName}
                onChange={(e) => setEditingCat({ ...editingCat, newName: e.target.value })}
                className="flex-1 px-2.5 py-1 text-xs border border-[#CCCCCC] bg-white font-medium focus:border-[#1854BA] focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 bg-[#1854BA] text-white text-xs font-bold uppercase cursor-pointer hover:bg-[#12408F]"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="px-2 py-1 text-xs text-[#666666] hover:text-black cursor-pointer"
              >
                Batal
              </button>
            </form>
          )}

          {/* Categories Grid Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {categories.map((cat) => {
              const productCount = products.filter((p) => p.category === cat).length;
              return (
                <div
                  key={cat}
                  className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-between hover:border-[#1854BA] transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-black block truncate">{cat}</span>
                    <span className="text-[10px] text-[#666666] block">
                      {productCount} produk terkait
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingCat({ oldName: cat, newName: cat })}
                      className="p-1.5 text-[#666666] hover:text-[#1854BA] hover:bg-white border border-transparent hover:border-[#CCCCCC] transition-colors cursor-pointer"
                      title={`Ubah nama kategori ${cat}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete(cat)}
                      className="p-1.5 text-[#666666] hover:text-red-600 hover:bg-white border border-transparent hover:border-[#CCCCCC] transition-colors cursor-pointer"
                      title={`Hapus kategori ${cat}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Manajemen Produk (Tambah, Edit, Hapus + Upload Foto Langsung) */}
        <div className="bg-white border border-[#E5E5E5] p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-2">
              <RisolIcon className="w-4 h-4 text-[#1854BA] stroke-[1.8]" />
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">
                4. Manajemen Menu Produk ({products.length} Menu • {products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0)} Porsi Stok)
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="px-3.5 py-1.5 bg-[#1854BA] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#12408F] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Menu Baru</span>
            </button>
          </div>

          {/* Add Product Inline Form */}
          {showAddProduct && (
            <form onSubmit={handleCreateProduct} className="p-4 bg-[#FAFAFA] border border-[#1854BA] mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#1854BA]" />
                  <span>Tambah Menu Baru</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="text-xs text-[#888888] hover:text-black cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                    Nama Menu
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="cth: Vanilla Cold Brew"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] bg-white font-medium focus:border-[#1854BA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                    Kategori
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] bg-white font-medium focus:border-[#1854BA] focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="25000"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] bg-white font-mono focus:border-[#1854BA] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                    Jumlah Stok (Porsi)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    placeholder="30"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] bg-white font-mono focus:border-[#1854BA] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                  Deskripsi Menu
                </label>
                <input
                  type="text"
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Deskripsi singkat rasa dan bahan..."
                  className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] bg-white focus:border-[#1854BA] focus:outline-none"
                />
              </div>

              {/* Direct Photo Upload */}
              <div className="p-3 bg-white border border-[#E5E5E5] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {newProdImage ? (
                    <img
                      src={newProdImage}
                      alt="Preview"
                      className="w-12 h-12 object-cover border border-[#CCCCCC]"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-[#F5F5F5] border border-[#CCCCCC] flex items-center justify-center text-[#999999]">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-semibold text-black block">Foto Menu (Opsional)</span>
                    <span className="text-[11px] text-[#666666]">
                      {newProdImage ? 'Foto siap digunakan' : 'Klik tombol di kanan untuk memilih foto'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={productFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        readFileAsDataUrl(file, (dataUrl) => setNewProdImage(dataUrl));
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => productFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-black border border-[#CCCCCC] hover:border-[#1854BA] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Foto</span>
                  </button>
                  {newProdImage && (
                    <button
                      type="button"
                      onClick={() => setNewProdImage('')}
                      className="text-xs text-red-600 hover:underline px-2 cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-3 py-1.5 text-xs border border-[#CCCCCC] hover:border-black cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1854BA] text-white text-xs font-bold uppercase cursor-pointer hover:bg-[#12408F]"
                >
                  Simpan Menu
                </button>
              </div>
            </form>
          )}

          {/* Product Items Table with EDIT and DELETE buttons */}
          <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5]">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-3.5 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-10 h-10 object-cover border border-[#E5E5E5]"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center text-[#999999]">
                      <RisolIcon className="w-5 h-5 stroke-[1.8]" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-black">{p.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#F0F5FF] text-[#1854BA] border border-[#1854BA]/20">
                        {p.category}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-[#666666] mt-0.5 line-clamp-1">
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  {/* Stock Quantity Badge & Quick Stepper */}
                  <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2.5 py-1 rounded border border-[#E5E5E5]">
                    <span className="text-[10px] text-[#666666] uppercase font-semibold hidden md:inline">
                      Stok:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickAdjustStock(p, -1)}
                      disabled={(p.stockQuantity || 0) <= 0}
                      className="w-5 h-5 rounded bg-white hover:bg-slate-200 disabled:opacity-30 border border-[#CCCCCC] flex items-center justify-center text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                      title="Kurangi stok (-1 porsi)"
                    >
                      -
                    </button>
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded tabular-nums min-w-[34px] text-center ${
                        (p.stockQuantity || 0) === 0
                          ? 'bg-rose-100 text-rose-700 border border-rose-200 font-extrabold'
                          : (p.stockQuantity || 0) <= 15
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                      title={`${p.stockQuantity ?? 0} porsi tersedia`}
                    >
                      {p.stockQuantity ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickAdjustStock(p, 1)}
                      className="w-5 h-5 rounded bg-white hover:bg-slate-200 border border-[#CCCCCC] flex items-center justify-center text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                      title="Tambah stok (+1 porsi)"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                      {(p.stockQuantity || 0) === 0 ? 'Habis' : 'porsi'}
                    </span>
                  </div>

                  <span className="font-mono font-bold text-xs text-black tabular-nums min-w-[65px] text-right">
                    {formatCurrency(p.price)}
                  </span>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...p })}
                    className="p-1.5 text-[#1854BA] hover:bg-[#1854BA]/10 border border-transparent hover:border-[#1854BA] transition-colors cursor-pointer"
                    title={`Edit menu ${p.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete button (In-app modal) */}
                  <button
                    type="button"
                    onClick={() => setProductToDelete(p)}
                    className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title={`Hapus menu ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Keamanan, Akun Kasir & Password */}
        <div className="bg-white border border-[#E5E5E5] p-6">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-[#E5E5E5]">
            <Lock className="w-4 h-4 text-[#1854BA] stroke-[1.5]" />
            <h2 className="text-sm font-bold text-black uppercase tracking-wider">
              5. Keamanan, Akun Kasir &amp; Password Masuk
            </h2>
          </div>

          {/* Cashier accounts info box */}
          <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200 rounded text-xs space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>Akun Login Kasir Resmi:</span>
              <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                5 User Kasir Aktif
              </span>
            </div>
            <p className="text-slate-600">
              User kasir: <strong>Harits</strong>, <strong>Rafi</strong>, <strong>Barra</strong>, <strong>Dimas</strong>, dan <strong>Akhyar</strong>.
            </p>
            <p className="text-slate-600">
              Password masuk sistem: <code className="bg-white px-2 py-0.5 rounded font-mono font-bold text-[#1854BA] border border-blue-200">RisoLogyKeren</code> (atau PIN alternatif: <code>{settings.pinCode}</code>)
            </p>
          </div>

          <form onSubmit={handleChangePin} className="space-y-4 max-w-md">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#666666] uppercase mb-1">
                  PIN Lama
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-[#1854BA] font-mono text-black bg-white focus:outline-none"
                  placeholder="******"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#666666] uppercase mb-1">
                  PIN Baru (6 Digit)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CCCCCC] focus:border-[#1854BA] font-mono text-black bg-white focus:outline-none"
                  placeholder="******"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!oldPin || newPin.length !== 6}
              className="px-4 py-2 bg-[#1854BA] text-white hover:bg-[#12408F] text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
            >
              Ubah PIN Kasir
            </button>

            {pinMessage && (
              <div
                className={`p-2.5 text-xs border ${
                  pinMessage.success
                    ? 'bg-[#1854BA] text-white border-[#1854BA]'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}
              >
                {pinMessage.text}
              </div>
            )}
          </form>
        </div>

        {/* Section 6: Reset Data */}
        <div className="p-4 border border-dashed border-[#CCCCCC] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-black uppercase tracking-wider">
                Reset Data Awal RisoLogy
              </h4>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Dilindungi Password
              </span>
            </div>
            <p className="text-[11px] text-[#666666] mt-0.5">
              Mengembalikan menu awal, diskon, dan mengosongkan riwayat order. Logo dan QRIS toko tetap aman dipertahankan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {resetSuccess && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 border border-emerald-200">
                Data Berhasil Direset (Logo &amp; QRIS Aman)
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setResetPasswordInput('');
                setResetError('');
                setShowResetConfirm(true);
              }}
              className="px-3.5 py-2 bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Awal</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: In-App Category Delete Confirmation */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-[#E5E5E5] shadow-2xl p-5">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">Hapus Kategori</h3>
            </div>
            <p className="text-xs text-[#555555] mb-4">
              Apakah Anda yakin ingin menghapus kategori <strong>"{categoryToDelete}"</strong>?
              {products.filter((p) => p.category === categoryToDelete).length > 0 && (
                <span className="block mt-2 text-black font-medium bg-amber-50 p-2 border border-amber-200">
                  {products.filter((p) => p.category === categoryToDelete).length} produk dalam kategori ini akan otomatis dialihkan ke kategori lain.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3.5 py-2 text-xs border border-[#CCCCCC] hover:border-black cursor-pointer font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Ya, Hapus Kategori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: In-App Product Delete Confirmation */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-[#E5E5E5] shadow-2xl p-5">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">Hapus Menu</h3>
            </div>
            <p className="text-xs text-[#555555] mb-4">
              Apakah Anda yakin ingin menghapus menu <strong>"{productToDelete.name}"</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3.5 py-2 text-xs border border-[#CCCCCC] hover:border-black cursor-pointer font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Ya, Hapus Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: In-App Reset Data Confirmation with Security Password */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E5E5] shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  Verifikasi Reset Data Awal
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold uppercase tracking-wider">
                  Memerlukan Password Khusus
                </span>
              </div>
            </div>

            <p className="text-xs text-[#555555] mb-3 leading-relaxed">
              Tindakan ini akan mengembalikan daftar produk, kategori, dan diskon ke setelan awal serta membersihkan transaksi.
            </p>

            {/* Brand Logo & QRIS Safe Notice */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] font-medium mb-4 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Aman Terproteksi:</strong> Logo Toko dan Gambar QRIS Anda <strong>TIDAK AKAN direset</strong> atau dihapus.
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!resetPasswordInput.trim()) {
                  setResetError('Silakan ketik password verifikasi reset.');
                  return;
                }
                const res = resetAllData(resetPasswordInput.trim());
                if (!res.success) {
                  setResetError(res.message);
                  return;
                }
                // Success
                setShowResetConfirm(false);
                setResetPasswordInput('');
                setResetError('');
                setResetSuccess(true);
                setTimeout(() => setResetSuccess(false), 4000);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Masukkan Password Verifikasi:
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetPasswordInput}
                    onChange={(e) => {
                      setResetPasswordInput(e.target.value);
                      if (resetError) setResetError('');
                    }}
                    placeholder="Ketik: AnakDajjalYangReset"
                    className="w-full pl-3 pr-10 py-2 text-xs font-mono border border-[#CCCCCC] focus:border-rose-600 bg-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showResetPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Password verifikasi: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-rose-700">AnakDajjalYangReset</code></span>
                </div>
              </div>

              {resetError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetPasswordInput('');
                    setResetError('');
                  }}
                  className="px-3.5 py-2 text-xs border border-[#CCCCCC] hover:border-black cursor-pointer font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Konfirmasi &amp; Reset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E5E5] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E5E5]">
              <h3 className="text-sm font-bold text-black uppercase tracking-tight flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#1854BA]" />
                <span>Edit Menu: {editingProduct.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-[#888888] hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                    Nama Menu
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] focus:border-[#1854BA] bg-white font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                    Kategori
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] focus:border-[#1854BA] bg-white font-medium focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                    Harga (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] focus:border-[#1854BA] bg-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                    Jumlah Stok (Porsi)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingProduct.stockQuantity ?? 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stockQuantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] focus:border-[#1854BA] bg-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#666666] uppercase mb-1">
                  Deskripsi Menu
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#CCCCCC] focus:border-[#1854BA] bg-white focus:outline-none"
                />
              </div>

              {/* Direct Photo Change in Edit Modal */}
              <div className="p-3 bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {editingProduct.imageUrl ? (
                    <img
                      src={editingProduct.imageUrl}
                      alt="Preview"
                      className="w-14 h-14 object-cover border border-[#CCCCCC]"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-white border border-[#CCCCCC] flex items-center justify-center text-[#999999]">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-semibold text-black block">Foto Produk</span>
                    <span className="text-[11px] text-[#666666]">
                      {editingProduct.imageUrl ? 'Foto terpasang' : 'Belum ada foto'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={editProductFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        readFileAsDataUrl(file, (dataUrl) =>
                          setEditingProduct({ ...editingProduct, imageUrl: dataUrl })
                        );
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => editProductFileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-[#1854BA] border border-[#1854BA] hover:bg-[#1854BA] hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ganti Foto</span>
                  </button>
                  {editingProduct.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, imageUrl: undefined })}
                      className="text-xs text-red-600 hover:underline px-2 cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-xs border border-[#CCCCCC] hover:border-black cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1854BA] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#12408F] cursor-pointer shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
