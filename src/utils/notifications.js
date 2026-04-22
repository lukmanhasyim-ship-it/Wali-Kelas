import { fetchGAS } from './gasClient';

/**
 * Send a notification to specific roles and/or a specific student
 * @param {Array} studentsList - The full student list to find recipients
 * @param {Object} options - {
 *   subjectId: string, // NISN or ID_Siswa of the primary subject
 *   targetRoles: Array, // Roles to notify (e.g., ['Bendahara', 'Ketua Kelas', 'Wali Kelas'])
 *   message: string,
 *   type: 'info' | 'success' | 'alert',
 *   includeSelf: boolean, // Whether to notify the subjectId student
 *   selfMessage: string, // Custom message for the subject student
 *   waliEmail: string // Optional: Wali Kelas email to notify
 * }
 */
export async function sendNotification(studentsList, options) {
  const { 
    subjectId, 
    targetRoles = [], 
    message, 
    type = 'info', 
    includeSelf = false, 
    selfMessage,
    waliEmail
  } = options;

  const notifPromises = [];
  const recipients = new Set(); // Use Set for unique emails

  // 1. Target Roles
  studentsList.forEach(s => {
    if (targetRoles.includes(s.Jabatan) && s.Email && s.Status_Aktif === 'Aktif') {
      recipients.add({ email: s.Email, role: s.Jabatan, msg: message });
    }
  });

  // 2. Specific Student
  if (includeSelf && subjectId) {
    const student = studentsList.find(s => 
      String(s.NISN) === String(subjectId) || String(s.ID_Siswa) === String(subjectId)
    );
    if (student && student.Email) {
      recipients.add({ 
        email: student.Email, 
        role: student.Jabatan || 'Siswa', 
        msg: selfMessage || message,
        type: 'alert' // Always alert for direct messages
      });
    }
  }

  // 3. Wali Kelas
  if (targetRoles.includes('Wali Kelas') && waliEmail) {
    recipients.add({ email: waliEmail, role: 'Wali Kelas', msg: message });
  }

  const uniqueRecipients = Array.from(recipients);

  for (const r of uniqueRecipients) {
    notifPromises.push(
      fetchGAS('CREATE', {
        sheet: 'Notifikasi',
        data: {
          ID: 'NT' + Date.now() + Math.random().toString(36).substr(2, 4),
          Message: r.msg,
          Type: r.type || type,
          Target_Email: r.email,
          Is_Read: 'FALSE',
          Timestamp: new Date().toISOString(),
          Target_Role: r.role,
          Role: r.role,
          Email: r.email
        }
      }).catch(err => console.warn('Failed to send individual notification to', r.email, err))
    );
  }

  return Promise.allSettled(notifPromises);
}
