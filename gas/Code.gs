/**
 * API Serverless Wali Kelas - Google Apps Script
 * Deploy as Web App, set "Execute as: Me" and "Who has access: Anyone".
 */



function pancingIzin() {
  DriveApp.createFolder("uji siswa.hub");
}

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
      MARK_ALL_NOTIFS_READ: function() {
        return { status: 'success', data: markAllNotificationsRead(payload && payload.role, payload && payload.email) };
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
      UPLOAD_FILE: function() {
        return { status: 'success', data: uploadFileToDrive(payload && payload.fileName, payload && payload.mimeType, payload && payload.base64Data, payload && payload.folderName) };
      },
      RUN_MANUAL_ARCHIVE: function() {
        return { status: 'success', data: runMonthlyArchive(payload && payload.month) };
      },
      SETUP_TRIGGERS: function() {
        return { status: 'success', data: setupArchiveTriggers() };
      },
      RESET_DATABASE: function() {
        return { status: 'success', data: resetDatabase(payload && payload.email) };
      },
      RENAME_MAPEL: function() {
        return { status: 'success', data: renameMapel(payload && payload.oldMapel, payload && payload.oldTopik, payload && payload.newName, payload && payload.newTopik, payload && payload.kategori) };
      },
      SEND_PIKET_NOTIFICATIONS: function() {
        return { status: 'success', data: sendPiketNotifications() };
      },
      SYNC_PIKET: function() {
        return { status: 'success', data: syncPiket(payload && payload.data) };
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

  var lock = LockService.getScriptLock();
  try {
    // Wait for up to 30 seconds for other processes to finish
    lock.waitLock(30000);
    
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
  } finally {
    // Always release the lock
    lock.releaseLock();
  }
}

function updateData(sheetName, id, updateObj) {
  sheetName = (sheetName || '').toString();
  if (!sheetName || id === undefined || id === null || !updateObj) return false;

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return false;

    ensureHeaders(sheet, updateObj);

    var range = sheet.getDataRange();
    var data = range.getValues();
    if (data.length <= 1) return false;

    var headers = data[0];
    var headerMap = buildHeaderIndex(headers);
    var pkIndex = 0; 

    // Auto-detect PK index if the first column isn't it
    if (headerMap['ID_' + sheetName.replace('Log_', '')] !== undefined) {
      pkIndex = headerMap['ID_' + sheetName.replace('Log_', '')];
    } else if (headerMap['ID'] !== undefined) {
      pkIndex = headerMap['ID'];
    } else if (headerMap['ID_Transaksi'] !== undefined && sheetName === 'Keuangan') {
      pkIndex = headerMap['ID_Transaksi'];
    }

    if (sheetName === 'Presensi' && updateObj.Status_Siang) {
      updateObj.Timestamp_Siang = formatDateValue(new Date(), 'Timestamp_Siang');
    }

    for (var i = 1; i < data.length; i++) {
      if ((data[i][pkIndex] || '').toString() === id.toString()) {
        var rowRange = sheet.getRange(i + 1, 1, 1, headers.length);
        var rowValues = [data[i]]; 
        
        for (var key in updateObj) {
          if (headerMap[key] !== undefined) {
            rowValues[0][headerMap[key]] = formatDateValue(updateObj[key], key);
          }
        }
        rowRange.setValues(rowValues);
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
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
    var oldStatusPagi = '';
    var oldStatusSiang = '';

    if (rowIdx !== undefined) {
      // Get old status to check for changes
      oldStatusPagi = (fullData[rowIdx][headerMap['Status_Pagi']] || '').toString();
      oldStatusSiang = (fullData[rowIdx][headerMap['Status_Siang']] || '').toString();

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
            var studentName = student.Nama_Siswa || 'Siswa';
            var nowStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd'T'HH:mm:ssXXX");

            // Notifikasi Pagi (Hanya jika ada PERUBAHAN status)
            var newPagi = (item.Status_Pagi || '').toString();
            if (newPagi && newPagi !== oldStatusPagi) {
              var msgPagi = '';
              if (newPagi === 'H') {
                msgPagi = 'Terimakasih, ' + studentName + ' telah hadir. Selamat belajar.';
              } else if (newPagi === 'S') {
                msgPagi = 'Hallo, ' + studentName + ' terpantau sedang Sakit. Semoga lekas sembuh!';
              } else {
                msgPagi = 'Absensi Pagi ' + studentName + ' dicatat: ' + newPagi;
              }
              
              createNotification(msgPagi, newPagi === 'H' ? 'success' : 'info', 'Siswa', student.Email);
              // Tambahkan notifikasi untuk Wali Kelas (yang juga bisa dilihat Pengurus)
              createNotification(msgPagi, 'info', 'Wali Kelas', '');
            }

            // Notifikasi Siang (Hanya jika ada PERUBAHAN status)
            var newSiang = (item.Status_Siang || '').toString();
            if (newSiang && newSiang !== oldStatusSiang) {
              var msgSiang = '';
              if (newSiang === 'H') {
                msgSiang = 'Ok, Absensi siang ' + studentName + ' sudah di catat.';
              } else {
                msgSiang = 'Absensi Siang ' + studentName + ' dicatat: ' + newSiang;
              }
              
              createNotification(msgSiang, newSiang === 'H' ? 'success' : 'info', 'Siswa', student.Email);
              // Tambahkan notifikasi untuk Wali Kelas (yang juga bisa dilihat Pengurus)
              createNotification(msgSiang, 'info', 'Wali Kelas', '');
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
  if (!dataList || !Array.isArray(dataList) || dataList.length === 0) return false;
  
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Master_Siswa');
    if (!sheet) return false;

    // Pastikan header ada (ambil sampel dari item pertama)
    ensureHeaders(sheet, dataList[0]);

    var range = sheet.getDataRange();
    var fullData = range.getValues();
    var headers = fullData[0];
    var headerMap = buildHeaderIndex(headers);
    
    // Cari index kolom identitas
    var idSiswaIdx = headerMap['ID_Siswa'];
    var nisnIdx = headerMap['NISN'];

    // Map baris berdasarkan ID_Siswa dan NISN untuk pencarian cepat
    var rowLookup = {};
    for (var i = 1; i < fullData.length; i++) {
        var idVal = idSiswaIdx !== undefined ? (fullData[i][idSiswaIdx] || '').toString() : '';
        var nisnVal = nisnIdx !== undefined ? (fullData[i][nisnIdx] || '').toString() : '';
        if (idVal) rowLookup[idVal] = i;
        if (nisnVal) rowLookup[nisnVal] = i;
    }

    var updatedCount = 0;
    dataList.forEach(function(item) {
      var searchKey = (item.ID_Siswa || item.NISN || '').toString();
      if (!searchKey) return;
      
      var rowIdx = rowLookup[searchKey];

      if (rowIdx !== undefined) {
        for (var keyAttr in item) {
          if (item.hasOwnProperty(keyAttr) && headerMap[keyAttr] !== undefined && keyAttr !== 'ID_Siswa' && keyAttr !== 'NISN') {
            var colIdx = headerMap[keyAttr];
            fullData[rowIdx][colIdx] = formatDateValue(item[keyAttr], keyAttr);
          }
        }
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      range.setValues(fullData);
      return true;
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

function loginWali(email) {
  if (!email) throw new Error('Email harus diisi.');
  var wali = readData('Profil_Wali_Kelas').find(function(item) {
    if (!item.Email) return false;
    var emails = item.Email.toString().toLowerCase().split(',').map(function(e) { return e.trim(); });
    return emails.indexOf(email.toString().toLowerCase()) !== -1;
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
    sheet.appendRow(['ID', 'Message', 'Type', 'Target_Email', 'Is_Read', 'Timestamp', 'Target_Role', 'Role', 'Email']);
    createNotification('Selamat datang di SISWA.HUB! Sistem manajemen kelas digital Anda sudah siap digunakan.', 'success', 'ALL');
  }

  var all = readData('Notifikasi');
  if (!all) return [];

  return all.filter(function(n) {
    // Role Hierarchy & Mapping
    var nRole = (n.Target_Role || 'ALL').toString().toUpperCase();
    var uRole = (role || 'SISWA').toString().toUpperCase();
    
    // Core check: Individual Email match
    var nEmail = (n.Target_Email || '').toString().toLowerCase();
    var uEmail = (email || '').toString().toLowerCase();
    var emailMatch = nEmail === '' || nEmail === uEmail;

    // Role Match Logic:
    // 1. ALL matches everyone
    // 2. Exact role matches (Wali Kelas -> Wali Kelas)
    // 3. Officers (Ketua, Bendahara, Sekre) can see notifications targeted to 'SISWA'
    // 4. Wali Kelas can see everything except maybe highly private student stuff?
    //    Actually, let Wali Kelas see 'SISWA' role notifications too.
    var roleMatch = (nRole === 'ALL') || (nRole === uRole);
    
    if (!roleMatch) {
      if (nRole === 'SISWA' || nRole === 'WALI KELAS') {
        // Bendahara, Sekretaris, Ketua Kelas adalah Pengurus yang bisa melihat notifikasi umum
        var officerRoles = ['KETUA KELAS', 'BENDAHARA', 'SEKRETARIS', 'WALI KELAS'];
        if (officerRoles.indexOf(uRole) !== -1) {
          roleMatch = true;
        }
      }
    }

    return roleMatch && emailMatch;
  }).sort(function(a, b) {
    return new Date(b.Timestamp) - new Date(a.Timestamp);
  }).slice(0, 30);
}

function createNotification(message, type, targetRole, targetEmail) {
  var row = {
    ID: 'NT' + new Date().getTime().toString(),
    Message: message,
    Type: type || 'info', 
    Target_Email: targetEmail || '',
    Is_Read: 'false',
    Timestamp: Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd'T'HH:mm:ssXXX"),
    Target_Role: targetRole || 'ALL',
    Role: targetRole || 'ALL', // Sesuai schema 9 kolom
    Email: targetEmail || ''    // Sesuai schema 9 kolom
  };
  appendData('Notifikasi', row);
  return row;
}

function markAllNotificationsRead(role, email) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Notifikasi');
  if (!sheet) return false;

  var range = sheet.getDataRange();
  var data = range.getValues();
  if (data.length <= 1) return true;

  var headers = data[0];
  var hMap = buildHeaderIndex(headers);
  var roleIdx = hMap['Target_Role'];
  var emailIdx = hMap['Target_Email'];
  var readIdx = hMap['Is_Read'];

  var updated = false;
  for (var i = 1; i < data.length; i++) {
    // Check if it belongs to user
    var nRole = (data[i][roleIdx] || 'ALL').toString().toUpperCase();
    var nEmail = (data[i][emailIdx] || '').toString().toLowerCase();
    var uRole = (role || 'SISWA').toString().toUpperCase();
    var uEmail = (email || '').toString().toLowerCase();

    var isTarget = (nRole === 'ALL' || nRole === uRole) && (nEmail === '' || nEmail === uEmail);

    if (isTarget && data[i][readIdx].toString() !== 'true') {
      data[i][readIdx] = 'true';
      updated = true;
    }
  }

  if (updated) {
    range.setValues(data);
  }
  return true;
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
  master.appendRow(['ID_Siswa', 'NIS', 'NISN', 'Nama_Siswa', 'L/P', 'Email', 'Jabatan', 'Tempat_Lahir', 'Tanggal_Lahir', 'No_WA_Siswa', 'Nama_Wali', 'No_WA_Wali', 'Alamat']);
  
  var presensi = ss.insertSheet('Presensi');
  presensi.appendRow(['ID_Presensi', 'Tanggal', 'ID_Siswa', 'NISN', 'Status_Pagi', 'Timestamp_Pagi', 'Status_Siang', 'Timestamp_Siang', 'Keterangan']);
  
  var keuangan = ss.insertSheet('Keuangan');
  keuangan.appendRow(['ID_Transaksi', 'Tanggal', 'ID_Siswa', 'NISN', 'Tipe', 'Jumlah', 'Keterangan']);

  var daftarNilai = ss.insertSheet('Daftar_Nilai');
  daftarNilai.appendRow(['ID_Nilai', 'ID_Siswa', 'NISN', 'Jenjang', 'Semester', 'Kategori_Mapel', 'Nama_Mapel', 'Topik', 'Nilai', 'Timestamp']);
  
  var panggilan = ss.insertSheet('Log_Panggilan');
  panggilan.appendRow(['ID_Panggilan', 'Tanggal', 'ID_Siswa', 'NISN', 'Kategori', 'Alasan', 'Tanggal_Pemanggilan', 'Waktu_Diskusi', 'Hasil_Pertemuan', 'Status_Selesai', 'Bukti_File_URL']);
  
  var profil = ss.insertSheet('Profil_Wali_Kelas');
  profil.appendRow(['Id_Wali', 'Nama', 'Email', 'Bio', 'Gaya_Ajar', 'Kontak', 'Created_At', 'Nominal_Iuran', 'Kelas']);

  var lokasi = ss.insertSheet('Lokasi');
  lokasi.appendRow(['ID_Lokasi', 'Nama_Lokasi', 'Deskripsi', 'Alamat', 'Latitude', 'Longitude', 'Lokasi', 'Created_By', 'Created_By_Email', 'Created_At']);

  var notif = ss.insertSheet('Notifikasi');
  notif.appendRow(['ID', 'Message', 'Type', 'Target_Email', 'Is_Read', 'Timestamp', 'Target_Role', 'Role', 'Email']);

  var piket = ss.insertSheet('Piket');
  piket.appendRow(['ID_Piket', 'Hari', 'ID_Siswa', 'Nama_Siswa', 'Email']);
  
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
    ss.insertSheet('Archive_Rekap_Absensi').appendRow(['ID_Siswa', 'Bulan', 'H', 'I', 'S', 'A', 'B']);
  }
  if (!ss.getSheetByName('Archive_Rekap_Keuangan')) {
    ss.insertSheet('Archive_Rekap_Keuangan').appendRow(['Bulan', 'Saldo_Awal', 'Total_Masuk', 'Total_Keluar', 'Saldo_Akhir']);
  }
  if (!ss.getSheetByName('Archive_Detail_Absensi')) {
    ss.insertSheet('Archive_Detail_Absensi').appendRow(['ID_Presensi', 'Tanggal', 'ID_Siswa', 'NISN', 'Status_Pagi', 'Timestamp_Pagi', 'Status_Siang', 'Timestamp_Siang', 'Keterangan']);
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

function renameMapel(oldMapel, oldTopik, newName, newTopik, kategori) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Daftar_Nilai');
  if (!sheet) return false;
  
  var range = sheet.getDataRange();
  var data = range.getValues();
  var headers = data[0];
  var hMap = buildHeaderIndex(headers);
  var mapelIdx = hMap['Nama_Mapel'];
  var topikIdx = hMap['Topik'];
  var katIdx = hMap['Kategori_Mapel'];
  
  if (mapelIdx === undefined || topikIdx === undefined || katIdx === undefined) return false;
  
  var updatedCount = 0;
  for (var i = 1; i < data.length; i++) {
    var m = (data[i][mapelIdx] || '').toString();
    var t = (data[i][topikIdx] || '').toString();
    var k = (data[i][katIdx] || '').toString();
    
    var matchCondition = false;
    if (kategori === 'P5') {
       matchCondition = k === 'P5' && m === oldMapel;
    } else {
       matchCondition = m === oldMapel && t === oldTopik;
    }

    if (matchCondition) {
      if (newName) data[i][mapelIdx] = newName;
      if (newTopik) data[i][topikIdx] = newTopik;
      updatedCount++;
    }
  }
  
  if (updatedCount > 0) {
    range.setValues(data);
  }
  return updatedCount > 0;
}

function uploadFileToDrive(fileName, mimeType, base64Data, folderName) {
  if (!fileName || !base64Data) throw new Error("File data tidak lengkap/Missing file data");
  folderName = folderName || "Bukti Panggilan";

  var activeSheet = SpreadsheetApp.getActiveSpreadsheet();
  var parentFolder = DriveApp.getRootFolder();
  
  if (activeSheet) {
    var ssFile = DriveApp.getFileById(activeSheet.getId());
    var parents = ssFile.getParents();
    if (parents.hasNext()) {
      parentFolder = parents.next();
    }
  }

  var folder;
  var existingFolders = parentFolder.getFoldersByName(folderName);
  if (existingFolders.hasNext()) {
    folder = existingFolders.next();
  } else {
    folder = parentFolder.createFolder(folderName);
  }

  // Strip Base64 header string if present
  var cleanBase64 = base64Data;
  if (cleanBase64.indexOf(",") > -1) {
    cleanBase64 = cleanBase64.split(",")[1];
  }

  var finalMimeType = mimeType || "application/octet-stream";
  var blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), finalMimeType, fileName);
  var file = folder.createFile(blob);
  
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // Akun Workspace/Edukasi mungkin membatasi sharing public. Abaikan jika ditolak.
    Logger.log("Akses public file sharing dibatasi oleh kebijakan Workspace: " + e.toString());
  }
  
  return {
    url: file.getUrl(),
    id: file.getId(),
    name: file.getName()
  };
}

/**
 * LOGIKA PIKET SISWA
 */

function getPiketToday() {
  var allPiket = readData('Piket');
  var days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var todayName = days[new Date().getDay()];
  
  return allPiket.filter(function(p) {
    return p.Hari === todayName;
  });
}

function sendPiketNotifications() {
  var piketToday = getPiketToday();
  if (piketToday.length === 0) return "Tidak ada jadwal piket hari ini.";
  
  var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var count = 0;
  
  piketToday.forEach(function(member) {
    var email = (member.Email || '').toString().toLowerCase();
    if (!email) return;
    
    // Cek apakah sudah dikirim hari ini
    var notifs = readData('Notifikasi');
    var alreadySent = notifs.some(function(n) {
      return n.Target_Email.toLowerCase() === email && 
             n.Message.indexOf('tugas piket') > -1 && 
             n.Timestamp.indexOf(todayStr) > -1;
    });
    
    if (!alreadySent) {
      createNotification(
        'Hallo ' + member.Nama_Siswa + ', jangan lupa ya hari ini kamu ada tugas piket kelas. Mari jaga kebersihan kelas kita!',
        'info',
        'Siswa',
        email
      );
      count++;
    }
  });
  
  return "Berhasil mengirim " + count + " notifikasi piket.";
}

function syncPiket(dataList) {
  try {
    if (!dataList || !Array.isArray(dataList)) return false;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Piket');
    if (!sheet) {
      sheet = ss.insertSheet('Piket');
      sheet.appendRow(['ID_Piket', 'Hari', 'ID_Siswa', 'Nama_Siswa', 'Email']);
    }
    
    // Clear all old records safely
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
    
    if (dataList.length > 0) {
      var headers = ['ID_Piket', 'Hari', 'ID_Siswa', 'Nama_Siswa', 'Email'];
      var rows = dataList.map(function(item) {
        return [
          (item.ID_Piket || 'PK' + new Date().getTime() + Math.random().toString(36).substr(2, 5)).toString(),
          (item.Hari || '').toString(),
          (item.ID_Siswa || '').toString(),
          (item.Nama_Siswa || '').toString(),
          (item.Email || '').toString()
        ];
      });
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    return true;
  } catch (err) {
    Logger.log('SyncPiket Error: ' + err.toString());
    throw err;
  }
}

/**
 * Jalankan fungsi ini SEKALI SAJA di editor Apps Script 
 * untuk menambahkan kolom Tanggal_Pemanggilan yang hilang secara otomatis.
 */
function fixLogPanggilanHeader() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Log_Panggilan');
  if (!sheet) return "Sheet Log_Panggilan tidak ditemukan";
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var alasanIdx = headers.indexOf('Alasan');
  var targetIdx = headers.indexOf('Tanggal_Pemanggilan');
  
  if (alasanIdx !== -1 && targetIdx === -1) {
    // Sisipkan kolom setelah Alasan (alasanIdx + 1, karena index 0 dan kita ingin kolom berikutnya)
    sheet.insertColumnAfter(alasanIdx + 1);
    sheet.getRange(1, alasanIdx + 2).setValue('Tanggal_Pemanggilan');
    return "Berhasil menambahkan kolom Tanggal_Pemanggilan!";
  } else if (targetIdx !== -1) {
    return "Kolom sudah ada.";
  }
  return "Gagal mendeteksi kolom Alasan.";
}
