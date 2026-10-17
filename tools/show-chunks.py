"""Print Korean caption lines for the given days in 5-line chunks, each prefixed with its first line index.
Used to translate by hand: write transcripts/en-src/NNN.json as [[chunk_first_index, "English"], ...]."""
import json, sys
readings = dict(l.rstrip("\n").split("\t", 1) for l in open("tools/readings.tsv", encoding="utf8"))
for day in map(int, sys.argv[1:]):
    lines = json.load(open(f"transcripts/ko/{day:03d}.json", encoding="utf8"))["lines"]
    print(f"=== DAY {day} ({readings[str(day)]}) {len(lines)} lines")
    for i in range(0, len(lines), 5):
        print(f"{i}| " + " ".join(l[1] for l in lines[i:i + 5]))
