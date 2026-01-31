#!/usr/bin/env python3
"""
Generate TTS audio for Mandarin Practice app.

Usage:
    python generate-audio.py --engine edge     # Use Microsoft Edge TTS (no GPU needed)
    python generate-audio.py --engine qwen     # Use Qwen3-TTS (needs GPU)
    python generate-audio.py --engine edge --phrases  # Generate only phrase audio
    python generate-audio.py --list            # List all phrases without generating

Requirements:
    Edge TTS:  pip install edge-tts
    Qwen TTS:  pip install transformers torch torchaudio accelerate
"""

import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path

# Get the project root (parent of scripts directory)
PROJECT_ROOT = Path(__file__).parent.parent
AUDIO_DIR = PROJECT_ROOT / "audio"
DAILY_CURRICULUM_FILE = PROJECT_ROOT / "daily-curriculum.js"


def extract_phrases_from_curriculum():
    """Extract all phrases that need audio from daily-curriculum.js"""
    phrases = []

    with open(DAILY_CURRICULUM_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all phrase objects with characters field
    # Pattern matches: { characters: "...", ... }
    phrase_pattern = r'\{\s*characters:\s*["\']([^"\']+)["\']'

    # Also extract from vocabulary for intro lessons
    vocab_pattern = r'word:\s*["\']([^"\']+)["\']'
    sentence_pattern = r'sentence:\s*["\']([^"\']+)["\']'

    # Extract day and activity info for naming
    day_pattern = r'day:\s*(\d+)'
    activity_pattern = r'type:\s*["\']speaking["\']'

    # Parse the curriculum structure more carefully
    # Split by day blocks
    days = re.split(r'\{\s*day:', content)[1:]  # Skip first empty part

    for day_content in days:
        day_match = re.match(r'\s*(\d+)', day_content)
        if not day_match:
            continue
        day_num = int(day_match.group(1))

        # Find speaking activities
        activities = re.split(r'\{\s*type:', day_content)
        activity_idx = 0

        for activity in activities:
            if activity.strip().startswith('"speaking"') or activity.strip().startswith("'speaking'"):
                # Found a speaking activity, extract phrases
                phrase_matches = re.findall(phrase_pattern, activity)
                for i, chars in enumerate(phrase_matches):
                    phrases.append({
                        'day': day_num,
                        'activity': activity_idx,
                        'phrase_index': i,
                        'characters': chars,
                        'filename': f'day{day_num}_speaking_phrase{i}.mp3'
                    })
            activity_idx += 1

    return phrases


def extract_all_chinese_text():
    """Extract all Chinese text that might need audio"""
    texts = []

    with open(DAILY_CURRICULUM_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all Chinese text in quotes
    # Match text containing at least one Chinese character
    chinese_pattern = r'["\']([^"\']*[\u4e00-\u9fff]+[^"\']*)["\']'

    matches = re.findall(chinese_pattern, content)

    # Deduplicate while preserving order
    seen = set()
    for text in matches:
        text = text.strip()
        if text and text not in seen:
            seen.add(text)
            texts.append(text)

    return texts


async def generate_edge_tts(text: str, output_path: str, voice: str = "zh-CN-XiaoxiaoNeural"):
    """Generate audio using Microsoft Edge TTS"""
    import edge_tts

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    print(f"  Generated: {output_path}")


def generate_qwen_tts(text: str, output_path: str, model=None, processor=None):
    """Generate audio using Qwen3-TTS"""
    import torch
    import torchaudio

    if model is None:
        from transformers import AutoModelForTextToWaveform, AutoProcessor
        print("Loading Qwen3-TTS model (this may take a while)...")
        processor = AutoProcessor.from_pretrained("Qwen/Qwen2-Audio-7B-Instruct")
        model = AutoModelForTextToWaveform.from_pretrained(
            "Qwen/Qwen2-Audio-7B-Instruct",
            torch_dtype=torch.float16,
            device_map="auto"
        )

    # Prepare input
    inputs = processor(text=text, return_tensors="pt")
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    # Generate
    with torch.no_grad():
        outputs = model.generate(**inputs)

    # Save audio
    torchaudio.save(output_path, outputs.cpu(), sample_rate=24000)
    print(f"  Generated: {output_path}")

    return model, processor


async def generate_all_phrase_audio(engine: str, voice: str = None):
    """Generate audio for all speaking lesson phrases"""
    phrases = extract_phrases_from_curriculum()

    if not phrases:
        print("No phrases found in curriculum!")
        return

    AUDIO_DIR.mkdir(exist_ok=True)

    print(f"\nGenerating audio for {len(phrases)} phrases using {engine}...")

    if engine == "edge":
        voice = voice or "zh-CN-XiaoxiaoNeural"
        for phrase in phrases:
            output_path = str(AUDIO_DIR / phrase['filename'])
            await generate_edge_tts(phrase['characters'], output_path, voice)

    elif engine == "qwen":
        model, processor = None, None
        for phrase in phrases:
            output_path = str(AUDIO_DIR / phrase['filename'])
            model, processor = generate_qwen_tts(
                phrase['characters'], output_path, model, processor
            )

    print(f"\nDone! Generated {len(phrases)} audio files in {AUDIO_DIR}")


async def generate_custom_audio(engine: str, text: str, output: str, voice: str = None):
    """Generate audio for custom text"""
    if engine == "edge":
        voice = voice or "zh-CN-XiaoxiaoNeural"
        await generate_edge_tts(text, output, voice)
    elif engine == "qwen":
        generate_qwen_tts(text, output)


def list_phrases():
    """List all phrases that would be generated"""
    phrases = extract_phrases_from_curriculum()

    print(f"\nFound {len(phrases)} phrases in daily curriculum:\n")
    for p in phrases:
        print(f"  Day {p['day']}: {p['characters']}")
        print(f"    -> {p['filename']}")

    print(f"\n\nAll unique Chinese text in curriculum:\n")
    texts = extract_all_chinese_text()
    for i, text in enumerate(texts[:50]):  # Limit to first 50
        print(f"  {i+1}. {text}")
    if len(texts) > 50:
        print(f"  ... and {len(texts) - 50} more")


def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio for Mandarin Practice app")
    parser.add_argument("--engine", choices=["edge", "qwen"], default="edge",
                        help="TTS engine to use (default: edge)")
    parser.add_argument("--voice", type=str, default=None,
                        help="Voice to use (edge: zh-CN-XiaoxiaoNeural, zh-CN-YunxiNeural, etc.)")
    parser.add_argument("--list", action="store_true",
                        help="List all phrases without generating")
    parser.add_argument("--text", type=str,
                        help="Generate audio for specific text")
    parser.add_argument("--output", type=str,
                        help="Output file path (used with --text)")
    parser.add_argument("--phrases", action="store_true",
                        help="Generate audio for all speaking lesson phrases")

    args = parser.parse_args()

    if args.list:
        list_phrases()
        return

    if args.text:
        if not args.output:
            print("Error: --output required when using --text")
            sys.exit(1)
        asyncio.run(generate_custom_audio(args.engine, args.text, args.output, args.voice))
        return

    if args.phrases:
        asyncio.run(generate_all_phrase_audio(args.engine, args.voice))
        return

    # Default: generate all phrase audio
    asyncio.run(generate_all_phrase_audio(args.engine, args.voice))


if __name__ == "__main__":
    main()
