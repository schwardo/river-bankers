"""Transcribe full_gemini_kore.mp3 via Google Cloud Speech-to-Text, then
align our known narration sentences against the word-timestamps to produce
sentence-level start times.

Output: writes `kore_alignment.json` with one entry per sentence (in script
order) giving {text, start_s, end_s}. Also prints the mapping for quick
inspection.
"""
import json
import re
import subprocess
import sys

from google.cloud import speech


AUDIO = "full_gemini_kore.mp3"
SAMPLE_RATE = 16000  # we'll resample to this
WAV = "/tmp/full_gemini_kore_16k.wav"
GCS_URI = "gs://riverbankers-promo-tts-1780889179/full_gemini_kore_16k.wav"


def ffmpeg_to_wav() -> None:
    """Speech API mono PCM at 16kHz is the universal-input safe choice."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", AUDIO,
         "-ac", "1", "-ar", str(SAMPLE_RATE), "-acodec", "pcm_s16le", WAV],
        check=True, capture_output=True,
    )


def transcribe() -> list:
    """Return a list of (word, start_s, end_s) using long_running_recognize
    with a GCS URI (inline audio is limited to 60 seconds)."""
    client = speech.SpeechClient()
    audio = speech.RecognitionAudio(uri=GCS_URI)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=SAMPLE_RATE,
        language_code="en-US",
        enable_word_time_offsets=True,
        model="latest_long",
        enable_automatic_punctuation=True,
    )
    operation = client.long_running_recognize(config=config, audio=audio)
    print("Waiting for transcription to complete…", file=sys.stderr)
    response = operation.result(timeout=300)
    words = []
    for result in response.results:
        alt = result.alternatives[0]
        for w in alt.words:
            start = w.start_time.total_seconds()
            end = w.end_time.total_seconds()
            words.append((w.word, start, end))
    return words


def normalize(s: str) -> str:
    """For alignment we compare lowercased, alphanumeric-only tokens."""
    return re.sub(r"[^a-z0-9]", "", s.lower())


def load_sentences() -> list:
    """Read narration.txt; each non-blank line is a sentence (sometimes
    containing multiple sentences). We split on . ! ? so each clause aligns
    independently, but then re-merge by scene boundary downstream."""
    with open("narration.txt") as f:
        text = f.read().strip()
    # Split on sentence terminators while keeping punctuation off the result
    sents = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sents if s.strip()]


def align(sentences: list, words: list) -> list:
    """For each sentence, find the start time of its first word in the
    transcript by walking forward through the word list."""
    out = []
    word_idx = 0
    for sent in sentences:
        sent_tokens = [normalize(t) for t in sent.split() if normalize(t)]
        if not sent_tokens:
            continue
        # Find first sent token in the transcript starting from word_idx
        target = sent_tokens[0]
        best_idx = None
        for j in range(word_idx, len(words)):
            w_norm = normalize(words[j][0])
            if w_norm == target:
                best_idx = j
                break
            # Allow partial: target startswith w_norm or vice versa
            if len(w_norm) >= 3 and (w_norm in target or target in w_norm):
                best_idx = j
                break
        if best_idx is None:
            print(f"  WARN: could not find start of: {sent!r}", file=sys.stderr)
            start = None
            end = None
        else:
            start = words[best_idx][1]
            # Walk forward through this sentence's tokens to find the end
            sent_end_idx = best_idx
            for k, tok in enumerate(sent_tokens):
                if best_idx + k >= len(words):
                    break
                w_norm = normalize(words[best_idx + k][0])
                if w_norm == tok or (len(w_norm) >= 3 and (w_norm in tok or tok in w_norm)):
                    sent_end_idx = best_idx + k
            end = words[sent_end_idx][2]
            word_idx = sent_end_idx + 1
        out.append({"text": sent, "start_s": start, "end_s": end})
    return out


def main() -> int:
    ffmpeg_to_wav()
    words = transcribe()
    print(f"Got {len(words)} words from transcription", file=sys.stderr)
    sentences = load_sentences()
    print(f"Loaded {len(sentences)} sentences from narration.txt", file=sys.stderr)
    aligned = align(sentences, words)
    with open("kore_alignment.json", "w") as f:
        json.dump({"sentences": aligned, "words": [
            {"word": w[0], "start_s": w[1], "end_s": w[2]} for w in words
        ]}, f, indent=2)
    print(json.dumps(aligned, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
