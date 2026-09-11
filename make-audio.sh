#!/bin/bash
# Generate the Brooklyn case-study narration as an MP3 using edge-tts (UK female voice).
# Run from the folder that contains narration.txt:   bash make-audio.sh

set -e
cd "$(dirname "$0")"

VOICE="${VOICE:-en-GB-SoniaNeural}"   # other UK female options: en-GB-LibbyNeural, en-GB-MaisieNeural
RATE="${RATE:--5%}"                   # slightly slower than default; set to +0% for normal
OUT="brooklyn-pbs-final-assignment.mp3"

if ! command -v edge-tts >/dev/null 2>&1; then
  echo "Installing edge-tts..."
  python3 -m pip install --user --quiet edge-tts || pip3 install --user --quiet edge-tts
  export PATH="$PATH:$(python3 -c 'import site,os;print(os.path.join(site.USER_BASE,"bin"))')"
fi

echo "Voice: $VOICE   Rate: $RATE"
edge-tts --voice "$VOICE" --rate="$RATE" --file narration.txt --write-media "$OUT" --write-subtitles "brooklyn-pbs-final-assignment.vtt"

echo "Done -> $(pwd)/$OUT"

# List every UK voice available:
#   edge-tts --list-voices | grep en-GB
