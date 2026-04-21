import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import Loading from '../components/Loading';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { 
  Calendar, 
  UserPlus, 
  Trash2, 
  Save, 
  Info,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function Piket() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [piketData, setPiketData] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Senin');

  useEffect(() => {
    async function loadData() {
      try {
        const [sRes, pRes] = await Promise.all([
          fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
          fetchGAS('GET_ALL', { sheet: 'Piket' })
        ]);

        if (sRes.status === 'success') {
          setStudents((sRes.data || []).filter(s => s.Status_Aktif === 'Aktif'));
        }
        if (pRes.status === 'success') {
          setPiketData(pRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load piket data:', err);
        showToast('Gagal memuat data.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [showToast]);

  const handleAddStudentToDay = (student, day) => {
    // Check if already assigned to this day
    const exists = piketData.some(p => p.Hari === day && p.ID_Siswa === student.ID_Siswa);
    if (exists) {
      showToast(`${student.Nama_Siswa} sudah dijadwalkan pada hari ${day}.`, 'warning');
      return;
    }

    const newItem = {
      ID_Piket: 'PK' + Date.now(),
      Hari: day,
      ID_Siswa: student.ID_Siswa,
      Nama_Siswa: student.Nama_Siswa,
      Email: student.Email
    };

    setPiketData(prev => [...prev, newItem]);
  };

  const handleRemoveStudent = (id) => {
    setPiketData(prev => prev.filter(p => p.ID_Piket !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchGAS('SYNC_PIKET', { data: piketData });
      if (res.status === 'success') {
        showToast('Jadwal piket berhasil disimpan.', 'success');
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      console.error('Failed to save piket:', err);
      showToast('Gagal menyimpan jadwal piket.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Menyiapkan jadwal piket..." />;

  const isTeacher = user.role === 'Wali Kelas';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-8 h-8 text-emerald-600" />
            Jadwal Piket Kelas
          </h2>
          <p className="text-sm text-slate-500 font-medium">Atur dan pantau jadwal kebersihan rutin kelas {user.managedClass}.</p>
        </div>
        
        {isTeacher && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-emerald-100"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Management Sidebar (Wali Kelas only) */}
        {isTeacher && (
          <div className="xl:col-span-1 space-y-4">
            <div className="card sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-700">Daftar Siswa</h3>
              </div>
              
              <div className="relative mb-4">
                <Info className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <p className="pl-9 text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                  Pilih hari di bawah, lalu klik nama siswa untuk menambahkan ke jadwal.
                </p>
              </div>

              <div className="space-y-2 mb-6">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Pilih Hari Tugas</label>
                 <div className="grid grid-cols-3 gap-1">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all border ${
                          selectedDay === day 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2 space-y-1">
                {(() => {
                  const assignedStudentIds = new Set(piketData.map(p => p.ID_Siswa));
                  const availableStudents = students.filter(s => !assignedStudentIds.has(s.ID_Siswa));

                  if (availableStudents.length === 0 && students.length > 0) {
                    return (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-dashed border-emerald-200 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Semua siswa sudah terjadwal</p>
                      </div>
                    );
                  }

                  return availableStudents.map(s => (
                    <button
                      key={s.ID_Siswa}
                      onClick={() => handleAddStudentToDay(s, selectedDay)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all border bg-white border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black bg-emerald-100 text-emerald-600">
                          {s.Nama_Siswa.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate">{s.Nama_Siswa}</span>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ));
                })()}
              </div>
            </div>

            <div className="card bg-slate-50 border-none">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ketersediaan</p>
                  <p className="text-xl font-black text-slate-800">
                    {students.length - piketData.length} <span className="text-sm text-slate-400">/ {students.length}</span>
                  </p>
                </div>
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${((students.length - piketData.length) / students.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Schedule Display */}
        <div className={`${isTeacher ? 'xl:col-span-3' : 'xl:col-span-4'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
          {DAYS.map(day => {
            const members = piketData.filter(p => p.Hari === day);
            const todayIdx = new Date().getDay();
            const todayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][todayIdx];
            const isToday = day === todayName;

            return (
              <div 
                key={day} 
                className={`card relative overflow-hidden transition-all duration-300 ${isToday ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-50' : 'hover:shadow-lg hover:border-slate-200'}`}
              >
                {isToday && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl shadow-sm z-10 animate-pulse">
                    Hari Ini
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${isToday ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 tracking-tight">{day}</h4>
                </div>

                <div className="space-y-2 min-h-[120px]">
                  {members.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <AlertCircle className="w-6 h-6 text-slate-300 mb-2" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Belum ada tugas</p>
                    </div>
                  ) : (
                    members.map(m => (
                      <div 
                        key={m.ID_Piket} 
                        className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl group hover:border-emerald-100 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-600 border border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                            {m.Nama_Siswa.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-700 truncate">{m.Nama_Siswa}</span>
                        </div>
                        {isTeacher && (
                          <button 
                            onClick={() => handleRemoveStudent(m.ID_Piket)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {members.length} Anggota
                  </span>
                  {members.length > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-500/30" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
