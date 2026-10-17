"""Turn a translation (transcripts/en-src/NNN.json: [[first_ko_line_index, "English"], ...]) into
transcripts/en/NNN.json with timestamps and the Korean text of each segment, and check coverage.
    python tools/merge-translation.py 1 2     (days)"""
import json, os, sys

for day in map(int, sys.argv[1:]):
    ko = json.load(open(f"transcripts/ko/{day:03d}.json", encoding="utf8"))["lines"]
    src = json.load(open(f"transcripts/en-src/{day:03d}.json", encoding="utf8"))
    starts = [s[0] for s in src]
    assert starts[0] == 0, f"day {day}: first segment must start at line 0"
    assert starts == sorted(set(starts)) and starts[-1] < len(ko), f"day {day}: bad line indexes"
    ends = starts[1:] + [len(ko)]
    segments = [
        {"t": ko[a][0], "ko": " ".join(l[1] for l in ko[a:b]), "en": en}
        for (a, en), b in zip(src, ends)
    ]
    os.makedirs("transcripts/en", exist_ok=True)
    json.dump({"day": day, "segments": segments}, open(f"transcripts/en/{day:03d}.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"day {day}: {len(ko)} Korean lines -> {len(segments)} segments")
