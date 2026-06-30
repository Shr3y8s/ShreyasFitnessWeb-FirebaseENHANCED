/**
 * fetch-transcripts.js  (Step 2)
 * ------------------------------------------------------------------
 * Reads a video list JSON (default: output/youtube-videos.json) and
 * fetches the auto-generated transcript for each video.
 *
 * Strategy per video:
 *   1. youtube-transcript        (primary, cleanest text)
 *   2. youtube-transcript-plus   (fallback)
 *   3. video description         (final fallback if captions disabled)
 *
 * Writes:
 *   output/transcripts/<videoId>.txt          (one file per video)
 *   output/transcripts-index.json             (videoId -> {source, words, ok})
 *
 * No API key / OAuth needed (libraries emulate the player flow).
 *
 * USAGE:
 *   node firebase\scripts\fetch-transcripts.js
 *   node firebase\scripts\fetch-transcripts.js --input=output/youtube-shorts.json
 *   node firebase\scripts\fetch-transcripts.js --force   (re-fetch even if cached)
 * ------------------------------------------------------------------
 */

'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (raw.startsWith('--')) args[raw.slice(2)] = true;
  }
  return args;
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

function clean(text) {
  return decodeEntities(text || '').replace(/\s+/g, ' ').trim();
}

async function viaYoutubeTranscript(videoId) {
  const { YoutubeTranscript } = require('youtube-transcript');
  const result = await YoutubeTranscript.fetchTranscript(videoId);
  return clean(result.map((r) => r.text).join(' '));
}

async function viaYoutubeTranscriptPlus(videoId) {
  const mod = require('youtube-transcript-plus');
  const fn =
    mod.fetchTranscript ||
    mod.YoutubeTranscriptPlus?.fetchTranscript ||
    mod.default?.fetchTranscript ||
    mod.default;
  const result =
    typeof fn === 'function'
      ? await fn(videoId)
      : await mod.YoutubeTranscriptPlus.fetchTranscript(videoId);
  return clean(result.map((r) => r.text).join(' '));
}

async function fetchOneTranscript(video) {
  // Try primary, then fallback library, then description.
  try {
    const t = await viaYoutubeTranscript(video.videoId);
    if (t) return { text: t, source: 'youtube-transcript' };
  } catch {
    /* continue */
  }
  try {
    const t = await viaYoutubeTranscriptPlus(video.videoId);
    if (t) return { text: t, source: 'youtube-transcript-plus' };
  } catch {
    /* continue */
  }
  const desc = clean(video.description);
  if (desc) return { text: desc, source: 'description-fallback' };
  return { text: '', source: 'none' };
}

async function main() {
  const args = parseArgs(process.argv);
  const inputPath = path.resolve(
    process.cwd(),
    args.input || path.join('firebase', 'scripts', 'output', 'youtube-videos.json')
  );
  const force = !!args.force;

  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: input not found: ${inputPath}`);
    console.error('Run fetch-youtube-videos.js first.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const videos = data.videos || [];
  console.log(`Loaded ${videos.length} videos from ${path.basename(inputPath)}`);

  const outDir = path.join(__dirname, 'output', 'transcripts');
  fs.mkdirSync(outDir, { recursive: true });

  const index = {};
  let i = 0;
  for (const video of videos) {
    i++;
    const txtPath = path.join(outDir, `${video.videoId}.txt`);

    if (!force && fs.existsSync(txtPath)) {
      const cached = fs.readFileSync(txtPath, 'utf8');
      index[video.videoId] = {
        source: 'cached',
        words: cached.split(/\s+/).filter(Boolean).length,
        ok: cached.length > 0,
      };
      console.log(`  [${i}/${videos.length}] ${video.videoId} (cached)`);
      continue;
    }

    process.stdout.write(`  [${i}/${videos.length}] ${video.videoId} ... `);
    const { text, source } = await fetchOneTranscript(video);
    fs.writeFileSync(txtPath, text, 'utf8');
    const words = text.split(/\s+/).filter(Boolean).length;
    index[video.videoId] = { source, words, ok: text.length > 0, title: video.title };
    console.log(`${source} (${words} words)`);
  }

  const indexPath = path.join(__dirname, 'output', 'transcripts-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');

  // Summary
  const counts = {};
  for (const v of Object.values(index)) counts[v.source] = (counts[v.source] || 0) + 1;
  console.log('\nDone. Source breakdown:');
  for (const [src, n] of Object.entries(counts)) console.log(`  ${src}: ${n}`);
  console.log(`\nTranscripts in: ${outDir}`);
  console.log(`Index: ${indexPath}`);

  const failed = Object.entries(index).filter(([, v]) => !v.ok);
  if (failed.length) {
    console.log(`\nNeeds attention (no transcript or description):`);
    for (const [id] of failed) console.log(`  ${id}`);
  }
}

main().catch((err) => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
