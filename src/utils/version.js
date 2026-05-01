export const getCurrentVersion = () => "4.9.5";

export const checkForUpdate = async () => {
  const current = getCurrentVersion();
  const repoUrl = "https://raw.githubusercontent.com/lukmanhasyim-ship-it/Wali-Kelas/main/src/utils/version.js";

  try {
    const response = await fetch(repoUrl);
    if (!response.ok) throw new Error("Gagal terhubung ke server update.");
    
    const text = await response.text();
    // Simple regex to extract version from the file content
    const match = text.match(/getCurrentVersion = \(\) => "(.*?)"/);
    const latestVersion = match ? match[1] : current;

    const hasUpdate = latestVersion !== current;

    return {
      hasUpdate,
      currentVersion: current,
      latestVersion,
      releaseUrl: "https://github.com/lukmanhasyim-ship-it/Wali-Kelas/releases",
      releaseNotes: hasUpdate 
        ? `Tersedia pembaruan versi ${latestVersion}. Silakan hubungi pengelola atau lakukan git pull untuk memperbarui.`
        : "Sistem sudah dalam versi terbaru.",
      description: hasUpdate 
        ? "Versi baru tersedia di repository." 
        : "Sistem sudah dalam versi terbaru."
    };
  } catch (error) {
    console.error("Check for update failed:", error);
    return { 
      hasUpdate: false, 
      currentVersion: current,
      error: "Gagal mengecek pembaruan. Pastikan Anda terhubung ke internet." 
    };
  }
};
