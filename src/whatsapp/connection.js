const { makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const { useSupabaseAuthState } = require('./authAdapter');
const supabase = require('../config/supabase');
const pino = require('pino');
require('dotenv').config();

const phoneNumber = process.env.WA_PHONE_NUMBER;

// Global variables for watchdog and logout management
let globalSock = null;
let watchdogTimer = null;
let isIntentionalLogout = false;
let isConnecting = false;

const updateDeviceStatus = async (status, qr_code = null) => {
    if (!phoneNumber) return;
    try {
        const { error } = await supabase
            .from('wa_devices')
            .upsert(
                { 
                    phone_number: phoneNumber, 
                    status: status,
                    qr_code: qr_code,
                    last_connected: status === 'connected' ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'phone_number' }
            );
        if (error) {
            console.error('[DB] Gagal update status perangkat:', error.message);
        }
    } catch (err) {
        console.error('[DB] Error update status perangkat:', err.message);
    }
};

async function logoutWhatsApp() {
    isIntentionalLogout = true;
    console.log('\n[LOGOUT] Memulai proses logout...');
    
    // 1. Logout dari Baileys jika ada instance yang jalan
    if (globalSock) {
        try {
            await globalSock.logout();
            console.log('[LOGOUT] Berhasil logout dari server WhatsApp.');
        } catch (error) {
            console.log('[LOGOUT] Gagal memanggil sock.logout() (kemungkinan sudah terputus).');
        }
    }

    // 2. Hapus semua data session dari Supabase
    try {
        const { error } = await supabase
            .from('wa_sessions')
            .delete()
            .neq('id', 'dummy_id'); // Hack untuk delete semua row
        if (error) {
             console.error('[LOGOUT] Gagal menghapus session di Supabase:', error.message);
        } else {
             console.log('[LOGOUT] Berhasil menghapus data session di Supabase.');
        }
    } catch (error) {
        console.error('[LOGOUT] Error saat menghapus session:', error.message);
    }

    // 3. Update status device
    await updateDeviceStatus('disconnected');
    
    // Hentikan watchdog
    if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
    }
    
    globalSock = null;
    isIntentionalLogout = false;
    isConnecting = false;
    console.log('[LOGOUT] Proses logout selesai.\n');
}

function startWatchdog() {
    if (watchdogTimer) return;
    
    console.log('[WATCHDOG] Pelindung sesi WhatsApp telah diaktifkan di latar belakang.');
    watchdogTimer = setInterval(() => {
        if (!globalSock || isIntentionalLogout || isConnecting) return;
        
        // Cek jika status web socket tidak ada atau CLOSED (3)
        if (!globalSock.ws || globalSock.ws.readyState === 3) {
            console.log('[WATCHDOG] Mendeteksi koneksi mati di latar belakang. Memicu reconnect...');
            connectToWhatsApp();
        }
    }, 60000); // Check every 60 seconds
}

let lastQrTime = 0;

async function connectToWhatsApp() {
    if (isConnecting) return;
    isConnecting = true;
    
    const { state, saveCreds } = await useSupabaseAuthState();

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }), // Hide noisy baileys internal logs
        defaultQueryTimeoutMs: undefined,
        // Anti-mac out prevention settings
        keepAliveIntervalMs: 30000, 
        markOnlineOnConnect: true,
    });
    
    globalSock = sock;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const now = Date.now();
            // Jeda 60 detik (60000 ms) sebelum memunculkan QR baru
            if (now - lastQrTime >= 60000) {
                lastQrTime = now;
                // Untuk ukuran terkecil di qrcode-terminal, kita wajib memakai { small: true }
                console.log('\n[QR] Silakan scan QR code di bawah ini dengan WhatsApp Anda (berlaku sekitar 20-30 detik):');
                qrcode.generate(qr, { small: true });
                await updateDeviceStatus('qr_ready', qr);
            }
        }

        if (connection === 'close') {
            isConnecting = false;
            if (isIntentionalLogout) return;
            
            const statusCode = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('[KONEKSI] Sesi telah dikeluarkan (logged out) dari HP.');
                await logoutWhatsApp(); // Clean up everything properly
            } else if (statusCode === 428) {
                console.log('[ANTI MAC OUT] Koneksi ditutup (Code: 428). Mencoba reconnect...');
                await updateDeviceStatus('connecting');
                setTimeout(connectToWhatsApp, 2000);
            } else if (statusCode === 515) {
                console.log('[ANTI MAC OUT] WhatsApp meminta restart (Code: 515). Mencoba reconnect...');
                await updateDeviceStatus('connecting');
                setTimeout(connectToWhatsApp, 2000);
            } else if (shouldReconnect) {
                console.log(`[KONEKSI] Terputus (Code: ${statusCode || 'Unknown'}). Mencoba menyambungkan kembali...`);
                await updateDeviceStatus('connecting');
                // Exponential backoff or standard delay
                setTimeout(connectToWhatsApp, 5000); 
            } else {
                console.log('[KONEKSI] Sesi invalid dan tidak bisa direconnect.');
                await updateDeviceStatus('disconnected');
            }
        } else if (connection === 'open') {
            isConnecting = false;
            console.log('\n[KONEKSI] Berhasil terhubung ke WhatsApp!');
            await updateDeviceStatus('connected');
            startWatchdog();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        // Disini nanti kita bisa handle kalau ada balasan pesan dari user
    });

    return sock;
}

function getSock() {
    return globalSock;
}

module.exports = { connectToWhatsApp, logoutWhatsApp, getSock };
