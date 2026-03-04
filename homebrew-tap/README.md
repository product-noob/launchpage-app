# Homebrew Tap for Launchpad

This directory contains the Homebrew cask formula template. To set up distribution via Homebrew:

## Setup (one-time)

1. Create a new GitHub repo named `homebrew-tap` under your account
2. Copy `Casks/launchpad.rb` into that repo
3. Users can then install via:

```bash
brew tap princejain/tap
brew install --cask launchpad
```

Or in one command:

```bash
brew install --cask princejain/tap/launchpad
```

## Updating on Release

After each GitHub Release, update the cask formula:

1. Update the `version` in `launchpad.rb`
2. Download the new DMG and compute its SHA256: `shasum -a 256 Launchpad-X.Y.Z-universal.dmg`
3. Update the `sha256` in the formula
4. Push to the `homebrew-tap` repo

This can be automated in the release workflow by adding a step that updates the tap repo via the GitHub API.
