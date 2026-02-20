#!/usr/bin/env python3
"""
DungeonSlopper MIDI → Grungy WAV Renderer

Pipeline:
  1. FluidSynth renders MIDI → clean WAV (via subprocess)
  2. Pedalboard applies category-specific grungy effects
  3. Output: cohesive but distinct sound per category

Effect philosophy:
  - Everything shares a "dungeon reverb" base (large, dark, damp)
  - Each category gets its own dirt/character on top
  - Music: bitcrushed + warm distortion + heavy reverb
  - SFX: sharper, less reverb, more presence
  - UI: cleanest, but still lo-fi
"""

import os
import subprocess
import glob
import numpy as np
import soundfile as sf
from pedalboard import (
    Pedalboard, Reverb, Distortion, Bitcrush,
    HighpassFilter, LowpassFilter, Compressor, Gain,
    HighShelfFilter, LowShelfFilter,
)

# --- Config ---

BASE = os.path.dirname(os.path.abspath(__file__))
MIDI_DIR = os.path.join(BASE, "midi")
WAV_DIR = os.path.join(BASE, "wav")
SOUNDFONT = os.path.join(BASE, "soundfonts", "GeneralUser_GS.sf2")
SAMPLE_RATE = 44100
FLUIDSYNTH = "fluidsynth"

# --- Effect Chains (per category) ---
# Each returns a Pedalboard + optional post-process function

def fx_music_ambient():
    """Dungeon ambient: heavy reverb, warm, lo-fi."""
    return Pedalboard([
        Gain(gain_db=-3),
        LowpassFilter(cutoff_frequency_hz=7000),       # Dark, muffled
        Bitcrush(bit_depth=14),                         # Very subtle grit
        Distortion(drive_db=4),                         # Light warmth
        HighpassFilter(cutoff_frequency_hz=60),         # Remove sub rumble
        LowShelfFilter(cutoff_frequency_hz=200, gain_db=3),  # Boost low warmth
        Reverb(room_size=0.85, damping=0.7, wet_level=0.4, dry_level=0.65),
        Compressor(threshold_db=-18, ratio=4),
        Gain(gain_db=2),
    ])

def fx_music_combat():
    """Combat music: aggressive, crunchy, punchy."""
    return Pedalboard([
        Gain(gain_db=-2),
        Distortion(drive_db=10),                        # Moderate crunch
        Bitcrush(bit_depth=13),                         # Subtle grit
        HighpassFilter(cutoff_frequency_hz=80),
        LowpassFilter(cutoff_frequency_hz=9000),
        HighShelfFilter(cutoff_frequency_hz=3000, gain_db=-3),
        Reverb(room_size=0.5, damping=0.6, wet_level=0.25, dry_level=0.8),
        Compressor(threshold_db=-15, ratio=5),
        Gain(gain_db=3),
    ])

def fx_music_boss():
    """Boss fight: massive, driven, overwhelming."""
    return Pedalboard([
        Gain(gain_db=-1),
        Distortion(drive_db=14),                        # Heavy but not crushed
        Bitcrush(bit_depth=12),                         # Moderate grit
        HighpassFilter(cutoff_frequency_hz=50),
        LowpassFilter(cutoff_frequency_hz=10000),
        LowShelfFilter(cutoff_frequency_hz=150, gain_db=5),   # Big low end
        Reverb(room_size=0.6, damping=0.5, wet_level=0.3, dry_level=0.75),
        Compressor(threshold_db=-14, ratio=6),
        Gain(gain_db=4),
    ])

def fx_music_menu():
    """Menu theme: atmospheric, reverb-heavy, slightly cleaner."""
    return Pedalboard([
        Gain(gain_db=-3),
        LowpassFilter(cutoff_frequency_hz=5000),        # Very muffled/distant
        Bitcrush(bit_depth=14),                         # Subtle
        Distortion(drive_db=5),                         # Light warmth
        Reverb(room_size=0.9, damping=0.8, wet_level=0.55, dry_level=0.5),
        HighpassFilter(cutoff_frequency_hz=40),
        Compressor(threshold_db=-20, ratio=3),
        Gain(gain_db=1),
    ])

def fx_stinger():
    """Stingers: punchy, present, moderate reverb."""
    return Pedalboard([
        Gain(gain_db=-2),
        Distortion(drive_db=5),
        Bitcrush(bit_depth=14),
        HighpassFilter(cutoff_frequency_hz=100),
        LowpassFilter(cutoff_frequency_hz=9000),
        Reverb(room_size=0.7, damping=0.6, wet_level=0.3, dry_level=0.75),
        Compressor(threshold_db=-16, ratio=4),
        Gain(gain_db=3),
    ])

def fx_player():
    """Player sounds: close, intimate, slight grit, less reverb."""
    return Pedalboard([
        Gain(gain_db=-1),
        Distortion(drive_db=6),                         # Light crunch
        Bitcrush(bit_depth=14),                         # Barely there
        HighpassFilter(cutoff_frequency_hz=120),
        LowpassFilter(cutoff_frequency_hz=8000),
        Reverb(room_size=0.4, damping=0.5, wet_level=0.2, dry_level=0.85),
        Compressor(threshold_db=-14, ratio=4),
        Gain(gain_db=4),
    ])

def fx_skeleton():
    """Skeleton sounds: dry, bony, sharp transients, medium reverb."""
    return Pedalboard([
        Gain(gain_db=-2),
        HighpassFilter(cutoff_frequency_hz=200),        # Remove body, keep click
        Distortion(drive_db=8),                         # Moderate crunch
        Bitcrush(bit_depth=13),                         # Light digital edge
        LowpassFilter(cutoff_frequency_hz=7000),
        HighShelfFilter(cutoff_frequency_hz=2000, gain_db=2),  # Slight click boost
        Reverb(room_size=0.55, damping=0.6, wet_level=0.3, dry_level=0.75),
        Compressor(threshold_db=-15, ratio=4),
        Gain(gain_db=3),
    ])

def fx_environment():
    """Environment sounds: very wet reverb, dark, distant."""
    return Pedalboard([
        Gain(gain_db=-4),
        LowpassFilter(cutoff_frequency_hz=5000),        # Dark
        Bitcrush(bit_depth=15),                         # Nearly clean
        Distortion(drive_db=3),                         # Touch of warmth
        HighpassFilter(cutoff_frequency_hz=50),
        Reverb(room_size=0.95, damping=0.85, wet_level=0.55, dry_level=0.5),
        Compressor(threshold_db=-22, ratio=3),
        Gain(gain_db=2),
    ])

def fx_ui():
    """UI sounds: clearest of all, but still lo-fi character."""
    return Pedalboard([
        Gain(gain_db=-2),
        Bitcrush(bit_depth=12),                         # Subtle retro
        Distortion(drive_db=4),                         # Barely there
        HighpassFilter(cutoff_frequency_hz=150),
        LowpassFilter(cutoff_frequency_hz=10000),       # Less dark
        Reverb(room_size=0.3, damping=0.4, wet_level=0.15, dry_level=0.9),
        Compressor(threshold_db=-18, ratio=3),
        Gain(gain_db=3),
    ])


# --- File → Effect Chain Mapping ---

# Map specific files to specific chains when they need special treatment
SPECIAL_FX = {
    "05_combat_tension": fx_music_combat,
    "06_boss_fight": fx_music_boss,
    "04_menu_theme": fx_music_menu,
}

# Map categories to default chains
CATEGORY_FX = {
    "music": fx_music_ambient,
    "stingers": fx_stinger,
    "player": fx_player,
    "skeleton": fx_skeleton,
    "environment": fx_environment,
    "ui": fx_ui,
}


def add_noise(audio: np.ndarray, intensity: float = 0.003) -> np.ndarray:
    """Add subtle noise floor for analog grit."""
    noise = np.random.normal(0, intensity, audio.shape).astype(np.float32)
    return audio + noise


def render_midi_to_wav(midi_path: str, wav_path: str):
    """Render a MIDI file to WAV using FluidSynth."""
    cmd = [
        FLUIDSYNTH,
        "-ni",                  # No interactive, no MIDI input
        "-F", wav_path,         # Output file
        "-r", str(SAMPLE_RATE), # Sample rate
        "-g", "0.5",            # Gain (moderate)
        SOUNDFONT,
        midi_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if not os.path.exists(wav_path):
        print(f"  ERROR: FluidSynth failed for {midi_path}")
        print(f"  stderr: {result.stderr[:200]}")
        return False
    return True


def process_file(midi_path: str, category: str):
    """Full pipeline: render MIDI → apply effects → save WAV."""
    filename = os.path.splitext(os.path.basename(midi_path))[0]

    # Create output directory
    out_dir = os.path.join(WAV_DIR, category)
    os.makedirs(out_dir, exist_ok=True)

    clean_path = os.path.join(out_dir, f"{filename}_clean.wav")
    final_path = os.path.join(out_dir, f"{filename}.wav")

    # Step 1: Render MIDI → clean WAV
    if not render_midi_to_wav(midi_path, clean_path):
        return False

    # Step 2: Load clean audio
    audio, sr = sf.read(clean_path, dtype='float32')

    # Handle mono → ensure 2D array
    if audio.ndim == 1:
        audio = audio.reshape(-1, 1)

    # Trim silence from end (keep leading silence for timing)
    # Find last sample above threshold
    threshold = 0.001
    abs_audio = np.abs(audio).max(axis=1) if audio.ndim > 1 else np.abs(audio)
    nonsilent = np.where(abs_audio > threshold)[0]
    if len(nonsilent) > 0:
        # Keep 0.5s tail after last audible sample
        tail_samples = int(0.5 * sr)
        end_idx = min(len(audio), nonsilent[-1] + tail_samples)
        audio = audio[:end_idx]

    # Step 3: Pick effect chain
    if filename in SPECIAL_FX:
        board = SPECIAL_FX[filename]()
        fx_name = filename
    else:
        board = CATEGORY_FX.get(category, fx_ui)()
        fx_name = category

    # Step 4: Apply effects
    processed = board(audio, sr)

    # Step 5: Add noise floor (analog grit)
    noise_intensity = {
        "music": 0.0015,
        "stingers": 0.001,
        "player": 0.002,
        "skeleton": 0.0015,
        "environment": 0.0025,
        "ui": 0.0008,
    }.get(category, 0.001)

    processed = add_noise(processed, noise_intensity)

    # Step 6: Normalize to prevent clipping
    peak = np.max(np.abs(processed))
    if peak > 0:
        processed = processed * (0.9 / peak)

    # Step 7: Save
    sf.write(final_path, processed, sr)

    # Clean up intermediate file
    os.remove(clean_path)

    size_kb = os.path.getsize(final_path) / 1024
    print(f"  {filename}.wav ({size_kb:.0f} KB) [fx: {fx_name}]")
    return True


def main():
    print("=== DungeonSlopper MIDI → Grungy WAV Renderer ===\n")

    if not os.path.exists(SOUNDFONT):
        print(f"ERROR: Soundfont not found at {SOUNDFONT}")
        print("Run the download script first or place a .sf2 file there.")
        return

    categories = ["music", "stingers", "player", "skeleton", "environment", "ui"]
    total = 0
    success = 0

    for category in categories:
        cat_dir = os.path.join(MIDI_DIR, category)
        if not os.path.isdir(cat_dir):
            continue

        midi_files = sorted(glob.glob(os.path.join(cat_dir, "*.mid")))
        if not midi_files:
            continue

        print(f"\n--- {category.upper()} ({len(midi_files)} files) ---")

        for midi_path in midi_files:
            total += 1
            if process_file(midi_path, category):
                success += 1

    print(f"\n=== Done! {success}/{total} files rendered to {WAV_DIR} ===")


if __name__ == "__main__":
    main()
