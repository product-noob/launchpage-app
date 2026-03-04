cask "launchpad" do
  version "1.0.0"
  sha256 "REPLACE_WITH_ACTUAL_SHA256"

  url "https://github.com/princejain/launchpad/releases/download/v#{version}/Launchpad-#{version}-universal.dmg"
  name "Launchpad"
  desc "macOS menu bar app for launching and managing local dev servers"
  homepage "https://github.com/princejain/launchpad"

  app "Launchpad.app"

  zap trash: [
    "~/Library/Application Support/launchpad",
    "~/Library/Preferences/com.princejain.launchpad.plist",
  ]
end
