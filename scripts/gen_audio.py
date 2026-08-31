#!/usr/bin/env python3
"""Render TOEFL listening scripts to MP3 with Kokoro-82M.

Build-time only. Nothing here runs in production; the site ships the MP3s.

  VIRTUAL_ENV=$PWD/.venv-tts .venv-tts/bin/python scripts/gen_audio.py [--force] [id ...]
"""
import json, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/toefl/data/listening"
OUT = ROOT / "public/toefl/audio"
SR = 24000

VOICES = {
    "female-a": "af_bella",
    "female-b": "af_sarah",
    "male-a": "am_michael",
    "male-b": "am_fenrir",
}
NARRATOR = "af_heart"

GAP_SAME = 0.28      # pause between consecutive lines from one speaker
GAP_TURN = 0.55      # pause when the speaker changes
GAP_INTRO = 0.85     # after the narrator's framing line

pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")


def synth(text: str, voice: str) -> np.ndarray:
    """Kokoro degrades on very long inputs, so let it split on sentences."""
    parts = [audio for _, _, audio in pipeline(text, voice=voice, speed=1.0)]
    if not parts:
        raise RuntimeError(f"no audio for {text[:60]!r}")
    return np.concatenate(parts)


def silence(seconds: float) -> np.ndarray:
    return np.zeros(int(SR * seconds), dtype=np.float32)


def render(item: dict) -> tuple[np.ndarray, list[dict]]:
    voice_of = {s["id"]: VOICES[s["voice"]] for s in item["speakers"]}
    label_of = {s["id"]: s["label_en"] for s in item["speakers"]}

    chunks: list[np.ndarray] = []
    times: list[dict] = []
    cursor = 0.0

    def push(audio: np.ndarray, meta: dict | None):
        nonlocal cursor
        start = cursor
        chunks.append(audio)
        cursor += len(audio) / SR
        if meta is not None:
            times.append({**meta, "start": round(start, 3), "end": round(cursor, 3)})

    kind = "a lecture" if item["kind"] == "lecture" else "a conversation"
    push(synth(f"Listen to part of {kind}. {item['setting_en']}", NARRATOR), None)
    push(silence(GAP_INTRO), None)

    prev = None
    for i, line in enumerate(item["script"]):
        if prev is not None:
            push(silence(GAP_SAME if line["speaker"] == prev else GAP_TURN), None)
        push(synth(line["text"], voice_of[line["speaker"]]),
             {"line": i, "speaker": line["speaker"], "label": label_of[line["speaker"]]})
        prev = line["speaker"]

    push(silence(0.6), None)
    return np.concatenate(chunks), times


def encode(audio: np.ndarray, dest: Path):
    """48 kbps mono MP3: transparent enough for speech, small enough for mobile data."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, audio, SR)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name,
             "-ac", "1", "-ar", "24000", "-b:a", "48k", "-codec:a", "libmp3lame", str(dest)],
            check=True,
        )
    Path(tmp.name).unlink()


def main():
    args = sys.argv[1:]
    force = "--force" in args
    only = {a for a in args if not a.startswith("--")}

    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(SRC.glob("*.json"))
    if not files:
        sys.exit(f"no listening items in {SRC}")

    for path in files:
        item = json.loads(path.read_text(encoding="utf-8"))
        item_id = item["id"]
        if only and item_id not in only:
            continue
        mp3 = OUT / f"{item_id}.mp3"
        if mp3.exists() and not force:
            print(f"  skip {item_id} (exists)")
            continue

        print(f"  render {item_id} ...", flush=True)
        audio, times = render(item)
        encode(audio, mp3)
        (OUT / f"{item_id}.times.json").write_text(
            json.dumps({"id": item_id, "duration": round(len(audio) / SR, 3), "lines": times},
                       ensure_ascii=False, indent=1),
            encoding="utf-8",
        )
        print(f"    {len(audio) / SR:6.1f}s  {mp3.stat().st_size / 1024:6.0f} KB")

    total = sum(p.stat().st_size for p in OUT.glob("*.mp3"))
    print(f"\n{len(list(OUT.glob('*.mp3')))} clips, {total / 1024 / 1024:.1f} MB total")


if __name__ == "__main__":
    main()
