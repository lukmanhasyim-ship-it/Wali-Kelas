const GAS_URL = import.meta.env.VITE_GAS_API_URL;

export async function fetchGAS(action, payload = {}) {
  if (!GAS_URL) {
    throw new Error('VITE_GAS_API_URL tidak ditemukan. Silakan set environment variable VITE_GAS_API_URL dengan URL Google Apps Script Web App Anda.');
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, payload })
    });

    if (!response.ok) {
      throw new Error('Gagal terhubung ke Google Apps Script. Pastikan Web App sudah di-deploy sebagai "Anyone".');
    }

    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    return result;
  } catch (error) {
    console.error('GAS Fetch Error:', error);
    throw error;
  }
}
