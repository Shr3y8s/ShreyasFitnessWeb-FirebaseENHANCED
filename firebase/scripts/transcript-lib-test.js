/**
 * transcript-lib-test.js
 * ------------------------------------------------------------------
 * Tries multiple transcript libraries against ONE video id and reports
 * which one(s) succeed. Used to pick the most reliable approach.
 *
 * USAGE:
 *   node firebase/scripts/transcript-lib-test.js <videoId>
 *   node firebase/scripts/transcript-lib-test.js pSeMNSAXnrs
 * ------------------------------------------------------------------
 */

'use strict';

function preview(text, n = 400) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.slice(0, n) + (clean.length > n ? ' ...[truncated]' : '');
}

async function tryYoutubeTranscriptApi(videoId) {
  const mod = require('youtube-transcript-api');
  const TranscriptClient = mod.default || mod;
  const client = new TranscriptClient();
  if (client.ready) await client.ready;
  const result = await client.getTranscript(videoId);
  // result shape can vary; normalize to text
  let text = '';
  if (Array.isArray(result)) {
    text = result.map((r) => r.text || r.snippet || '').join(' ');
  } else if (result && Array.isArray(result.transcript)) {
    text = result.transcript.map((r) => r.text || '').join(' ');
  } else {
    text = JSON.stringify(result).slice(0, 500);
  }
  return text;
}

async function tryYoutubeTranscriptPlus(videoId) {
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
  return result.map((r) => r.text).join(' ');
}

async function tryYoutubeTranscript(videoId) {
  const { YoutubeTranscript } = require('youtube-transcript');
  const result = await YoutubeTranscript.fetchTranscript(videoId);
  return result.map((r) => r.text).join(' ');
}

async function run(name, fn, videoId) {
  process.stdout.write(`\n--- ${name} ---\n`);
  try {
    const text = await fn(videoId);
    if (text && text.trim()) {
      console.log(`  SUCCESS  (chars=${text.length}, words=${text.split(/\s+/).filter(Boolean).length})`);
      console.log(`  preview: ${preview(text)}`);
      return { name, ok: true, text };
    }
    console.log('  EMPTY result');
    return { name, ok: false };
  } catch (e) {
    console.log(`  FAILED: ${e.message}`);
    return { name, ok: false };
  }
}

async function main() {
  const videoId = process.argv[2];
  if (!videoId) {
    console.error('Usage: node firebase/scripts/transcript-lib-test.js <videoId>');
    process.exit(1);
  }

  console.log(`Testing transcript libraries for video: ${videoId}`);

  const results = [];
  results.push(await run('youtube-transcript-api', tryYoutubeTranscriptApi, videoId));
  results.push(await run('youtube-transcript-plus', tryYoutubeTranscriptPlus, videoId));
  results.push(await run('youtube-transcript', tryYoutubeTranscript, videoId));

  console.log('\n========== SUMMARY ==========');
  for (const r of results) {
    console.log(`  ${r.ok ? 'OK   ' : 'FAIL '} ${r.name}`);
  }
  const winner = results.find((r) => r.ok);
  if (winner) {
    const fs = require('fs');
    const path = require('path');
    const outDir = path.join(__dirname, 'output', 'transcripts');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${videoId}.txt`);
    fs.writeFileSync(outPath, winner.text.replace(/\s+/g, ' ').trim(), 'utf8');
    console.log(`\nWinner: ${winner.name}. Saved transcript to ${outPath}`);
  } else {
    console.log('\nNo library succeeded. We may need OAuth captions or audio->Whisper.');
    process.exit(2);
  }
}

main();
