/**
 * fetch-youtube-videos.js
 * ------------------------------------------------------------------
 * Pulls every public video from a YouTube channel, classifies each as a
 * Short vs long-form video, fetches durations, and writes:
 *   - output/youtube-videos.json   (long-form videos only)
 *   - output/youtube-shorts.json   (Shorts only)
 *   - output/youtube-all.json      (everything, tagged with isShort)
 *
 * This is a one-time / occasional CONTENT-PIPELINE script. NOT runtime.
 * The API key is a build-time secret and must never ship to the browser.
 *
 * ------------------------------------------------------------------
 * HOW TO GET A YOUTUBE DATA API v3 KEY (~5 minutes):
 *   1. https://console.cloud.google.com/  -> create/select a project
 *   2. APIs & Services -> Library -> "YouTube Data API v3" -> Enable
 *   3. APIs & Services -> Credentials -> Create Credentials -> API key
 *   4. (Recommended) Restrict the key to "YouTube Data API v3"
 *
 * ------------------------------------------------------------------
 * USAGE (Windows cmd):
 *   node firebase\scripts\fetch-youtube-videos.js --key=YOUR_KEY
 *   set YOUTUBE_API_KEY=YOUR_KEY && node firebase\scripts\fetch-youtube-videos.js
 *   node firebase\scripts\fetch-youtube-videos.js   (prompts for key)
 *
 * Optional flags:
 *   --handle=@shreybeast     Channel handle (default: @shreybeast)
 *   --channelId=UCxxxx       Explicit channel ID (skips handle lookup)
 *   --type=videos|shorts|all Which set to print summary for (default: videos)
 *   --no-verify              Skip the /shorts/<id> redirect check (use duration only)
 *   --shortMax=180           Max seconds counted as a Short by duration (default 180)
 *   --concurrency=6          Parallel redirect checks (default 6)
 *
 * Requires Node 18+ (built-in fetch). No npm install needed.
 * ------------------------------------------------------------------
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const DEFAULT_HANDLE = '@shreybeast';

function parseArgs(argv) {
  const args = {};
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (raw.startsWith('--')) args[raw.slice(2)] = true;
  }
  return args;
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function apiGet(endpoint, params, apiKey) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`YouTube API ${endpoint} failed (HTTP ${res.status}): ${detail}`);
  }
  return res.json();
}

async function resolveChannel({ handle, channelId }, apiKey) {
  let id = channelId;

  if (!id) {
    const cleanHandle = handle.replace(/^@/, '');
    const byHandle = await apiGet(
      'channels',
      { part: 'contentDetails,snippet', forHandle: cleanHandle },
      apiKey
    );
    if (byHandle.items && byHandle.items.length > 0) {
      const ch = byHandle.items[0];
      return {
        channelId: ch.id,
        title: ch.snippet?.title,
        uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads,
      };
    }
    const search = await apiGet(
      'search',
      { part: 'snippet', q: handle, type: 'channel', maxResults: '1' },
      apiKey
    );
    if (!search.items || search.items.length === 0) {
      throw new Error(`Could not resolve channel for handle "${handle}".`);
    }
    id = search.items[0].snippet.channelId;
  }

  const byId = await apiGet('channels', { part: 'contentDetails,snippet', id }, apiKey);
  if (!byId.items || byId.items.length === 0) throw new Error(`Channel id "${id}" not found.`);
  const ch = byId.items[0];
  return {
    channelId: ch.id,
    title: ch.snippet?.title,
    uploadsPlaylistId: ch.contentDetails?.relatedPlaylists?.uploads,
  };
}

function bestThumbnail(thumbnails, videoId) {
  if (thumbnails) {
    const pref = ['maxres', 'standard', 'high', 'medium', 'default'];
    for (const key of pref) if (thumbnails[key]?.url) return thumbnails[key].url;
  }
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

async function fetchAllUploads(uploadsPlaylistId, apiKey) {
  const videos = [];
  let pageToken = '';
  do {
    const params = {
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: '50',
    };
    if (pageToken) params.pageToken = pageToken;
    const data = await apiGet('playlistItems', params, apiKey);

    for (const item of data.items || []) {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (!videoId) continue;
      videos.push({
        videoId,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        publishedAt:
          item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || null,
        thumbnail: bestThumbnail(item.snippet?.thumbnails, videoId),
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
    pageToken = data.nextPageToken || '';
    process.stdout.write(`  ...collected ${videos.length} videos\r`);
  } while (pageToken);
  process.stdout.write('\n');
  return videos;
}

// ISO 8601 duration (e.g. PT1M30S) -> seconds
function parseISODuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return h * 3600 + min * 60 + s;
}

function durationLabel(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Fetch durations in batches of 50 via videos.list
async function fetchDurations(videoIds, apiKey) {
  const map = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await apiGet(
      'videos',
      { part: 'contentDetails', id: batch.join(',') },
      apiKey
    );
    for (const item of data.items || []) {
      map[item.id] = parseISODuration(item.contentDetails?.duration);
    }
  }
  return map;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Definitive Short check: request /shorts/<id> with redirects disabled.
 * If it stays (200) -> Short. If it redirects to /watch -> regular video.
 */
async function isShortByRedirect(videoId) {
  const url = `https://www.youtube.com/shorts/${videoId}`;
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    headers: { 'User-Agent': UA },
  });
  // 200 => served as a Short. 30x => redirected to /watch => not a Short.
  if (res.status >= 300 && res.status < 400) return false;
  if (res.status === 200) return true;
  // Unknown; signal null so caller can fall back to duration.
  return null;
}

async function classifyShorts(videos, { verify, shortMax, concurrency }) {
  // Duration-based default classification first.
  for (const v of videos) {
    v.isShort = v.durationSeconds > 0 && v.durationSeconds <= shortMax;
  }

  if (!verify) return;

  let idx = 0;
  let done = 0;
  async function worker() {
    while (idx < videos.length) {
      const myIdx = idx++;
      const v = videos[myIdx];
      try {
        const result = await isShortByRedirect(v.videoId);
        if (result !== null) v.isShort = result;
      } catch {
        // keep duration-based value on failure
      }
      done++;
      process.stdout.write(`  ...verified ${done}/${videos.length}\r`);
    }
  }
  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  process.stdout.write('\n');
}

function writeJson(outPath, obj) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(obj, null, 2), 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);

  let apiKey = args.key || process.env.YOUTUBE_API_KEY;
  if (!apiKey) apiKey = await prompt('Enter your YouTube Data API v3 key: ');
  if (!apiKey) {
    console.error('ERROR: No API key provided. Aborting.');
    process.exit(1);
  }

  const handle = args.handle || DEFAULT_HANDLE;
  const channelId = args.channelId || null;
  const type = (args.type || 'videos').toLowerCase();
  const verify = args['no-verify'] ? false : true;
  const shortMax = parseInt(args.shortMax || '180', 10);
  const concurrency = parseInt(args.concurrency || '6', 10);

  const outDir = path.join(__dirname, 'output');

  console.log('Resolving channel...');
  const channel = await resolveChannel({ handle, channelId }, apiKey);
  console.log(`  Channel: ${channel.title} (${channel.channelId})`);
  console.log(`  Uploads playlist: ${channel.uploadsPlaylistId}`);
  if (!channel.uploadsPlaylistId) throw new Error('No uploads playlist found.');

  console.log('Fetching video list...');
  const videos = await fetchAllUploads(channel.uploadsPlaylistId, apiKey);

  console.log('Fetching durations...');
  const durations = await fetchDurations(videos.map((v) => v.videoId), apiKey);
  for (const v of videos) {
    v.durationSeconds = durations[v.videoId] || 0;
    v.durationLabel = durationLabel(v.durationSeconds);
  }

  console.log(
    verify
      ? 'Classifying Shorts (definitive /shorts redirect check)...'
      : 'Classifying Shorts (duration heuristic only)...'
  );
  await classifyShorts(videos, { verify, shortMax, concurrency });

  // Sort newest first.
  const sortNewest = (a, b) =>
    (b.publishedAt ? Date.parse(b.publishedAt) : 0) -
    (a.publishedAt ? Date.parse(a.publishedAt) : 0);
  videos.sort(sortNewest);

  const longform = videos.filter((v) => !v.isShort);
  const shorts = videos.filter((v) => v.isShort);

  const meta = {
    channelId: channel.channelId,
    channelTitle: channel.title,
    handle,
    fetchedAt: new Date().toISOString(),
  };

  writeJson(path.join(outDir, 'youtube-all.json'), {
    ...meta,
    videoCount: videos.length,
    videos,
  });
  writeJson(path.join(outDir, 'youtube-videos.json'), {
    ...meta,
    videoCount: longform.length,
    videos: longform,
  });
  writeJson(path.join(outDir, 'youtube-shorts.json'), {
    ...meta,
    videoCount: shorts.length,
    videos: shorts,
  });

  console.log(`\nDone.`);
  console.log(`  Total uploads: ${videos.length}`);
  console.log(`  Long-form videos: ${longform.length}  -> output/youtube-videos.json`);
  console.log(`  Shorts: ${shorts.length}  -> output/youtube-shorts.json`);
  console.log(`  All (tagged): output/youtube-all.json`);

  const preview = type === 'shorts' ? shorts : type === 'all' ? videos : longform;
  console.log(`\nPreview (${type}, newest 10):`);
  for (const v of preview.slice(0, 10)) {
    const date = v.publishedAt ? v.publishedAt.slice(0, 10) : 'unknown';
    const tag = v.isShort ? 'SHORT' : 'VIDEO';
    console.log(`  [${date}] (${v.durationLabel}, ${tag}) ${v.title}  (${v.videoId})`);
  }
  if (preview.length > 10) console.log(`  ...and ${preview.length - 10} more.`);
}

main().catch((err) => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
