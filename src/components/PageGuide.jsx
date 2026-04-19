import React from 'react';
import { Info } from 'lucide-react';

export default function PageGuide({ title, steps = [] }) {
  if (steps.length === 0) return null;

  return (
    <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4 flex gap-4 animate-in fade-in slide-in-from-top-2 duration-500 print:hidden shadow-sm shadow-emerald-900/5 mb-6">
      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Info className="w-5 h-5 text-emerald-600" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-emerald-900 mb-1">{title}</h4>
        <ul className="text-[11px] text-emerald-700 space-y-1 list-disc list-inside font-medium leading-relaxed">
          {steps.map((step, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: step }} />
          ))}
        </ul>
      </div>
    </div>
  );
}
