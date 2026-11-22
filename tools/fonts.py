#!/usr/bin/env python3
"""Rebuild site/fonts/web/ CJK web fonts (Noto Serif SC) from the sliced originals in tools/fontsrc/.

Why: the original fontsource build is ~200 unicode-range slices (~50 requests / 1.5 MB per page).
This script merges them and keeps only the characters the site uses, so a page needs 1-2 files per weight.

Per weight (400, 600) it writes two files:
  noto-serif-sc-used-<w>.woff2   every character found in site html/js/css/data + data/**/*.json
                                 (+ CJK/fullwidth punctuation)             -> loaded on every page
  noto-serif-sc-gb-<w>.woff2     the rest of GB2312 level 1 (3755 common chars)
                                 -> only downloaded when a page shows a char that is not in the first file
                                    (e.g. future news with new words)
Characters outside both fall back to the system serif (Songti SC / STSong).
Non-CJK faces (latin, latin-ext, cyrillic, vietnamese, Cormorant, Jost) are copied unchanged from tools/fontsrc/fonts.src.css.

Usage (needs fonttools + brotli):
  /usr/bin/python3 -m venv /tmp/fv && /tmp/fv/bin/pip install fonttools brotli
  /tmp/fv/bin/python tools/fonts.py
Re-run whenever text is added (new news/albums/etc.) to move new characters into the always-loaded file.
"""
import re, sys, glob, os, json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset, merge

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'fontsrc'
OUT = ROOT / 'site' / 'fonts' / 'web'
WEIGHTS = ['400', '600']


def collect_used():
    pats = ['site/**/*.html', 'site/js/**/*.js', 'site/css/**/*.css', 'site/data/**/*.json', 'data/**/*.json']
    chars = set()
    for p in pats:
        for f in glob.glob(str(ROOT / p), recursive=True):
            if '/fonts/' in f or '/vendor/' in f or os.path.basename(f).startswith('_shot'):
                continue
            chars |= set(Path(f).read_text(encoding='utf-8', errors='ignore'))
    return {ord(c) for c in chars if ord(c) > 0x20 and c not in '​﻿'}


def gb2312_l1():
    out = set()
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                out.add(ord(bytes([hi, lo]).decode('gb2312')))
            except UnicodeDecodeError:
                pass
    return out


def parse_ranges(s):
    r = set()
    for part in s.split(','):
        part = part.strip().upper().replace('U+', '')
        if not part:
            continue
        if '-' in part:
            a, b = part.split('-')
            r |= set(range(int(a, 16), int(b, 16) + 1))
        else:
            r.add(int(part, 16))
    return r


def to_ranges(cps):
    cps = sorted(cps)
    out, i = [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        out.append(f'U+{cps[i]:x}' if i == j else f'U+{cps[i]:x}-{cps[j]:x}')
        i = j + 1
    return ','.join(out)


def main():
    css = (SRC / 'fonts.src.css').read_text()
    blocks = re.findall(r'(/\* ([^*]+?) \*/\s*@font-face \{.*?\n\})', css, re.S)
    keep, taken = [], set()
    for text, name in blocks:
        if re.match(r'noto-serif-sc-\[\d+\]-', name):
            continue
        keep.append(text)
        if name.startswith('noto-serif-sc-'):  # latin/cyrillic/... faces own these codepoints
            taken |= parse_ranges(re.search(r'unicode-range:\s*([^;]+);', text).group(1))

    used = collect_used()
    punct = set(range(0x2000, 0x2070)) | set(range(0x3000, 0x3040)) | set(range(0xFF00, 0xFFF0)) | set(range(0xFE30, 0xFE50))
    gb = gb2312_l1()
    tierA_want = {c for c in (used | punct) if c >= 0x80} - taken
    tierB_want = (gb | set()) - tierA_want - taken
    print(f'used chars: {len(used)}; tier A wanted: {len(tierA_want)}; tier B wanted: {len(tierB_want)}')

    new_blocks, sizes = [], {}
    for w in WEIGHTS:
        want = tierA_want | tierB_want
        parts = []
        for f in sorted(glob.glob(str(SRC / f'noto-serif-sc-[0-9]*-{w}-normal.woff2'))):
            font = TTFont(f)
            have = want & set(font.getBestCmap())
            if not have:
                continue
            opts = subset.Options(layout_features=['*'], notdef_outline=True, name_IDs=[1, 2, 3, 4, 6], glyph_names=False, flavor=None)
            sub = subset.Subsetter(opts)
            sub.populate(unicodes=have)
            sub.subset(font)
            tmp = Path('/tmp') / f'fontpart-{w}-{len(parts)}.ttf'
            font.save(tmp)
            parts.append(str(tmp))
        merged = merge.Merger().merge(parts)
        cmap = set(merged.getBestCmap())
        for tier, tw in (('used', tierA_want), ('gb', tierB_want)):
            cps = tw & cmap
            font = TTFont(merged.reader.file.name) if False else None
            tmp = Path('/tmp') / f'fontmerged-{w}.ttf'
            merged.save(tmp)
            font = TTFont(tmp)
            opts = subset.Options(layout_features=['*'], notdef_outline=True, name_IDs=[1, 2, 3, 4, 6], flavor='woff2')
            sub = subset.Subsetter(opts)
            sub.populate(unicodes=cps)
            sub.subset(font)
            fn = f'noto-serif-sc-{tier}-{w}.woff2'
            font.flavor = 'woff2'
            font.save(OUT / fn)
            sizes[fn] = (len(cps), (OUT / fn).stat().st_size)
            new_blocks.append(
                f"/* noto-serif-sc-{tier}-{w} */\n@font-face {{\n  font-family: 'Noto Serif SC';\n  font-style: normal;\n  font-display: swap;\n  font-weight: {w};\n"
                f"  src:url(./{fn}) format('woff2');\n  unicode-range: {to_ranges(cps)};\n}}")
    for old in glob.glob(str(OUT / 'noto-serif-sc-used-*')) + []:
        pass
    (OUT / 'fonts.css').write_text('\n'.join(keep + new_blocks) + '\n')
    for k, v in sizes.items():
        print(f'{k}: {v[0]} chars, {v[1]/1024:.0f} KB')
    print('Bump the ?v= on fonts.css in index.html/member.html if you changed the output.')


if __name__ == '__main__':
    main()
