export const getCurrentVersion = () => "4.9.2";

export const checkForUpdate = async () => {
  try {
    // In a real scenario, this would fetch from a remote manifest
    // For now, returning no update
    return { 
      hasUpdate: false, 
      latestVersion: "4.9.2",
      description: "Sistem sudah dalam versi terbaru." 
    };
  } catch (error) {
    console.error("Check for update failed:", error);
    return { hasUpdate: false };
  }
};
