"""Regenerate the reader's Edge TTS audio. Requires edge-tts and beautifulsoup4."""
import asyncio
import hashlib
import html
import json
import re
from pathlib import Path

import edge_tts
from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / 'ABA_Before_Day_1_Reading.html'
OUT = ROOT / 'audio/aba-before-day-1'
VOICE = 'en-US-AriaNeural'

async def main():
    source = PAGE.read_text()
    tracks = []
    # Keep the surrounding HTML, CSS and scripts byte-for-byte intact.
    pattern = r'<header class="hero"[^>]*>[\s\S]*?</header>|<section class="chapter"[^>]*>[\s\S]*?</section>'
    for match in list(re.finditer(pattern, source)):
        original = match.group()
        soup = BeautifulSoup(original, 'html.parser')
        container = soup.find(['header', 'section'])
        for span in list(container.select('[data-tts-node]')):
            span.unwrap()
        key = container.get('id', 'intro')
        title = container.find(['h1', 'h2']).get_text(' ', strip=True)
        nodes, parts, offset = [], [], 0
        for node in list(container.find_all(string=True)):
            if isinstance(node, Comment) or not node.strip():
                continue
            if any(p.name in ('script', 'style', 'details', 'button') or 'top' in p.get('class', []) for p in node.parents):
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
        metadata = OUT / f'{key}.words.json'
        audio = OUT / f'{key}.mp3'
        payload = json.loads(metadata.read_text()) if metadata.exists() else {}
        if payload.get('digest') != digest or not audio.exists() or not audio.stat().st_size:
            print(f'Generating {key}: {len(text.split())} words', flush=True)
            words, cursor = [], 0
            temp = audio.with_suffix('.part')
            with temp.open('wb') as handle:
                async for chunk in edge_tts.Communicate(text, VOICE, boundary='WordBoundary').stream():
                    if chunk['type'] == 'audio':
                        handle.write(chunk['data'])
                    elif chunk['type'] == 'WordBoundary':
                        token = html.unescape(chunk['text'])
                        found = re.search(re.escape(token), text[cursor:], re.IGNORECASE)
                        if not found:
                            raise ValueError(f'Cannot align {token!r} after {cursor} in {key}')
                        start = cursor + found.start()
                        end = cursor + found.end()
                        words.append({'text': token, 'start': chunk['offset']/1e7, 'end': (chunk['offset']+chunk['duration'])/1e7, 'start_char': start, 'end_char': end})
                        cursor = end
            if not words or not temp.stat().st_size:
                raise ValueError(f'Missing audio or timings for {key}')
            temp.replace(audio)
            payload = {'digest': digest, 'voice': VOICE, 'text': text, 'audio': audio.name, 'words': words}
            metadata.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
        tracks.append({'id': key, 'title': title, 'audio': f'audio/aba-before-day-1/{audio.name}', 'nodes': nodes, 'words': payload['words']})
        source = source.replace(original, str(soup), 1)
        print(f'Ready {key}: {len(payload["words"])} timed words', flush=True)
    OUT.joinpath('narration.js').write_text('window.ABA_NARRATION=' + json.dumps(tracks, ensure_ascii=False, separators=(',', ':')) + ';\n')
    PAGE.write_text(source)

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    asyncio.run(main())
