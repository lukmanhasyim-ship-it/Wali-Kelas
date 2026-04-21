import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchGAS } from '../utils/gasClient';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';
import { BookOpen, Plus, Save, FileSpreadsheet, Trash2, Edit2, X, Info, FileUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const KURIKULUM_MERDEKA = [
  { kategori: 'Umum', mapel: 'Pendidikan Agama Islam dan Budi Pekerti' },
  { kategori: 'Umum', mapel: 'Pendidikan Kewarganegaraan' },
  { kategori: 'Umum', mapel: 'Bahasa Indonesia' },
  { kategori: 'Umum', mapel: 'Sejarah' },
  { kategori: 'Umum', mapel: 'Seni Budaya' },
  { kategori: 'Kejuruan', mapel: 'Matematika' },
  { kategori: 'Kejuruan', mapel: 'Bahasa Inggris' },
  { kategori: 'Kejuruan', mapel: 'Informatika' },
  { kategori: 'Kejuruan', mapel: 'Ilmu Pengetahuan Alam dan Sosial' },
  { kategori: 'Kejuruan', mapel: 'Dasar Program Keahlian', topik: 'Sesuai program keahlian' },
  { kategori: 'Kejuruan', mapel: 'Konsentrasi Keahlian', topik: 'Sesuai program keahlian' },
  { kategori: 'Kejuruan', mapel: 'Produk Kreatif dan Kewirausahaan' }
];

export default function DKN() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siswa, setSiswa] = useState([]);
  const [semuaNilai, setSemuaNilai] = useState([]);

  // Filters
  const [jenjang, setJenjang] = useState('X');
  const [semester, setSemester] = useState('Ganjil');

  // Input Mapel Baru
  const [showAddMapel, setShowAddMapel] = useState(false);
  const [newKategori, setNewKategori] = useState('Umum');
  const [newMapel, setNewMapel] = useState('');
  const [newTopik, setNewTopik] = useState('');
  const [addedColumns, setAddedColumns] = useState([]);

  // Perubahan Nilai lokal sebelum disimpan
  // Format map: "ID_Siswa_Kategori_Mapel_Topik" -> value
  const [draftNilai, setDraftNilai] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resSiswa, resNilai] = await Promise.all([
        fetchGAS('GET_ALL', { sheet: 'Master_Siswa' }),
        fetchGAS('GET_ALL', { sheet: 'Daftar_Nilai' })
      ]);
      const allSiswaData = resSiswa.data || [];
      const sortedSiswa = allSiswaData
        .filter(st => st.Status_Aktif === 'Aktif')
        .sort((a, b) => (a.Nama_Siswa || '').localeCompare(b.Nama_Siswa || ''));
      setSiswa(sortedSiswa);
      setSemuaNilai(resNilai.data || []);
      setDraftNilai({});
      setAddedColumns([]);
    } catch (err) {
      console.error('Leger load error:', err);
      showToast('Gagal memuat data Leger.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Derive dynamic columns from existing data & newly added
  const columns = useMemo(() => {
    const colSet = new Set();
    const result = [];

    // Add columns from DB that match current jenjang & semester
    semuaNilai.forEach(n => {
      if (n.Jenjang === jenjang && n.Semester === semester && n.Nama_Mapel) {
        const key = `${n.Kategori_Mapel}_${n.Nama_Mapel}_${n.Topik || ''}`;
        if (!colSet.has(key)) {
          colSet.add(key);
          result.push({
            kategori: n.Kategori_Mapel || 'Umum',
            mapel: n.Nama_Mapel,
            topik: n.Topik || ''
          });
        }
      }
    });

    // Add newly defined columns
    addedColumns.forEach(c => {
      const key = `${c.kategori}_${c.mapel}_${c.topik || ''}`;
      if (!colSet.has(key)) {
        colSet.add(key);
        result.push(c);
      }
    });

    // Sort: Umum first, then Kejuruan, then others. Group by Mapel.
    const order = { 'Umum': 1, 'Kejuruan': 2, 'Pilihan': 3, 'Muatan Lokal': 4 };
    return result.sort((a, b) => {
      if (a.kategori !== b.kategori) {
        return (order[a.kategori] || 9) - (order[b.kategori] || 9);
      }
      if (a.mapel !== b.mapel) {
        return a.mapel.localeCompare(b.mapel);
      }
      return (a.topik || '').localeCompare(b.topik || '');
    });
  }, [semuaNilai, jenjang, semester, addedColumns]);

  const getDBNilai = useCallback((idSiswa, kategori, mapel, topik) => {
    const found = semuaNilai.find(n =>
      n.ID_Siswa?.toString() === idSiswa?.toString() &&
      n.Jenjang === jenjang &&
      n.Semester === semester &&
      n.Kategori_Mapel === kategori &&
      n.Nama_Mapel === mapel &&
      (n.Topik || '') === topik
    );
    return found ? found.Nilai : '';
  }, [semuaNilai, jenjang, semester]);

  const handleNilaiChange = (idSiswa, kategori, mapel, topik, val) => {
    const key = `${idSiswa}_${kategori}_${mapel}_${topik}`;
    setDraftNilai(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const getDisplayedNilai = (idSiswa, kategori, mapel, topik) => {
    const key = `${idSiswa}_${kategori}_${mapel}_${topik}`;
    if (draftNilai[key] !== undefined) {
      return draftNilai[key];
    }
    return getDBNilai(idSiswa, kategori, mapel, topik);
  };

  const handleAddMapel = () => {
    if (!newMapel) {
      showToast('Nama Mapel harus diisi', 'error');
      return;
    }
    if (newKategori === 'Kejuruan' && !newTopik && (newMapel.toLowerCase().includes('keahlian'))) {
      showToast('Topik sebaiknya diisi untuk mapel kejuruan spesifik', 'warning');
    }

    // Check duplication
    const exists = columns.some(c => c.mapel === newMapel && c.topik === newTopik && c.kategori === newKategori);
    if (exists) {
      showToast('Mapel/Topik sudah ada di tabel.', 'error');
      return;
    }

    setAddedColumns(prev => [...prev, {
      kategori: newKategori,
      mapel: newMapel,
      topik: newTopik || ''
    }]);

    // Set default value 0 for all students for this new column
    setDraftNilai(prev => {
      const next = { ...prev };
      siswa.forEach(s => {
        const key = `${s.ID_Siswa}_${newKategori}_${newMapel}_${newTopik || ''}`;
        if (next[key] === undefined) {
          next[key] = '0';
        }
      });
      return next;
    });

    setNewMapel('');
    setNewTopik('');
    setShowAddMapel(false);
    showToast(`Kolom ${newMapel} ditambahkan dengan nilai default 0.`, 'info');
  };

  const handleDeleteMapel = (col) => {
    // Check if it's in addedColumns
    const isNew = addedColumns.some(c => c.kategori === col.kategori && c.mapel === col.mapel && c.topik === col.topik);
    if (!isNew) {
      showToast('Hanya kolom yang baru ditambah (draft) yang dapat dihapus.', 'warning');
      return;
    }

    if (confirm(`Hapus kolom "${col.mapel}" dari draft?`)) {
      setAddedColumns(prev => prev.filter(c =>
        !(c.kategori === col.kategori && c.mapel === col.mapel && c.topik === col.topik)
      ));

      // Also cleanup draftNilai for this column
      setDraftNilai(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          if (key.includes(`_${col.kategori}_${col.mapel}_${col.topik}`)) {
            delete next[key];
          }
        });
        return next;
      });
    }
  };

  const [editingCol, setEditingCol] = useState(null); // {kategori, mapel, topik}
  const [editValues, setEditValues] = useState({ mapel: '', topik: '' });

  const startEdit = (col) => {
    setEditingCol(col);
    setEditValues({ mapel: col.mapel, topik: col.topik });
  };

  const handleUpdateMapel = async () => {
    if (!editValues.mapel) return;

    const isNew = addedColumns.some(c => c.kategori === editingCol.kategori && c.mapel === editingCol.mapel && c.topik === editingCol.topik);

    if (isNew) {
      // Update draft columns
      setAddedColumns(prev => prev.map(c => {
        if (c.kategori === editingCol.kategori && c.mapel === editingCol.mapel && c.topik === editingCol.topik) {
          return { ...c, mapel: editValues.mapel, topik: editValues.topik };
        }
        return c;
      }));

      // Migrate draftNilai keys
      setDraftNilai(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          const oldKeySuffix = `_${editingCol.kategori}_${editingCol.mapel}_${editingCol.topik}`;
          if (key.endsWith(oldKeySuffix)) {
            const newKey = key.replace(oldKeySuffix, `_${editingCol.kategori}_${editValues.mapel}_${editValues.topik}`);
            next[newKey] = next[key];
            delete next[key];
          }
        });
        return next;
      });
      showToast('Kolom draft berhasil diperbarui.', 'success');
    } else {
      // Update existing subjects in database
      setSaving(true);
      try {
        await fetchGAS('RENAME_MAPEL', {
          oldMapel: editingCol.mapel,
          oldTopik: editingCol.topik,
          newName: editValues.mapel,
          newTopik: editValues.topik,
          kategori: editingCol.kategori
        });
        showToast('Nama Mapel di database berhasil diubah!', 'success');
        await loadData();
      } catch (err) {
        showToast('Gagal mengubah nama mapel di database.', 'error');
      } finally {
        setSaving(false);
      }
    }

    setEditingCol(null);
  };

  const handleApplyTemplate = () => {
    let addCount = 0;
    const newDraft = { ...draftNilai };
    const newAdded = [...addedColumns];

    KURIKULUM_MERDEKA.forEach(tm => {
      const exists = columns.some(c => c.mapel === tm.mapel && (c.topik || '') === (tm.topik || '') && c.kategori === tm.kategori);
      if (!exists) {
        newAdded.push({
          kategori: tm.kategori,
          mapel: tm.mapel,
          topik: tm.topik || ''
        });
        siswa.forEach(s => {
          const key = `${s.ID_Siswa}_${tm.kategori}_${tm.mapel}_${tm.topik || ''}`;
          if (newDraft[key] === undefined) {
             newDraft[key] = '0';
          }
        });
        addCount++;
      }
    });

    if (addCount > 0) {
      setAddedColumns(newAdded);
      setDraftNilai(newDraft);
      showToast(`Berhasil menambahkan ${addCount} mapel dari susunan kurikulum.`, 'success');
    } else {
      showToast('Semua mapel kurikulum sudah ada.', 'info');
    }
  };

  const handleSave = async () => {
    if (Object.keys(draftNilai).length === 0) {
      showToast('Tidak ada perubahan nilai untuk disimpan.', 'info');
      return;
    }

    setSaving(true);
    const updates = [];

    // Parse draftNilai to array of updates
    Object.keys(draftNilai).forEach(key => {
      // key: ID_Siswa_Kategori_Mapel_Topik
      const parts = key.split('_');
      const idSiswa = parts[0];
      const kategori = parts[1];
      const mapel = parts[2];
      const topik = parts.slice(3).join('_'); // If topik has underscore
      const nilai = draftNilai[key];

      const student = siswa.find(s => String(s.ID_Siswa) === String(idSiswa));

      updates.push({
        ID_Siswa: idSiswa,
        NISN: student?.NISN || '',
        Jenjang: jenjang,
        Semester: semester,
        Kategori_Mapel: kategori,
        Nama_Mapel: mapel,
        Topik: topik,
        Nilai: nilai
      });
    });

    try {
      const res = await fetchGAS('BULK_UPDATE_NILAI', { data: updates });
      if (res.status === 'success') {
        showToast('Nilai berhasil disimpan!', 'success');
        await loadData();
      } else {
        throw new Error('Respons backend error');
      }
    } catch (err) {
      console.error('Save Leger Failed:', err);
      showToast('Gagal menyimpan nilai.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="Memuat Daftar Kumpulan Nilai..." />;

  const isChanged = Object.keys(draftNilai).length > 0;

  const handleExportExcel = () => {
    if (siswa.length === 0) {
      showToast('Tidak ada data siswa untuk diekspor', 'error');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const levels = ['X', 'XI', 'XII'];

      levels.forEach(lvl => {
        // 1. Get columns for this specific level
        const lvlCols = [];
        const colSet = new Set();
        semuaNilai.forEach(n => {
          if (n.Jenjang === lvl && n.Semester === semester && n.Nama_Mapel) {
            const key = `${n.Kategori_Mapel}_${n.Nama_Mapel}_${n.Topik || ''}`;
            if (!colSet.has(key)) {
              colSet.add(key);
              lvlCols.push({ kategori: n.Kategori_Mapel, mapel: n.Nama_Mapel, topik: n.Topik || '' });
            }
          }
        });

        // Add also currently added (unsaved) columns if they match level
        if (lvl === jenjang) {
          addedColumns.forEach(c => {
            const key = `${c.kategori}_${c.mapel}_${c.topik || ''}`;
            if (!colSet.has(key)) {
              colSet.add(key);
              lvlCols.push(c);
            }
          });
        }

        // Sort columns
        lvlCols.sort((a, b) => {
          if (a.kategori !== b.kategori) return a.kategori === 'Umum' ? -1 : 1;
          if (a.mapel !== b.mapel) return a.mapel.localeCompare(b.mapel);
          return a.topik.localeCompare(b.topik);
        });

        // 2. Prepare headers
        const headerRow1 = ['No', 'ID Siswa', 'NISN', 'NIS', 'Nama Siswa'];
        lvlCols.forEach(c => headerRow1.push(c.kategori));

        const headerRow2 = ['', '', '', '', ''];
        lvlCols.forEach(c => headerRow2.push(c.kategori === 'Kejuruan' ? `${c.mapel} (${c.topik})` : c.mapel));

        // 3. Prepare Data
        const dataRows = siswa.map((item, index) => {
          const row = [index + 1, item.ID_Siswa, item.NISN || '-', item.NIS || '-', item.Nama_Siswa];
          lvlCols.forEach(c => {
            const val = getDisplayedNilai(item.ID_Siswa, c.kategori, c.mapel, c.topik);
            row.push(val || 0);
          });
          return row;
        });

        const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);

        // 4. Merges
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // No
          { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // ID
          { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // NISN
          { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // NIS
          { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }  // Nama
        ];

        let currentCol = 5;
        const categories = Array.from(new Set(lvlCols.map(c => c.kategori)));
        categories.forEach(kat => {
          const katCols = lvlCols.filter(c => c.kategori === kat).length;
          if (katCols > 1) {
            ws['!merges'].push({ s: { r: 0, c: currentCol }, e: { r: 0, c: currentCol + katCols - 1 } });
          }
          currentCol += katCols;
        });

        XLSX.utils.book_append_sheet(wb, ws, `Kelas ${lvl}`);
      });

      const fileName = `Leger_${new Date().getTime()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast('Berhasil mengekspor Leger kelas X, XI, dan XII.', 'success');
    } catch (error) {
      console.error('Export Excel Error:', error);
      showToast('Gagal mengekspor ke Excel.', 'error');
    }
  };

  const handleDownloadTemplate = () => {
    if (siswa.length === 0 || columns.length === 0) {
      showToast('Konfigurasi Mapel dulu sebelum unduh template', 'warning');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Headers
      const h1 = ['No', 'ID Siswa', 'NISN', 'NIS', 'Nama Siswa', ...columns.map(c => c.kategori)];
      const h2 = ['', '', '', '', '', ...columns.map(c => c.kategori === 'Kejuruan' ? `${c.mapel} (${c.topik})` : c.mapel)];
      const data = siswa.map((s, i) => [i + 1, s.ID_Siswa, s.NISN || '-', s.NIS || '-', s.Nama_Siswa, ...columns.map(() => '')]);

      const ws = XLSX.utils.aoa_to_sheet([h1, h2, ...data]);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
        { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
        { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
        { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Template Leger');
      XLSX.writeFile(wb, `Template_Leger_${jenjang}_${semester}.xlsx`);
      showToast('Template berhasil diunduh.', 'success');
    } catch (e) {
      showToast('Gagal membuat template.', 'error');
    }
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 3) throw new Error('Format file tidak valid');

        const newDraft = { ...draftNilai };
        let importCount = 0;

        // Iterate students (starts from row 3)
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          const idSiswa = row[1]; // ID_Siswa is at index 1
          if (!idSiswa) continue;

          // Process each column starting from index 5
          columns.forEach((col, colIdx) => {
            const val = row[colIdx + 5]; // Value starts at index 5
            if (val !== undefined && val !== null && val !== '') {
              const key = `${idSiswa}_${col.kategori}_${col.mapel}_${col.topik}`;
              newDraft[key] = val.toString();
              importCount++;
            }
          });
        }

        setDraftNilai(newDraft);
        showToast(`Berhasil mengimpor ${importCount} nilai dari Excel.`, 'success');
      } catch (err) {
        console.error('Import error:', err);
        showToast('Gagal membaca file. Pastikan menggunakan template yang benar.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Clean input
  };

  return (
    <div className="space-y-6 animate-fade-in print:space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daftar Kumpulan Nilai (Leger)</h2>
          <p className="text-sm text-slate-500">Kelola dan input nilai Akademik & Kejuruan siswa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
            <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Unduh Template Excel">
              <Download className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Template</span>
            </button>
            
            <div className="relative group">
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="absolute inset-0 opacity-0 cursor-pointer z-10" title="Impor Nilai dari Excel" />
              <button className="flex items-center gap-2 px-3 py-2 text-slate-600 group-hover:text-emerald-600 group-hover:bg-emerald-50 rounded-lg transition-all">
                <FileUp className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Impor Nilai</span>
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

            <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-[#008647] hover:bg-emerald-50 rounded-lg transition-all" title="Ekspor Leger ke Excel">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Ekspor Leger</span>
            </button>
          </div>

          <button onClick={handleSave} disabled={!isChanged || saving} className="btn-primary flex justify-center items-center gap-2 px-6">
            <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Petunjuk Pengisian */}
      <PageGuide 
        title="Petunjuk Pengisian Leger:"
        steps={[
          'Pilih <span class="font-black">Jenjang dan Semester</span> terlebih dahulu untuk memfilter data.',
          'Klik <span class="font-black">+ Tambah Kolom Mapel</span> atau <span class="font-black">Terapkan Susunan Mapel</span> jika mata pelajaran belum tersedia.',
          'Masukkan nilai langsung pada kolom (<span class="font-black italic">0-100</span>). Kolom baru/diedit akan berwarna <span class="text-amber-700 font-bold">Kuning</span>.',
          'Arahkan kursor ke judul kolom baru untuk <span class="font-black">Mengubah nama</span> atau <span class="font-black">Menghapus</span> kolom draf tersebut.',
          'Pastikan klik <span class="font-black">Simpan Perubahan</span> agar nilai tersimpan permanen ke database Google Sheets.'
        ]}
      />

      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold uppercase underline">Daftar Kumpulan Nilai</h1>
        <p className="text-sm">Kelas: {user?.managedClass || '-'} | Sem: {semester} | Jenjang: {jenjang}</p>
        <p className="text-sm">Wali Kelas: {user?.name || '-'}</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-4 items-end bg-emerald-50/50 print:hidden border border-emerald-100">
        <div>
          <label className="block text-xs font-semibold text-emerald-900 mb-1">Jenjang</label>
          <select value={jenjang} onChange={e => setJenjang(e.target.value)} className="input-field py-1.5 px-3 min-w-[100px]">
            <option value="X">Kelas X</option>
            <option value="XI">Kelas XI</option>
            <option value="XII">Kelas XII</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-emerald-900 mb-1">Semester</label>
          <select value={semester} onChange={e => setSemester(e.target.value)} className="input-field py-1.5 px-3 min-w-[120px]">
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>

        <div className="flex-1" />

        {showAddMapel ? (
          <div className="flex items-end gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kategori</label>
              <select value={newKategori} onChange={e => setNewKategori(e.target.value)} className="input-field py-1 px-2 text-sm max-w-[120px]">
                <option value="Umum">Umum</option>
                <option value="Kejuruan">Kejuruan</option>
                <option value="Pilihan">Pilihan</option>
                <option value="Muatan Lokal">Muatan Lokal</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama Mapel</label>
              <input placeholder="Cth: Matematika" value={newMapel} onChange={e => setNewMapel(e.target.value)} className="input-field py-1 px-2 text-sm max-w-[150px]" />
            </div>
            {newKategori === 'Produktif' && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Topik</label>
                <input placeholder="Cth: Web Design" value={newTopik} onChange={e => setNewTopik(e.target.value)} className="input-field py-1 px-2 text-sm max-w-[150px]" />
              </div>
            )}
            <button onClick={handleAddMapel} className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors">
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={() => setShowAddMapel(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium">Batal</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleApplyTemplate} className="btn-secondary flex items-center gap-2 border-dashed border-2 bg-white !text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 shadow-sm" title="Terapkan susunan mapel sesuai lampiran">
               <BookOpen className="w-4 h-4" /> Terapkan Susunan Mapel
            </button>
            <button onClick={() => setShowAddMapel(true)} className="btn-secondary flex items-center gap-2 border-dashed border-2 bg-white !text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 shadow-sm">
              <Plus className="w-4 h-4" /> Tambah Kolom Manual
            </button>
          </div>
        )}
      </div>

      <div className="card p-0 md:p-6 print:p-0 overflow-hidden print:shadow-none print:border-none">
        {siswa.length === 0 ? (
          <EmptyState
            title="Siswa Kosong"
            description="Tambahkan siswa terlebih dahulu di Master Siswa."
            icon={BookOpen}
          />
        ) : columns.length === 0 ? (
          <EmptyState
            title="Mapel Belum Dikonfigurasi"
            description={`Belum ada mata pelajaran untuk Jenjang ${jenjang} Semester ${semester}. Silakan tambah Kolom Mapel terlebih dahulu.`}
            icon={BookOpen}
          />
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse text-sm print:text-xs">
              <thead>
                <tr className="bg-emerald-50 text-emerald-900 border-b border-emerald-200 print:bg-gray-100 print:text-black">
                  <th className="p-2 border print:border-black font-bold text-center w-8 text-[11px] uppercase tracking-wider" rowSpan={2}>No</th>
                  <th className="p-2 border print:border-black font-bold text-center w-14 text-[10px] uppercase tracking-wider hidden md:table-cell" rowSpan={2}>Ket.</th>
                  <th className="p-2 border print:border-black font-bold min-w-[150px] text-[11px] uppercase tracking-wider" rowSpan={2}>Nama Siswa</th>
                  {/* Group headers by Kategori -> Mapel */}
                  {Array.from(new Set(columns.map(c => c.kategori))).map(kat => {
                    const kCols = columns.filter(c => c.kategori === kat);
                    return <th key={kat} colSpan={kCols.length} className="p-2 border print:border-black font-bold text-center text-[10px] uppercase bg-emerald-100/50 tracking-widest">{kat}</th>
                  })}
                </tr>
                <tr className="bg-emerald-50 text-emerald-900 border-b border-emerald-200 print:bg-gray-100 print:text-black">
                  {columns.map((c, i) => {
                    const isNew = addedColumns.some(ac => ac.kategori === c.kategori && ac.mapel === c.mapel && ac.topik === c.topik);
                    return (
                      <th key={i} className={`p-2 border print:border-black font-semibold text-center align-top min-w-[100px] group relative ${isNew ? 'bg-emerald-50/50' : ''}`}>
                        <div className="flex flex-col h-full justify-between items-center gap-1">
                          <div className="text-[11px] text-slate-800 leading-tight pr-5">{c.mapel}</div>
                          {c.topik && <div className="text-[9px] text-slate-500 font-normal max-w-[80px] mx-auto truncate" title={c.topik}>{c.topik}</div>}

                          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                            <button onClick={() => startEdit(c)} className="p-1 hover:bg-emerald-100 rounded text-emerald-600 transition-colors" title="Edit Nama/Topik">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {isNew && (
                              <button onClick={() => handleDeleteMapel(c)} className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors" title="Hapus Draft">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        {isNew && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full m-1" title="Kolom Baru (Belum Disimpan)" />}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {siswa.map((item, index) => (
                  <tr key={item.ID_Siswa || index} className="border-b border-slate-100 hover:bg-slate-50 print:border-black transition-colors">
                    <td className="p-2 border print:border-black text-center text-slate-500 text-xs">{index + 1}</td>
                    <td className="p-1 border print:border-black text-slate-500 text-center hidden md:table-cell">
                      <div className="text-[10px] font-mono leading-none">{item.ID_Siswa}</div>
                      <div className="text-[9px] opacity-40 leading-none mt-1">{item.NISN || '-'}</div>
                    </td>
                    <td className="p-2 border print:border-black font-medium text-slate-800">{item.Nama_Siswa}</td>
                    {columns.map((c, i) => {
                      const val = getDisplayedNilai(item.ID_Siswa, c.kategori, c.mapel, c.topik);
                      return (
                        <td key={i} className={`p-1 border print:border-black text-center ${draftNilai[`${item.ID_Siswa}_${c.kategori}_${c.mapel}_${c.topik}`] !== undefined ? 'bg-amber-50' : ''}`}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full text-center bg-transparent focus:bg-white border focus:border-emerald-300 rounded outline-none p-1 text-sm font-semibold text-slate-700 placeholder:text-slate-200 transition-colors"
                            value={val}
                            onChange={e => handleNilaiChange(item.ID_Siswa, c.kategori, c.mapel, c.topik, e.target.value)}
                            placeholder="-"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Column Modal */}
      {editingCol && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
              <h3 className="font-bold text-emerald-900">Ubah Nama Mata Pelajaran</h3>
              <button onClick={() => setEditingCol(null)} className="p-1 hover:bg-emerald-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-emerald-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Mapel</label>
                <input
                  value={editValues.mapel}
                  onChange={e => setEditValues({ ...editValues, mapel: e.target.value })}
                  className="input-field"
                  placeholder="Cth: Matematika"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Topik (Opsional)</label>
                <input
                  value={editValues.topik}
                  onChange={e => setEditValues({ ...editValues, topik: e.target.value })}
                  className="input-field"
                  placeholder="Cth: Aljabar / Sesuai Kurikulum"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button onClick={() => setEditingCol(null)} className="btn-secondary flex-1 py-2 text-sm">Batal</button>
                <button onClick={handleUpdateMapel} className="btn-primary flex-1 py-2 text-sm">Perbarui</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
