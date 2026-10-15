import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { CustomerRecord, Transaction } from '../types/pos';
import { formatCurrency, formatDateTime } from '../utils/pos-logic';
import {
  Users,
  Search,
  Star,
  Phone,
  ArrowRight,
  Eye,
  X,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { RisolIcon } from './RisolIcon';

export const CustomersView: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    products,
    transactions,
    setCustomerName,
    setActiveTab,
    viewReceipt,
  } = usePos();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<'ALL' | 'VIP' | 'Reguler' | 'Baru'>('ALL');
  const [activeCustomerDetail, setActiveCustomerDetail] = useState<CustomerRecord | null>(null);

  // Modal states for Add & Edit
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);

  // Form fields for Add / Edit
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formTier, setFormTier] = useState<CustomerRecord['loyaltyTier']>('Baru');
  const [formFavoriteItem, setFormFavoriteItem] = useState<string>('');
  const [formCustomFavorite, setFormCustomFavorite] = useState<string>('');
  const [formTotalOrders, setFormTotalOrders] = useState<number>(0);
  const [formTotalSpent, setFormTotalSpent] = useState<number>(0);
  const [formError, setFormError] = useState<string>('');

  // Delete confirmation modal state
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRecord | null>(null);

  // Product name list for favorite item suggestions
  const productOptions = useMemo(() => {
    return products.map((p) => p.name);
  }, [products]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery));
      const matchTier = selectedTier === 'ALL' || c.loyaltyTier === selectedTier;
      return matchSearch && matchTier;
    });
  }, [customers, searchQuery, selectedTier]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCount = customers.length;
    const vipCount = customers.filter((c) => c.loyaltyTier === 'VIP').length;
    const totalLtv = customers.reduce((acc, c) => acc + c.totalSpent, 0);
    const avgSpend = totalCount > 0 ? Math.round(totalLtv / totalCount) : 0;
    return { totalCount, vipCount, totalLtv, avgSpend };
  }, [customers]);

  // Customer order history
  const customerTransactions = useMemo(() => {
    if (!activeCustomerDetail) return [];
    return transactions.filter(
      (tx) => tx.customerName.toLowerCase() === activeCustomerDetail.name.toLowerCase()
    );
  }, [transactions, activeCustomerDetail]);

  const handleStartOrderForCustomer = (name: string) => {
    setCustomerName(name);
    setActiveTab('pos');
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormName('');
    setFormPhone('');
    setFormTier('Baru');
    setFormFavoriteItem(productOptions[0] || 'Risol Mayo Melt');
    setFormCustomFavorite('');
    setFormTotalOrders(0);
    setFormTotalSpent(0);
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cust: CustomerRecord) => {
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormPhone(cust.phone || '');
    setFormTier(cust.loyaltyTier);

    // Check if current favorite is in product list
    if (productOptions.includes(cust.favoriteItem)) {
      setFormFavoriteItem(cust.favoriteItem);
      setFormCustomFavorite('');
    } else {
      setFormFavoriteItem('OTHER');
      setFormCustomFavorite(cust.favoriteItem);
    }

    setFormTotalOrders(cust.totalOrders);
    setFormTotalSpent(cust.totalSpent);
    setFormError('');
  };

  // Save Add Customer
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Nama pelanggan wajib diisi');
      return;
    }

    const finalFav =
      formFavoriteItem === 'OTHER'
        ? formCustomFavorite.trim() || 'Risol Mayo Melt'
        : formFavoriteItem || productOptions[0] || 'Risol Mayo Melt';

    addCustomer({
      name: formName.trim(),
      phone: formPhone.trim() || undefined,
      loyaltyTier: formTier,
      favoriteItem: finalFav,
      totalOrders: Math.max(0, Number(formTotalOrders) || 0),
      totalSpent: Math.max(0, Number(formTotalSpent) || 0),
    });

    setIsAddModalOpen(false);
  };

  // Save Edit Customer
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!formName.trim()) {
      setFormError('Nama pelanggan wajib diisi');
      return;
    }

    const finalFav =
      formFavoriteItem === 'OTHER'
        ? formCustomFavorite.trim() || editingCustomer.favoriteItem
        : formFavoriteItem || editingCustomer.favoriteItem;

    updateCustomer(editingCustomer.id, {
      name: formName.trim(),
      phone: formPhone.trim() || undefined,
      loyaltyTier: formTier,
      favoriteItem: finalFav,
      totalOrders: Math.max(0, Number(formTotalOrders) || 0),
      totalSpent: Math.max(0, Number(formTotalSpent) || 0),
    });

    // Update activeCustomerDetail if currently open
    if (activeCustomerDetail && activeCustomerDetail.id === editingCustomer.id) {
      setActiveCustomerDetail({
        ...activeCustomerDetail,
        name: formName.trim(),
        phone: formPhone.trim() || undefined,
        loyaltyTier: formTier,
        favoriteItem: finalFav,
        totalOrders: Math.max(0, Number(formTotalOrders) || 0),
        totalSpent: Math.max(0, Number(formTotalSpent) || 0),
        averageOrderValue:
          Number(formTotalOrders) > 0
            ? Math.round(Number(formTotalSpent) / Number(formTotalOrders))
            : 0,
      });
    }

    setEditingCustomer(null);
  };

  // Confirm delete customer
  const handleConfirmDelete = () => {
    if (!deletingCustomer) return;
    deleteCustomer(deletingCustomer.id);
    if (activeCustomerDetail && activeCustomerDetail.id === deletingCustomer.id) {
      setActiveCustomerDetail(null);
    }
    setDeletingCustomer(null);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F5F5F5]">
      {/* Top Header */}
      <div className="p-6 bg-white border-b border-[#E5E5E5] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1854BA] stroke-[2]" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Data Pelanggan &amp; Riwayat Belanja
              </h1>
            </div>
            <p className="text-xs text-[#666666] mt-0.5">
              Direktori pelanggan RisoLogy, frekuensi repeat order, total belanja LTV, tier loyalitas, dan menu kesukaan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-[#1854BA] text-white hover:bg-[#12408F] text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Pelanggan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomerName('');
                setActiveTab('pos');
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Order Kasir</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#F0F0F0]">
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
              Total Pelanggan Terdaftar
            </span>
            <span className="font-mono text-xl font-extrabold text-blue-950 mt-0.5 block">
              {stats.totalCount} orang
            </span>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-100 rounded">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
              Pelanggan VIP / Loyal
            </span>
            <span className="font-mono text-xl font-extrabold text-amber-950 mt-0.5 block">
              {stats.vipCount} orang
            </span>
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded">
            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
              Total Akumulasi LTV
            </span>
            <span className="font-mono text-xl font-extrabold text-emerald-700 mt-0.5 block">
              {formatCurrency(stats.totalLtv)}
            </span>
          </div>

          <div className="p-3 bg-purple-50/60 border border-purple-100 rounded">
            <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
              Rata-rata Belanja (AOV)
            </span>
            <span className="font-mono text-xl font-extrabold text-purple-950 mt-0.5 block">
              {formatCurrency(stats.avgSpend)}
            </span>
          </div>
        </div>

        {/* Search & Tier Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama pelanggan atau nomor telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1854BA] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded">
            {(['ALL', 'VIP', 'Reguler', 'Baru'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  selectedTier === tier
                    ? 'bg-[#1854BA] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tier === 'ALL' ? 'Semua Status' : tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-3">Kontak</th>
                  <th className="py-3 px-3 text-center">Tier Loyalitas</th>
                  <th className="py-3 px-3 text-right">Total Order</th>
                  <th className="py-3 px-4 text-right">Total Belanja (LTV)</th>
                  <th className="py-3 px-3 text-right">Rata-rata (AOV)</th>
                  <th className="py-3 px-4">Menu Favorit</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center text-slate-500">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1854BA] flex items-center justify-center mb-3">
                          <Users className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-800">
                          {searchQuery || selectedTier !== 'ALL'
                            ? 'Tidak Ada Pelanggan yang Sesuai'
                            : 'Belum Ada Data Pelanggan'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 text-center max-w-sm">
                          {searchQuery || selectedTier !== 'ALL'
                            ? 'Coba ganti kata kunci pencarian atau reset filter tier loyalitas.'
                            : 'Data pelanggan masih kosong. Pelanggan akan otomatis dicatat saat pesanan dibuat dengan nama pelanggan di kasir, atau Anda dapat menambahkannya sekarang.'}
                        </p>
                        {!searchQuery && selectedTier === 'ALL' && (
                          <button
                            type="button"
                            onClick={handleOpenAddModal}
                            className="mt-4 px-4 py-2 bg-[#1854BA] hover:bg-[#12408F] text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Tambah Pelanggan Baru</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isVip = cust.loyaltyTier === 'VIP';
                    const isReguler = cust.loyaltyTier === 'Reguler';
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                        {/* Name & avatar */}
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1854BA] font-extrabold flex items-center justify-center shrink-0 text-xs">
                              {cust.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="block font-bold text-slate-900">{cust.name}</span>
                              <span className="text-[10px] text-slate-500 font-normal">
                                Terakhir: {cust.lastVisit ? formatDateTime(cust.lastVisit).date : '-'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-3 text-slate-600 font-mono">
                          {cust.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{cust.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Tidak dicatat</span>
                          )}
                        </td>

                        {/* Tier */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              isVip
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : isReguler
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isVip && <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />}
                            {cust.loyaltyTier}
                          </span>
                        </td>

                        {/* Orders count */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          {cust.totalOrders}x
                        </td>

                        {/* Total Spent (LTV) - Green */}
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-700">
                          {formatCurrency(cust.totalSpent)}
                        </td>

                        {/* AOV */}
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatCurrency(cust.averageOrderValue)}
                        </td>

                        {/* Fav item */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <RisolIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate max-w-[150px] font-medium">{cust.favoriteItem}</span>
                          </div>
                        </td>

                        {/* Actions: Order, Detail, Edit, Delete */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartOrderForCustomer(cust.name)}
                              className="px-2 py-1 bg-[#1854BA] text-white hover:bg-[#12408F] font-semibold text-[11px] rounded flex items-center gap-0.5 cursor-pointer transition-colors shadow-2xs"
                              title="Buka Kasir untuk Pelanggan Ini"
                            >
                              <span>Order</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveCustomerDetail(cust)}
                              className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                              title="Lihat Riwayat Transaksi"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(cust)}
                              className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer transition-colors"
                              title="Edit Data Pelanggan"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingCustomer(cust)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                              title="Hapus Pelanggan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: ADD CUSTOMER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-[#1854BA] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm tracking-tight">Tambah Data Pelanggan Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Pelanggan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Bu Nadia, Mas Dimas"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1854BA] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Misal: 0812-3456-7890"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1854BA] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tier Loyalitas
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Baru', 'Reguler', 'VIP'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormTier(t)}
                      className={`py-2 px-3 text-xs font-bold rounded cursor-pointer border flex items-center justify-center gap-1.5 transition-colors ${
                        formTier === t
                          ? t === 'VIP'
                            ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300'
                            : t === 'Reguler'
                            ? 'bg-blue-100 text-blue-900 border-blue-400 ring-2 ring-blue-300'
                            : 'bg-slate-200 text-slate-900 border-slate-400 ring-2 ring-slate-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'VIP' && <Star className="w-3 h-3 fill-amber-500 text-amber-500" />}
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Menu Favorit
                </label>
                <select
                  value={formFavoriteItem}
                  onChange={(e) => setFormFavoriteItem(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1854BA] focus:outline-none"
                >
                  {productOptions.map((pName) => (
                    <option key={pName} value={pName}>
                      {pName}
                    </option>
                  ))}
                  <option value="OTHER">Lainnya (Ketik Manual)...</option>
                </select>

                {formFavoriteItem === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="Ketik nama menu favorit..."
                    value={formCustomFavorite}
                    onChange={(e) => setFormCustomFavorite(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Total Order Awal
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formTotalOrders}
                    onChange={(e) => setFormTotalOrders(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Total Belanja (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formTotalSpent}
                    onChange={(e) => setFormTotalSpent(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white font-mono text-emerald-700 font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1854BA] hover:bg-[#12408F] rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pelanggan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CUSTOMER */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm tracking-tight">
                  Edit Data Pelanggan: <span className="text-amber-300">{editingCustomer.name}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Pelanggan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1854BA] focus:outline-none font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Misal: 0812-3456-7890"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1854BA] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tier Loyalitas
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Baru', 'Reguler', 'VIP'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormTier(t)}
                      className={`py-2 px-3 text-xs font-bold rounded cursor-pointer border flex items-center justify-center gap-1.5 transition-colors ${
                        formTier === t
                          ? t === 'VIP'
                            ? 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300'
                            : t === 'Reguler'
                            ? 'bg-blue-100 text-blue-900 border-blue-400 ring-2 ring-blue-300'
                            : 'bg-slate-200 text-slate-900 border-slate-400 ring-2 ring-slate-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'VIP' && <Star className="w-3 h-3 fill-amber-500 text-amber-500" />}
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Menu Favorit
                </label>
                <select
                  value={formFavoriteItem}
                  onChange={(e) => setFormFavoriteItem(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-[#1854BA] focus:outline-none"
                >
                  {productOptions.map((pName) => (
                    <option key={pName} value={pName}>
                      {pName}
                    </option>
                  ))}
                  <option value="OTHER">Lainnya (Ketik Manual)...</option>
                </select>

                {formFavoriteItem === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="Ketik nama menu favorit..."
                    value={formCustomFavorite}
                    onChange={(e) => setFormCustomFavorite(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#1854BA] focus:outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Total Order (Frekuensi)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formTotalOrders}
                    onChange={(e) => setFormTotalOrders(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Total Belanja / LTV (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formTotalSpent}
                    onChange={(e) => setFormTotalSpent(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white font-mono text-emerald-700 font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = editingCustomer;
                    setEditingCustomer(null);
                    setDeletingCustomer(toDelete);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Pelanggan Ini</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-[#1854BA] hover:bg-[#12408F] rounded shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Hapus Data Pelanggan?
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Apakah Anda yakin ingin menghapus pelanggan <strong className="text-slate-800">{deletingCustomer.name}</strong>? Data profil, tier, dan riwayat belanja ini akan dihapus dari direktori.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingCustomer(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs cursor-pointer"
                >
                  Ya, Hapus Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail & Past Transactions Modal */}
      {activeCustomerDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-400 text-amber-950 font-black flex items-center justify-center text-sm">
                  {activeCustomerDetail.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">{activeCustomerDetail.name}</h3>
                  <p className="text-[11px] text-slate-300">
                    Tier: {activeCustomerDetail.loyaltyTier} • Kontak: {activeCustomerDetail.phone || 'Tidak dicatat'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEditModal(activeCustomerDetail);
                  }}
                  className="p-1.5 text-amber-300 hover:text-amber-200 hover:bg-slate-800 rounded cursor-pointer"
                  title="Edit Data Pelanggan"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeletingCustomer(activeCustomerDetail);
                  }}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded cursor-pointer"
                  title="Hapus Pelanggan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCustomerDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Belanja</span>
                  <span className="font-mono text-sm font-extrabold text-emerald-700">
                    {formatCurrency(activeCustomerDetail.totalSpent)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Frekuensi</span>
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {activeCustomerDetail.totalOrders}x Order
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Menu Favorit</span>
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {activeCustomerDetail.favoriteItem}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Riwayat Struk &amp; Pembelian:
                </h4>
                {customerTransactions.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded border border-slate-200 text-center text-xs text-slate-500">
                    Belum ada riwayat transaksi tersimpan untuk pelanggan ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customerTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 border border-slate-200 rounded flex items-center justify-between hover:border-slate-300"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {tx.transactionNumber}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {formatDateTime(tx.timestamp).full}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {tx.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-xs text-emerald-700 block">
                            {formatCurrency(tx.total)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCustomerDetail(null);
                              viewReceipt(tx);
                            }}
                            className="text-[10px] text-[#1854BA] hover:underline font-semibold cursor-pointer"
                          >
                            Buka Struk
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => setActiveCustomerDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStartOrderForCustomer(activeCustomerDetail.name);
                  setActiveCustomerDetail(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#1854BA] hover:bg-[#12408F] rounded shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Mulai Order Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
