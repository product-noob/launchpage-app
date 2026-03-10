import { useState, useEffect } from 'react';
import { GITHUB_REPO, GITHUB_URL } from '../constants';

interface LatestRelease {
  macUrl: string;
  winUrl: string;
  version: string | null;
  loading: boolean;
}

const FALLBACK_MAC = `${GITHUB_URL}/releases/latest`;
const FALLBACK_WIN = `${GITHUB_URL}/releases/latest`;

export function useLatestRelease(): LatestRelease {
  const [state, setState] = useState<LatestRelease>({
    macUrl: FALLBACK_MAC,
    winUrl: FALLBACK_WIN,
    version: null,
    loading: true,
  });

  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then((res) => res.json())
      .then((data) => {
        const assets: Array<{ name: string; browser_download_url: string }> =
          data.assets ?? [];

        const macAsset = assets.find((a) => a.name.endsWith('.dmg'));
        const winAsset = assets.find((a) => a.name.endsWith('.exe'));

        setState({
          macUrl: macAsset?.browser_download_url ?? FALLBACK_MAC,
          winUrl: winAsset?.browser_download_url ?? FALLBACK_WIN,
          version: data.tag_name ?? null,
          loading: false,
        });
      })
      .catch(() => {
        setState({ macUrl: FALLBACK_MAC, winUrl: FALLBACK_WIN, version: null, loading: false });
      });
  }, []);

  return state;
}
