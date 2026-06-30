/**
 * fetch-transcript-test.js
 * ------------------------------------------------------------------
 * Single-video proof-of-concept: fetch YouTube's auto-generated
 * transcript for ONE video, dependency-free (no npm install, no API key).
 *
 * It works the same way the "Show transcript" button does:
 *   1. Load the watch page HTML for the video.
 *   2. Extract the ytInitialPlayerResponse JSON embedded in the page.
 *   3. Find the caption track (prefers English, then auto-generated).
 *   4. Download that timedtext track and parse it into plain text.
 *
 * USAGE:
 *   node firebase/scripts/fetch-transcript-test.js <videoId>
 *   node firebase/scripts/fetch-transcript-test.js pSeMNSAXnrs
 *
 * Output:
 *   - prints transcript + word count to console
 *   - saves firebase/scripts/output/transcripts/<videoId>.txt
 * ------------------------------------------------------------------
 */

'use strict';

const fs = require('fs');
const path = require('path');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getText(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      ...extraHeaders,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

function extractPlayerResponse(html) {
  // The watch page embeds: var ytInitialPlayerResponse = {...};
  const marker = 'ytInitialPlayerResponse = ';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  let start = idx + marker.length;
  // Walk braces to find the matching end of the JSON object.
  let depth = 0;
  let inString = false;
  let escape = false;
  let end = -1;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) return null;
  const jsonStr = html.slice(start, end);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function pickCaptionTrack(playerResponse) {
  const tracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer
      ?.captionTracks || [];
  if (tracks.length === 0) return null;

  // Prefer manual English, then any English, then auto (asr) English, then first.
  const byLang = (t) => (t.languageCode || '').toLowerCase().startsWith('en');
  const manualEn = tracks.find((t) => byLang(t) && t.kind !== 'asr');
  if (manualEn) return manualEn;
  const anyEn = tracks.find((t) => byLang(t));
  if (anyEn) return anyEn;
  return tracks[0];
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function parseTimedText(xml) {
  // timedtext XML: <text start="1.2" dur="3.4">line</text>
  const lines = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    let line = m[1]
      .replace(/<[^>]+>/g, '') // strip nested tags
      .replace(/\n+/g, ' ')
      .trim();
    line = decodeEntities(line);
    if (line) lines.push(line);
  }
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

function parseJson3(jsonStr) {
  // timedtext json3: { events: [ { segs: [ { utf8: "..." } ] } ] }
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    return '';
  }
  const events = data?.events || [];
  const parts = [];
  for (const ev of events) {
    if (!ev.segs) continue;
    const segText = ev.segs.map((s) => s.utf8 || '').join('');
    if (segText.trim()) parts.push(segText);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}


async function fetchTranscript(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en`;
  console.log(`Loading watch page: ${watchUrl}`);
  const html = await getText(watchUrl);

  const player = extractPlayerResponse(html);
  if (!player) {
    throw new Error(
      'Could not extract ytInitialPlayerResponse from the page. ' +
        'YouTube may have changed the page format, or the video is unavailable.'
    );
  }

  const status = player?.playabilityStatus?.status;
  if (status && status !== 'OK') {
    console.log(`  playabilityStatus: ${status}`);
  }

  const track = pickCaptionTrack(player);
  if (!track) {
    throw new Error(
      'NO_CAPTIONS: this video has no caption tracks available ' +
        '(captions may be disabled). Fallback would use the description.'
    );
  }

  console.log(
    `  Using caption track: lang=${track.languageCode} kind=${
      track.kind || 'manual'
    } name=${track.name?.simpleText || track.name?.runs?.[0]?.text || ''}`
  );

  let baseUrl = track.baseUrl.replace(/&fmt=[^&]*/g, '');
  console.log(`  caption baseUrl: ${baseUrl.slice(0, 160)}...`);

  // Try json3 first (modern, most reliable), then fall back to XML.
  let text = '';

  try {
    const json3Url = `${baseUrl}&fmt=json3`;
    const body = await getText(json3Url, { Referer: watchUrl });
    console.log(`  json3 body length: ${body.length}`);
    if (body.length < 200) console.log(`  json3 raw: ${JSON.stringify(body)}`);
    text = parseJson3(body);
    if (text) console.log('  Parsed via: json3');
  } catch (e) {
    console.log(`  json3 attempt failed: ${e.message}`);
  }

  if (!text) {
    const xml = await getText(baseUrl, { Referer: watchUrl });
    console.log(`  xml body length: ${xml.length}`);
    if (xml.length < 200) console.log(`  xml raw: ${JSON.stringify(xml)}`);
    text = parseTimedText(xml);
    if (text) console.log('  Parsed via: xml');
  }


  if (!text) {
    throw new Error(
      'Caption track found but produced empty text after parsing (tried json3 + xml).'
    );
  }
  return { text, track };

}

async function main() {
  const videoId = process.argv[2];
  if (!videoId) {
    console.error(
      'Usage: node firebase/scripts/fetch-transcript-test.js <videoId>'
    );
    process.exit(1);
  }

  try {
    const { text } = await fetchTranscript(videoId);
    const words = text.split(/\s+/).filter(Boolean).length;

    const outDir = path.join(__dirname, 'output', 'transcripts');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${videoId}.txt`);
    fs.writeFileSync(outPath, text, 'utf8');

    console.log('\n===== TRANSCRIPT (first 1200 chars) =====\n');
    console.log(text.slice(0, 1200));
    if (text.length > 1200) console.log('\n...[truncated]...');
    console.log('\n=========================================');
    console.log(`Word count: ${words}`);
    console.log(`Char count: ${text.length}`);
    console.log(`Saved to: ${outPath}`);
  } catch (err) {
    console.error('\nTRANSCRIPT FETCH FAILED:', err.message);
    console.error(
      '\nIf this is a page-format or network issue, we can fall back to the ' +
        '`youtube-transcript` npm package. Let me know and I will wire it in.'
    );
    process.exit(2);
  }
}

main();
