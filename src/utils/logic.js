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
export function calculateDisciplineStatus(attedanceRecords, semesterBolosCount = 0) {
  // Check for 6x Bolos
  if (semesterBolosCount >= 6) {
    return 'Panggilan Orang Tua';
  }

  // Check for 3x Alfa consecutive
  // attedanceRecords should be an array of status ['H', 'A', 'A', 'A'] sorted by date ascending
  if (attedanceRecords.length >= 3) {
    const lastThree = attedanceRecords.slice(-3);
    if (lastThree.every(status => status === 'A')) {
      return 'Siap Panggil';
    }
  }

  return null;
}
