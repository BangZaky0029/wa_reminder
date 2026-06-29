const { makeWASocket } = require('@whiskeysockets/baileys');
const { useSupabaseAuthState } = require('./whatsapp/authAdapter');
const pino = require('pino');
require('dotenv').config();

// Mengambil nomor target dari .env
const targetNumber = process.env.WA_PHONE_NUMBER; 

async function testSendMessage() {
    console.log('[TEST] Menghubungkan ke sesi WhatsApp yang tersimpan...');
    const { state, saveCreds } = await useSupabaseAuthState();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }) // Sembunyikan log bawaan
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;

        if (qr) {
            console.log('[TEST] ERROR: Sesi belum login. Silakan login menggunakan node src/index.js terlebih dahulu.');
            process.exit(1);
        }

        if (connection === 'open') {
            console.log(`[TEST] Berhasil masuk! Menyiapkan pengiriman pesan ke: ${targetNumber}...`);
            
            // Mengubah format "0819..." menjadi format JID internasional "62819..."
            let formattedNumber = targetNumber.trim();
            if (formattedNumber.startsWith('0')) {
                formattedNumber = '62' + formattedNumber.substring(1);
            } else if (formattedNumber.startsWith('+')) {
                formattedNumber = formattedNumber.substring(1);
            }
            const jid = `${formattedNumber}@s.whatsapp.net`;

            try {
                // Proses mengirim pesan
                await sock.sendMessage(jid, { 
                    text: '*[SISTEM CASHBOND]*\nHalo, ini adalah pesan *Uji Coba* untuk memastikan fitur pengiriman WhatsApp Bot Anda berjalan lancar! 🚀' 
                });
                console.log('[TEST] ✅ Pesan berhasil dikirim! Silakan cek HP Anda.');
            } catch (err) {
                console.error('[TEST] ❌ Gagal mengirim pesan:', err.message);
            }

            // Beri jeda 2 detik agar pesan tereksekusi sempurna di jaringan sebelum dimatikan
            setTimeout(() => {
                console.log('[TEST] Memutuskan koneksi test...');
                process.exit(0);
            }, 2000);
        }
    });
}

testSendMessage();
