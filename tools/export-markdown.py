"""Write one Markdown file per day to transcripts/md/NNN.md from transcripts/ko (and transcripts/en when translated).
Personal use only: transcripts/ is gitignored. Rerun any time:  python tools/export-markdown.py"""
import glob, json, os

readings = dict(l.rstrip("\n").split("\t", 1) for l in open("tools/readings.tsv", encoding="utf8"))
os.makedirs("transcripts/md", exist_ok=True)

def stamp(sec, vid):
    s = int(sec)
    return f"[{s // 60}:{s % 60:02d}](https://youtu.be/{vid}?t={s})"

done = translated = 0
for path in sorted(glob.glob("transcripts/ko/*.json")):
    ko = json.load(open(path, encoding="utf8"))
    day, vid = ko["day"], ko["id"]
    en_path = f"transcripts/en/{day:03d}.json"
    en = json.load(open(en_path, encoding="utf8"))["segments"] if os.path.exists(en_path) else None

    out = [f"# Day {day}: {readings.get(str(day), '')}", "",
           f"Video: https://youtu.be/{vid}", "",
           "_Korean is YouTube auto-captions (expect errors)." + (" English is a translation, with caption errors noted in [brackets]._" if en else " Not translated yet._"), ""]
    if en:
        for seg in en:
            out += [f"**{stamp(seg['t'], vid)}** {seg['en']}", "", f"> {seg['ko']}", ""]
        translated += 1
    else:
        lines = ko["lines"]
        for i in range(0, len(lines), 6):  # captions are tiny fragments: group into short paragraphs
            chunk = lines[i:i + 6]
            out += [f"**{stamp(chunk[0][0], vid)}** " + " ".join(l[1] for l in chunk), ""]
    open(f"transcripts/md/{day:03d}.md", "w", encoding="utf8", newline="\n").write("\n".join(out))
    done += 1

print(f"{done} files written to transcripts/md ({translated} translated)")
