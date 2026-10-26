import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { DiscountPreset } from '../types/pos';
import { formatCurrency } from '../utils/pos-logic';
import { Tag, Plus, Edit2, Trash2, X, Check, Percent, Banknote } from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: DiscountPreset) => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, onSelectPreset }) => {
  const { discounts, addDiscount, updateDiscount, deleteDiscount, selectedDiscountPresetId } = usePos();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<'percentage' | 'nominal'>('percentage');
  const [value, setValue] = useState<number>(10);
  const [minPurchase, setMinPurchase] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  if (!isOpen) return null;

  const handleOpenCreate = () => {
    setIsEditing(true);
    setEditingId(null);
    setName('');
    setType('percentage');
    setValue(10);
    setMinPurchase(undefined);
    setDescription('');
    setFormError('');
  };

  const handleOpenEdit = (preset: DiscountPreset) => {
    setIsEditing(true);
    setEditingId(preset.id);
    setName(preset.name);
    setType(preset.type);
    setValue(preset.value);
    setMinPurchase(preset.minPurchase);
    setDescription(preset.description || '');
    setFormError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama diskon wajib diisi');
      return;
    }
    if (value <= 0) {
      setFormError('Nilai diskon harus lebih besar dari 0');
      return;
    }
    if (type === 'percentage' && value > 100) {
      setFormError('Diskon persentase maksimal 100%');
      return;
    }

    if (editingId) {
      updateDiscount(editingId, {
        name: name.trim(),
        type,
        value,
        minPurchase: minPurchase && minPurchase > 0 ? minPurchase : undefined,
        description: description.trim() || undefined,
      });
    } else {
      addDiscount({
        name: name.trim(),
        type,
        value,
        minPurchase: minPurchase && minPurchase > 0 ? minPurchase : undefined,
        description: description.trim() || undefined,
        isActive: true,
      });
    }

    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm tracking-tight">Manajemen Diskon &amp; Promo</h3>
              <p className="text-[11px] text-slate-300">Kelola preset diskon transaksi kasir</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Create / Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSave} className="p-4 bg-amber-50/60 border border-amber-200 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  {editingId ? 'Edit Diskon' : 'Tambah Diskon Baru'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Batal
                </button>
              </div>

              {formError && (
                <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Nama Promo / Diskon
                </label>
                <input
                  type="text"
                  required
                  placeholder="Cth: Promo Pelajar, Jumat Berkah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Tipe Diskon
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-white p-1 border border-slate-300 rounded">
                    <button
                      type="button"
                      onClick={() => setType('percentage')}
                      className={`py-1 text-xs font-semibold rounded flex items-center justify-center gap-1 cursor-pointer ${
                        type === 'percentage'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      <span>% Persen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('nominal')}
                      className={`py-1 text-xs font-semibold rounded flex items-center justify-center gap-1 cursor-pointer ${
                        type === 'nominal'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Rp Nominal</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Besar Diskon ({type === 'percentage' ? '%' : 'Rp'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={type === 'percentage' ? 100 : 10000000}
                    required
                    value={value || ''}
                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Minimal Belanja (Opsional)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 (Tanpa minimal)"
                  value={minPurchase || ''}
                  onChange={(e) => setMinPurchase(parseFloat(e.target.value) || undefined)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Keterangan / Syarat
                </label>
                <input
                  type="text"
                  placeholder="Cth: Khusus hari Jumat, Member aktif, dll."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-md shadow-amber-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Diskon</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Preset Diskon ({discounts.length})
              </span>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors shadow-sm shadow-amber-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Diskon Baru</span>
              </button>
            </div>
          )}

          {/* List of Discounts */}
          <div className="space-y-2.5">
            {discounts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Belum ada preset diskon. Klik "Buat Diskon Baru" di atas.
              </div>
            ) : (
              discounts.map((preset) => {
                const isSelected = selectedDiscountPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`p-3.5 border rounded-lg transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{preset.name}</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            preset.type === 'percentage'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {preset.type === 'percentage'
                            ? `${preset.value}% OFF`
                            : `- ${formatCurrency(preset.value)}`}
                        </span>
                        {preset.minPurchase && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Min {formatCurrency(preset.minPurchase)}
                          </span>
                        )}
                      </div>
                      {preset.description && (
                        <p className="text-[11px] text-slate-600 mt-1">{preset.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onSelectPreset && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPreset(preset);
                            onClose();
                          }}
                          className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-amber-600 hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Terpasang' : 'Pilih'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(preset)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded cursor-pointer"
                        title="Edit diskon"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus preset diskon "${preset.name}"?`)) {
                            deleteDiscount(preset.id);
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        title="Hapus diskon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
