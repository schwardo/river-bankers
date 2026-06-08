"""Generate a voiceover via Vertex AI Gemini TTS.

Reads narration.txt, calls gemini-2.5-flash-preview-tts with a style
instruction for the warm, conversational pacing the script needs, and
writes a 24 kHz PCM WAV plus a 192 kbps MP3 alongside it.
"""

import argparse
import os
import struct
import subprocess
import sys
import wave

from google import genai
from google.genai import types

# Default voice. Gemini TTS prebuilt voices (mid-2026): Kore, Puck, Charon,
# Fenrir, Aoede, Leda, Orus, Zephyr, ... Aoede is breezy/expressive;
# Kore is grounded/clear. We'll start with Aoede as the closest natural
# replacement for Ava (expressive female).
DEFAULT_VOICE = "Aoede"
DEFAULT_MODEL = "gemini-2.5-flash-preview-tts"
DEFAULT_PROJECT = "nanochat-don"
DEFAULT_LOCATION = "us-central1"

# Style instruction prepended to the narration. Gemini TTS uses natural-
# language steering — we describe the desired delivery in plain English.
STYLE = (
    "Read the following promotional narration in a warm, conversational "
    "tone. Speak at a relaxed pace — about 145 to 150 words per minute. "
    "Use light emphasis on numbers and rule names. Take a brief breath "
    "between sentences. Sound engaged, not announcer-y. The audience is "
    "tabletop game hobbyists."
)


def generate(text: str, out_wav: str, voice: str, model: str,
             project: str, location: str) -> None:
    client = genai.Client(vertexai=True, project=project, location=location)
    prompt = STYLE + "\n\n" + text

    print(f"Calling {model} with voice={voice} in {project}/{location} …",
          file=sys.stderr)
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice
                    )
                )
            ),
        ),
    )

    # The audio comes back as raw 24 kHz, 16-bit, mono PCM in inline_data.
    candidate = response.candidates[0]
    audio_bytes = candidate.content.parts[0].inline_data.data
    print(f"Received {len(audio_bytes)} bytes of audio", file=sys.stderr)

    # Wrap raw PCM in a WAV container so it can be played anywhere.
    with wave.open(out_wav, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(24000)
        wf.writeframes(audio_bytes)
    print(f"Wrote {out_wav}", file=sys.stderr)


def to_mp3(wav: str, mp3: str) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-i", wav, "-codec:a", "libmp3lame",
         "-b:a", "192k", mp3],
        check=True, capture_output=True,
    )
    print(f"Wrote {mp3}", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--text-file", default="narration.txt")
    ap.add_argument("--out-stem", default="full_gemini",
                    help="Output basename (no extension)")
    ap.add_argument("--voice", default=DEFAULT_VOICE)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--project", default=DEFAULT_PROJECT)
    ap.add_argument("--location", default=DEFAULT_LOCATION)
    args = ap.parse_args()

    with open(args.text_file) as f:
        text = f.read().strip()

    wav = f"{args.out_stem}.wav"
    mp3 = f"{args.out_stem}.mp3"
    generate(text, wav, args.voice, args.model, args.project, args.location)
    to_mp3(wav, mp3)
    return 0


if __name__ == "__main__":
    sys.exit(main())
