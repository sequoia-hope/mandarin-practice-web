#!/bin/bash
#
# Pull, generate audio, commit and push in one command.
#
# Usage:
#   ./generate-and-push.sh              # Generate and push
#   ./generate-and-push.sh --force      # Regenerate all audio
#   ./generate-and-push.sh --dry-run    # Preview only
#

set -e

cd "$(dirname "$0")"

echo "📥 Pulling latest changes..."
git pull

echo ""
echo "🎙️ Generating audio..."
python3 generate-audio.py "$@"

# Check if there are new audio files to commit
if git status --porcelain audio/ | grep -q .; then
    echo ""
    echo "📦 Committing new audio files..."
    git add audio/
    git commit -m "Generate TTS audio for daily curriculum phrases"

    echo ""
    echo "🚀 Pushing to remote..."
    git push

    echo ""
    echo "✅ Done! Audio files generated and pushed."
else
    echo ""
    echo "ℹ️  No new audio files to commit."
fi
