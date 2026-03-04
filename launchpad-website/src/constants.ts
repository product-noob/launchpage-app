export const DOWNLOAD_MAC = 'https://github.com/product-noob/launchpage-app/releases/download/v1.0.0/Launchpad-1.0.0-arm64.dmg';
export const DOWNLOAD_WIN = 'https://github.com/product-noob/launchpage-app/releases/download/v1.0.0/Launchpad.Setup.1.0.0.exe';
export const GITHUB_URL = 'https://github.com/product-noob/launchpage-app';

export function getOSInfo(): { label: string; url: string; isMac: boolean } {
  const isMac = !navigator.userAgent.includes('Win');
  return {
    label: isMac ? 'Download for macOS' : 'Download for Windows',
    url: isMac ? DOWNLOAD_MAC : DOWNLOAD_WIN,
    isMac,
  };
}
