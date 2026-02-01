#!/usr/bin/env python3
"""
Generate TTS audio for all speaking phrases in the Mandarin Practice app.

Simple usage:
    python generate-audio.py                      # Use edge-tts (default)
    python generate-audio.py --engine cosyvoice  # Use CosyVoice (Qwen/Alibaba)
    python generate-audio.py --engine chattts    # Use ChatTTS

Engines:
    edge      - Microsoft Edge TTS (cloud, easy setup)
    cosyvoice - Alibaba CosyVoice (local, high quality Chinese)
    chattts   - ChatTTS (local, open source)

Requirements:
    edge-tts:    pip install edge-tts
    cosyvoice:   pip install cosyvoice-v2 torch torchaudio
    chattts:     pip install chattts torch torchaudio

Options:
    --engine     TTS engine to use (default: edge)
    --voice      Voice to use (engine-specific)
    --list       Just list phrases, don't generate
    --dry-run    Show what would be generated
    --force      Regenerate even if file exists
"""

import argparse
import asyncio
import os
import re
import sys
from pathlib import Path

# Find project root
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
    speaking_pattern = r'type:\s*["\']speaking["\'].*?phrases:\s*\[(.*?)\]'
    matches = re.findall(speaking_pattern, content, re.DOTALL)

    for day_idx, block in enumerate(matches, 1):
        char_pattern = r'characters:\s*["\']([^"\']+)["\']'
        char_matches = re.findall(char_pattern, block)

        for phrase_idx, chars in enumerate(char_matches):
            chars_for_audio = chars.replace('{{NAME}}', '小明')
            phrases.append({
                'day': day_idx,
                'index': phrase_idx,
                'text': chars,
                'text_for_audio': chars_for_audio,
                'filename': f'day{day_idx}_speaking_phrase{phrase_idx}.mp3'
            })

    return phrases


# =============================================================================
# TTS Engines
# =============================================================================

async def generate_edge_tts(text, output_path, voice="zh-CN-XiaoxiaoNeural"):
    """Generate audio using Microsoft Edge TTS"""
    import edge_tts
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(str(output_path))


def generate_cosyvoice(text, output_path, voice="中文女", model=None):
    """
    Generate audio using CosyVoice (Alibaba/Qwen ecosystem).

    Install: pip install cosyvoice-v2 torch torchaudio

    Available voices: 中文女, 中文男, 英文女, 英文男, 日语男, 粤语女, 韩语女
    """
    import torch
    import torchaudio

    if model is None:
        from cosyvoice import CosyVoice2
        print("  Loading CosyVoice model (first run may download ~2GB)...")
        model = CosyVoice2('CosyVoice2-0.5B', load_jit=False, load_trt=False)

    # Generate speech
    for result in model.inference_sft(text, voice, stream=False):
        audio = result['tts_speech']

    # Save as mp3
    # CosyVoice outputs at 22050 Hz
    temp_wav = output_path.replace('.mp3', '.wav')
    torchaudio.save(temp_wav, audio, 22050)

    # Convert to mp3 using ffmpeg if available, otherwise keep wav
    try:
        import subprocess
        subprocess.run(['ffmpeg', '-y', '-i', temp_wav, '-b:a', '128k', output_path],
                       capture_output=True, check=True)
        os.remove(temp_wav)
    except (subprocess.CalledProcessError, FileNotFoundError):
        # ffmpeg not available, rename wav to mp3 (will still work in browser)
        os.rename(temp_wav, output_path)

    return model


def generate_chattts(text, output_path, model=None):
    """
    Generate audio using ChatTTS (open source).

    Install: pip install chattts torch torchaudio
    """
    import torch
    import torchaudio

    if model is None:
        import ChatTTS
        print("  Loading ChatTTS model...")
        model = ChatTTS.Chat()
        model.load(compile=False)

    # Generate speech
    wavs = model.infer([text])
    audio = torch.from_numpy(wavs[0]).unsqueeze(0)

    # Save (ChatTTS outputs at 24000 Hz)
    temp_wav = output_path.replace('.mp3', '.wav')
    torchaudio.save(temp_wav, audio, 24000)

    # Convert to mp3
    try:
        import subprocess
        subprocess.run(['ffmpeg', '-y', '-i', temp_wav, '-b:a', '128k', output_path],
                       capture_output=True, check=True)
        os.remove(temp_wav)
    except (subprocess.CalledProcessError, FileNotFoundError):
        os.rename(temp_wav, output_path)

    return model


# =============================================================================
# Main Generation Loop
# =============================================================================

async def generate_all_edge(phrases, voice, dry_run, force):
    """Generate all audio using edge-tts"""
    try:
        import edge_tts
    except ImportError:
        print("Error: edge-tts not installed")
        print("Install with: pip install edge-tts")
        sys.exit(1)

    AUDIO_DIR.mkdir(exist_ok=True)
    generated, skipped = 0, 0

    for p in phrases:
        output_path = AUDIO_DIR / p['filename']

        if output_path.exists() and not force:
            print(f"  [skip] {p['filename']}")
            skipped += 1
            continue

        if dry_run:
            print(f"  [would generate] {p['filename']} - {p['text']}")
            continue

        print(f"  [generating] {p['filename']} - {p['text_for_audio']}")
        try:
            await generate_edge_tts(p['text_for_audio'], str(output_path), voice)
            generated += 1
        except Exception as e:
            print(f"    Error: {e}")

    return generated, skipped


def generate_all_local(phrases, engine, voice, dry_run, force):
    """Generate all audio using local TTS (cosyvoice or chattts)"""
    AUDIO_DIR.mkdir(exist_ok=True)
    generated, skipped = 0, 0
    model = None

    for p in phrases:
        output_path = AUDIO_DIR / p['filename']

        if output_path.exists() and not force:
            print(f"  [skip] {p['filename']}")
            skipped += 1
            continue

        if dry_run:
            print(f"  [would generate] {p['filename']} - {p['text']}")
            continue

        print(f"  [generating] {p['filename']} - {p['text_for_audio']}")
        try:
            if engine == 'cosyvoice':
                model = generate_cosyvoice(p['text_for_audio'], str(output_path), voice, model)
            elif engine == 'chattts':
                model = generate_chattts(p['text_for_audio'], str(output_path), model)
            generated += 1
        except Exception as e:
            print(f"    Error: {e}")
            import traceback
            traceback.print_exc()

    return generated, skipped


def main():
    parser = argparse.ArgumentParser(
        description="Generate TTS audio for Mandarin Practice app",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate-audio.py                           # Edge TTS (default)
  python generate-audio.py --engine cosyvoice        # CosyVoice (Qwen/Alibaba)
  python generate-audio.py --engine chattts          # ChatTTS
  python generate-audio.py --force                   # Regenerate all
  python generate-audio.py --list                    # List phrases only

Edge TTS voices (--engine edge):
  zh-CN-XiaoxiaoNeural  (female, default)
  zh-CN-XiaohanNeural   (female)
  zh-CN-YunxiNeural     (male)
  zh-CN-YunjianNeural   (male)

CosyVoice voices (--engine cosyvoice):
  中文女  (Chinese female, default)
  中文男  (Chinese male)
        """
    )
    parser.add_argument("--engine", choices=["edge", "cosyvoice", "chattts"],
                        default="edge", help="TTS engine (default: edge)")
    parser.add_argument("--voice", default=None,
                        help="Voice to use (engine-specific)")
    parser.add_argument("--list", action="store_true",
                        help="List phrases without generating")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be generated")
    parser.add_argument("--force", action="store_true",
                        help="Regenerate even if file exists")

    args = parser.parse_args()

    # Set default voice per engine
    if args.voice is None:
        if args.engine == 'edge':
            args.voice = 'zh-CN-XiaoxiaoNeural'
        elif args.engine == 'cosyvoice':
            args.voice = '中文女'
        elif args.engine == 'chattts':
            args.voice = None  # ChatTTS doesn't use voice parameter

    print(f"\n📚 Mandarin Practice Audio Generator")
    print(f"   Engine: {args.engine}")
    if args.voice:
        print(f"   Voice: {args.voice}")
    print(f"   Audio dir: {AUDIO_DIR}\n")

    # Extract phrases
    phrases = extract_phrases()
    print(f"Found {len(phrases)} speaking phrases\n")

    if args.list:
        for p in phrases:
            print(f"  Day {p['day']}, #{p['index']}: {p['text']}")
            print(f"    -> {p['filename']}")
        return

    # Generate audio
    if args.engine == 'edge':
        generated, skipped = asyncio.run(
            generate_all_edge(phrases, args.voice, args.dry_run, args.force)
        )
    else:
        generated, skipped = generate_all_local(
            phrases, args.engine, args.voice, args.dry_run, args.force
        )

    print(f"\n✅ Done! Generated: {generated}, Skipped: {skipped}")

    if generated > 0 and not args.dry_run:
        print(f"\nTo commit these files:")
        print(f"  git add audio/")
        print(f"  git commit -m 'Add generated TTS audio'")
        print(f"  git push")


if __name__ == "__main__":
    main()
