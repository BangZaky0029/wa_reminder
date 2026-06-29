const readline = require('readline');
const { connectToWhatsApp, logoutWhatsApp } = require('./whatsapp/connection');
const { startCronJobs, processReminders } = require('./whatsapp/scheduler');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const showMenu = () => {
    console.log('\n=====================================');
    console.log('   WHATSAPP BOT SESSION MANAGEMENT   ');
    console.log('=====================================');
    console.log('1. Login Session (Start Bot)');
    console.log('2. Logout Session (Clear Data)');
    console.log('3. Exit Program');
    console.log('4. Test Jalankan Reminder Sekarang');
    console.log('=====================================');
    rl.question('Pilih menu (1/2/3/4): ', async (answer) => {
        switch (answer.trim()) {
            case '1':
                console.log('\nMemulai proses koneksi (Auto-Login jika ada session)...');
                try {
                    await connectToWhatsApp();
                } catch (error) {
                    console.error('Error saat memulai WhatsApp:', error);
                }
                // Memunculkan menu lagi setelah delay agar log koneksi tampil duluan
                setTimeout(showMenu, 5000); 
                break;
            
            case '2':
                await logoutWhatsApp();
                setTimeout(showMenu, 1000); // Show menu again after a short delay
                break;
                
            case '3':
                console.log('\nMematikan program. Selamat tinggal!');
                process.exit(0);
                break;
                
            case '4':
                console.log('\n[TEST] Mengeksekusi pengecekan jatuh tempo sekarang...');
                await processReminders();
                setTimeout(showMenu, 2000);
                break;
                
            default:
                console.log('\nPilihan tidak valid. Silakan pilih 1, 2, 3, atau 4.');
                showMenu();
                break;
        }
    });
};

console.log('Aplikasi CLI Bot WhatsApp Dijalankan.\n');
startCronJobs();
showMenu();
