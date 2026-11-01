# Builds src/data/cross-references.json from the OpenBible.info cross-reference zip (CC BY). See src/data/CROSS-REFERENCES.md.
# Usage: python3 build-cross-references.py cross-references.zip <refs per verse> <minimum votes> <out.json>
import zipfile, json, sys, collections
OSIS = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal','Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev']
idx = {b: i for i, b in enumerate(OSIS)}
def key(ref):
    b, c, v = ref.split('-')[0].split('.')
    return idx[b] * 1000000 + int(c) * 1000 + int(v)
lines = zipfile.ZipFile(sys.argv[1]).read('cross_references.txt').decode().splitlines()
assert 'CC-BY' in lines[0], lines[0]
refs = collections.defaultdict(list)
for l in lines[1:]:
    f, t, votes = l.split('\t')
    votes = int(votes)
    if votes < int(sys.argv[3]): continue
    refs[key(f)].append((votes, key(t)))
K = int(sys.argv[2])
out = {}
for k, lst in refs.items():
    lst.sort(reverse=True)
    seen = []
    for v, t in lst:
        if t not in seen: seen.append(t)
        if len(seen) == K: break
    out[k] = seen
# Compact: hexadecimal keys
enc = {format(k, 'x'): [format(t, 'x') for t in v] for k, v in sorted(out.items())}
s = json.dumps(enc, separators=(',', ':'))
print(len(out), 'verses', len(s) // 1024, 'KB')
open(sys.argv[4], 'w').write(s)
