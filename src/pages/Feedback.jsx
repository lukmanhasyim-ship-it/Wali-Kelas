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
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackSubject, setFallbackSubject] = useState('');
  const [fallbackBody, setFallbackBody] = useState('');
  const [copiedField, setCopiedField] = useState(null);

  const role = user?.role || 'Siswa';

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      showToast(`${field === 'email' ? 'Email' : field === 'subject' ? 'Subjek' : 'Pesan'} berhasil disalin.`, 'success');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showToast('Gagal menyalin ke clipboard.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      showToast('Mohon isi subjek dan pesan.', 'error');
      return;
    }

    setSending(true);

    try {
      const fullSubject = `[Feedback ${type.toUpperCase()}] ${subject}`;
      const fullBody = 
        `=== INFORMASI PENGIRIM ===\n` +
        `Nama: ${user?.name || 'Tidak diketahui'}\n` +
        `Email: ${user?.email || 'Tidak diketahui'}\n` +
        `Role: ${role}\n` +
        `Kelas: ${user?.managedClass || '-'}\n\n` +
        `=== DETAIL FEEDBACK ===\n` +
        `Jenis: ${type === 'saran' ? 'Saran' : 'Keluhan'}\n` +
        `Subjek: ${subject}\n\n` +
        `Pesan:\n${message}\n\n` +
        `========================`;

      const mailtoLink = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(fullBody)}`;
      
      // Try mailto first
      window.location.href = mailtoLink;
      
      // Fallback after short delay - if mailto didn't work
      setTimeout(() => {
        setFallbackSubject(fullSubject);
        setFallbackBody(fullBody);
        setShowFallback(true);
      }, 1000);
      
      showToast('Email client terbuka. Silakan kirim email untuk submit feedback.', 'success');
      
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error('Feedback error:', err);
      const fullSubject = `[Feedback ${type.toUpperCase()}] ${subject}`;
      const fullBody = 
        `=== INFORMASI PENGIRIM ===\n` +
        `Nama: ${user?.name || 'Tidak diketahui'}\n` +
        `Email: ${user?.email || 'Tidak diketahui'}\n` +
        `Role: ${role}\n` +
        `Kelas: ${user?.managedClass || '-'}\n\n` +
        `=== DETAIL FEEDBACK ===\n` +
        `Jenis: ${type === 'saran' ? 'Saran' : 'Keluhan'}\n` +
        `Subjek: ${subject}\n\n` +
        `Pesan:\n${message}\n\n` +
        `========================`;
      setFallbackSubject(fullSubject);
      setFallbackBody(fullBody);
      setShowFallback(true);
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
              Jika email client tidak terbuka, Anda bisa copy manual.
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

      {/* Fallback Modal */}
      {showFallback && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 bg-emerald-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-emerald-900">Kirim Feedback Manual</h3>
                <p className="text-xs text-emerald-700 mt-1">Email client tidak terbuka. Silakan copy dan kirim manual.</p>
              </div>
              <button
                onClick={() => setShowFallback(false)}
                className="p-2 hover:bg-emerald-100 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Email Tujuan */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tujuan</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={FEEDBACK_EMAIL}
                    className="input-field flex-1 text-sm font-medium"
                  />
                  <button
                    onClick={() => copyToClipboard(FEEDBACK_EMAIL, 'email')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      copiedField === 'email'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {copiedField === 'email' ? '✓ Tersalin' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Subjek</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fallbackSubject}
                    className="input-field flex-1 text-sm font-medium"
                  />
                  <button
                    onClick={() => copyToClipboard(fallbackSubject, 'subject')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      copiedField === 'subject'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {copiedField === 'subject' ? '✓ Tersalin' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Pesan */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pesan</label>
                <div className="flex items-start gap-2">
                  <textarea
                    readOnly
                    value={fallbackBody}
                    rows={8}
                    className="input-field flex-1 text-xs font-mono resize-none"
                  />
                  <button
                    onClick={() => copyToClipboard(fallbackBody, 'body')}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      copiedField === 'body'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {copiedField === 'body' ? '✓ Tersalin' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Quick Links */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Buka Langsung di Email</label>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${FEEDBACK_EMAIL}&su=${encodeURIComponent(fallbackSubject)}&body=${encodeURIComponent(fallbackBody)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl hover:bg-red-100 transition-all font-bold text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                    </svg>
                    Gmail
                  </a>
                  <a
                    href={`https://outlook.live.com/mail/0/deeplink/compose?to=${FEEDBACK_EMAIL}&subject=${encodeURIComponent(fallbackSubject)}&body=${encodeURIComponent(fallbackBody)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-100 transition-all font-bold text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 7.387v10.478c0 .23-.08.424-.238.576a.769.769 0 0 1-.572.242h-5.773V11.73l3.895-2.894 2.688-1.45z"/>
                      <path d="M12 16.64L1.636 8.91 0 10.082v12.284c0 .904.732 1.636 1.636 1.636h20.728a1.636 1.636 0 0 0 1.636-1.636V10.082L12 16.64z"/>
                      <path d="M22.066 4.682L12 11.73 1.934 4.682l1.528-1.145C5.08 2.28 7.39 3.434 7.39 5.457v6.273l4.61 3.44 4.61-3.44V5.457c0-2.023 2.31-3.178 3.928-1.964l1.528 1.145z"/>
                    </svg>
                    Outlook
                  </a>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowFallback(false)}
                className="btn-primary px-6"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
