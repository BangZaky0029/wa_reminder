function formatPhoneNumber(numberStr) {
    if (!numberStr) return null;
    let formattedNumber = numberStr.trim();
    
    // Ganti 0 di depan dengan 62
    if (formattedNumber.startsWith('0')) {
        formattedNumber = '62' + formattedNumber.substring(1);
    } 
    // Hapus + jika ada
    else if (formattedNumber.startsWith('+')) {
        formattedNumber = formattedNumber.substring(1);
    }
    return `${formattedNumber}@s.whatsapp.net`;
}

function formatMessageTemplate(template, data) {
    if (!template) return '';
    let result = template;
    for (const key in data) {
        // Ganti semua tanda {{key}} dengan value aslinya
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, data[key]);
    }
    return result;
}

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
}

module.exports = { formatPhoneNumber, formatMessageTemplate, formatRupiah };
