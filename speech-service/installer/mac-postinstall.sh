#!/bin/bash

# Create Launch Agent to auto-start CornerstoneSpeechService on login
PLIST_PATH="$HOME/Library/LaunchAgents/com.cornerstone.speechservice.plist"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cornerstone.speechservice</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Applications/CornerstoneSpeechService/CornerstoneSpeechService</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/cornerstone-speech.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cornerstone-speech-error.log</string>
</dict>
</plist>
EOF

# Set correct permissions
chmod 644 "$PLIST_PATH"

# Load it immediately without requiring restart
launchctl load "$PLIST_PATH"

echo "Cornerstone Speech Service will now start automatically on login."
