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
  var nisnIdx = headerMap['NISN'];

  // Map to find row by composite key (Tanggal + NISN)
  var keyToRowMap = {};
  for (var i = 1; i < fullData.length; i++) {
    var dateVal = formatDateValue(fullData[i][dateIdx], 'Tanggal');
    var nisnVal = fullData[i][nisnIdx].toString();
    keyToRowMap[dateVal + '_' + nisnVal] = i;
  }

  var now = new Date();
  var newRows = [];

  dataList.forEach(function(item) {
    var itemDate = formatDateValue(item.Tanggal, 'Tanggal');
    var itemNisn = item.NISN.toString();
    var key = itemDate + '_' + itemNisn;
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
        return s.NISN.toString() === item.NISN.toString(); 
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
  master.appendRow(['NISN', 'Nama_Siswa', 'L/P', 'Email', 'Jabatan', 'No_WA_Siswa', 'Nama_Wali', 'No_WA_Wali', 'Alamat', 'Latitude', 'Longitude', 'Lokasi', 'Status_Aktif']);
  
  var presensi = ss.insertSheet('Presensi');
  presensi.appendRow(['ID_Presensi', 'Tanggal', 'NISN', 'Status_Pagi', 'Status_Siang', 'Keterangan', 'Timestamp_Pagi', 'Timestamp_Siang']);
  
  var keuangan = ss.insertSheet('Keuangan');
  keuangan.appendRow(['ID_Transaksi', 'Tanggal', 'NISN', 'Tipe', 'Jumlah', 'Keterangan']);
  
  var panggilan = ss.insertSheet('Log_Panggilan');
  panggilan.appendRow(['ID_Panggilan', 'Tanggal', 'NISN', 'Kategori', 'Alasan', 'Hasil_Pertemuan', 'Status_Selesai']);
  
  var profil = ss.insertSheet('Profil_Wali_Kelas');
  profil.appendRow(['Id_Wali', 'Nama', 'Email', 'Kelas', 'Bio', 'Gaya_Ajar', 'Kontak', 'Created_At']);
  
  var queue = ss.insertSheet('Queue_Chat');
  queue.appendRow(['ID_Queue', 'Email', 'Student_NISN', 'Student_Name', 'Query', 'Attendance_Detail', 'Summary', 'Status', 'Response', 'Created_At', 'Processed_At']);
  
  var catatan = ss.insertSheet('Catatan_Siswa');
  catatan.appendRow(['NISN', 'Nama_Siswa', 'Tanggal', 'Ringkasan_AI', 'Tindak_Lanjut', 'Created_By']);

  var lokasi = ss.insertSheet('Lokasi');
  lokasi.appendRow(['ID_Lokasi', 'Nama_Lokasi', 'Deskripsi', 'Alamat', 'Latitude', 'Longitude', 'Lokasi', 'Created_By', 'Created_By_Email', 'Created_At']);

  var notif = ss.insertSheet('Notifikasi');
  notif.appendRow(['ID', 'Message', 'Type', 'Target_Role', 'Target_Email', 'Is_Read', 'Timestamp']);
  
  // Seed initial notification
  createNotification('Selamat datang di SISWA.HUB! Sistem manajemen kelas digital Anda sudah siap digunakan.', 'success', 'ALL');
}
