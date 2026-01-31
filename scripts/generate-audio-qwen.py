#!/usr/bin/env python3
"""
Generate TTS audio using Qwen2-Audio / CosyVoice for Mandarin Practice app.

This script uses high-quality Chinese TTS models.

Requirements:
    pip install transformers torch torchaudio accelerate sentencepiece

For CosyVoice (recommended for Chinese):
    pip install cosyvoice

Usage:
    python generate-audio-qwen.py                    # Generate all phrase audio
    python generate-audio-qwen.py --text "你好" --output hello.mp3
    python generate-audio-qwen.py --list             # List phrases
"""

import argparse
import os
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
AUDIO_DIR = PROJECT_ROOT / "audio"
DAILY_CURRICULUM_FILE = PROJECT_ROOT / "daily-curriculum.js"


def extract_speaking_phrases():
    """Extract phrases from speaking activities in daily curriculum"""
    phrases = []

    with open(DAILY_CURRICULUM_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # More robust parsing - find speaking activities and their phrases
    # This regex finds blocks that look like speaking activities with phrases
    speaking_blocks = re.findall(
        r'type:\s*["\']speaking["\'].*?phrases:\s*\[(.*?)\]',
        content,
        re.DOTALL
    )

    day_num = 0
    for block in speaking_blocks:
        day_num += 1
        # Extract characters from each phrase object
        char_matches = re.findall(r'characters:\s*["\']([^"\']+)["\']', block)
        for i, chars in enumerate(char_matches):
            phrases.append({
                'day': day_num,
                'index': i,
                'text': chars,
                'filename': f'day{day_num}_speaking_phrase{i}.mp3'
            })

    return phrases


def generate_with_edge_tts(phrases, voice="zh-CN-XiaoxiaoNeural"):
    """Fallback to edge-tts if available"""
    import asyncio
    import edge_tts

    async def generate_all():
        for p in phrases:
            output = AUDIO_DIR / p['filename']
            communicate = edge_tts.Communicate(p['text'], voice)
            await communicate.save(str(output))
            print(f"Generated: {p['filename']} - {p['text']}")

    asyncio.run(generate_all())


def generate_with_cosyvoice(phrases):
    """Generate using CosyVoice (Alibaba's high-quality Chinese TTS)"""
    try:
        from cosyvoice import CosyVoice
        import torchaudio

        print("Loading CosyVoice model...")
        cosyvoice = CosyVoice('CosyVoice-300M-SFT')

        for p in phrases:
            output = AUDIO_DIR / p['filename']
            # Generate speech
            output_audio = cosyvoice.inference_sft(p['text'], '中文女')

            # Save
            torchaudio.save(str(output), output_audio['tts_speech'], 22050)
            print(f"Generated: {p['filename']} - {p['text']}")

    except ImportError:
        print("CosyVoice not installed. Install with: pip install cosyvoice")
        print("Falling back to edge-tts...")
        generate_with_edge_tts(phrases)


def generate_with_chattts(phrases):
    """Generate using ChatTTS (open source, good quality)"""
    try:
        import ChatTTS
        import torch
        import torchaudio

        print("Loading ChatTTS model...")
        chat = ChatTTS.Chat()
        chat.load(compile=False)

        for p in phrases:
            output = AUDIO_DIR / p['filename']

            # Generate
            wavs = chat.infer([p['text']])

            # Save (ChatTTS outputs at 24kHz)
            torchaudio.save(str(output), torch.from_numpy(wavs[0]), 24000)
            print(f"Generated: {p['filename']} - {p['text']}")

    except ImportError:
        print("ChatTTS not installed. Install with: pip install ChatTTS")
        raise


def main():
    parser = argparse.ArgumentParser(description="Generate Chinese TTS audio")
    parser.add_argument("--engine", choices=["edge", "cosyvoice", "chattts"],
                        default="edge", help="TTS engine")
    parser.add_argument("--voice", default="zh-CN-XiaoxiaoNeural",
                        help="Voice for edge-tts")
    parser.add_argument("--text", help="Single text to generate")
    parser.add_argument("--output", help="Output file for --text")
    parser.add_argument("--list", action="store_true", help="List phrases only")

    args = parser.parse_args()

    AUDIO_DIR.mkdir(exist_ok=True)

    phrases = extract_speaking_phrases()

    if args.list:
        print(f"\nFound {len(phrases)} phrases:\n")
        for p in phrases:
            print(f"  Day {p['day']}, Phrase {p['index']}: {p['text']}")
            print(f"    -> {p['filename']}")
        return

    if args.text:
        phrases = [{'text': args.text, 'filename': args.output or 'output.mp3', 'day': 0, 'index': 0}]

    print(f"\nGenerating {len(phrases)} audio files with {args.engine}...\n")

    if args.engine == "edge":
        generate_with_edge_tts(phrases, args.voice)
    elif args.engine == "cosyvoice":
        generate_with_cosyvoice(phrases)
    elif args.engine == "chattts":
        generate_with_chattts(phrases)

    print(f"\nDone! Files saved to {AUDIO_DIR}")


if __name__ == "__main__":
    main()
