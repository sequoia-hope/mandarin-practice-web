# Mandarin Practice Web App

## Git Branch
**Always push to:** `claude/main-lKVck`

## Project Overview
A Progressive Web App (PWA) for learning Mandarin Chinese through interactive lessons and spaced repetition.

## Tech Stack
- Vanilla JavaScript (no frameworks)
- Single-page application with multiple views
- Browser Text-to-Speech (TTS) for Chinese audio
- Whisper ASR for speech recognition in speaking exercises
- localStorage for progress and user profile persistence

## Key Files
- `index.html` - Main HTML with all CSS styles and view containers
- `app.js` - Core application logic, lesson handlers, navigation
- `daily-curriculum.js` - 7-day curriculum with vocabulary and activities
- `curriculum.js` - Extended curriculum data
- `storage.js` - localStorage helpers for progress tracking
- `scoring.js` - Scoring logic for exercises
- `whisper-asr.js` - Speech recognition integration
- `audio-capture.js` - Audio recording utilities

## Lesson Types
1. **intro** - Word introduction with TTS and example sentences
2. **matching** - Match Chinese characters to pinyin/English
3. **tones** - Tone identification drills
4. **listening** - Listen and select correct answer
5. **cloze** - Fill-in-the-blank sentences
6. **speaking** - Speech recognition practice
7. **ordering** - Sentence word ordering

## Daily Flow
Each day follows: Intro → Matching → Tones → Listening → Cloze → Speaking → Ordering

## Features
- User profile with avatar and Chinese name
- Spaced repetition via reviewWords in later days
- Progress tracking per activity
- "Next Activity" button for seamless progression
- Best time tracking for matching games

## Running Locally
```bash
python ssl_server.py
```
Then open https://localhost:8443 (HTTPS required for speech recognition)
