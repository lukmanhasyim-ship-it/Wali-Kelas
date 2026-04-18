import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ 
  title = 'Tidak ada data ditemukan', 
  description = 'Belum ada data yang tersedia untuk ditampilkan saat ini.',
  icon: Icon = Inbox
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in zoom-in duration-500">
    <div className="bg-slate-50 p-6 rounded-[2.5rem] mb-6 border border-slate-100 shadow-inner">
      <Icon className="w-12 h-12 text-slate-300" />
    </div>
    <div className="max-w-xs space-y-2">
      <h3 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

export default EmptyState;
