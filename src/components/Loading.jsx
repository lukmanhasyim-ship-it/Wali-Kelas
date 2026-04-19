import React from 'react';

const quotes = [
  "Pendidikan adalah senjata paling mematikan di dunia. — Nelson Mandela",
  "Ilmu adalah harta yang tidak akan pernah habis. — Ali bin Abi Thalib",
  "Hiduplah seolah-olah kamu mati besok. Belajarlah seolah-olah kamu hidup selamanya. — Mahatma Gandhi",
  "Guru membuka pintu, tetapi kamu harus memasukinya sendiri.",
  "Keberhasilan bukanlah akhir, kegagalan bukanlah fatal: keberanian untuk melanjutkanlah yang utama.",
  "Sedang merapikan catatan masa depanmu...",
  "Menyiapkan panggung untuk kesuksesan siswa hari ini...",
  "Sabar ya, hal besar butuh waktu untuk bersiap.",
  "Ilmu yang bermanfaat adalah cahaya bagi pemiliknya.",
  "Dibalik setiap data, ada cita-cita yang sedang diperjuangkan.",
  "Belajar hari ini untuk masa depan yang lebih baik.",
  "Teruslah berproses, tak perlu menjadi sempurna.",
  "Masa depan tidak ditentukan oleh keberuntungan, tetapi oleh kerja keras dan ketekunan.",
  "Jangan pernah meremehkan diri sendiri, karena kamu mampu melakukan apa pun yang diinginkan.",
  "Hidup adalah pilihan, pilih dengan bijak untuk mencapai kesuksesan."
];

const Loading = ({ message = 'Memuat data...' }) => {
  const randomQuote = React.useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in duration-700">
      <div className="relative">
        <div className="loader"></div>
      </div>

      <div className="text-center space-y-4 max-w-sm px-6">
        <div className="space-y-1">
          <h3 className="text-emerald-900 font-black text-xl tracking-tight uppercase">{message}</h3>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Sistem Wali Kelas Digital</p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-slate-500 italic text-sm font-medium animate-slide-up leading-relaxed">
            "{randomQuote}"
          </p>
        </div>
      </div>

      <style>{`
        .loader {
          width: 50px;
          aspect-ratio: 1;
          display: grid;
        }
        .loader::before,
        .loader::after {    
          content:"";
          grid-area: 1/1;
          --c: no-repeat radial-gradient(farthest-side, #064e3b 92%, #0000); /* Brand Emerald 900 */
          background: 
            var(--c) 50%  0, 
            var(--c) 50%  100%, 
            var(--c) 100% 50%, 
            var(--c) 0    50%;
          background-size: 12px 12px;
          animation: l12 1.2s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        .loader::before {
          margin: 4px;
          --c: no-repeat radial-gradient(farthest-side, #d97706 92%, #0000); /* Accent Gold 600 */
          background-size: 8px 8px;
          animation-timing-function: linear;
        }

        @keyframes l12 { 
          100%{transform: rotate(.5turn)}
        }
      `}</style>
    </div>
  );
};

export default Loading;
