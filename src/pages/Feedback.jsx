import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const FEEDBACK_EMAIL = 'lukmanhasyim@gmail.com';

export default function Feedback() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [type, setType] = useState('saran');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const role = user?.role || 'Siswa';
  const isSiswaRole = ['Siswa', 'Ketua Kelas', 'Wakil Ketua Kelas', 'Sekretaris', 'Wakil Sekretaris', 'Bendahara', 'Wakil Bendahara'].includes(role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      showToast('Mohon isi subjek dan pesan.', 'error');
      return;
    }

    setSending(true);

    try {
      const emailSubject = encodeURIComponent(`[Feedback ${type.toUpperCase()}] ${subject}`);
      
      const emailBody = encodeURIComponent(
        `Nama: ${user?.name || 'Tidak diketahui'}\n` +
        `Email: ${user?.email || 'Tidak diketahui'}\n` +
        `Role: ${role}\n` +
        `Jenis Feedback: ${type === 'saran' ? 'Saran' : 'Keluhan'}\n` +
        `Subjek: ${subject}\n\n` +
        `Pesan:\n${message}`
      );

      window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${emailSubject}&body=${emailBody}`;
      
      showToast('Email client terbuka. Silakan kirim email untuk submit feedback.', 'success');
      
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error('Feedback error:', err);
      showToast('Gagal membuka email client.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kirim Feedback</h2>
          <p className="text-sm text-slate-500">Saran dan keluhan Anda sangat berarti untuk perbaikan aplikasi.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          Kembali ke Dashboard
        </button>
      </div>

      <div className="card p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Jenis Feedback</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('saran')}
                className={`p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  type === 'saran'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3 3 0 0010 19v-4" />
                  </svg>
                  <span>Saran</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType('keluhan')}
                className={`p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  type === 'keluhan'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Keluhan</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Subjek</label>
            <input
              type="text"
              className="input-field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ringkasan singkat..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {type === 'saran' ? 'Saran' : 'Keluhan'}
            </label>
            <textarea
              className="input-field min-h-[160px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={type === 'saran' 
                ? 'Tulis saran Anda untuk perbaikan aplikasi...' 
                : 'Jelaskan keluhan Anda dengan detail...'}
              required
            />
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-slate-600">Informasi</span>
            </div>
            <p className="text-xs text-slate-500">
              Feedback akan dikirim ke <span className="font-semibold">{FEEDBACK_EMAIL}</span>. 
              Pastikan email client (Gmail, Outlook, dll) terbuka untuk mengirim pesan.
            </p>
            <div className="mt-2 text-[10px] text-slate-400">
              <p>Login sebagai: <span className="font-medium">{user?.name}</span> ({role})</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <button type="submit" className="btn-primary min-w-[160px]" disabled={sending}>
              {sending ? 'Membuka Email...' : 'Kirim Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}