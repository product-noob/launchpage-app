#!/usr/bin/env bash
# Launchpad — macOS installer
# Usage: curl -fsSL https://raw.githubusercontent.com/product-noob/launchpage-app/main/install.sh | bash
set -e

REPO="product-noob/launchpage-app"
APP_NAME="Launchpad"
INSTALL_DIR="/Applications"

# Require macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "This script is for macOS only. For Windows, use install.ps1." >&2
  exit 1
fi

echo "Fetching latest Launchpad release..."
TAG=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep '"tag_name"' \
  | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')

if [[ -z "$TAG" ]]; then
  echo "Error: could not determine latest release tag." >&2
  exit 1
fi

VERSION="${TAG#v}"
DMG_NAME="${APP_NAME}-${VERSION}-universal.dmg"
DMG_URL="https://github.com/${REPO}/releases/download/${TAG}/${DMG_NAME}"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Downloading ${APP_NAME} ${TAG}..."
curl -L --progress-bar -o "${TMP}/${DMG_NAME}" "${DMG_URL}"

echo "Mounting disk image..."
MOUNT_OUTPUT=$(hdiutil attach "${TMP}/${DMG_NAME}" -nobrowse -quiet)
MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | tail -1 | awk '{print $NF}')

echo "Installing to ${INSTALL_DIR}..."
# Remove existing install if present
if [[ -d "${INSTALL_DIR}/${APP_NAME}.app" ]]; then
  rm -rf "${INSTALL_DIR}/${APP_NAME}.app"
fi
cp -R "${MOUNT_POINT}/${APP_NAME}.app" "${INSTALL_DIR}/"

hdiutil detach "${MOUNT_POINT}" -quiet

# Remove quarantine flag so macOS Gatekeeper doesn't block the first launch
xattr -cr "${INSTALL_DIR}/${APP_NAME}.app" 2>/dev/null || true

echo ""
echo "✓ Launchpad ${TAG} installed to ${INSTALL_DIR}/${APP_NAME}.app"
echo "  Open it from Spotlight or run: open '${INSTALL_DIR}/${APP_NAME}.app'"
