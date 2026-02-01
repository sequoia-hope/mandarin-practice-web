#!/usr/bin/env python3
"""
Generate TTS audio for all speaking phrases in the Mandarin Practice app.

Simple usage:
    python generate-audio.py

This will:
1. Extract all Chinese phrases from daily-curriculum.js
2. Generate MP3 audio files using Microsoft Edge TTS
3. Save them to the audio/ directory

Requirements:
    pip install edge-tts

Options:
    --voice VOICE    Voice to use (default: zh-CN-XiaoxiaoNeural)
    --list           Just list phrases, don't generate
    --dry-run        Show what would be generated
"""

import asyncio
import os
import re
import sys
from pathlib import Path

# Find project root (where this script lives or parent of scripts/)
SCRIPT_DIR = Path(__file__).parent
if SCRIPT_DIR.name == "scripts":
    PROJECT_ROOT = SCRIPT_DIR.parent
else:
    PROJECT_ROOT = SCRIPT_DIR

AUDIO_DIR = PROJECT_ROOT / "audio"
DAILY_CURRICULUM_FILE = PROJECT_ROOT / "daily-curriculum.js"


def extract_phrases():
    """Extract all speaking phrases from daily-curriculum.js"""
    if not DAILY_CURRICULUM_FILE.exists():
        print(f"Error: {DAILY_CURRICULUM_FILE} not found")
        sys.exit(1)

    with open(DAILY_CURRICULUM_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    phrases = []

    # Find speaking activity blocks and extract phrases
    # Pattern: type: "speaking" ... phrases: [ { characters: "..." }, ... ]
    speaking_pattern = r'type:\s*["\']speaking["\'].*?phrases:\s*\[(.*?)\]'

    matches = re.findall(speaking_pattern, content, re.DOTALL)

    for day_idx, block in enumerate(matches, 1):
        # Extract characters from each phrase
        char_pattern = r'characters:\s*["\']([^"\']+)["\']'
        char_matches = re.findall(char_pattern, block)

        for phrase_idx, chars in enumerate(char_matches):
            # Replace template placeholder with a common name for audio
            chars_for_audio = chars.replace('{{NAME}}', '小明')

            phrases.append({
                'day': day_idx,
                'index': phrase_idx,
                'text': chars,
                'text_for_audio': chars_for_audio,
                'filename': f'day{day_idx}_speaking_phrase{phrase_idx}.mp3'
            })

    return phrases


async def generate_audio(phrases, voice="zh-CN-XiaoxiaoNeural", dry_run=False):
    """Generate audio files using edge-tts"""
    try:
        import edge_tts
    except ImportError:
        print("Error: edge-tts not installed")
        print("Install with: pip install edge-tts")
        sys.exit(1)

    AUDIO_DIR.mkdir(exist_ok=True)

    generated = 0
    skipped = 0

    for p in phrases:
        output_path = AUDIO_DIR / p['filename']

        if output_path.exists():
            print(f"  [skip] {p['filename']} (already exists)")
            skipped += 1
            continue

        if dry_run:
            print(f"  [would generate] {p['filename']} - {p['text']}")
            continue

        print(f"  [generating] {p['filename']} - {p['text_for_audio']}")

        try:
            communicate = edge_tts.Communicate(p['text_for_audio'], voice)
            await communicate.save(str(output_path))
            generated += 1
        except Exception as e:
            print(f"    Error: {e}")

    return generated, skipped


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate TTS audio for Mandarin Practice app",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate-audio.py                    # Generate all missing audio
  python generate-audio.py --list             # List all phrases
  python generate-audio.py --force            # Regenerate all audio
  python generate-audio.py --voice zh-CN-YunxiNeural  # Use male voice

Available voices:
  zh-CN-XiaoxiaoNeural  (female, default)
  zh-CN-XiaohanNeural   (female)
  zh-CN-YunxiNeural     (male)
  zh-CN-YunjianNeural   (male)
        """
    )
    parser.add_argument("--voice", default="zh-CN-XiaoxiaoNeural",
                        help="TTS voice to use")
    parser.add_argument("--list", action="store_true",
                        help="List phrases without generating")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be generated")
    parser.add_argument("--force", action="store_true",
                        help="Regenerate even if file exists")

    args = parser.parse_args()

    print(f"\n📚 Mandarin Practice Audio Generator")
    print(f"   Project: {PROJECT_ROOT}")
    print(f"   Audio dir: {AUDIO_DIR}\n")

    # Extract phrases
    phrases = extract_phrases()
    print(f"Found {len(phrases)} speaking phrases\n")

    if args.list:
        for p in phrases:
            print(f"  Day {p['day']}, #{p['index']}: {p['text']}")
            print(f"    -> {p['filename']}")
        return

    if args.force:
        # Remove existing files
        for p in phrases:
            output_path = AUDIO_DIR / p['filename']
            if output_path.exists():
                output_path.unlink()

    # Generate audio
    print(f"Generating audio with voice: {args.voice}\n")
    generated, skipped = asyncio.run(
        generate_audio(phrases, args.voice, args.dry_run)
    )

    print(f"\n✅ Done! Generated: {generated}, Skipped: {skipped}")

    if generated > 0 and not args.dry_run:
        print(f"\nTo commit these files:")
        print(f"  git add audio/")
        print(f"  git commit -m 'Add generated TTS audio for daily curriculum'")
        print(f"  git push")


if __name__ == "__main__":
    main()
