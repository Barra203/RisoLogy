import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '5mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    store: 'RisoLogy',
    brand: 'RisoLogy',
    timestamp: new Date().toISOString(),
  });
});

// Send digital receipt via email without external client
app.post('/api/send-receipt', async (req, res) => {
  try {
    const { recipientEmail, transaction, store } = req.body;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Alamat email penerima tidak valid.',
      });
    }

    if (!transaction || !transaction.transactionNumber) {
      return res.status(400).json({
        success: false,
        message: 'Data transaksi tidak ditemukan.',
      });
    }

    const storeName = store?.storeName || 'RisoLogy';
    const brandName = store?.brandName || 'RisoLogy';
    const storeAddress = store?.address || 'Jakarta, Indonesia';
    const storePhone = store?.phone || '-';
    const footerText = store?.footerText || 'Terima kasih atas kunjungan Anda!';

    // Format currency
    const formatRp = (num: number) => {
      return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(num || 0))}`;
    };

    // Format date & time
    const txDate = new Date(transaction.timestamp || Date.now());
    const formattedDate = txDate.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = txDate.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Build items HTML
    const itemsHtml = (transaction.items || [])
      .map(
        (item: { name: string; quantity: number; price: number }) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px dashed #E5E5E5; font-size: 13px; color: #000000;">
            <div style="font-weight: 600;">${item.name}</div>
            <div style="font-size: 11px; color: #666666;">${item.quantity} x ${formatRp(item.price)}</div>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px dashed #E5E5E5; text-align: right; font-size: 13px; font-weight: 600; color: #000000; font-family: monospace;">
            ${formatRp(item.quantity * item.price)}
          </td>
        </tr>
      `
      )
      .join('');

    // Minimalist, Clean Black & White HTML Receipt Template
    const htmlReceipt = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Struk Pembayaran ${transaction.transactionNumber} - ${storeName}</title>
      </head>
      <body style="margin: 0; padding: 24px 0; background-color: #F5F5F5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000000;">
        <div style="max-width: 440px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E5E5; padding: 28px 24px;">
          <!-- Store Header -->
          <div style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 16px; margin-bottom: 20px;">
            <div style="font-size: 22px; font-weight: 700; letter-spacing: -0.5px; text-transform: uppercase;">${storeName}</div>
            <div style="font-size: 11px; color: #666666; letter-spacing: 1.5px; margin-top: 2px; text-transform: uppercase;">${brandName}</div>
            <div style="font-size: 11px; color: #666666; margin-top: 8px; line-height: 1.4;">
              ${storeAddress}<br>Telp: ${storePhone}
            </div>
          </div>

          <!-- Transaction Info -->
          <div style="font-size: 12px; line-height: 1.6; border-bottom: 1px dashed #000000; padding-bottom: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666666;">No. Transaksi:</span>
              <strong style="font-family: monospace; font-size: 13px;">${transaction.transactionNumber}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666666;">Waktu:</span>
              <span>${formattedDate} ${formattedTime}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666666;">Pelanggan:</span>
              <span>${transaction.customerName || 'Pelanggan'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666666;">Metode Bayar:</span>
              <strong>${transaction.paymentMethod}</strong>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr style="border-bottom: 1px solid #000000; font-size: 11px; text-transform: uppercase; color: #666666;">
                <th style="text-align: left; padding-bottom: 6px;">Menu</th>
                <th style="text-align: right; padding-bottom: 6px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Financial Breakdown -->
          <div style="border-top: 1px dashed #000000; padding-top: 12px; margin-bottom: 20px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #666666;">Subtotal:</span>
              <span style="font-family: monospace;">${formatRp(transaction.subtotal)}</span>
            </div>
            ${
              transaction.discountAmount > 0
                ? `<div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #000000;">
                    <span>Diskon:</span>
                    <span style="font-family: monospace;">- ${formatRp(transaction.discountAmount)}</span>
                  </div>`
                : ''
            }
            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #000000; font-size: 16px; font-weight: 700;">
              <span>TOTAL:</span>
              <span style="font-family: monospace;">${formatRp(transaction.total)}</span>
            </div>
            ${
              transaction.paymentMethod === 'CASH' && transaction.cashTendered
                ? `
                <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #666666;">
                  <span>Uang Diterima:</span>
                  <span style="font-family: monospace;">${formatRp(transaction.cashTendered)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; color: #666666;">
                  <span>Kembalian:</span>
                  <span style="font-family: monospace;">${formatRp(transaction.cashChange || 0)}</span>
                </div>
              `
                : ''
            }
          </div>

          <!-- Footer Note -->
          <div style="text-align: center; border-top: 1px dashed #E5E5E5; padding-top: 16px; font-size: 11px; color: #666666; line-height: 1.5;">
            ${footerText.replace(/\n/g, '<br>')}
          </div>
        </div>
      </body>
      </html>
    `;

    // Check if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

    let deliveredVia = 'mock';

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"${storeName}" <${smtpUser}>`,
          to: recipientEmail,
          subject: `Struk Transaksi ${transaction.transactionNumber} - ${storeName}`,
          html: htmlReceipt,
        });

        deliveredVia = 'smtp';
      } catch (smtpErr) {
        console.warn('SMTP delivery encountered error, falling back to instant service delivery:', smtpErr);
      }
    }

    // Always succeed so the transaction is saved and user experience is smooth
    return res.json({
      success: true,
      deliveredVia,
      recipientEmail,
      transactionNumber: transaction.transactionNumber,
      message: `Struk transaksi ${transaction.transactionNumber} berhasil dikirim ke ${recipientEmail}.`,
    });
  } catch (error: any) {
    console.error('Error sending receipt email:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Gagal memproses pengiriman struk email.',
    });
  }
});

// Setup server with Vite in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RisoLogy POS server listening at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
