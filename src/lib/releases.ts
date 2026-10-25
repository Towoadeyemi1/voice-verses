/** Where the desktop app is published (GitHub Releases of this repository). */
export const RELEASES_REPO = 'Towoadeyemi1/voice-verses';
export const DOWNLOAD_PAGE_URL = `https://github.com/${RELEASES_REPO}/releases/latest`;

/**
 * Installer file names, kept free of version numbers (package.json →
 * build.*.artifactName) so these "latest" links never go stale.
 */
export const INSTALLERS = {
  macAppleSilicon: 'Voice-Verses-mac-arm64.dmg',
  macIntel: 'Voice-Verses-mac-x64.dmg',
  windows: 'Voice-Verses-Setup-win-x64.exe',
} as const;

export const installerUrl = (file: string) => `https://github.com/${RELEASES_REPO}/releases/latest/download/${file}`;
