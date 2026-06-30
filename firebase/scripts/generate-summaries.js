/**
 * generate-summaries.js  (Step 3)
 * ------------------------------------------------------------------
 * Reads a video list JSON + transcripts and uses Amazon Bedrock (Claude)
 * to produce, per video: a marketing summary, a TOPIC (closed set), and
 * BODY PARTS (only when the topic is Workouts). Writes the website data
 * file the /exercises page consumes:
 *
 *   app/src/lib/exercise-videos.ts
 *
 * Also writes a JSON mirror: firebase/scripts/output/exercise-videos.json
 *
 * Taxonomy (closed, to keep filter chips clean):
 *   topic:     Workouts | Nutrition | Mindset | Other
 *   bodyParts: subset of [Chest, Back, Shoulders, Arms, Legs, Core, Glutes, Full Body]
 *              (only meaningful when topic === "Workouts"; otherwise [])
 *
 * format ("long" | "short") is carried from the isShort flag set by
 * fetch-youtube-videos.js.
 *
 * ------------------------------------------------------------------
 * USAGE (Windows cmd):
 *   node firebase\scripts\generate-summaries.js --model=us.anthropic.claude-opus-4-8
 *   node firebase\scripts\generate-summaries.js --input=output/youtube-videos.json
 *   node firebase\scripts\generate-summaries.js --dry-run
 *
 * Flags:
 *   --model=...   Bedrock model id / inference profile (default below)
 *   --region=...  AWS region (default: AWS_REGION env or us-west-2)
 *   --input=...   video list json (default output/youtube-all.json)
 *   --out=...     output .ts path (default app/src/lib/exercise-videos.ts)
 *   --concurrency=4   parallel Bedrock calls (default 4)
 *   --dry-run     Skip Bedrock; emit placeholders
 * ------------------------------------------------------------------
 */

"use strict";

const fs = require("fs");
const path = require("path");

const TOPICS = ["Workouts", "Nutrition", "Mindset", "Other"];
const BODY_PARTS = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
  "Glutes",
  "Full Body",
];

const DEFAULT_MODEL = "us.anthropic.claude-opus-4-8";

// Videos published before this date are auto-hidden (override with --hideBefore).
const DEFAULT_HIDE_BEFORE = "2025-01-01";

function parseArgs(argv) {
  const args = {};
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
    else if (raw.startsWith("--")) args[raw.slice(2)] = true;
  }
  return args;
}

// Accept a full YouTube URL (watch / shorts / youtu.be) OR a bare 11-char ID,
// and return the normalized video id (or null if it cannot be parsed).
function parseVideoId(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;
  // Bare ID.
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    // youtube.com/watch?v=<id>
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    // youtube.com/shorts/<id> or /embed/<id>
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "shorts" || p === "embed");
    if (idx !== -1 && parts[idx + 1] && /^[A-Za-z0-9_-]{11}$/.test(parts[idx + 1])) {
      return parts[idx + 1];
    }
  } catch {
    // not a URL
  }
  return null;
}

// Load the manual blacklist (firebase/scripts/hidden-videos.json) into a Set of ids.
function loadHiddenIds() {
  const p = path.join(__dirname, "hidden-videos.json");
  const ids = new Set();
  if (!fs.existsSync(p)) return ids;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    const list = Array.isArray(raw) ? raw : raw.hide || [];
    for (const entry of list) {
      const id = parseVideoId(entry);
      if (id) ids.add(id);
    }
  } catch (e) {
    console.warn(`  WARN: could not parse hidden-videos.json: ${e.message}`);
  }
  return ids;
}

// Decide whether a video should be hidden. Returns { hidden, hiddenReason }.
function computeHidden(video, hideBeforeMs, manualIds) {
  if (manualIds.has(video.videoId)) {
    return { hidden: true, hiddenReason: "manual" };
  }
  if (hideBeforeMs && video.publishedAt) {
    const t = Date.parse(video.publishedAt);
    if (!Number.isNaN(t) && t < hideBeforeMs) {
      return { hidden: true, hiddenReason: "date" };
    }
  }
  return { hidden: false, hiddenReason: null };
}


function buildPrompt(video, transcript) {
  const trimmed = (transcript || "").slice(0, 12000);
  return `You are writing copy for a personal trainer's public marketing website. Below is the auto-generated transcript (or description) of one of the trainer's YouTube videos.

Video title: "${video.title}"
Duration: ${video.durationLabel || "unknown"}

Transcript:
"""
${trimmed}
"""

Classify and summarize this video. Respond with ONLY a JSON object (no markdown fences, no commentary) in exactly this shape:
{
  "summary": "2-3 sentences, marketing tone, describing what the viewer will learn. Do not start with 'In this video'. No emojis.",
  "topic": "one of: ${TOPICS.join(", ")}",
  "bodyParts": ["zero or more of: ${BODY_PARTS.join(", ")}"],
  "keywords": ["3-6 lowercase search keywords or short phrases"]
}

Rules:
- "topic" must be exactly one of the allowed values. Use "Workouts" for any training/exercise/form content, "Nutrition" for diet/food/supplements, "Mindset" for motivation/psychology/discipline, and "Other" only if none fit.
- "bodyParts" applies ONLY when topic is "Workouts". List every muscle group meaningfully trained or demonstrated (one or more). For non-workout topics, return an empty array.
- If a workout targets the whole body or is a full routine across many groups, you may use "Full Body".`;
}

async function summarizeWithBedrock(client, ConverseCommand, modelId, prompt) {
  const command = new ConverseCommand({
    modelId,
    messages: [{ role: "user", content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 700 },
  });
  const response = await client.send(command);
  return response.output?.message?.content?.map((c) => c.text).join("") || "";
}

function extractJson(text) {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

function normalizeTopic(topic) {
  if (!topic) return "Other";
  const found = TOPICS.find((t) => t.toLowerCase() === String(topic).toLowerCase());
  return found || "Other";
}

function normalizeBodyParts(arr, topic) {
  if (topic !== "Workouts" || !Array.isArray(arr)) return [];
  const out = [];
  for (const raw of arr) {
    const found = BODY_PARTS.find(
      (b) => b.toLowerCase() === String(raw).toLowerCase()
    );
    if (found && !out.includes(found)) out.push(found);
  }
  return out;
}

function tsString(s) {
  return JSON.stringify(s == null ? "" : String(s));
}

function buildTsFile(meta, items) {
  const header = `// AUTO-GENERATED by firebase/scripts/generate-summaries.js
// Do not edit by hand (re-run the script to regenerate).
// Source channel: ${meta.channelTitle} (${meta.handle})
// Generated: ${new Date().toISOString()}

export type ExerciseTopic =
${TOPICS.map((t) => `  | ${JSON.stringify(t)}`).join("\n")};

export type BodyPart =
${BODY_PARTS.map((b) => `  | ${JSON.stringify(b)}`).join("\n")};

export type VideoFormat = "long" | "short";

export interface ExerciseVideo {
  videoId: string;
  title: string;
  summary: string;
  topic: ExerciseTopic;
  bodyParts: BodyPart[];
  format: VideoFormat;
  keywords: string[];
  durationLabel: string;
  durationSeconds: number;
  publishedAt: string | null;
  thumbnail: string;        // portrait (oar) thumbnail, best for vertical video
  thumbnailFallback: string; // landscape hqdefault fallback
  url: string;
  hidden: boolean;          // true => not displayed on the site
  hiddenReason: "date" | "manual" | null;
}


export const EXERCISE_TOPICS: ExerciseTopic[] = [
${TOPICS.map((t) => `  ${JSON.stringify(t)},`).join("\n")}
];

export const BODY_PARTS: BodyPart[] = [
${BODY_PARTS.map((b) => `  ${JSON.stringify(b)},`).join("\n")}
];

export const exerciseVideos: ExerciseVideo[] = [
`;

  const body = items
    .map((it) => {
      return `  {
    videoId: ${tsString(it.videoId)},
    title: ${tsString(it.title)},
    summary: ${tsString(it.summary)},
    topic: ${tsString(it.topic)},
    bodyParts: [${(it.bodyParts || []).map((b) => tsString(b)).join(", ")}],
    format: ${tsString(it.format)},
    keywords: [${(it.keywords || []).map((k) => tsString(k)).join(", ")}],
    durationLabel: ${tsString(it.durationLabel)},
    durationSeconds: ${it.durationSeconds || 0},
    publishedAt: ${it.publishedAt ? tsString(it.publishedAt) : "null"},
    thumbnail: ${tsString(it.thumbnail)},
    thumbnailFallback: ${tsString(it.thumbnailFallback)},
    url: ${tsString(it.url)},
    hidden: ${it.hidden ? "true" : "false"},
    hiddenReason: ${it.hiddenReason ? tsString(it.hiddenReason) : "null"},
  },`;
    })
    .join("\n");

  return `${header}${body}
];
`;
}

async function main() {
  const args = parseArgs(process.argv);
  const region = args.region || process.env.AWS_REGION || "us-west-2";
  const modelId = args.model || DEFAULT_MODEL;
  const dryRun = !!args["dry-run"];
  const concurrency = Math.max(1, parseInt(args.concurrency || "4", 10));

  // Hide rules: date cutoff + manual blacklist.
  const hideBeforeStr = args.hideBefore || DEFAULT_HIDE_BEFORE;
  const hideBeforeMs = hideBeforeStr ? Date.parse(hideBeforeStr) : NaN;
  const manualHiddenIds = loadHiddenIds();


  const inputPath = path.resolve(
    process.cwd(),
    args.input || path.join("firebase", "scripts", "output", "youtube-all.json")
  );
  const outTsPath = path.resolve(
    process.cwd(),
    args.out || path.join("app", "src", "lib", "exercise-videos.ts")
  );
  const transcriptsDir = path.join(__dirname, "output", "transcripts");

  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: input not found: ${inputPath}. Run fetch-youtube-videos.js first.`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const videos = data.videos || [];
  const meta = {
    channelTitle: data.channelTitle || "",
    handle: data.handle || "",
  };

  let client = null;
  let ConverseCommand = null;
  if (!dryRun) {
    let sdk;
    try {
      sdk = require("@aws-sdk/client-bedrock-runtime");
    } catch {
      console.error(
        "ERROR: @aws-sdk/client-bedrock-runtime is not installed.\n" +
          "Install:  npm install @aws-sdk/client-bedrock-runtime\n" +
          "Or run with --dry-run."
      );
      process.exit(1);
    }
    const { BedrockRuntimeClient } = sdk;
    ConverseCommand = sdk.ConverseCommand;
    client = new BedrockRuntimeClient({ region });
    console.log(`Bedrock region: ${region}`);
    console.log(`Model: ${modelId}`);
    console.log(`Concurrency: ${concurrency}`);
  } else {
    console.log("DRY RUN: no Bedrock calls will be made.");
  }

  // Prepare an array of result slots so we can run with bounded concurrency
  // while preserving order.
  const results = new Array(videos.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= videos.length) break;
      const video = videos[i];

      const txtPath = path.join(transcriptsDir, `${video.videoId}.txt`);
      const transcript = fs.existsSync(txtPath)
        ? fs.readFileSync(txtPath, "utf8")
        : video.description || "";

      let summary = "";
      let topic = "Other";
      let bodyParts = [];
      let keywords = [];

      if (dryRun) {
        summary = `Placeholder summary for "${video.title}".`;
      } else {
        try {
          const prompt = buildPrompt(video, transcript);
          const raw = await summarizeWithBedrock(client, ConverseCommand, modelId, prompt);
          const parsed = extractJson(raw);
          summary = (parsed.summary || "").trim();
          topic = normalizeTopic(parsed.topic);
          bodyParts = normalizeBodyParts(parsed.bodyParts, topic);
          keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
        } catch (e) {
          summary = "";
          topic = "Other";
          console.log(`  ${video.videoId} FAILED: ${e.message}`);
        }
      }

      const { hidden, hiddenReason } = computeHidden(
        video,
        hideBeforeMs,
        manualHiddenIds
      );

      results[i] = {
        videoId: video.videoId,
        title: video.title,
        summary,
        topic,
        bodyParts,
        format: video.isShort ? "short" : "long",
        keywords,
        durationLabel: video.durationLabel || "",
        durationSeconds: video.durationSeconds || 0,
        publishedAt: video.publishedAt || null,
        // Portrait-first thumbnail for vertical videos; landscape fallback.
        thumbnail: `https://i.ytimg.com/vi/${video.videoId}/oardefault.jpg`,
        thumbnailFallback:
          video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        url: video.url || `https://www.youtube.com/watch?v=${video.videoId}`,
        hidden,
        hiddenReason,
      };

      completed++;
      const tag = results[i].topic + (bodyParts.length ? ` / ${bodyParts.join(",")}` : "");
      process.stdout.write(
        `  [${completed}/${videos.length}] ${video.videoId} -> ${tag}\n`
      );
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const items = results.filter(Boolean);

  const jsonOut = path.join(__dirname, "output", "exercise-videos.json");
  fs.writeFileSync(jsonOut, JSON.stringify({ ...meta, items }, null, 2), "utf8");

  fs.mkdirSync(path.dirname(outTsPath), { recursive: true });
  fs.writeFileSync(outTsPath, buildTsFile(meta, items), "utf8");

  console.log(`\nDone.`);
  console.log(`  TS data file: ${outTsPath}`);
  console.log(`  JSON mirror:  ${jsonOut}`);

  const byTopic = {};
  const byFormat = {};
  for (const it of items) {
    byTopic[it.topic] = (byTopic[it.topic] || 0) + 1;
    byFormat[it.format] = (byFormat[it.format] || 0) + 1;
  }
  console.log("\nBy topic:");
  for (const [t, n] of Object.entries(byTopic)) console.log(`  ${t}: ${n}`);
  console.log("By format:");
  for (const [f, n] of Object.entries(byFormat)) console.log(`  ${f}: ${n}`);
}

main().catch((err) => {
  console.error("\nERROR:", err.message);
  process.exit(1);
});
