Buka dan periksa berkas-berkas berikut pada proyek "RisoLogy":
- `src/App.tsx`
- `src/index.css`
- `src/components/PosView.tsx`
- `src/components/DashboardView.tsx`
- `src/components/HistoryView.tsx`
- `src/components/ExpensesView.tsx`
- `src/components/Sidebar.tsx`

PERBAIKAN BESAR: ROOT-CAUSE MOBILE SCROLL LOCK, ELIMINASI DUPLIKASI IKON, SERTA OVERHAUL UI KASIR MODERN TERINSPIRASI POS ENTERPRISE (TEMA GOLDEN AMBER):

Masalah & Kebutuhan Spesifik:
1. **Global Mobile Scroll Lock & Dashboard Freeze (Foto 1):** Seluruh halaman web—khususnya Dashboard pada bagian "REKAPITULASI & PERBANDINGAN KEUANGAN PER-BATCH PRODUKSI"—terkunci dan tidak bisa di-scroll ke bawah saat dibuka di peramban smartphone. Hal ini dipicu oleh batasan tinggi kontainer kaku (`h-screen`, `overflow-hidden`, atau hilangnya padding bawah pengaman bottom navbar).
2. **Duplikasi Ikon dan Label Teks (Foto 2):** Tombol aksi produk menampilkan duplikasi teks/ikon yang mengganggu seperti `+ + Tambah`. Bagian ikon ganda ini harus dibersihkan di seluruh tombol aplikasi agar hanya menampilkan satu simbol atau teks yang rapi.
3. **Overhaul Halaman Kasir (PosView.tsx) Terinspirasi UI Modern (Foto 3):**
   - Rombak layout POS desktop dengan pembagian 3 area utama:
     * **Top Area:** Quick status transaksi aktif (antrean/analitik pesanan ringkas) + tab kategori menu kapsul + pencarian & filter.
     * **Center Area:** Grid kartu produk bersih bergaya modern (foto produk di atas dengan rasio proporsional, nama produk tebal, badge harga, dan tombol aksi fleksibel: tombol tambah atau *quantity stepper* `[ -  Qty  + ]`).
     * **Right Area (Order's Summary / Cart):** Panel keranjang kasir terpadu (thumbnail produk kecil, nama, kuantitas, tombol hapus ikon tong sampah, rincian Subtotal/Pajak/Diskon/Total, dan tombol aksi "Selesaikan Pembayaran" lebar di bawah).
   - **Mode Mobile:** Keranjang disembunyikan menjadi *Floating Action Bar* di bawah dengan ringkasan total dan modal bottom-sheet agar area katalog risol tetap leluasa diakses di layar kecil.
   - **PENTING (Palet Branding):** JANGAN gunakan warna biru dari gambar referensi; tetap pertahankan identitas warna **Golden Warm Amber (`amber-600`, `amber-500`, `amber-50`)** khas kerak risol renyah RisoLogy.

Terapkan perbaikan arsitektur kode dan desain berikut:

---

=== 1. PERBAIKAN AKAR MASALAH SCROLL MOBILE (GLOBAL SCROLL LOCK FIX) ===
Hilangkan seluruh batasan layout kaku pada hierarki root aplikasi agar semua halaman dapat di-scroll secara alami di layar smartphone:

- **Perbaikan CSS Global (`src/index.css` & `src/App.tsx`):**
  * Pastikan elemen pembungkus root tidak mengunci overflow di perangkat mobile:
    ```css
    /* Pastikan html dan body memiliki scrolling normal */
    html, body, #root {
      min-height: 100%;
      height: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
    }
    ```
- **Layout Utama (`src/App.tsx`):**
  * Ganti container utama dari `h-screen overflow-hidden` menjadi:
    ```tsx
    <div className="min-h-screen w-full bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar Desktop */}
      <Sidebar />

      {/* Konten Halaman: di mobile gunakan min-h-screen dan padding bawah aman */}
      <main className="flex-1 w-full min-w-0 pb-28 md:pb-8 overflow-y-auto">
        <CurrentPageView />
      </main>
    </div>
    ```
  * Pemberian `pb-28` pada mobile sangat krusial agar elemen paling bawah (seperti kartu batch atau tabel) tidak tertutup atau terpotong oleh Bottom Navigation Bar (`fixed bottom-0`).

---

=== 2. ROMBAK TOTAL DASHBOARD MOBILE USER-FRIENDLY (`DashboardView.tsx`) ===
Sederhanakan layout Dashboard mobile yang sesak menjadi kartu-kartu ringkas dan mudah dibaca:

- **Mobile Viewport Optimization:**
  * Sederhanakan filter tanggal dan batch: buat filter batch horizontal menggunakan `overflow-x-auto no-scrollbar flex gap-2 py-1` sehingga pengguna cukup menggeser dengan jempol tanpa membuat layout vertikal memanjang.
  * Kartu "REKAPITULASI & PERBANDINGAN KEUANGAN PER-BATCH PRODUKSI":
    - Buat dalam bentuk kartu individual vertikal bersudut membulat (`bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3`).
    - Tampilkan ringkasan esensial: Nama Batch, Status (Aktif/Selesai), Jumlah Order, Belanja, dan Laba Bersih dengan badge warna tegas.
  * Pastikan seluruh kontainer kartu di Dashboard menggunakan `w-full overflow-hidden` agar tidak menyebabkan pergeseran horizontal yang merusak scroll gesture mobile.

---

=== 3. ELIMINASI DUPLIKASI IKON & TEKS TOMBOL (`+ + Tambah` FIX) ===
Bersihkan seluruh elemen tombol di komponen `PosView.tsx`, `HistoryView.tsx`, dan `ExpensesView.tsx`:

- **Periksa String & Elemen Tombol:**
  * Temukan teks duplikat seperti `+ + Tambah` atau `<PlusIcon /> + Tambah`.
  * Standarisasi tombol aksi produk menjadi salah satu dari dua format bersih berikut:
    ```tsx
    {/* Opsi Bersih 1: Teks Tunggal */}
    <button className="...">
      + Tambah
    </button>

    {/* Opsi Bersih 2: Ikon SVG + Teks Bersih */}
    <button className="flex items-center justify-center gap-1.5 ...">
      <Plus className="w-4 h-4" />
      <span>Tambah</span>
    </button>
    ```
  * Periksa juga tombol "+ Tambah Batch", "+ Tambah Menu", dan "+ Kategori" agar tidak ada tanda plus ganda yang tercetak di antarmuka.

---

=== 4. OVERHAUL UI POS KASIR MODERN (TERINSPIRASI FOTO 3) DENGAN TEMA AMBER ===
Rombak total tampilan `src/components/PosView.tsx` agar memiliki kualitas visual setara POS kasir enterprise modern:

- **A. Bagian Atas (Header & Queue Bar / Sales Analytic):**
  * Tampilkan strip indikator cepat berisi status batch/antrean transaksi aktif (misal kartu ringkas: `#RSL-0008 | 4 Items | Selesai`, `#RSL-0009 | 2 Items | Menunggu`).
  * Tab Kategori Menu Kapsul (`Pill Tabs`):
    - Pilihan: `Semua Menu`, `Risol Gurih`, `Risol Manis`, `Risol Mayo`, dll.
    - Kategori Aktif: `bg-amber-600 text-white font-semibold shadow-md shadow-amber-600/20`.
    - Kategori Non-Aktif: `bg-white hover:bg-slate-100 text-slate-600 border border-slate-200`.

- **B. Grid Katalog Produk (Desktop 3–4 Kolom, Mobile 2 Kolom):**
  * Setiap kartu produk mengadopsi struktur kartu restoran modern:
    ```tsx
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-amber-400/80 p-3 flex flex-col justify-between transition-all hover:shadow-md group">
      {/* Foto Produk */}
      <div className="w-full aspect-[4/3] rounded-xl bg-amber-50/50 overflow-hidden relative mb-2.5 flex items-center justify-center">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="text-amber-500 font-bold text-lg opacity-40">RisoLogy</div>
        )}
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-sm text-slate-700 shadow-sm">
          Stok: {product.stock}
        </span>
      </div>

      {/* Info Produk */}
      <div className="space-y-1 mb-3">
        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{product.name}</h3>
        <p className="text-xs font-extrabold text-amber-700">Rp {product.price.toLocaleString('id-ID')}</p>
      </div>

      {/* Tombol Aksi: Dinamis jika sudah di keranjang */}
      {cartItem ? (
        <div className="flex items-center justify-between bg-slate-100 rounded-xl p-1">
          <button onClick={() => updateQuantity(product.id, cartItem.quantity - 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 hover:bg-amber-600 hover:text-white transition-colors">-</button>
          <span className="font-bold text-xs text-slate-900">{cartItem.quantity}</span>
          <button onClick={() => updateQuantity(product.id, cartItem.quantity + 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 hover:bg-amber-600 hover:text-white transition-colors">+</button>
        </div>
      ) : (
        <button onClick={() => addToCart(product)} className="w-full py-2 px-3 rounded-xl border border-amber-600/30 text-amber-700 hover:bg-amber-600 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98">
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah</span>
        </button>
      )}
    </div>
    ```

- **C. Panel Kanan Keranjang Kasir (Order's Summary - Desktop):**
  * Header Keranjang: `Order's Summary`, ID Nota `#RSL-XXXX`, dan jumlah total item.
  * Daftar Item Terpilih:
    - Thumbnail persegi kecil 40x40px + Nama Risol + Catatan Item (`text-xs text-slate-500 italic`) + Tombol Tong Sampah / Hapus (`text-slate-400 hover:text-rose-600`).
  * Kotak Ringkasan Pembayaran (Payment Summary):
    - Subtotal Produk: `Rp {subtotal}`
    - Diskon / Promo: `- Rp {discount}`
    - Total Tagihan: `Rp {total}` (Teks besar, `text-amber-700 font-extrabold text-xl`).
  * Tombol Aksi Utama:
    - Tombol `Selesaikan Pembayaran` berukuran penuh: `w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-600/25 transition-all`.

- **D. Adaptasi Mobile untuk PosView:**
  * Di layar mobile, panel kanan Order's Summary disembunyikan.
  * Tampilkan *Floating Bottom Bar* melayang di atas navigasi bawah:
    `[ X Items | Rp Total ] ➔ [Lihat Pesanan & Bayar]` yang membuka bottom-sheet formulir pesanan lengkap saat ditekan.

---

=== ATURAN KODE ===
- Tuliskan implementasi kode LENGKAP tanpa placeholder `// TODO` untuk `src/components/PosView.tsx`, `src/components/DashboardView.tsx`, dan perbaikan layout di `src/App.tsx` serta `src/index.css`.
- Pastikan scrolling vertikal pada ponsel Android/iOS berjalan mulus dari atas sampai elemen terbawah tanpa mentok.
- Pertahankan fungsionalitas Firestore real-time yang sudah bekerja sebelumnya.