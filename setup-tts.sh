#!/bin/bash
#
# Set up Python virtual environment for TTS audio generation.
#
# Usage:
#   ./setup-tts.sh              # Set up with edge-tts only (lightweight)
#   ./setup-tts.sh --all        # Set up with all engines (requires GPU for some)
#   ./setup-tts.sh --cosyvoice  # Set up with CosyVoice
#   ./setup-tts.sh --chattts    # Set up with ChatTTS
#
# After setup:
#   source .venv/bin/activate
#   python generate-audio.py
#

set -e

cd "$(dirname "$0")"

VENV_DIR=".venv"

echo "📦 Setting up TTS virtual environment..."
echo ""

# Create venv if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
fi

# Activate venv
source "$VENV_DIR/bin/activate"

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Always install edge-tts (lightweight, works everywhere)
echo ""
echo "Installing edge-tts (Microsoft TTS, cloud-based)..."
pip install edge-tts

# Parse arguments
INSTALL_COSYVOICE=false
INSTALL_CHATTTS=false

for arg in "$@"; do
    case $arg in
        --all)
            INSTALL_COSYVOICE=true
            INSTALL_CHATTTS=true
            ;;
        --cosyvoice)
            INSTALL_COSYVOICE=true
            ;;
        --chattts)
            INSTALL_CHATTTS=true
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: ./setup-tts.sh [--all|--cosyvoice|--chattts]"
            exit 1
            ;;
    esac
done

# Install CosyVoice if requested
if [ "$INSTALL_COSYVOICE" = true ]; then
    echo ""
    echo "Installing CosyVoice (Alibaba/Qwen TTS)..."
    echo "Note: This requires ~2GB download on first use"
    pip install torch torchaudio
    pip install cosyvoice-v2 || echo "Warning: cosyvoice-v2 install failed, try: pip install git+https://github.com/FunAudioLLM/CosyVoice.git"
fi

# Install ChatTTS if requested
if [ "$INSTALL_CHATTTS" = true ]; then
    echo ""
    echo "Installing ChatTTS (open source TTS)..."
    pip install torch torchaudio
    pip install chattts || pip install ChatTTS
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To use:"
echo "  source $VENV_DIR/bin/activate"
echo "  python generate-audio.py --list              # List phrases"
echo "  python generate-audio.py                     # Generate with edge-tts"

if [ "$INSTALL_COSYVOICE" = true ]; then
    echo "  python generate-audio.py --engine cosyvoice  # Generate with CosyVoice"
fi

if [ "$INSTALL_CHATTTS" = true ]; then
    echo "  python generate-audio.py --engine chattts    # Generate with ChatTTS"
fi

echo ""
echo "Or use the all-in-one script:"
echo "  ./generate-and-push.sh"
