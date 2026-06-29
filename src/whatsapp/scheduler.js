const cron = require('node-cron');
const supabase = require('../config/supabase');
const { formatPhoneNumber, formatMessageTemplate, formatRupiah } = require('./messageFormatter');
require('dotenv').config();
const { getSock } = require('./connection');

const scheduleString = process.env.CRON_SCHEDULE || "0 15 * * *";

const calculateReminderType = (dueDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 3) return 'h_minus_3';
    if (diffDays === 1) return 'h_minus_1';
    if (diffDays === 0) return 'h_day';
    if (diffDays < 0) return 'overdue';
    
    return null; // Belum waktunya
};

const processReminders = async () => {
    const sock = getSock();
    if (!sock || !sock.user) {
        console.log('[SCHEDULER] Gagal: Bot WhatsApp belum terhubung/login. Silakan pilih Menu 1 terlebih dahulu.');
        return;
    }

    console.log('\n[SCHEDULER] Memulai proses pengecekan Cashbond otomatis...');

    try {
        // 1. Ambil Cashbond aktif yang masih ada sisa hutang
        const { data: cashbonds, error: cbError } = await supabase
            .from('cashbonds')
            .select(`
                *,
                employees!inner(id, full_name, phone_wa)
            `)
            .in('status', ['active', 'overdue'])
            .gt('remaining_amount', 0);

        if (cbError) throw cbError;
        if (!cashbonds || cashbonds.length === 0) {
            console.log('[SCHEDULER] Tidak ada tagihan jatuh tempo untuk direminder hari ini.\n');
            return;
        }

        // 2. Ambil Template WA aktif
        const { data: templates, error: tplError } = await supabase
            .from('wa_templates')
            .select('*')
            .eq('is_active', true);

        if (tplError) throw tplError;

        const templateMap = {};
        templates.forEach(t => templateMap[t.reminder_type] = t.template_body);

        let sentCount = 0;

        // 3. Proses pengiriman
        for (const cb of cashbonds) {
            const reminderType = calculateReminderType(cb.due_date);
            if (!reminderType) continue; // Belum jadwalnya

            const templateBody = templateMap[reminderType];
            if (!templateBody) continue; // Template tidak ada

            // Cek log agar tidak terkirim dua kali di hari yang sama untuk reminder yang sama
            const { data: logs } = await supabase
                .from('reminder_logs')
                .select('id')
                .eq('cashbond_id', cb.id)
                .eq('reminder_type', reminderType)
                .in('status', ['sent', 'pending'])
                .limit(1);

            if (logs && logs.length > 0) continue; // Sudah pernah dikirim

            const employee = Array.isArray(cb.employees) ? cb.employees[0] : cb.employees;
            
            // Format Pesan
            const messageText = formatMessageTemplate(templateBody, {
                nama: employee.full_name,
                nominal: formatRupiah(cb.remaining_amount),
                tanggal: cb.due_date,
                kode: cb.cashbond_code
            });

            // Format Nomor 
            const jid = formatPhoneNumber(employee.phone_wa);

            // Simpan pending log
            const { data: insertedLog, error: insErr } = await supabase
                .from('reminder_logs')
                .insert({
                    cashbond_id: cb.id,
                    employee_id: employee.id,
                    reminder_type: reminderType,
                    message_content: messageText,
                    status: 'pending',
                    phone_number: employee.phone_wa
                })
                .select()
                .single();

            if (insErr) {
                console.error('[SCHEDULER] Gagal membuat log pending:', insErr.message);
                continue;
            }

            // Kirim via Baileys
            try {
                await sock.sendMessage(jid, { text: messageText });
                
                await supabase
                    .from('reminder_logs')
                    .update({ status: 'sent', sent_at: new Date().toISOString() })
                    .eq('id', insertedLog.id);
                
                console.log(`[SCHEDULER] ✅ Terkirim ke ${employee.full_name} (${employee.phone_wa}) - Tipe: ${reminderType}`);
                sentCount++;
            } catch (sendErr) {
                await supabase
                    .from('reminder_logs')
                    .update({ status: 'failed', error_message: sendErr.message })
                    .eq('id', insertedLog.id);
                    
                console.error(`[SCHEDULER] ❌ Gagal kirim ke ${employee.full_name}:`, sendErr.message);
            }

            // Delay 3 detik antar pesan agar tidak dibanned
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        console.log(`[SCHEDULER] Proses selesai. Total dikirim: ${sentCount} pesan.\n`);

    } catch (err) {
        console.error('[SCHEDULER] Terjadi kesalahan kritis:', err.message);
    }
};

const startCronJobs = () => {
    cron.schedule(scheduleString, () => {
        processReminders();
    });
    console.log(`[CRON] Penjadwalan Otomatis aktif. Jadwal eksekusi: ${scheduleString}`);
};

module.exports = { startCronJobs, processReminders };
