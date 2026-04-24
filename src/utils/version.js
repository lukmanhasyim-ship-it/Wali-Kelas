import packageJson from '../../package.json?raw'

const GITHUB_OWNER = 'lukmanhasyim-ship-it'
const GITHUB_REPO = 'Siswa.Hub'
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`

let cachedVersion = null

export function getCurrentVersion() {
  if (cachedVersion) return cachedVersion
  try {
    const pkg = JSON.parse(packageJson)
    cachedVersion = pkg.version || '0.0.0'
  } catch {
    cachedVersion = '0.0.0'
  }
  return cachedVersion
}

function compareVersions(current, latest) {
  const curParts = current.split('.').map(Number)
  const latParts = latest.split('.').map(Number)

  for (let i = 0; i < Math.max(curParts.length, latParts.length); i++) {
    const cur = curParts[i] || 0
    const lat = latParts[i] || 0
    if (cur < lat) return -1
    if (cur > lat) return 1
  }
  return 0
}

export async function checkForUpdate() {
  try {
    const response = await fetch(`${GITHUB_API_URL}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return {
          hasUpdate: false,
          currentVersion: getCurrentVersion(),
          latestVersion: null,
          releaseNotes: null,
          releaseUrl: null,
          error: 'Belum ada release',
        }
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const release = await response.json()
    const latestVersion = release.tag_name?.replace(/^v/, '') || release.name || '0.0.0'
    const currentVersion = getCurrentVersion()

    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseNotes: release.body || null,
      releaseUrl: release.html_url,
      publishedAt: release.published_at,
      error: null,
    }
  } catch (err) {
    return {
      hasUpdate: false,
      currentVersion: getCurrentVersion(),
      latestVersion: null,
      releaseNotes: null,
      releaseUrl: null,
      error: err.message,
    }
  }
}