import React, { memo } from 'react';
import { Phone, FileText, AlertTriangle, Edit3, MapPin, Trash2, MessageCircle, Crown } from 'lucide-react';

function StudentCard({ student, disciplineStatus, onWaClick, onWaStudentClick, onContactClick, onEdit, onDelete, canSeeLocation }) {
  const getAvatarColor = (gender) => {
    return gender === 'P' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700';
  };

  return (
    <div className={`group relative bg-white p-3 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${disciplineStatus ? 'border-red-200 bg-red-50/50 shadow-red-100/50' : 'border-slate-100 shadow-sm'}`}>
      {/* Name & Status Header - Top of Card */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-4 mb-1 truncate group-hover:whitespace-normal transition-all">
            {student.Nama_Siswa}
          </h3>
          <div className="flex flex-wrap gap-1">
            {student.Status_Aktif && student.Status_Aktif !== 'Aktif' && (
              <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase ${student.Status_Aktif === 'Keluar' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                {student.Status_Aktif}
              </span>
            )}
            {student.Jabatan && student.Jabatan !== 'Siswa' && (
              <span className="px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                <Crown className="w-2 h-2" />
                {student.Jabatan}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Left: Avatar Section */}
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-inner transition-transform group-hover:scale-105 duration-300 ${getAvatarColor(student['L/P'])}`}>
            {student.Nama_Siswa.charAt(0)}
          </div>
        </div>

        {/* Center: Detail Section */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center flex-wrap gap-1">
              <span className="text-[8px] font-black text-emerald-600 font-mono bg-emerald-50 px-1 py-0.5 rounded-md border border-emerald-100">{student.ID_Siswa || student.NIS}</span>
              <span className="text-[9px] text-slate-400 font-bold tracking-tighter">NISN: {student.NISN || '-'}</span>
            </div>
            <div className="mt-0.5">
              <p className="text-[10px] text-slate-500 font-semibold truncate">
                <span className="text-slate-400 font-medium tracking-tight">Wali:</span> {student.Nama_Wali}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions Section */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2 border-l border-slate-100 pl-3 ml-0.5">
          {/* Communication Group */}
          <div className="flex items-center gap-1">
            {onContactClick && (
              <button
                onClick={() => onContactClick(student)}
                className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm"
                title="Log Panggilan"
              >
                <FileText className="w-3 h-3" />
              </button>
            )}
            {onWaStudentClick && (
              <button
                onClick={() => onWaStudentClick(student)}
                className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-sky-500 hover:text-white transition-all duration-300 shadow-sm"
                title="WhatsApp Siswa"
              >
                <MessageCircle className="w-3 h-3" />
              </button>
            )}
            {onWaClick && (
              <button
                onClick={() => onWaClick(student)}
                className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all duration-300 shadow-sm"
                title="WhatsApp Wali"
              >
                <Phone className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Management Group */}
          <div className="flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(student)}
                className="p-1 bg-slate-50 text-slate-400 rounded-md hover:bg-slate-900 hover:text-white transition-all duration-300"
                title="Edit"
              >
                <Edit3 className="w-2.5 h-2.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(student.ID_Siswa)}
                className="p-1 bg-rose-50 text-rose-300 rounded-md hover:bg-rose-600 hover:text-white transition-all duration-300"
                title="Hapus"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Indicator for Alert */}
      {disciplineStatus && (
        <div className={`mt-2 pt-2 border-t ${disciplineStatus === 'Sudah Dipanggil' ? 'border-amber-100' : 'border-red-100'} flex items-center justify-between`}>
          <span className={`text-[9px] font-black ${disciplineStatus === 'Sudah Dipanggil' ? 'text-amber-600' : 'text-red-600'} uppercase tracking-widest flex items-center gap-1`}>
            {disciplineStatus}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(StudentCard);
