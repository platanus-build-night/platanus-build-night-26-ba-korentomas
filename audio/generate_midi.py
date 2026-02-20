#!/usr/bin/env python3
"""
DungeonSlopper MIDI Sound Generator
Generates all game audio as MIDI files with a grungy, grainy, noisy aesthetic.

Aesthetic approach:
- Minor keys, diminished chords, tritones
- Heavy pitch bend for detuning/wrongness
- Velocity extremes (pp to fff)
- Cluster chords for noise textures
- Channel 10 percussion for impacts
- Rapid note repetitions for grit
- Low drones for oppression
"""

import os
import random
from mido import MidiFile, MidiTrack, Message, MetaMessage

random.seed(42)  # Reproducible but "random" feeling

OUT = os.path.dirname(os.path.abspath(__file__))
TICKS = 480  # Ticks per beat

# --- MIDI Helpers ---

def save(mid: MidiFile, category: str, name: str):
    path = os.path.join(OUT, "midi", category, f"{name}.mid")
    mid.save(path)
    print(f"  -> {path}")

def new_midi(tempo_bpm: int = 120) -> MidiFile:
    mid = MidiFile(ticks_per_beat=TICKS)
    return mid

def add_tempo(track: MidiTrack, bpm: int):
    tempo = int(60_000_000 / bpm)
    track.append(MetaMessage('set_tempo', tempo=tempo, time=0))

def add_name(track: MidiTrack, name: str):
    track.append(MetaMessage('track_name', name=name, time=0))

def program(track: MidiTrack, ch: int, prog: int):
    track.append(Message('program_change', channel=ch, program=prog, time=0))

def note(track: MidiTrack, ch: int, pitch: int, vel: int, dur: int, time: int = 0):
    """Add a note with given duration in ticks."""
    track.append(Message('note_on', channel=ch, note=pitch, velocity=vel, time=time))
    track.append(Message('note_off', channel=ch, note=pitch, velocity=0, time=dur))

def chord(track: MidiTrack, ch: int, pitches: list, vel: int, dur: int, time: int = 0):
    """Play multiple notes simultaneously."""
    for i, p in enumerate(pitches):
        track.append(Message('note_on', channel=ch, note=p, velocity=vel, time=time if i == 0 else 0))
    for i, p in enumerate(pitches):
        track.append(Message('note_off', channel=ch, note=p, velocity=0, time=dur if i == 0 else 0))

def pitch_bend(track: MidiTrack, ch: int, value: int, time: int = 0):
    """Pitch bend: -8192=max down, 0=center, 8191=max up."""
    clamped = max(-8192, min(8191, value))
    track.append(Message('pitchwheel', channel=ch, pitch=clamped, time=time))

def cc(track: MidiTrack, ch: int, control: int, value: int, time: int = 0):
    track.append(Message('control_change', channel=ch, control=control, value=value, time=time))

def rest(track: MidiTrack, ticks: int):
    track.append(Message('note_off', channel=0, note=0, velocity=0, time=ticks))

def beats(n: float) -> int:
    return int(TICKS * n)

# Grungy velocity: mostly hard with random dips
def gvel(base: int = 100) -> int:
    return max(1, min(127, base + random.randint(-25, 15)))

# Detune: slight pitch bend wobble
def detune_sequence(track: MidiTrack, ch: int, steps: int = 8, intensity: int = 300):
    for i in range(steps):
        val = random.randint(-intensity, intensity)
        pitch_bend(track, ch, random.randint(-intensity, intensity), time=beats(0.25))

# --- SCALES & CHORDS ---

# D minor (the saddest of all keys)
D_MIN = [38, 40, 41, 43, 45, 46, 48, 50]  # D E F G A Bb C D (octave 2-3)
D_MIN_HIGH = [62, 64, 65, 67, 69, 70, 72, 74]

# Diminished for dread
D_DIM = [38, 41, 44, 47]  # D F Ab B
D_DIM7 = [50, 53, 56, 59]

# Tritone intervals for wrongness
TRITONES = [(38, 44), (43, 49), (45, 51)]

# Power chords (root + fifth, grungy)
def power(root: int) -> list:
    return [root, root + 7]

def power_dirty(root: int) -> list:
    """Power chord with added minor 2nd for grit."""
    return [root, root + 1, root + 7]

# ============================================================
# MUSIC TRACKS
# ============================================================

def music_dungeon_ambient():
    """Floors 1-3: Low drone, distant drips, faint dissonance."""
    print("Generating: Dungeon Ambient (Floors 1-3)")
    mid = new_midi()

    # Track 0: Tempo
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 60)
    add_name(t0, "Dungeon Ambient")

    # Track 1: Deep organ drone
    drone = MidiTrack(); mid.tracks.append(drone)
    add_name(drone, "Drone")
    program(drone, 0, 19)  # Church Organ
    cc(drone, 0, 7, 70)  # Volume
    cc(drone, 0, 91, 100)  # Reverb

    # 32 bars of slow evolving drone
    drone_notes = [38, 38, 36, 38, 41, 38, 36, 33,
                   38, 38, 41, 38, 36, 38, 33, 38,
                   38, 40, 38, 36, 38, 41, 38, 36,
                   33, 38, 36, 38, 38, 41, 38, 38]
    for i, n in enumerate(drone_notes):
        vel = gvel(50)
        # Slow detune wobble
        pitch_bend(drone, 0, random.randint(-200, 200), time=0)
        note(drone, 0, n, vel, beats(4))

    # Track 2: Dissonant string stabs (sparse)
    strings = MidiTrack(); mid.tracks.append(strings)
    add_name(strings, "Strings")
    program(strings, 1, 49)  # String Ensemble
    cc(strings, 1, 91, 110)  # Heavy reverb

    for bar in range(32):
        if random.random() < 0.25:  # Only 25% of bars
            # Cluster chord: close intervals = grungy
            root = random.choice([38, 41, 44, 47])
            pitches = [root, root + 1, root + 5]  # Minor 2nd + 4th = nasty
            vel = gvel(40)
            chord(strings, 1, pitches, vel, beats(3))
            rest(strings, beats(1))
        else:
            rest(strings, beats(4))

    # Track 3: Percussion drips (channel 10)
    perc = MidiTrack(); mid.tracks.append(perc)
    add_name(perc, "Drips")

    for bar in range(32):
        for beat_idx in range(16):  # 16th note resolution
            if random.random() < 0.06:  # Sparse random drips
                # Use woodblock/click sounds
                note(perc, 9, random.choice([75, 76, 77]), gvel(30), beats(0.125))
            else:
                rest(perc, beats(0.25))

    save(mid, "music", "01_dungeon_ambient_floors1-3")

def music_dungeon_deep():
    """Floors 4-6: Darker, deeper reverb, subtle dissonant strings."""
    print("Generating: Dungeon Deep (Floors 4-6)")
    mid = new_midi()

    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 50)  # Slower = more dread
    add_name(t0, "Dungeon Deep")

    # Track 1: Sub bass drone
    bass = MidiTrack(); mid.tracks.append(bass)
    add_name(bass, "Sub Drone")
    program(bass, 0, 39)  # Synth Bass
    cc(bass, 0, 7, 90)
    cc(bass, 0, 91, 127)  # Max reverb

    # Deep drone with tritone shifts
    for bar in range(32):
        root = random.choice([26, 28, 31, 33])  # Very low
        # Hold root
        note(bass, 0, root, gvel(70), beats(3))
        # Tritone stab
        note(bass, 0, root + 6, gvel(50), beats(1))

    # Track 2: Creepy high strings
    high = MidiTrack(); mid.tracks.append(high)
    add_name(high, "High Strings")
    program(high, 1, 48)  # Strings tremolo
    cc(high, 1, 91, 120)

    for bar in range(32):
        if random.random() < 0.2:
            # Dissonant high cluster
            root = random.choice([72, 74, 77, 79])
            pitches = [root, root + 1, root + 6]
            chord(high, 1, pitches, gvel(35), beats(6))
        elif random.random() < 0.1:
            # Descending chromatic line
            for step in range(4):
                note(high, 1, 76 - step, gvel(30), beats(1))
        else:
            rest(high, beats(4))

    # Track 3: Metallic percussion
    metal = MidiTrack(); mid.tracks.append(metal)
    add_name(metal, "Metal Hits")

    for bar in range(32):
        for sub in range(8):
            if random.random() < 0.04:
                # Anvil/metal sounds
                note(metal, 9, random.choice([56, 59, 80, 81]), gvel(45), beats(0.25))
            else:
                rest(metal, beats(0.5))

    save(mid, "music", "02_dungeon_deep_floors4-6")

def music_dungeon_abyss():
    """Floors 7+: Oppressive, industrial, hostile."""
    print("Generating: Dungeon Abyss (Floors 7+)")
    mid = new_midi()

    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 70)
    add_name(t0, "Dungeon Abyss")

    # Track 1: Industrial bass pulse
    bass = MidiTrack(); mid.tracks.append(bass)
    add_name(bass, "Industrial Bass")
    program(bass, 0, 87)  # Lead (fifth)
    cc(bass, 0, 7, 100)
    cc(bass, 0, 91, 100)

    # Relentless low pulse with pitch bend sickness
    for bar in range(32):
        root = random.choice([26, 28, 31])
        for pulse in range(8):
            pitch_bend(bass, 0, random.randint(-1000, 1000))
            vel = gvel(90) if pulse % 2 == 0 else gvel(60)
            note(bass, 0, root, vel, beats(0.4), time=beats(0.1) if pulse > 0 else 0)

    # Track 2: Noise texture (rapid clusters)
    noise = MidiTrack(); mid.tracks.append(noise)
    add_name(noise, "Noise Texture")
    program(noise, 1, 30)  # Overdriven Guitar
    cc(noise, 1, 7, 60)
    cc(noise, 1, 91, 90)

    for bar in range(32):
        if random.random() < 0.35:
            # Rapid cluster burst
            for i in range(random.randint(4, 12)):
                root = random.randint(36, 60)
                pitches = [root, root + 1, root + 2]
                vel = random.randint(20, 100)
                for j, p in enumerate(pitches):
                    noise.append(Message('note_on', channel=1, note=p, velocity=vel, time=0))
                dur = random.randint(beats(0.0625), beats(0.25))
                for j, p in enumerate(pitches):
                    noise.append(Message('note_off', channel=1, note=p, velocity=0, time=dur if j == 0 else 0))
            rest(noise, beats(1))
        else:
            rest(noise, beats(4))

    # Track 3: Heavy percussion
    drums = MidiTrack(); mid.tracks.append(drums)
    add_name(drums, "Drums")

    for bar in range(32):
        for eighth in range(8):
            hits = []
            if eighth % 4 == 0:
                hits.append((36, gvel(110)))  # Kick
            if eighth % 4 == 2:
                hits.append((38, gvel(100)))  # Snare
            if random.random() < 0.3:
                hits.append((42, gvel(60)))  # Closed hi-hat

            if hits:
                for i, (n, v) in enumerate(hits):
                    drums.append(Message('note_on', channel=9, note=n, velocity=v, time=0))
                drums.append(Message('note_off', channel=9, note=hits[0][0], velocity=0, time=beats(0.5)))
                for i, (n, v) in enumerate(hits[1:]):
                    drums.append(Message('note_off', channel=9, note=n, velocity=0, time=0))
            else:
                rest(drums, beats(0.5))

    save(mid, "music", "03_dungeon_abyss_floors7plus")

def music_menu_theme():
    """Slow, foreboding organ/choir. Gothic."""
    print("Generating: Menu Theme")
    mid = new_midi()

    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 55)
    add_name(t0, "Menu Theme")

    # Track 1: Church organ - main voice
    organ = MidiTrack(); mid.tracks.append(organ)
    add_name(organ, "Organ")
    program(organ, 0, 19)  # Church Organ
    cc(organ, 0, 7, 85)
    cc(organ, 0, 91, 120)

    # Gothic progression in D minor
    progression = [
        ([38, 45, 50], 4),   # Dm
        ([36, 43, 48], 4),   # C
        ([33, 41, 45], 4),   # A (minor feel)
        ([34, 41, 46], 4),   # Bb
        ([38, 44, 50], 4),   # Dm(b5) - grungy
        ([36, 43, 48], 2),   # C
        ([35, 43, 47], 2),   # Bdim
        ([38, 45, 50], 4),   # Dm
    ]
    # Play twice
    for _ in range(2):
        for pitches, dur in progression:
            vel = gvel(65)
            pitch_bend(organ, 0, random.randint(-100, 100))
            chord(organ, 0, pitches, vel, beats(dur))

    # Track 2: Choir pad
    choir = MidiTrack(); mid.tracks.append(choir)
    add_name(choir, "Choir")
    program(choir, 1, 52)  # Choir Aahs
    cc(choir, 1, 7, 60)
    cc(choir, 1, 91, 127)

    choir_notes = [
        ([62, 69], 8), ([60, 67], 8),
        ([57, 65], 8), ([58, 65], 8),
        ([62, 68], 8), ([60, 67], 4), ([59, 67], 4),
        ([62, 69], 8), (None, 8),
    ]
    for _ in range(1):
        for pitches, dur in choir_notes:
            if pitches:
                pitch_bend(choir, 1, random.randint(-150, 150))
                chord(choir, 1, pitches, gvel(45), beats(dur))
            else:
                rest(choir, beats(dur))

    save(mid, "music", "04_menu_theme")

def music_combat_tension():
    """Percussive, driving, medieval urgency."""
    print("Generating: Combat Tension")
    mid = new_midi()

    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 140)
    add_name(t0, "Combat Tension")

    # Track 1: Driving distorted bass
    bass = MidiTrack(); mid.tracks.append(bass)
    add_name(bass, "Bass")
    program(bass, 0, 30)  # Overdriven Guitar
    cc(bass, 0, 7, 100)
    cc(bass, 0, 91, 70)

    riff_patterns = [
        [38, 38, 0, 38, 44, 0, 38, 41,  38, 38, 0, 44, 38, 0, 41, 36],
        [38, 0, 38, 38, 44, 0, 41, 38,  36, 0, 38, 38, 44, 38, 0, 41],
        [33, 33, 0, 33, 39, 0, 33, 36,  33, 33, 0, 39, 33, 0, 36, 31],
        [38, 38, 0, 38, 44, 0, 38, 41,  46, 44, 0, 41, 38, 0, 36, 38],
    ]
    for _ in range(4):  # 4 repeats of all patterns
        for pattern in riff_patterns:
            for n in pattern:
                if n > 0:
                    pitch_bend(bass, 0, random.randint(-400, 400))
                    note(bass, 0, n, gvel(105), beats(0.4))
                else:
                    rest(bass, beats(0.5))

    # Track 2: Aggressive drums
    drums = MidiTrack(); mid.tracks.append(drums)
    add_name(drums, "Drums")

    kick_pattern =  [1,0,0,1,1,0,0,0, 1,0,0,1,1,0,1,0]
    snare_pattern = [0,0,1,0,0,0,1,0, 0,0,1,0,0,1,1,0]
    hh_pattern =    [1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1]

    for _ in range(64):  # 64 bars
        for i in range(16):
            events = []
            if kick_pattern[i]:
                events.append((36, gvel(115)))
            if snare_pattern[i]:
                events.append((38, gvel(105)))
            if hh_pattern[i]:
                events.append((42 if random.random() > 0.2 else 46, gvel(70)))

            if events:
                for j, (n, v) in enumerate(events):
                    drums.append(Message('note_on', channel=9, note=n, velocity=v, time=0))
                drums.append(Message('note_off', channel=9, note=events[0][0], velocity=0, time=beats(0.25)))
                for j, (n, v) in enumerate(events[1:]):
                    drums.append(Message('note_off', channel=9, note=n, velocity=0, time=0))
            else:
                rest(drums, beats(0.25))

    # Track 3: Stab chords
    stabs = MidiTrack(); mid.tracks.append(stabs)
    add_name(stabs, "Stabs")
    program(stabs, 2, 29)  # Overdriven Guitar
    cc(stabs, 2, 7, 80)

    stab_chords = [
        power_dirty(38), None, None, power(44), None, power_dirty(41), None, None,
        power_dirty(38), None, power(46), None, power_dirty(44), None, power(36), None,
    ]
    for _ in range(32):
        for s in stab_chords:
            if s:
                chord(stabs, 2, s, gvel(100), beats(0.4))
            else:
                rest(stabs, beats(0.5))

    save(mid, "music", "05_combat_tension")

def music_boss_fight():
    """Full orchestral/metal hybrid. Heavy, escalating."""
    print("Generating: Boss Fight")
    mid = new_midi()

    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 155)
    add_name(t0, "Boss Fight")

    # Track 1: Double bass drum assault
    drums = MidiTrack(); mid.tracks.append(drums)
    add_name(drums, "Drums")

    # Phase 1: Steady pummel (16 bars)
    for bar in range(16):
        for sixteenth in range(16):
            events = []
            # Double kick on every 16th
            events.append((36, gvel(120)))
            # Snare on 2 and 4
            if sixteenth in [4, 12]:
                events.append((38, gvel(115)))
            # Crash on bar start
            if sixteenth == 0 and bar % 4 == 0:
                events.append((49, gvel(100)))
            # Hi-hat
            if sixteenth % 2 == 0:
                events.append((42, gvel(75)))

            for j, (n, v) in enumerate(events):
                drums.append(Message('note_on', channel=9, note=n, velocity=v, time=0))
            drums.append(Message('note_off', channel=9, note=events[0][0], velocity=0, time=beats(0.25)))
            for j, (n, v) in enumerate(events[1:]):
                drums.append(Message('note_off', channel=9, note=n, velocity=0, time=0))

    # Phase 2: Breakdown (8 bars) - half time
    for bar in range(8):
        for eighth in range(8):
            events = []
            if eighth in [0, 4]:
                events.append((36, 127))
            if eighth in [2, 6]:
                events.append((38, 120))
            if eighth == 0 and bar % 2 == 0:
                events.append((57, 110))  # Crash

            if events:
                for j, (n, v) in enumerate(events):
                    drums.append(Message('note_on', channel=9, note=n, velocity=v, time=0))
                drums.append(Message('note_off', channel=9, note=events[0][0], velocity=0, time=beats(0.5)))
                for j, (n, v) in enumerate(events[1:]):
                    drums.append(Message('note_off', channel=9, note=n, velocity=0, time=0))
            else:
                rest(drums, beats(0.5))

    # Phase 3: Blast beats (8 bars)
    for bar in range(8):
        for sixteenth in range(16):
            n = 36 if sixteenth % 2 == 0 else 38
            drums.append(Message('note_on', channel=9, note=n, velocity=gvel(120), time=0))
            drums.append(Message('note_off', channel=9, note=n, velocity=0, time=beats(0.25)))

    # Track 2: Distorted power chord riff
    guitar = MidiTrack(); mid.tracks.append(guitar)
    add_name(guitar, "Guitar")
    program(guitar, 0, 30)  # Overdriven Guitar
    cc(guitar, 0, 7, 110)

    boss_riff = [
        (power_dirty(38), 0.5), (None, 0.25), (power_dirty(38), 0.25),
        (power_dirty(44), 0.5), (None, 0.25), (power(41), 0.25),
        (power_dirty(36), 0.5), (power_dirty(38), 0.25), (None, 0.25),
        (power_dirty(44), 0.25), (power(46), 0.25), (power_dirty(38), 0.5),
    ]
    for _ in range(24):
        for notes, dur in boss_riff:
            if notes:
                pitch_bend(guitar, 0, random.randint(-600, 600))
                chord(guitar, 0, notes, gvel(115), beats(dur * 0.9))
            else:
                rest(guitar, beats(dur))

    # Track 3: Choir stabs
    choir = MidiTrack(); mid.tracks.append(choir)
    add_name(choir, "Choir")
    program(choir, 1, 52)  # Choir
    cc(choir, 1, 7, 90)
    cc(choir, 1, 91, 110)

    choir_stabs = [
        ([62, 65, 69], 2), (None, 2),
        ([60, 65, 68], 2), (None, 2),
        ([58, 62, 65], 4), (None, 4),
        ([62, 65, 69], 1), ([60, 65, 68], 1), ([58, 62, 65], 1), (None, 1),
    ]
    for _ in range(8):
        for pitches, dur in choir_stabs:
            if pitches:
                chord(choir, 1, pitches, gvel(90), beats(dur * 0.95))
            else:
                rest(choir, beats(dur))

    save(mid, "music", "06_boss_fight")

# ============================================================
# STINGERS
# ============================================================

def stinger_floor_clear():
    """Triumphant brass swell, ~3 seconds."""
    print("Generating: Floor Clear stinger")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    brass = MidiTrack(); mid.tracks.append(brass)
    program(brass, 0, 61)  # Brass Section
    cc(brass, 0, 91, 100)

    # Ascending perfect 5ths with final major chord
    note(brass, 0, 50, 90, beats(0.5))
    note(brass, 0, 55, 100, beats(0.5))
    note(brass, 0, 57, 105, beats(0.5))
    chord(brass, 0, [62, 66, 69], 115, beats(2))  # D major triumph

    save(mid, "stingers", "07_floor_clear")

def stinger_game_over():
    """Low mournful bell toll + decay, ~4 seconds."""
    print("Generating: Game Over stinger")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 50)

    # Tubular bell
    bell = MidiTrack(); mid.tracks.append(bell)
    program(bell, 0, 14)  # Tubular Bells
    cc(bell, 0, 91, 127)

    note(bell, 0, 38, 100, beats(4))
    note(bell, 0, 36, 80, beats(4))
    # Final low cluster - death
    chord(bell, 0, [31, 32, 38], 60, beats(6))

    save(mid, "stingers", "08_game_over")

def stinger_floor_descent():
    """Descending chromatic passage, ~2 seconds."""
    print("Generating: Floor Descent stinger")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 140)

    desc = MidiTrack(); mid.tracks.append(desc)
    program(desc, 0, 19)  # Organ
    cc(desc, 0, 91, 110)

    # Chromatic descent
    for i in range(12):
        p = 60 - i
        v = 100 - i * 5
        pitch_bend(desc, 0, random.randint(-300, 300))
        note(desc, 0, p, v, beats(0.25))

    # Low impact
    chord(desc, 0, [30, 36, 42], 110, beats(1))

    save(mid, "stingers", "09_floor_descent")

# ============================================================
# PLAYER SOUNDS
# ============================================================

def player_footsteps():
    """4 variations of heavy boot on stone."""
    print("Generating: Player Footsteps (x4)")
    for var in range(4):
        mid = new_midi()
        t0 = MidiTrack(); mid.tracks.append(t0)
        add_tempo(t0, 120)

        step = MidiTrack(); mid.tracks.append(step)
        # Use different percussion for each variation
        hits = [
            [(36, 90), (38, 40)],   # Kick + ghost snare
            [(36, 85), (75, 30)],   # Kick + woodblock
            [(36, 95), (42, 25)],   # Kick + hat tap
            [(36, 88), (37, 35)],   # Kick + sidestick
        ]
        for n, v in hits[var]:
            step.append(Message('note_on', channel=9, note=n, velocity=v + random.randint(-5, 5), time=0))
        step.append(Message('note_off', channel=9, note=hits[var][0][0], velocity=0, time=beats(0.15)))
        for n, v in hits[var][1:]:
            step.append(Message('note_off', channel=9, note=n, velocity=0, time=0))

        save(mid, "player", f"10_footstep_stone_var{var+1}")

def player_breathing():
    """3 states: idle, active, low HP."""
    print("Generating: Player Breathing (3 states)")

    states = [
        ("12_breathing_idle", 40, 2.0, 60, 4),
        ("13_breathing_active", 55, 1.2, 80, 8),
        ("14_breathing_low_hp", 75, 0.8, 100, 12),
    ]
    for name, vel_base, speed, bpm, bars in states:
        mid = new_midi()
        t0 = MidiTrack(); mid.tracks.append(t0)
        add_tempo(t0, bpm)

        breath = MidiTrack(); mid.tracks.append(breath)
        program(breath, 0, 121)  # Breath Noise
        cc(breath, 0, 91, 80)

        for b in range(bars):
            # Inhale (pitch rise)
            pitch_bend(breath, 0, -1192)
            note(breath, 0, 60, gvel(vel_base), beats(speed))
            # Exhale (pitch fall)
            pitch_bend(breath, 0, 808)
            note(breath, 0, 58, gvel(vel_base - 10), beats(speed * 1.2))

        save(mid, "player", name)

def player_sword_swing():
    """Metallic whoosh."""
    print("Generating: Sword Swing")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    swing = MidiTrack(); mid.tracks.append(swing)
    program(swing, 0, 121)  # Breath Noise (for whoosh)
    cc(swing, 0, 91, 60)

    # Fast pitch bend sweep = whoosh
    pitch_bend(swing, 0, -4192)
    swing.append(Message('note_on', channel=0, note=72, velocity=90, time=0))
    for i in range(8):
        pitch_bend(swing, 0, -4192 + i * 1200, time=beats(0.04))
    swing.append(Message('note_off', channel=0, note=72, velocity=0, time=beats(0.1)))

    save(mid, "player", "15_sword_swing")

def player_sword_hit():
    """Wet impact + bone crack."""
    print("Generating: Sword Hit Flesh")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    hit = MidiTrack(); mid.tracks.append(hit)
    # Layered percussion for impact
    for n, v in [(38, 120), (39, 100), (75, 80), (36, 110)]:
        hit.append(Message('note_on', channel=9, note=n, velocity=v, time=0))
    hit.append(Message('note_off', channel=9, note=38, velocity=0, time=beats(0.2)))
    for n in [39, 75, 36]:
        hit.append(Message('note_off', channel=9, note=n, velocity=0, time=0))

    # Short pitched thud
    thud = MidiTrack(); mid.tracks.append(thud)
    program(thud, 1, 117)  # Taiko
    pitch_bend(thud, 1, -2192)
    note(thud, 1, 36, 110, beats(0.3))

    save(mid, "player", "16_sword_hit_flesh")

def player_sword_miss():
    """Extended whoosh, no impact."""
    print("Generating: Sword Miss")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    miss = MidiTrack(); mid.tracks.append(miss)
    program(miss, 0, 121)  # Breath Noise
    cc(miss, 0, 91, 70)

    pitch_bend(miss, 0, -5192)
    miss.append(Message('note_on', channel=0, note=72, velocity=70, time=0))
    for i in range(12):
        pitch_bend(miss, 0, -5192 + i * 800, time=beats(0.04))
    miss.append(Message('note_off', channel=0, note=72, velocity=0, time=beats(0.2)))

    save(mid, "player", "17_sword_miss")

def player_hurt():
    """3 variations of pain grunt."""
    print("Generating: Player Hurt (x3)")
    for var in range(3):
        mid = new_midi()
        t0 = MidiTrack(); mid.tracks.append(t0)
        add_tempo(t0, 120)

        grunt = MidiTrack(); mid.tracks.append(grunt)
        program(grunt, 0, 121)  # Breath Noise

        pitches = [55, 52, 58]
        pitch_bend(grunt, 0, random.randint(-2000, 2000))
        note(grunt, 0, pitches[var], gvel(110), beats(0.3))

        # Impact hit layered
        hit = MidiTrack(); mid.tracks.append(hit)
        note(hit, 9, 38, gvel(90), beats(0.15))

        save(mid, "player", f"18_player_hurt_var{var+1}")

def player_death():
    """Final groan + collapse thud."""
    print("Generating: Player Death")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 80)

    groan = MidiTrack(); mid.tracks.append(groan)
    program(groan, 0, 121)  # Breath Noise
    cc(groan, 0, 91, 100)

    # Descending groan
    pitch_bend(groan, 0, 808)
    groan.append(Message('note_on', channel=0, note=55, velocity=100, time=0))
    for i in range(16):
        pitch_bend(groan, 0, 808 - i * 400, time=beats(0.1))
    groan.append(Message('note_off', channel=0, note=55, velocity=0, time=beats(0.2)))

    # Body thud
    thud = MidiTrack(); mid.tracks.append(thud)
    rest(thud, beats(1.5))
    note(thud, 9, 36, 120, beats(0.5))
    note(thud, 9, 36, 60, beats(0.3))

    save(mid, "player", "19_player_death")

def player_heartbeat():
    """Slow thumping heartbeat loop for low HP."""
    print("Generating: Heartbeat Low HP")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 70)

    heart = MidiTrack(); mid.tracks.append(heart)
    # Low taiko-like double thump
    program(heart, 0, 117)  # Taiko
    cc(heart, 0, 7, 100)
    cc(heart, 0, 91, 60)

    for _ in range(16):
        # lub-dub
        note(heart, 0, 36, 100, beats(0.2))
        note(heart, 0, 38, 70, beats(0.15))
        rest(heart, beats(1.65))

    save(mid, "player", "20_heartbeat_low_hp")

# ============================================================
# SKELETON ENEMY SOUNDS
# ============================================================

def skeleton_footsteps():
    """3 variations of bone clicking on stone."""
    print("Generating: Skeleton Footsteps (x3)")
    for var in range(3):
        mid = new_midi()
        t0 = MidiTrack(); mid.tracks.append(t0)
        add_tempo(t0, 120)

        bones = MidiTrack(); mid.tracks.append(bones)
        clicks = [
            [(75, 80), (76, 50)],  # Claves + woodblock
            [(76, 75), (77, 45)],  # Woodblock variants
            [(75, 85), (37, 30)],  # Claves + sidestick
        ]
        for n, v in clicks[var]:
            bones.append(Message('note_on', channel=9, note=n, velocity=v + random.randint(-8, 8), time=0))
        bones.append(Message('note_off', channel=9, note=clicks[var][0][0], velocity=0, time=beats(0.1)))
        for n, v in clicks[var][1:]:
            bones.append(Message('note_off', channel=9, note=n, velocity=0, time=0))

        save(mid, "skeleton", f"21_bone_footstep_var{var+1}")

def skeleton_rattle_idle():
    """Subtle creaking/rattling loop."""
    print("Generating: Skeleton Idle Rattle")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 90)

    rattle = MidiTrack(); mid.tracks.append(rattle)
    # Maracas + woodblock taps
    for _ in range(16):
        if random.random() < 0.4:
            n = random.choice([70, 75, 76, 69])
            rattle.append(Message('note_on', channel=9, note=n, velocity=random.randint(20, 50), time=0))
            rattle.append(Message('note_off', channel=9, note=n, velocity=0, time=beats(random.uniform(0.1, 0.3))))
        else:
            rest(rattle, beats(random.uniform(0.3, 0.8)))

    save(mid, "skeleton", "22_bone_rattle_idle")

def skeleton_attack():
    """Sharp bone strike."""
    print("Generating: Skeleton Attack")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    atk = MidiTrack(); mid.tracks.append(atk)
    # Fast aggressive percussion burst
    for n, v in [(75, 110), (38, 100), (76, 90)]:
        atk.append(Message('note_on', channel=9, note=n, velocity=v, time=0))
    atk.append(Message('note_off', channel=9, note=75, velocity=0, time=beats(0.15)))
    for n in [38, 76]:
        atk.append(Message('note_off', channel=9, note=n, velocity=0, time=0))

    save(mid, "skeleton", "23_skeleton_attack")

def skeleton_aggro():
    """Hollow screech when detecting player."""
    print("Generating: Skeleton Aggro")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    screech = MidiTrack(); mid.tracks.append(screech)
    program(screech, 0, 121)  # Breath Noise
    cc(screech, 0, 91, 90)

    # Rising screech
    pitch_bend(screech, 0, -2192)
    screech.append(Message('note_on', channel=0, note=80, velocity=100, time=0))
    for i in range(6):
        pitch_bend(screech, 0, -2192 + i * 1500, time=beats(0.08))
    screech.append(Message('note_off', channel=0, note=80, velocity=0, time=beats(0.15)))

    save(mid, "skeleton", "24_skeleton_aggro")

def skeleton_hit():
    """2 variations of bone impact."""
    print("Generating: Skeleton Hit (x2)")
    for var in range(2):
        mid = new_midi()
        t0 = MidiTrack(); mid.tracks.append(t0)
        add_tempo(t0, 120)

        hit = MidiTrack(); mid.tracks.append(hit)
        if var == 0:
            for n, v in [(75, 100), (76, 80), (38, 60)]:
                hit.append(Message('note_on', channel=9, note=n, velocity=v, time=0))
            hit.append(Message('note_off', channel=9, note=75, velocity=0, time=beats(0.2)))
            for n in [76, 38]:
                hit.append(Message('note_off', channel=9, note=n, velocity=0, time=0))
        else:
            for n, v in [(76, 95), (37, 85), (75, 70)]:
                hit.append(Message('note_on', channel=9, note=n, velocity=v, time=0))
            hit.append(Message('note_off', channel=9, note=76, velocity=0, time=beats(0.18)))
            for n in [37, 75]:
                hit.append(Message('note_off', channel=9, note=n, velocity=0, time=0))

        save(mid, "skeleton", f"25_skeleton_hit_var{var+1}")

def skeleton_death():
    """Bones scattering and collapsing."""
    print("Generating: Skeleton Death")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    death = MidiTrack(); mid.tracks.append(death)
    # Cascade of bone hits
    bone_sounds = [75, 76, 77, 75, 76, 37, 75, 76, 36]
    for i, n in enumerate(bone_sounds):
        vel = 100 - i * 8
        death.append(Message('note_on', channel=9, note=n, velocity=max(vel, 20), time=0))
        death.append(Message('note_off', channel=9, note=n, velocity=0, time=beats(random.uniform(0.05, 0.15))))

    # Final collapse
    rest(death, beats(0.2))
    for n, v in [(36, 80), (38, 50)]:
        death.append(Message('note_on', channel=9, note=n, velocity=v, time=0))
    death.append(Message('note_off', channel=9, note=36, velocity=0, time=beats(0.4)))
    death.append(Message('note_off', channel=9, note=38, velocity=0, time=0))

    save(mid, "skeleton", "26_skeleton_death")

def skeleton_ambient():
    """Faint bone creaks heard through walls."""
    print("Generating: Skeleton Ambient Nearby")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 80)

    amb = MidiTrack(); mid.tracks.append(amb)
    # Very quiet random bone taps
    for _ in range(20):
        if random.random() < 0.3:
            n = random.choice([75, 76, 77])
            amb.append(Message('note_on', channel=9, note=n, velocity=random.randint(10, 30), time=0))
            amb.append(Message('note_off', channel=9, note=n, velocity=0, time=beats(random.uniform(0.05, 0.1))))
        rest(amb, beats(random.uniform(0.5, 2.0)))

    save(mid, "skeleton", "27_skeleton_ambient_nearby")

# ============================================================
# ENVIRONMENT SOUNDS
# ============================================================

def env_water_drips():
    """3 variations of drip with echo."""
    print("Generating: Water Drips (x3)")
    for var in range(3):
        mid = new_midi()
        t0 = MidiTrack(); mid.tracks.append(t0)
        add_tempo(t0, 120)

        drip = MidiTrack(); mid.tracks.append(drip)
        program(drip, 0, 96)  # Rain/FX
        cc(drip, 0, 91, 127)  # Max reverb

        pitches = [84, 79, 88]
        note(drip, 0, pitches[var], gvel(60), beats(0.15))
        # Echo
        rest(drip, beats(0.3))
        note(drip, 0, pitches[var], gvel(25), beats(0.1))

        save(mid, "environment", f"28_water_drip_var{var+1}")

def env_wind_draft():
    """Low moaning wind loop."""
    print("Generating: Wind Draft")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 50)

    wind = MidiTrack(); mid.tracks.append(wind)
    program(wind, 0, 121)  # Breath Noise
    cc(wind, 0, 7, 50)
    cc(wind, 0, 91, 120)

    for _ in range(8):
        # Slow pitch sweep = wind
        pitch_bend(wind, 0, -1192 + random.randint(-500, 500))
        wind.append(Message('note_on', channel=0, note=48, velocity=gvel(35), time=0))
        for i in range(8):
            pitch_bend(wind, 0, -1192 + int(1000 * random.uniform(-1, 1)), time=beats(0.5))
        wind.append(Message('note_off', channel=0, note=48, velocity=0, time=beats(0.5)))

    save(mid, "environment", "29_wind_draft")

def env_stone_creak():
    """Settling stone sound."""
    print("Generating: Stone Creak")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    creak = MidiTrack(); mid.tracks.append(creak)
    program(creak, 0, 117)  # Taiko Drum (deep)
    cc(creak, 0, 91, 100)

    pitch_bend(creak, 0, -692)
    note(creak, 0, 30, 70, beats(0.8))
    pitch_bend(creak, 0, 308)
    note(creak, 0, 28, 40, beats(0.4))

    save(mid, "environment", "30_stone_creak")

def env_distant_rumble():
    """Deep underground tremor."""
    print("Generating: Distant Rumble")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 60)

    rumble = MidiTrack(); mid.tracks.append(rumble)
    program(rumble, 0, 117)  # Taiko
    cc(rumble, 0, 91, 127)
    cc(rumble, 0, 7, 80)

    # Low roll
    for i in range(16):
        vel = int(40 + 50 * (i / 16) * (1 - i / 20))
        pitch_bend(rumble, 0, random.randint(-500, 500))
        note(rumble, 0, 24 + random.randint(-2, 2), vel, beats(0.2))

    save(mid, "environment", "31_distant_rumble")

def env_chains():
    """Metal chains clinking."""
    print("Generating: Chains Rattle")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 100)

    chains = MidiTrack(); mid.tracks.append(chains)
    # Triangle + bell tree = metallic clinks
    for _ in range(8):
        n = random.choice([81, 80, 56, 53])  # Triangle, bell, cowbell, ride bell
        chains.append(Message('note_on', channel=9, note=n, velocity=random.randint(30, 70), time=0))
        chains.append(Message('note_off', channel=9, note=n, velocity=0, time=beats(random.uniform(0.1, 0.4))))
        rest(chains, beats(random.uniform(0.1, 0.5)))

    save(mid, "environment", "32_chains_rattle")

def env_torch():
    """Torch crackle loop + flare."""
    print("Generating: Torch Crackle + Flare")
    # Crackle loop
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    crackle = MidiTrack(); mid.tracks.append(crackle)
    # Rapid quiet percussion = fire crackle
    for _ in range(64):
        if random.random() < 0.6:
            n = random.choice([75, 76, 77, 69, 70])
            crackle.append(Message('note_on', channel=9, note=n, velocity=random.randint(15, 45), time=0))
            crackle.append(Message('note_off', channel=9, note=n, velocity=0, time=beats(random.uniform(0.03, 0.1))))
        rest(crackle, beats(random.uniform(0.05, 0.15)))

    save(mid, "environment", "33_torch_crackle")

    # Flare
    mid2 = new_midi()
    t02 = MidiTrack(); mid2.tracks.append(t02)
    add_tempo(t02, 120)

    flare = MidiTrack(); mid2.tracks.append(flare)
    # Sudden burst of crackle + whoosh
    for i in range(12):
        n = random.choice([75, 76, 77, 69])
        v = 80 - i * 5
        flare.append(Message('note_on', channel=9, note=n, velocity=max(v, 15), time=0))
        flare.append(Message('note_off', channel=9, note=n, velocity=0, time=beats(0.04)))

    save(mid, "environment", "34_torch_flare")

# ============================================================
# UI / INTERACTION SOUNDS
# ============================================================

def ui_menu_hover():
    """Subtle stone scrape."""
    print("Generating: Menu Hover")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    hover = MidiTrack(); mid.tracks.append(hover)
    program(hover, 0, 14)  # Tubular Bells
    cc(hover, 0, 91, 80)
    note(hover, 0, 72, 50, beats(0.3))

    save(mid, "ui", "35_menu_hover")

def ui_menu_select():
    """Deep bell tone."""
    print("Generating: Menu Select")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    sel = MidiTrack(); mid.tracks.append(sel)
    program(sel, 0, 14)  # Tubular Bells
    cc(sel, 0, 91, 100)
    chord(sel, 0, [48, 55, 60], 100, beats(1.5))

    save(mid, "ui", "36_menu_select")

def ui_menu_back():
    """Softer reverse of select."""
    print("Generating: Menu Back")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    back = MidiTrack(); mid.tracks.append(back)
    program(back, 0, 14)  # Tubular Bells
    cc(back, 0, 91, 80)
    note(back, 0, 60, 60, beats(0.3))
    note(back, 0, 55, 40, beats(0.5))

    save(mid, "ui", "37_menu_back")

def ui_blueprint_found():
    """Zelda-style item fanfare! Ascending arpeggio, bright, triumphant."""
    print("Generating: Blueprint Found (Zelda fanfare)")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 140)

    # Track 1: Main melody (bright trumpet/horn)
    melody = MidiTrack(); mid.tracks.append(melody)
    program(melody, 0, 56)  # Trumpet
    cc(melody, 0, 91, 90)

    # Da da da DAAA! (ascending)
    notes_seq = [
        (62, 80, 0.25),   # D
        (66, 90, 0.25),   # F#
        (69, 100, 0.25),  # A
        (74, 120, 1.5),   # D (high, held)
    ]
    for p, v, d in notes_seq:
        note(melody, 0, p, v, beats(d))

    # Track 2: Harmony
    harmony = MidiTrack(); mid.tracks.append(harmony)
    program(harmony, 1, 46)  # Harp
    cc(harmony, 1, 91, 100)

    rest(harmony, beats(0.75))
    chord(harmony, 1, [62, 66, 69, 74], 90, beats(1.5))

    # Track 3: Sparkle
    sparkle = MidiTrack(); mid.tracks.append(sparkle)
    program(sparkle, 2, 10)  # Glockenspiel
    rest(sparkle, beats(0.75))
    for i in range(6):
        note(sparkle, 2, 74 + i * 2, 70 - i * 8, beats(0.15))

    save(mid, "ui", "38_blueprint_found")

def ui_item_pickup():
    """Quick sparkle/chime."""
    print("Generating: Item Pickup")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    chime = MidiTrack(); mid.tracks.append(chime)
    program(chime, 0, 10)  # Glockenspiel
    cc(chime, 0, 91, 90)
    note(chime, 0, 79, 80, beats(0.15))
    note(chime, 0, 84, 90, beats(0.3))

    save(mid, "ui", "39_item_pickup")

def ui_stairs_found():
    """Ominous descending tone + stone grinding."""
    print("Generating: Stairs Found")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 90)

    tone = MidiTrack(); mid.tracks.append(tone)
    program(tone, 0, 19)  # Church Organ
    cc(tone, 0, 91, 110)

    # Descending ominous
    for i in range(6):
        p = 55 - i * 2
        pitch_bend(tone, 0, random.randint(-400, 400))
        note(tone, 0, p, gvel(70), beats(0.5))

    # Low rumble
    chord(tone, 0, [30, 36], 90, beats(2))

    save(mid, "ui", "40_stairs_found")

def ui_score_tick():
    """Tiny click for score incrementing."""
    print("Generating: Score Tick")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    tick = MidiTrack(); mid.tracks.append(tick)
    tick.append(Message('note_on', channel=9, note=76, velocity=50, time=0))  # Woodblock
    tick.append(Message('note_off', channel=9, note=76, velocity=0, time=beats(0.05)))

    save(mid, "ui", "42_score_tick")

def ui_health_warning():
    """Dull alarm pulse synced with HP bar."""
    print("Generating: Health Warning Pulse")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 70)

    alarm = MidiTrack(); mid.tracks.append(alarm)
    program(alarm, 0, 19)  # Organ
    cc(alarm, 0, 7, 60)
    cc(alarm, 0, 91, 80)

    for _ in range(8):
        chord(alarm, 0, [38, 44], 70, beats(0.5))  # Tritone pulse
        rest(alarm, beats(1.5))

    save(mid, "ui", "43_health_warning_pulse")

def ui_floor_transition():
    """Rushing wind during floor change."""
    print("Generating: Floor Transition Whoosh")
    mid = new_midi()
    t0 = MidiTrack(); mid.tracks.append(t0)
    add_tempo(t0, 120)

    whoosh = MidiTrack(); mid.tracks.append(whoosh)
    program(whoosh, 0, 121)  # Breath Noise
    cc(whoosh, 0, 91, 110)
    cc(whoosh, 0, 7, 90)

    # Build up
    pitch_bend(whoosh, 0, -4192)
    whoosh.append(Message('note_on', channel=0, note=60, velocity=40, time=0))
    for i in range(20):
        vel_ramp = min(127, 40 + i * 5)
        pitch_bend(whoosh, 0, -4192 + i * 400, time=beats(0.1))
        cc(whoosh, 0, 7, vel_ramp, time=0)
    whoosh.append(Message('note_off', channel=0, note=60, velocity=0, time=beats(0.2)))

    save(mid, "ui", "44_floor_transition_whoosh")


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("=== DungeonSlopper MIDI Generator ===\n")

    print("\n--- MUSIC TRACKS ---")
    music_dungeon_ambient()
    music_dungeon_deep()
    music_dungeon_abyss()
    music_menu_theme()
    music_combat_tension()
    music_boss_fight()

    print("\n--- STINGERS ---")
    stinger_floor_clear()
    stinger_game_over()
    stinger_floor_descent()

    print("\n--- PLAYER SOUNDS ---")
    player_footsteps()
    player_breathing()
    player_sword_swing()
    player_sword_hit()
    player_sword_miss()
    player_hurt()
    player_death()
    player_heartbeat()

    print("\n--- SKELETON SOUNDS ---")
    skeleton_footsteps()
    skeleton_rattle_idle()
    skeleton_attack()
    skeleton_aggro()
    skeleton_hit()
    skeleton_death()
    skeleton_ambient()

    print("\n--- ENVIRONMENT SOUNDS ---")
    env_water_drips()
    env_wind_draft()
    env_stone_creak()
    env_distant_rumble()
    env_chains()
    env_torch()

    print("\n--- UI SOUNDS ---")
    ui_menu_hover()
    ui_menu_select()
    ui_menu_back()
    ui_blueprint_found()
    ui_item_pickup()
    ui_stairs_found()
    ui_score_tick()
    ui_health_warning()
    ui_floor_transition()

    print(f"\n=== Done! All MIDI files saved to {os.path.join(OUT, 'midi')} ===")
