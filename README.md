# 普通话练习 - Mandarin Practice (Web Version)

A web-based Mandarin pronunciation practice app using browser speech recognition.

## Live Demo

**https://sequoia-hope.github.io/mandarin-practice-web/**

- Default: Uses Web Speech API (cloud-based, works on most browsers)
- [Whisper mode](https://sequoia-hope.github.io/mandarin-practice-web/?asr=whisper): Uses local Whisper model (~41MB download, fully offline after first load)

## Quick Start

### Option 1: Python (simplest)

```bash
cd mandarin-web
python3 -m http.server 8080
```

Then open `http://localhost:8080` on your phone (same WiFi network).

### Option 2: Python with HTTPS (required for some browsers)

Some browsers require HTTPS for microphone access. Generate a self-signed cert:

```bash
# Generate certificate (one-time)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'

# Serve with HTTPS
python3 ssl_server.py
```

Then open `https://YOUR_IP:8443` on your phone (accept the certificate warning).

### Option 3: Node.js

```bash
npx serve -l 8080
```

## Accessing from Your Phone

1. Find your Ubuntu machine's IP:
   ```bash
   hostname -I
   ```

2. Make sure your phone is on the same WiFi network

3. Open `http://YOUR_IP:8080` in your phone's browser

4. **Important**: Chrome on Android requires HTTPS for microphone access from non-localhost origins. Use the HTTPS option above, or use Safari on iOS (more permissive).

## Features

- **10 Lessons** covering common scenarios
- **On-device speech recognition** via Web Speech API
- **Text-to-speech** for hearing correct pronunciation  
- **Word-matching scoring** - 100% match required to pass
- **Progress tracking** within each lesson
- **PWA support** - can be installed to home screen

## Browser Compatibility

| Browser | Speech Recognition | Notes |
|---------|-------------------|-------|
| Chrome (Android) | ✅ | Requires HTTPS for remote access |
| Safari (iOS) | ✅ | Works over HTTP on local network |
| Chrome (Desktop) | ✅ | Good for testing |
| Firefox | ❌ | No Web Speech API support |

## Technical Notes

This version uses the **Web Speech API** instead of Whisper WASM for simplicity and better mobile compatibility. The Web Speech API:

- Uses the device's built-in speech recognition
- Supports Chinese (zh-CN) well on most devices
- Requires no model download
- Works offline on some devices (depends on OS)

If you want true offline Whisper-based recognition, you'd need to integrate whisper.cpp WASM, which adds ~150MB model download and more complexity.

## Customization

### Adding Lessons

Edit `curriculum.js` and add new lesson objects to the `CURRICULUM` array.

### Adjusting Scoring

Edit `scoring.js` to modify the scoring algorithm. Currently:
- 60% weight on character presence
- 40% weight on character order
- Must be 100% to pass

## Troubleshooting

**"Speech recognition not supported"**
- Use Chrome or Safari
- Try HTTPS if on mobile

**No transcription appears**
- Check microphone permissions in browser settings
- Speak clearly and close to the mic
- Try shorter phrases first

**TTS sounds robotic**
- Quality depends on device's installed voices
- iOS typically has better Chinese TTS

## Project Structure

```
mandarin-web/
├── index.html      # Main HTML with embedded styles
├── curriculum.js   # Lesson data
├── scoring.js      # Pronunciation scoring logic
├── app.js          # Main application code
├── manifest.json   # PWA manifest
├── ssl_server.py   # HTTPS server script (optional)
└── README.md       # This file
```

## License

MIT - Feel free to modify and use for your learning!
