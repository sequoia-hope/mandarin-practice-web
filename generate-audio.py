#!/usr/bin/env python3
"""
Generate TTS audio for the Mandarin Practice app.

Generates audio for:
  - Speaking lesson phrases (from daily-curriculum.js)
  - Chinese profile names (12 names users can choose from)

Simple usage:
    python generate-audio.py                      # Use edge-tts (default, recommended)
    python generate-audio.py --engine cosyvoice  # Use CosyVoice (requires setup)
    python generate-audio.py --engine chattts    # Use ChatTTS

Engines:
    edge      - Microsoft Edge TTS (cloud, easy setup, recommended)
    cosyvoice - Alibaba CosyVoice (local, high quality, complex setup)
    chattts   - ChatTTS (local, open source)

Requirements:
    edge-tts (recommended):
        pip install edge-tts

    cosyvoice (complex setup - requires cloning repo):
        git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git
        cd CosyVoice && pip install -r requirements.txt
        # Then download model via modelscope

    chattts:
        pip install ChatTTS torch torchaudio

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

# Chinese names from storage.js - need audio for profile feature
CHINESE_NAMES = [
    { 'chinese': '小明', 'pinyin': 'Xiǎo Míng', 'english': 'Little Bright' },
    { 'chinese': '小红', 'pinyin': 'Xiǎo Hóng', 'english': 'Little Red' },
    { 'chinese': '小华', 'pinyin': 'Xiǎo Huá', 'english': 'Little China' },
    { 'chinese': '小龙', 'pinyin': 'Xiǎo Lóng', 'english': 'Little Dragon' },
    { 'chinese': '小美', 'pinyin': 'Xiǎo Měi', 'english': 'Little Beautiful' },
    { 'chinese': '大卫', 'pinyin': 'Dà Wèi', 'english': 'David' },
    { 'chinese': '安娜', 'pinyin': 'Ān Nà', 'english': 'Anna' },
    { 'chinese': '杰克', 'pinyin': 'Jié Kè', 'english': 'Jack' },
    { 'chinese': '丽丽', 'pinyin': 'Lì Lì', 'english': 'Lily' },
    { 'chinese': '明明', 'pinyin': 'Míng Míng', 'english': 'Bright' },
    { 'chinese': '天天', 'pinyin': 'Tiān Tiān', 'english': 'Every Day' },
    { 'chinese': '乐乐', 'pinyin': 'Lè Lè', 'english': 'Happy' },
]


def extract_names():
    """Extract all Chinese names for audio generation"""
    return [
        {
            'text': name['chinese'],
            'text_for_audio': name['chinese'],
            'pinyin': name['pinyin'],
            'filename': f"name_{name['chinese']}.mp3"
        }
        for name in CHINESE_NAMES
    ]


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

    Setup (requires cloning the repo):
        git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git
        cd CosyVoice
        pip install -r requirements.txt
        # Download model:
        python -c "from modelscope import snapshot_download; snapshot_download('iic/CosyVoice-300M-SFT', local_dir='pretrained_models/CosyVoice-300M-SFT')"

    Available voices: 中文女, 中文男, 英文女, 英文男, 日语男, 粤语女, 韩语女
    """
    import torch
    import torchaudio

    if model is None:
        try:
            from cosyvoice.cli.cosyvoice import CosyVoice
        except ImportError:
            print("Error: CosyVoice not properly installed.")
            print("CosyVoice requires cloning the repo and installing dependencies:")
            print("  git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git")
            print("  cd CosyVoice && pip install -r requirements.txt")
            print("")
            print("Or use edge-tts instead (much simpler):")
            print("  python generate-audio.py --engine edge")
            sys.exit(1)

        print("  Loading CosyVoice model (first run downloads ~2GB)...")
        # Try common model paths
        model_paths = [
            'pretrained_models/CosyVoice-300M-SFT',
            '../CosyVoice/pretrained_models/CosyVoice-300M-SFT',
            os.path.expanduser('~/CosyVoice/pretrained_models/CosyVoice-300M-SFT'),
        ]
        model_path = None
        for p in model_paths:
            if os.path.exists(p):
                model_path = p
                break

        if model_path is None:
            print("Error: CosyVoice model not found. Download it first:")
            print('  python -c "from modelscope import snapshot_download; snapshot_download(\'iic/CosyVoice-300M-SFT\', local_dir=\'pretrained_models/CosyVoice-300M-SFT\')"')
            sys.exit(1)

        model = CosyVoice(model_path, load_jit=False, load_onnx=False)

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

    # Extract all audio items
    phrases = extract_phrases()
    names = extract_names()
    all_items = phrases + names

    print(f"Found {len(phrases)} speaking phrases")
    print(f"Found {len(names)} Chinese names")
    print(f"Total: {len(all_items)} audio files\n")

    if args.list:
        print("Speaking phrases:")
        for p in phrases:
            print(f"  Day {p['day']}, #{p['index']}: {p['text']}")
            print(f"    -> {p['filename']}")
        print("\nChinese names:")
        for n in names:
            print(f"  {n['text']} ({n['pinyin']})")
            print(f"    -> {n['filename']}")
        return

    # Generate audio
    if args.engine == 'edge':
        generated, skipped = asyncio.run(
            generate_all_edge(all_items, args.voice, args.dry_run, args.force)
        )
    else:
        generated, skipped = generate_all_local(
            all_items, args.engine, args.voice, args.dry_run, args.force
        )

    print(f"\n✅ Done! Generated: {generated}, Skipped: {skipped}")

    if generated > 0 and not args.dry_run:
        print(f"\nTo commit these files:")
        print(f"  git add audio/")
        print(f"  git commit -m 'Add generated TTS audio'")
        print(f"  git push")


if __name__ == "__main__":
    main()
