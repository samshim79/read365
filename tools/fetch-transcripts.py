"""Download YouTube's Korean auto-captions for each Day video into transcripts/ko/NNN.json.
Personal use only: transcripts/ is gitignored and must never be published.
Resumable: days that already have a file are skipped. Run from the repo root:
    python tools/fetch-transcripts.py [first_day] [last_day]"""
import json, subprocess, sys, tempfile, time, os, glob

src = open("data/videos.js", encoding="utf8").read()
videos = json.loads(src[src.index("export default ") + len("export default "):].rstrip().rstrip(";"))
first = int(sys.argv[1]) if len(sys.argv) > 1 else 1
last = int(sys.argv[2]) if len(sys.argv) > 2 else 365
os.makedirs("transcripts/ko", exist_ok=True)

def lines_from_json3(path):
    out = []
    for ev in json.load(open(path, encoding="utf8")).get("events", []):
        text = "".join(s.get("utf8", "") for s in ev.get("segs", [])).replace("\n", " ").strip()
        if text:
            out.append([round(ev.get("tStartMs", 0) / 1000, 1), text])
    return out

failed = []
for v in videos:
    day = v.get("day")
    if not day or not first <= day <= last:
        continue
    target = f"transcripts/ko/{day:03d}.json"
    if os.path.exists(target):
        continue
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [sys.executable, "-m", "yt_dlp", "--skip-download", "--write-auto-subs", "--sub-langs", "ko",
             "--sub-format", "json3", "-o", os.path.join(tmp, "s"), f"https://youtu.be/{v['id']}"],
            capture_output=True, text=True)
        files = glob.glob(os.path.join(tmp, "*.json3"))
        if not files:
            failed.append(day)
            print(f"day {day}: no Korean captions", flush=True)
            time.sleep(2)
            continue
        lines = lines_from_json3(files[0])
    json.dump({"day": day, "id": v["id"], "lines": lines}, open(target, "w", encoding="utf8"), ensure_ascii=False)
    print(f"day {day}: {len(lines)} lines", flush=True)
    time.sleep(1.5)  # be gentle with YouTube

print("done; failed days:", failed, flush=True)
