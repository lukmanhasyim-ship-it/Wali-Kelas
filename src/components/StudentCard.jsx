import React, { memo } from 'react';
import { Phone, AlertTriangle, Edit3, MapPin } from 'lucide-react';

function StudentCard({ student, disciplineStatus, onWaClick, onEdit }) {
  const getAvatarColor = (gender) => {
    return gender === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700';
  };

  return (
    <div className={`card relative flex items-center gap-4 ${disciplineStatus ? 'border-red-200 bg-red-50' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getAvatarColor(student['L/P'])}`}>
        {student.Nama_Siswa.charAt(0)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 truncate">{student.Nama_Siswa}</h3>
          {disciplineStatus && (
             <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
               <AlertTriangle className="w-3 h-3" />
               {disciplineStatus}
             </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">NISN: {student.NISN}</p>
        <p className="text-xs text-slate-500 mt-1">Jabatan: {student.Jabatan || 'Siswa'}</p>
        <p className="text-xs text-slate-500 truncate">Wali: {student.Nama_Wali}</p>
      </div>

      {/* Quick Action */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(student)}
            className="p-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            title="Edit Data Siswa"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        )}
        {student.Latitude && student.Longitude && (
          <a
            href={`https://www.google.com/maps?q=${student.Latitude},${student.Longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            title="Lihat Lokasi di Google Maps"
          >
            <MapPin className="w-5 h-5" />
          </a>
        )}
        <button
          onClick={() => onWaClick(student)}
          className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
          title="WhatsApp Wali"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default memo(StudentCard);
