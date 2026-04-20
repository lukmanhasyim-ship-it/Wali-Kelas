// Round to nearest 500
export function calculateNominal(amount) {
  const num = parseInt(amount, 10);
  if (isNaN(num)) return 0;
  return Math.round(num / 500) * 500;
}

// Format IDR
export function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Calculate Discipline Status:
// Returns null, 'Siap Panggil' (3x Alfa), or 'Panggilan Orang Tua' (6x Bolos)
export function calculateDisciplineStatus(attendanceRecords, semesterBolosCount = 0) {
  const alfasCount = attendanceRecords.filter(s => s === 'A').length;

  // 1. Check for 6x Bolos or 5+ Alfa
  if (semesterBolosCount >= 6 || alfasCount >= 5) {
    return 'Panggilan Orang Tua';
  }

  // 2. Check for 3x Alfa (Total or Consecutive)
  if (alfasCount >= 3) {
    return 'Siap Panggil';
  }

  // 3. Fallback for consecutive check specifically if needed (optional, covered by cumulative above)
  if (attendanceRecords.length >= 3) {
    const lastThree = attendanceRecords.slice(-3);
    if (lastThree.every(status => status === 'A')) {
      return 'Siap Panggil';
    }
  }

  return null;
}

// Format Phone Number to International (62 for Indonesia)
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  // Remove all non-numeric characters
  let cleaned = phone.toString().replace(/\D/g, '');
  
  // If starts with '0', replace with '62'
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } 
  // If starts with '8', add '62'
  else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
}

// Format Date to DD/MMMM/YYYY (Indonesian)
export function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
}
