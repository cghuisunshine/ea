"""Generate Edge TTS narration for the ABA reading pages.

Usage:
    python3 tools/generate_aba_audio.py              # every page
    python3 tools/generate_aba_audio.py module-1     # one or more pages

Requires: edge-tts and beautifulsoup4  (pip install edge-tts beautifulsoup4)
Network:  edge-tts streams from speech.platform.bing.com, so that host must be
          reachable.  An HTTPS_PROXY in the environment is used automatically.

For every <header class="hero"> and <section class="chapter"> in a page the
script produces <key>.mp3 plus <key>.words.json (word timings) in the page's
audio folder, writes narration.js for the player, and rewrites the page so each
text node is wrapped in a <span data-tts-node="..."> the player can highlight.
Re-running is cheap: a section whose text has not changed is skipped.
"""
import asyncio
import hashlib
import html
import json
import os
import re
import sys
from pathlib import Path

import edge_tts
from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parent.parent
VOICE = 'en-US-AriaNeural'
PROXY = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or None

PAGES = {
    'before-day-1': ('ABA_Before_Day_1_Reading.html', 'audio/aba-before-day-1'),
    'module-1': ('ABA_Module_1_Reading.html', 'audio/aba-module-1'),
    'module-2': ('ABA_Module_2_Reading.html', 'audio/aba-module-2'),
    'module-3': ('ABA_Module_3_Reading.html', 'audio/aba-module-3'),
    'module-4': ('ABA_Module_4_Reading.html', 'audio/aba-module-4'),
}

SECTION_PATTERN = r'<header class="hero"[^>]*>[\s\S]*?</header>|<section class="chapter"[^>]*>[\s\S]*?</section>'
SKIP_PARENTS = ('script', 'style', 'details', 'button')


async def speak(text, audio_path):
    """Stream one section to MP3 and return its word timings."""
    words, cursor = [], 0
    temp = audio_path.with_suffix('.part')
    communicate = edge_tts.Communicate(text, VOICE, boundary='WordBoundary', proxy=PROXY)
    with temp.open('wb') as handle:
        async for chunk in communicate.stream():
            if chunk['type'] == 'audio':
                handle.write(chunk['data'])
            elif chunk['type'] == 'WordBoundary':
                token = html.unescape(chunk['text'])
                found = re.search(re.escape(token), text[cursor:], re.IGNORECASE)
                if not found:
                    continue  # a token the synthesiser expanded (e.g. "5" -> "five")
                start = cursor + found.start()
                end = cursor + found.end()
                words.append({
                    'text': token,
                    'start': chunk['offset'] / 1e7,
                    'end': (chunk['offset'] + chunk['duration']) / 1e7,
                    'start_char': start,
                    'end_char': end,
                })
                cursor = end
    if not words or not temp.stat().st_size:
        temp.unlink(missing_ok=True)
        raise ValueError(f'Missing audio or timings for {audio_path.name}')
    temp.replace(audio_path)
    return words


async def build(page_key):
    page_file, audio_dir = PAGES[page_key]
    page = ROOT / page_file
    out = ROOT / audio_dir
    out.mkdir(parents=True, exist_ok=True)
    source = page.read_text()
    tracks = []

    for match in list(re.finditer(SECTION_PATTERN, source)):
        original = match.group()
        soup = BeautifulSoup(original, 'html.parser')
        container = soup.find(['header', 'section'])
        for span in list(container.select('[data-tts-node]')):
            span.unwrap()
        key = container.get('id', 'intro')
        label = container.get('data-label')
        heading = container.find(['h1', 'h2'])
        title = heading.get_text(' ', strip=True) if heading else key

        nodes, parts, offset = [], [], 0
        for node in list(container.find_all(string=True)):
            if isinstance(node, Comment) or not node.strip():
                continue
            if any(p.name in SKIP_PARENTS or 'top' in (p.get('class') or []) for p in node.parents):
                continue
            value = str(node)
            node_id = f'{key}-{len(nodes)}'
            wrapper = soup.new_tag('span', attrs={'data-tts-node': node_id})
            wrapper.string = value
            node.replace_with(wrapper)
            nodes.append({'id': node_id, 'start': offset, 'end': offset + len(value)})
            parts.append(value)
            offset += len(value) + 1

        text = ' '.join(parts)
        digest = hashlib.sha256((VOICE + text).encode()).hexdigest()
        metadata = out / f'{key}.words.json'
        audio = out / f'{key}.mp3'
        payload = json.loads(metadata.read_text()) if metadata.exists() else {}

        if payload.get('digest') != digest or not audio.exists() or not audio.stat().st_size:
            print(f'[{page_key}] generating {key}: {len(text.split())} words', flush=True)
            words = await speak(text, audio)
            payload = {'digest': digest, 'voice': VOICE, 'text': text,
                       'audio': audio.name, 'words': words}
            metadata.write_text(json.dumps(payload, ensure_ascii=False, indent=2))

        track = {'id': key, 'title': title, 'audio': f'{audio_dir}/{audio.name}',
                 'nodes': nodes, 'words': payload['words']}
        if label:
            track['label'] = label
        tracks.append(track)
        source = source.replace(original, str(soup), 1)
        print(f'[{page_key}] ready {key}: {len(payload["words"])} timed words', flush=True)

    out.joinpath('narration.js').write_text(
        'window.ABA_NARRATION=' + json.dumps(tracks, ensure_ascii=False, separators=(',', ':')) + ';\n')
    page.write_text(source)
    print(f'[{page_key}] wrote {page_file} and {audio_dir}/narration.js', flush=True)


async def main(keys):
    for key in keys:
        await build(key)


if __name__ == '__main__':
    requested = sys.argv[1:] or list(PAGES)
    unknown = [k for k in requested if k not in PAGES]
    if unknown:
        sys.exit(f'Unknown page(s): {", ".join(unknown)}. Choose from: {", ".join(PAGES)}')
    asyncio.run(main(requested))
