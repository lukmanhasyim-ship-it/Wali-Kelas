import React, { memo } from 'react';
import { Phone, FileText, AlertTriangle, Edit3, MapPin, Trash2, MessageCircle } from 'lucide-react';

function StudentCard({ student, disciplineStatus, onWaClick, onWaStudentClick, onContactClick, onEdit, onDelete, canSeeLocation }) {
  const getAvatarColor = (gender) => {
    return gender === 'P' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700';
  };

  return (
    <div className={`group relative bg-white p-4 rounded-[2rem] border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${disciplineStatus ? 'border-red-200 bg-red-50/50 shadow-red-100/50' : 'border-slate-100 shadow-sm'}`}>
      <div className="flex items-center gap-4">
        {/* Left: Avatar Section */}
        <div className="relative">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-transform group-hover:scale-105 duration-300 ${getAvatarColor(student['L/P'])}`}>
            {student.Nama_Siswa.charAt(0)}
          </div>
          {disciplineStatus && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <AlertTriangle className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Center: Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 mb-1">
            <h3 className="text-[13px] font-black text-slate-800 truncate max-w-[150px] uppercase tracking-tight">
              {student.Nama_Siswa}
            </h3>
            {student.Status_Aktif && student.Status_Aktif !== 'Aktif' && (
              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${student.Status_Aktif === 'Keluar' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                {student.Status_Aktif}
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">{student.ID_Siswa}</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-tight">NISN: {student.NISN || '-'}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate opacity-75">
              <span className="font-bold text-slate-400">Wali:</span> {student.Nama_Wali}
            </p>
          </div>
        </div>

        {/* Right: Actions Section */}
        <div className="flex-shrink-0 flex flex-col items-end gap-3 border-l border-slate-100 pl-4 ml-2">
          {/* Communication Group */}
          <div className="flex items-center gap-1.5">
            {onContactClick && (
              <button
                onClick={() => onContactClick(student)}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm"
                title="Buat Surat Panggilan"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            )}
            {onWaStudentClick && (
              <button
                onClick={() => onWaStudentClick(student)}
                className="p-2 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all duration-300 shadow-sm"
                title="WhatsApp Siswa"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            )}
            {onWaClick && (
              <button
                onClick={() => onWaClick(student)}
                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all duration-300 shadow-sm"
                title="WhatsApp Wali"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Management & Location Group */}
          <div className="flex items-center gap-1.5">
            {canSeeLocation && student.Latitude && student.Longitude && (
              <a
                href={`https://www.google.com/maps?q=${student.Latitude},${student.Longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all duration-300"
                title="Google Maps"
              >
                <MapPin className="w-3 h-3" />
              </a>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(student)}
                className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all duration-300"
                title="Edit Data"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(student.ID_Siswa)}
                className="p-1.5 bg-rose-50 text-rose-300 rounded-lg hover:bg-rose-600 hover:text-white transition-all duration-300"
                title="Hapus"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Indicator for Alert */}
      {disciplineStatus && (
        <div className={`mt-2 pt-2 border-t ${disciplineStatus === 'Sudah Dipanggil' ? 'border-amber-100' : 'border-red-100'} flex items-center justify-between`}>
          <span className={`text-[10px] font-black ${disciplineStatus === 'Sudah Dipanggil' ? 'text-amber-600' : 'text-red-600'} uppercase tracking-widest flex items-center gap-1`}>
            <span className={`w-1 h-1 ${disciplineStatus === 'Sudah Dipanggil' ? 'bg-amber-600' : 'bg-red-600'} rounded-full ${disciplineStatus === 'Sudah Dipanggil' ? '' : 'animate-ping'}`} />
            {disciplineStatus}
          </span>
          <p className={`text-[9px] ${disciplineStatus === 'Sudah Dipanggil' ? 'text-amber-400' : 'text-red-400'} font-medium italic`}>
            {disciplineStatus === 'Sudah Dipanggil' ? 'Sedang Dimonitor' : 'Tindakan Diperlukan'}
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(StudentCard);
