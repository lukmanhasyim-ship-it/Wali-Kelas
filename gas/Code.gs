/**
 * API Serverless Wali Kelas - Google Apps Script
 * Deploy as Web App, set "Execute as: Me" and "Who has access: Anyone".
 */


function formatDateValue(value, header) {
  if (value instanceof Date) {
    if (header === 'Timestamp_Pagi' || header === 'Timestamp_Siang' || header === 'Created_At' || header === 'Processed_At' || header === 'Timestamp') {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    }
    var month = '' + (value.getMonth() + 1);
    var day = '' + value.getDate();
    var year = value.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  }
  return value;
}

function buildHeaderIndex(headers) {
  var index = {};
  for (var i = 0; i < headers.length; i++) {
    index[headers[i]] = i;
  }
  return index;
}

function doGet(e) {
  return handleResponse(e);
}

function doPost(e) {
  return handleResponse(e);
}

function handleResponse(e) {
  try {
    var params = JSON.parse(e.postData.contents || '{}');
    var action = params.action;
    var payload = params.payload;

    var actions = {
      GET_ALL: function() {
        return { status: 'success', data: readData(payload && payload.sheet) };
      },
      CREATE: function() {
        var created = appendData(payload && payload.sheet, payload && payload.data);
        // Otomatis buat notifikasi jika transaksi keuangan (Pembayaran Kas)
        if (payload && payload.sheet === 'Keuangan' && payload.data.Tipe === 'Masuk') {
          try {
            var student = readData('Master_Siswa').find(function(s) { 
              return s.NISN.toString() === payload.data.NISN.toString(); 
            });
            if (student && student.Email) {
              createNotification(
                'Pembayaran berhasil sebesar Rp ' + Number(payload.data.Jumlah).toLocaleString('id-ID') + ' (' + payload.data.Keterangan + ')', 
                'success', 
                'Siswa', 
                student.Email
              );
            }
          } catch (e) {
            Logger.log('Gagal membuat notifikasi keuangan: ' + e.toString());
          }
        }
        return { status: 'success', data: created };
      },
      UPDATE: function() {
        return { status: 'success', data: updateData(payload && payload.sheet, payload && payload.id, payload && payload.data) };
      },
      BULK_UPDATE_PRESENSI: function() {
        return { status: 'success', data: bulkUpdatePresensi(payload && payload.data) };
      },
      BULK_UPDATE_NILAI: function() {
        return { status: 'success', data: bulkUpdateNilai(payload && payload.data) };
      },
      BULK_UPDATE_MASTER_HISTORY: function() {
        return { status: 'success', data: bulkUpdateMasterHistory(payload && payload.data) };
      },
      LOGIN_WALI: function() {
        return { status: 'success', data: loginWali(payload && payload.email) };
      },
      GET_PROFILE_WALI: function() {
        return { status: 'success', data: getProfileWali(payload && payload.email) };
      },

      GET_NOTIFICATIONS: function() {
        return { status: 'success', data: getNotifications(payload && payload.role, payload && payload.email) };
      },
      MARK_NOTIF_READ: function() {
        return { status: 'success', data: updateData('Notifikasi', payload && payload.id, { Is_Read: 'true' }) };
      },
      DELETE_NOTIF: function() {
        return { status: 'success', data: deleteNotification(payload && payload.id) };
      },
      BULK_CREATE: function() {
        var results = [];
        if (payload && payload.data && Array.isArray(payload.data)) {
          payload.data.forEach(function(item) {
            results.push(appendData(payload.sheet, item));
          });
        }
        return { status: 'success', data: results };
      },
      DELETE: function() {
        return { status: 'success', data: deleteData(payload && payload.sheet, payload && payload.id) };
      },
      RUN_MANUAL_ARCHIVE: function() {
        return { status: 'success', data: runMonthlyArchive(payload && payload.month) };
      },
      SETUP_TRIGGERS: function() {
        return { status: 'success', data: setupArchiveTriggers() };
      },
      RESET_DATABASE: function() {
        return { status: 'success', data: resetDatabase(payload && payload.email) };
      }
    };

    var result = actions[action]
      ? actions[action]()
      : { status: 'error', message: 'Unknown action: ' + action };

    var output = ContentService.createTextOutput(JSON.stringify(result));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function readData(sheetName) {
  sheetName = (sheetName || '').toString();
  if (!sheetName) return [];

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Only headers

  var headers = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
      
      // Auto format JS Date to YYYY-MM-DD, except for timestamp columns
      if (headers[j] !== 'Timestamp_Pagi' && headers[j] !== 'Timestamp_Siang' && obj[headers[j]] instanceof Date) {
        var d = obj[headers[j]];
        var month = '' + (d.getMonth() + 1);
        var day = '' + d.getDate();
        var year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        obj[headers[j]] = [year, month, day].join('-');
      }
    }
    result.push(obj);
  }
  return result;
}

function ensureHeaders(sheet, dataObj) {
  var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headersToAdd = [];
  for (var key in dataObj) {
    if (dataObj.hasOwnProperty(key) && existingHeaders.indexOf(key) === -1) {
      headersToAdd.push(key);
    }
  }
  if (headersToAdd.length > 0) {
    sheet.getRange(1, existingHeaders.length + 1, 1, headersToAdd.length).setValues([headersToAdd]);
  }
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function appendData(sheetName, dataObj) {
  sheetName = (sheetName || '').toString();
  if (!sheetName || !dataObj) throw new Error('Sheet name dan data harus diisi.');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(Object.keys(dataObj));
  }

  ensureHeaders(sheet, dataObj);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Add Timestamp for Presensi sheet
  if (sheetName === 'Presensi') {
    // Use formatDateValue to ensure string consistency
    if (dataObj.Status_Pagi) {
      dataObj.Timestamp_Pagi = formatDateValue(new Date(), 'Timestamp_Pagi');
    }
    if (dataObj.Status_Siang) {
      dataObj.Timestamp_Siang = formatDateValue(new Date(), 'Timestamp_Siang');
    }
  }

  var rowData = headers.map(function(header) {
    var value = dataObj[header];
    return value !== undefined && value !== null ? formatDateValue(value, header) : '';
  });

  sheet.appendRow(rowData);
  return dataObj;
}

function updateData(sheetName, id, updateObj) {
  sheetName = (sheetName || '').toString();
  if (!sheetName || id === undefined || id === null || !updateObj) return false;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return false;

  ensureHeaders(sheet, updateObj);

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  var headers = data[0];
  var headerMap = buildHeaderIndex(headers);
  var pkIndex = 0;

  if (sheetName === 'Presensi' && updateObj.Status_Siang) {
    updateObj.Timestamp_Siang = formatDateValue(new Date(), 'Timestamp_Siang');
  }

  for (var i = 1; i < data.length; i++) {
    if (data[i][pkIndex].toString() === id.toString()) {
      for (var key in updateObj) {
        if (updateObj.hasOwnProperty(key) && headerMap.hasOwnProperty(key)) {
          var colIndex = headerMap[key];
          sheet.getRange(i + 1, colIndex + 1).setValue(formatDateValue(updateObj[key], key));
        }
      }
      return true;
    }
  }
  return false;
}


function deleteData(sheetName, id) {
  sheetName = (sheetName || '').toString();
  if (!sheetName || id === undefined || id === null) return false;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return false;

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  var pkIndex = 0; // PK is usually first column

  for (var i = 1; i < data.length; i++) {
    if (data[i][pkIndex].toString() === id.toString()) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function bulkUpdatePresensi(dataList) {
  if (!dataList || !Array.isArray(dataList)) throw new Error('Data harus berupa array.');
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var studentsData = readData('Master_Siswa'); // Prefetch student emails
  var sheet = ss.getSheetByName('Presensi');
  if (!sheet) {
    sheet = ss.insertSheet('Presensi');
    sheet.appendRow(['ID_Presensi', 'Tanggal', 'NISN', 'Status_Pagi', 'Status_Siang', 'Keterangan', 'Timestamp_Pagi', 'Timestamp_Siang']);
  }

  var fullData = sheet.getDataRange().getValues();
  var headers = fullData[0];
  var headerMap = buildHeaderIndex(headers);
  var dateIdx = headerMap['Tanggal'];
  var idSiswaIdx = headerMap['ID_Siswa'] !== undefined ? headerMap['ID_Siswa'] : headerMap['NISN'];
  if (idSiswaIdx === undefined) throw new Error('Kolom identitas (ID_Siswa/NISN) tidak ditemukan di sheet Presensi.');

  // Map to find row by composite key (Tanggal + ID)
  var keyToRowMap = {};
  for (var i = 1; i < fullData.length; i++) {
    var dateVal = formatDateValue(fullData[i][dateIdx], 'Tanggal');
    var idVal = (fullData[i][idSiswaIdx] || '').toString();
    if (idVal) keyToRowMap[dateVal + '_' + idVal] = i;
  }

  var now = new Date();
  var newRows = [];

  dataList.forEach(function(item) {
    var itemDate = formatDateValue(item.Tanggal, 'Tanggal');
    var itemId = (item.ID_Siswa || item.NISN || '').toString();
    if (!itemId) return;
    var key = itemDate + '_' + itemId;
    var rowIdx = keyToRowMap[key];

    if (rowIdx !== undefined) {
      // Get old status to check for changes
      var oldStatusPagi = (fullData[rowIdx][headerMap['Status_Pagi']] || '').toString();
      var oldStatusSiang = (fullData[rowIdx][headerMap['Status_Siang']] || '').toString();

      // Update existing row in fullData array
      for (var keyAttr in item) {
        if (item.hasOwnProperty(keyAttr) && headerMap.hasOwnProperty(keyAttr)) {
          var colIdx = headerMap[keyAttr];
          fullData[rowIdx][colIdx] = formatDateValue(item[keyAttr], keyAttr);
        }
      }
      // Timestamps - Only update if status CHANGED and is NOT empty
      if (item.Status_Pagi && item.Status_Pagi.toString() !== oldStatusPagi && headerMap.hasOwnProperty('Timestamp_Pagi')) {
          fullData[rowIdx][headerMap['Timestamp_Pagi']] = formatDateValue(now, 'Timestamp_Pagi');
      }
      if (item.Status_Siang && item.Status_Siang.toString() !== oldStatusSiang && headerMap.hasOwnProperty('Timestamp_Siang')) {
          fullData[rowIdx][headerMap['Timestamp_Siang']] = formatDateValue(now, 'Timestamp_Siang');
      }
    } else {
      // Prepare new row
      var newRow = headers.map(function(h) { return ''; });
      for (var keyAttr in item) {
        if (item.hasOwnProperty(keyAttr) && headerMap.hasOwnProperty(keyAttr)) {
          newRow[headerMap[keyAttr]] = formatDateValue(item[keyAttr], keyAttr);
        }
      }
      // Timestamps for new row
      if (item.Status_Pagi && headerMap.hasOwnProperty('Timestamp_Pagi')) {
          newRow[headerMap['Timestamp_Pagi']] = formatDateValue(now, 'Timestamp_Pagi');
      }
      if (item.Status_Siang && headerMap.hasOwnProperty('Timestamp_Siang')) {
          newRow[headerMap['Timestamp_Siang']] = formatDateValue(now, 'Timestamp_Siang');
      }
      newRows.push(newRow);
    }

    // --- INTEGRASI NOTIFIKASI ---
    try {
      var student = studentsData.find(function(s) { 
        return s.ID_Siswa.toString() === item.ID_Siswa.toString(); 
      });
      
      if (student && student.Email) {
        var statusMsg = '';
        var currentStatus = item.Status_Pagi || item.Status_Siang;
        var studentName = student.Nama_Siswa || 'Siswa';
        
        if (currentStatus === 'S') {
          statusMsg = 'Hallo, saya melihat ' + studentName + ' sedang sakit. Kami sekelas berharap kamu segera kembali sehat dan bersama-sama belajar. Semoga ' + studentName + ' lekas sembuh.';
        } else if (item.Status_Pagi) {
          statusMsg = 'Absensi Pagi telah dicatat: ' + item.Status_Pagi;
        } else if (item.Status_Siang) {
          statusMsg = 'Absensi Siang telah dicatat: ' + item.Status_Siang;
        }

        if (statusMsg) {
          createNotification(
            statusMsg, 
            currentStatus === 'H' ? 'success' : (currentStatus === 'S' ? 'info' : 'info'), 
            'Siswa', 
            student.Email
          );
        }
      }
    } catch (e) {
      Logger.log('Gagal membuat notifikasi absensi: ' + e.toString());
    }
    // ----------------------------
  });

  // Write back updated data
  if (fullData.length > 1) {
    sheet.getRange(1, 1, fullData.length, headers.length).setValues(fullData);
  }
  
  // Append new rows
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  }

  return true;
}

function bulkUpdateNilai(dataList) {
  if (!dataList || !Array.isArray(dataList)) throw new Error('Data harus berupa array.');
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Daftar_Nilai');
  if (!sheet) {
    sheet = ss.insertSheet('Daftar_Nilai');
    sheet.appendRow(['ID_Nilai', 'ID_Siswa', 'Jenjang', 'Semester', 'Kategori_Mapel', 'Nama_Mapel', 'Topik', 'Nilai', 'Timestamp']);
  }

  var fullData = sheet.getDataRange().getValues();
  var headers = fullData[0];
  var headerMap = buildHeaderIndex(headers);
  var idSiIdx = headerMap['ID_Siswa'] !== undefined ? headerMap['ID_Siswa'] : headerMap['NISN'];
  if (idSiIdx === undefined) throw new Error('Kolom identitas (ID_Siswa/NISN) tidak ditemukan di sheet Daftar_Nilai.');

  var semesterIdx = headerMap['Semester'];
  var mapelIdx = headerMap['Nama_Mapel'];
  var topikIdx = headerMap['Topik'];

  // Map to find row by composite key
  var keyToRowMap = {};
  for (var i = 1; i < fullData.length; i++) {
    var idVal = (fullData[i][idSiIdx] || '').toString();
    if (!idVal) continue;
    var semVal = (fullData[i][semesterIdx] || '').toString();
    var mapelVal = (fullData[i][mapelIdx] || '').toString();
    var topikVal = (fullData[i][topikIdx] || '').toString();
    keyToRowMap[idVal + '_' + semVal + '_' + mapelVal + '_' + topikVal] = i;
  }

  var now = new Date();
  var newRows = [];

  dataList.forEach(function(item) {
    var idVal = (item.ID_Siswa || item.NISN || '').toString();
    if (!idVal) return;
    var semVal = (item.Semester || '').toString();
    var mapelVal = (item.Nama_Mapel || '').toString();
    var topikVal = (item.Topik || '').toString();
    var key = idVal + '_' + semVal + '_' + mapelVal + '_' + topikVal;
    
    // Skip if no grade
    if (item.Nilai === undefined || item.Nilai === null || item.Nilai === '') return;
    
    var rowIdx = keyToRowMap[key];

    if (rowIdx !== undefined) {
      // Update existing
      for (var keyAttr in item) {
        if (item.hasOwnProperty(keyAttr) && headerMap.hasOwnProperty(keyAttr)) {
          var colIdx = headerMap[keyAttr];
          fullData[rowIdx][colIdx] = formatDateValue(item[keyAttr], keyAttr);
        }
      }
      if (headerMap.hasOwnProperty('Timestamp')) {
          fullData[rowIdx][headerMap['Timestamp']] = formatDateValue(now, 'Timestamp');
      }
    } else {
      // Prepare new row
      var newRow = headers.map(function(h) { return ''; });
      for (var keyAttr in item) {
        if (item.hasOwnProperty(keyAttr) && headerMap.hasOwnProperty(keyAttr)) {
          newRow[headerMap[keyAttr]] = formatDateValue(item[keyAttr], keyAttr);
        }
      }
      if (headerMap.hasOwnProperty('Timestamp')) {
          newRow[headerMap['Timestamp']] = formatDateValue(now, 'Timestamp');
      }
      if (headerMap.hasOwnProperty('ID_Nilai') && !newRow[headerMap['ID_Nilai']]) {
          newRow[headerMap['ID_Nilai']] = 'N' + new Date().getTime() + Math.random().toString(36).substr(2, 5);
      }
      newRows.push(newRow);
    }
  });

  if (fullData.length > 1) {
    sheet.getRange(1, 1, fullData.length, headers.length).setValues(fullData);
  }
  
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  }

  return true;
}

function bulkUpdateMasterHistory(dataList) {
  if (!dataList || !Array.isArray(dataList)) throw new Error('Data harus berupa array.');
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Master_Siswa');
  if (!sheet) return false;

  var fullData = sheet.getDataRange().getValues();
  var headers = fullData[0];
  var headerMap = buildHeaderIndex(headers);
  var idIdx = headerMap['ID_Siswa'] !== undefined ? headerMap['ID_Siswa'] : headerMap['NISN'];
  if (idIdx === undefined) throw new Error('Kolom identitas (ID_Siswa/NISN) tidak ditemukan di sheet Master_Siswa.');

  // Map to find row by identity column
  var idToRowMap = {};
  for (var i = 1; i < fullData.length; i++) {
    var idVal = (fullData[i][idIdx] || '').toString();
    if (idVal) idToRowMap[idVal] = i;
  }

  dataList.forEach(function(item) {
    var idVal = (item.ID_Siswa || item.NISN || '').toString();
    if (!idVal) return;
    var rowIdx = idToRowMap[idVal];

    if (rowIdx !== undefined) {
      for (var keyAttr in item) {
        if (item.hasOwnProperty(keyAttr) && headerMap.hasOwnProperty(keyAttr) && keyAttr !== 'ID_Siswa' && keyAttr !== 'NISN') {
          var colIdx = headerMap[keyAttr];
          sheet.getRange(rowIdx + 1, colIdx + 1).setValue(formatDateValue(item[keyAttr], keyAttr));
        }
      }
    }
  });

  return true;
}

function loginWali(email) {
  if (!email) throw new Error('Email harus diisi.');
  var wali = readData('Profil_Wali_Kelas').find(function(item) {
    return item.Email && item.Email.toString().toLowerCase() === email.toString().toLowerCase();
  });
  if (!wali) throw new Error('Email wali kelas tidak ditemukan.');
  return wali;
}

function getProfileWali(email) {
  return loginWali(email);
}



function getNotifications(role, email) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Notifikasi');
  if (!sheet) {
    sheet = ss.insertSheet('Notifikasi');
    sheet.appendRow(['ID', 'Message', 'Type', 'Target_Role', 'Target_Email', 'Is_Read', 'Timestamp']);
    createNotification('Selamat datang di SISWA.HUB! Sistem manajemen kelas digital Anda sudah siap digunakan.', 'success', 'ALL');
  }

  var all = readData('Notifikasi');
  if (!all) return [];

  return all.filter(function(n) {
    // Check role match
    var nRole = (n.Target_Role || 'ALL').toString().toUpperCase();
    var uRole = (role || 'SISWA').toString().toUpperCase();
    var roleMatch = nRole === 'ALL' || nRole === uRole;

    // Check email match
    var nEmail = (n.Target_Email || '').toString().toLowerCase();
    var uEmail = (email || '').toString().toLowerCase();
    var emailMatch = nEmail === '' || nEmail === uEmail;

    return roleMatch && emailMatch;
  }).sort(function(a, b) {
    return new Date(b.Timestamp) - new Date(a.Timestamp);
  }).slice(0, 30);
}

function createNotification(message, type, targetRole, targetEmail) {
  var row = {
    ID: new Date().getTime().toString(),
    Message: message,
    Type: type || 'info', // info, success, alert
    Target_Role: targetRole || 'ALL',
    Target_Email: targetEmail || '',
    Is_Read: 'false',
    Timestamp: new Date()
  };
  appendData('Notifikasi', row);
  return row;
}

function deleteNotification(id) {
  if (!id) return false;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Notifikasi');
  if (!sheet) return false;

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) { 
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}



function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var master = ss.insertSheet('Master_Siswa');
  master.appendRow(['ID_Siswa', 'NISN', 'NIS', 'Nama_Siswa', 'L/P', 'Tempat_Lahir', 'Tanggal_Lahir', 'Email', 'Jabatan', 'No_WA_Siswa', 'Nama_Wali', 'No_WA_Wali', 'Alamat', 'Latitude', 'Longitude', 'Lokasi', 'Status_Aktif', 'Keterangan', 'Tanggal_Masuk_X', 'Tanggal_Naik_XI', 'Tanggal_Naik_XII', 'Tanggal_Tamat_Sekolah']);
  
  var presensi = ss.insertSheet('Presensi');
  presensi.appendRow(['ID_Presensi', 'Tanggal', 'ID_Siswa', 'Status_Pagi', 'Status_Siang', 'Keterangan', 'Timestamp_Pagi', 'Timestamp_Siang']);
  
  var keuangan = ss.insertSheet('Keuangan');
  keuangan.appendRow(['ID_Transaksi', 'Tanggal', 'ID_Siswa', 'Tipe', 'Jumlah', 'Keterangan', 'Timestamp']);

  var daftarNilai = ss.insertSheet('Daftar_Nilai');
  daftarNilai.appendRow(['ID_Nilai', 'ID_Siswa', 'Jenjang', 'Semester', 'Kategori_Mapel', 'Nama_Mapel', 'Topik', 'Nilai', 'Timestamp']);
  
  var panggilan = ss.insertSheet('Log_Panggilan');
  panggilan.appendRow(['ID_Panggilan', 'Tanggal', 'ID_Siswa', 'Kategori', 'Alasan', 'Hasil_Pertemuan', 'Status_Selesai']);
  
  var profil = ss.insertSheet('Profil_Wali_Kelas');
  profil.appendRow(['Id_Wali', 'Nama', 'Email', 'Kelas', 'Bio', 'Gaya_Ajar', 'Kontak', 'Created_At']);
  
  var queue = ss.insertSheet('Queue_Chat');
  queue.appendRow(['ID_Queue', 'Email', 'ID_Siswa', 'Student_Name', 'Query', 'Attendance_Detail', 'Summary', 'Status', 'Response', 'Created_At', 'Processed_At']);
  
  var catatan = ss.insertSheet('Catatan_Siswa');
  catatan.appendRow(['ID_Siswa', 'Nama_Siswa', 'Tanggal', 'Ringkasan_AI', 'Tindak_Lanjut', 'Created_By']);

  var lokasi = ss.insertSheet('Lokasi');
  lokasi.appendRow(['ID_Lokasi', 'Nama_Lokasi', 'Deskripsi', 'Alamat', 'Latitude', 'Longitude', 'Lokasi', 'Created_By', 'Created_By_Email', 'Created_At']);

  var notif = ss.insertSheet('Notifikasi');
  notif.appendRow(['ID', 'Message', 'Type', 'Target_Role', 'Target_Email', 'Is_Read', 'Timestamp']);
  
  // Seed initial notification
  createNotification('Selamat datang di SISWA.HUB! Sistem manajemen kelas digital Anda sudah siap digunakan.', 'success', 'ALL');
}

/**
 * LOGIKA PENGARSIPAN OTOMATIS & MUTASI KAS
 */

function setupArchiveTriggers() {
  // Hapus trigger lama jika ada
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runMonthlyArchive') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Buat trigger baru setiap tanggal 1 jam 01:00 pagi (untuk mengarsip bulan sebelumnya)
  ScriptApp.newTrigger('runMonthlyArchive')
    .timeBased()
    .onMonthDay(1)
    .atHour(1)
    .create();
    
  return "Trigger pengarsipan otomatis berhasil disetup untuk tanggal 1 setiap bulan.";
}

function runMonthlyArchive(targetMonth) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = new Date();
  
  // Jika tidak ada targetMonth, gunakan bulan sebelumnya
  if (!targetMonth) {
    var lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    targetMonth = Utilities.formatDate(lastMonthDate, Session.getScriptTimeZone(), "yyyy-MM");
  }
  
  try {
    ensureArchiveSheets(ss);
    
    var resAbsensi = archiveAbsensi(ss, targetMonth);
    var resKeuangan = archiveKeuangan(ss, targetMonth);
    
    createNotification('Pengarsipan otomatis bulan ' + targetMonth + ' berhasil dilakukan.', 'success', 'Wali');
    
    return {
      month: targetMonth,
      absensi: resAbsensi,
      keuangan: resKeuangan
    };
  } catch (e) {
    createNotification('Gagal melakukan pengarsipan otomatis: ' + e.toString(), 'alert', 'Wali');
    throw e;
  }
}

function ensureArchiveSheets(ss) {
  if (!ss.getSheetByName('Archive_Rekap_Absensi')) {
    ss.insertSheet('Archive_Rekap_Absensi').appendRow(['ID_Siswa', 'Bulan', 'H', 'S', 'I', 'A', 'B']);
  }
  if (!ss.getSheetByName('Archive_Rekap_Keuangan')) {
    ss.insertSheet('Archive_Rekap_Keuangan').appendRow(['Bulan', 'Saldo_Awal', 'Total_Masuk', 'Total_Keluar', 'Saldo_Akhir']);
  }
  if (!ss.getSheetByName('Archive_Detail_Absensi')) {
    var template = ss.getSheetByName('Presensi');
    var headers = template ? template.getRange(1, 1, 1, template.getLastColumn()).getValues()[0] : ['ID_Presensi', 'Tanggal', 'ID_Siswa', 'Status_Pagi', 'Status_Siang', 'Keterangan', 'Timestamp_Pagi', 'Timestamp_Siang'];
    ss.insertSheet('Archive_Detail_Absensi').appendRow(headers);
  }
}

function archiveAbsensi(ss, monthStr) {
  var presensiSheet = ss.getSheetByName('Presensi');
  var rekapSheet = ss.getSheetByName('Archive_Rekap_Absensi');
  var detailSheet = ss.getSheetByName('Archive_Detail_Absensi');
  
  if (!presensiSheet) return 'Sheet Presensi tidak ditemukan.';
  if (!rekapSheet || !detailSheet) return 'Sheet Archive belum siap.';
  
  var lastRow = presensiSheet.getLastRow();
  if (lastRow <= 1) return 'Tidak ada data presensi untuk diarsip.';
  
  var data = presensiSheet.getRange(1, 1, lastRow, presensiSheet.getLastColumn()).getValues();
  var headers = data[0];
  var hMap = buildHeaderIndex(headers);
  var dateIdx = hMap['Tanggal'];
  var idIdx = hMap['ID_Siswa'] !== undefined ? hMap['ID_Siswa'] : hMap['NISN'];
  
  if (dateIdx === undefined) return 'Kolom Tanggal tidak ditemukan di sheet Presensi.';
  if (idIdx === undefined) return 'Kolom ID_Siswa/NISN tidak ditemukan di sheet Presensi.';
  
  var rekapMap = {}; // { studentId: { H, S, I, A, B } }
  var rowsToMove = [];
  var rowsToDelete = [];
  
  for (var i = 1; i < data.length; i++) {
    var rawDate = data[i][dateIdx];
    var rowMonth = '';
    if (rawDate instanceof Date) {
      rowMonth = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM');
    } else if (typeof rawDate === 'string' && rawDate.indexOf('-') > -1) {
      rowMonth = rawDate.substring(0, 7);
    }
    
    if (rowMonth !== monthStr) continue;
    
    var sId = (data[i][idIdx] || '').toString();
    if (!sId) continue;
    
    if (!rekapMap[sId]) rekapMap[sId] = { H: 0, S: 0, I: 0, A: 0, B: 0 };
    
    var sp = (data[i][hMap['Status_Pagi']] || '').toString().trim();
    var ssv = (data[i][hMap['Status_Siang']] || '').toString().trim();
    var combinedStatus = {};
    if (sp) combinedStatus[sp] = true;
    if (ssv) combinedStatus[ssv] = true;
    
    for (var st in combinedStatus) {
      if (rekapMap[sId][st] !== undefined) rekapMap[sId][st]++;
    }
    
    // Jika ada status tidak hadir, simpan detail barisnya
    if (combinedStatus['S'] || combinedStatus['I'] || combinedStatus['A'] || combinedStatus['B']) {
      rowsToMove.push(data[i]);
    }
    
    rowsToDelete.push(i + 1); // +1 karena row di Sheet adalah 1-indexed
  }
  
  if (rowsToDelete.length === 0) return 'Tidak ada data bulan ' + monthStr + ' di sheet Presensi.';

  // Simpan Rekap per siswa
  for (var sid in rekapMap) {
    rekapSheet.appendRow([
      sid, monthStr,
      rekapMap[sid].H, rekapMap[sid].S,
      rekapMap[sid].I, rekapMap[sid].A, rekapMap[sid].B
    ]);
  }
  
  // Simpan Detail Non-Hadir
  if (rowsToMove.length > 0) {
    detailSheet.getRange(detailSheet.getLastRow() + 1, 1, rowsToMove.length, headers.length).setValues(rowsToMove);
  }
  
  // Hapus dari sheet utama (dari bawah ke atas agar row index tidak bergeser)
  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    presensiSheet.deleteRow(rowsToDelete[j]);
  }
  
  return 'Berhasil mengarsip ' + rowsToDelete.length + ' baris absensi bulan ' + monthStr + '.';
}

function archiveKeuangan(ss, monthStr) {
  var keuanganSheet = ss.getSheetByName('Keuangan');
  var rekapSheet = ss.getSheetByName('Archive_Rekap_Keuangan');
  
  if (!keuanganSheet) return 'Sheet Keuangan tidak ditemukan.';
  if (!rekapSheet) return 'Sheet Archive_Rekap_Keuangan belum siap.';

  var lastRow = keuanganSheet.getLastRow();
  if (lastRow <= 1) {
    // Tidak ada transaksi, tetap simpan rekap dengan nilai 0
    var rekapDataEmpty = rekapSheet.getDataRange().getValues();
    var saldoAwalEmpty = rekapDataEmpty.length > 1 ? (Number(rekapDataEmpty[rekapDataEmpty.length - 1][4]) || 0) : 0;
    rekapSheet.appendRow([monthStr, saldoAwalEmpty, 0, 0, saldoAwalEmpty]);
    return 'Tidak ada transaksi bulan ' + monthStr + '. Rekap saldo disimpan.';
  }
  
  var data = keuanganSheet.getRange(1, 1, lastRow, keuanganSheet.getLastColumn()).getValues();
  var headers = data[0];
  var hMap = buildHeaderIndex(headers);

  if (hMap['Tanggal'] === undefined) return 'Kolom Tanggal tidak ditemukan di sheet Keuangan.';
  if (hMap['Tipe'] === undefined || hMap['Jumlah'] === undefined) return 'Kolom Tipe/Jumlah tidak ditemukan di sheet Keuangan.';
  
  var totalMasuk = 0;
  var totalKeluar = 0;
  var rowsToDelete = [];
  
  // Hitung Saldo Awal (Saldo Akhir dari rekap bulan terakhir)
  var rekapData = rekapSheet.getDataRange().getValues();
  var saldoAwal = 0;
  if (rekapData.length > 1) {
    saldoAwal = Number(rekapData[rekapData.length - 1][4]) || 0;
  }
  
  for (var i = 1; i < data.length; i++) {
    var rawDate = data[i][hMap['Tanggal']];
    var rowMonth = '';
    if (rawDate instanceof Date) {
      rowMonth = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM');
    } else if (typeof rawDate === 'string' && rawDate.indexOf('-') > -1) {
      rowMonth = rawDate.substring(0, 7);
    }
    
    if (rowMonth !== monthStr) continue;
    
    var tipe = (data[i][hMap['Tipe']] || '').toString().trim();
    var jumlah = Number(data[i][hMap['Jumlah']]) || 0;
    if (tipe === 'Masuk') totalMasuk += jumlah;
    else if (tipe === 'Keluar') totalKeluar += jumlah;
    
    rowsToDelete.push(i + 1);
  }
  
  var saldoAkhir = saldoAwal + totalMasuk - totalKeluar;
  
  // Simpan Rekap Mutasi
  rekapSheet.appendRow([monthStr, saldoAwal, totalMasuk, totalKeluar, saldoAkhir]);
  
  // Hapus baris lama dari bawah ke atas
  for (var k = rowsToDelete.length - 1; k >= 0; k--) {
    keuanganSheet.deleteRow(rowsToDelete[k]);
  }
  
  return 'Berhasil mutasi kas bulan ' + monthStr + '. Saldo Akhir: Rp ' + saldoAkhir.toLocaleString('id-ID');
}

/**
 * RESET DATABASE - Hapus semua record kecuali profile Wali Kelas
 */
function resetDatabase(requesterEmail) {
  if (!requesterEmail) throw new Error('Email pengirim harus disertakan.');
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    
    // Jangan hapus akun Wali Kelas
    if (name === 'Profil_Wali_Kelas') {
      return; 
    }
    
    // Hapus semua baris mulai dari baris ke-2 (menyisakan header)
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  });

  // Buat notifikasi baru setelah reset
  createNotification('Database telah direset sepenuhnya oleh ' + requesterEmail + '. Semua data siswa, transaksi, dan arsip telah dihapus.', 'alert', 'Wali Kelas', requesterEmail);
  
  return "Database berhasil direset. Seluruh records pada semua sheet telah dihapus, menyisakan header dan data Wali Kelas.";
}
