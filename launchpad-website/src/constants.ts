export const GITHUB_REPO = 'product-noob/launchpage-app';
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

export function getOSInfo(macUrl: string, winUrl: string): { label: string; url: string; isMac: boolean } {
  const isMac = !navigator.userAgent.includes('Win');
  return {
    label: isMac ? 'Download for macOS' : 'Download for Windows',
    url: isMac ? macUrl : winUrl,
    isMac,
  };
}
