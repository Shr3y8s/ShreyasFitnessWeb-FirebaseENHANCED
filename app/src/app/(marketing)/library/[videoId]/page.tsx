import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Youtube } from 'lucide-react';
import {
  exerciseVideos as allExerciseVideos,
  type ExerciseVideo,
} from '@/lib/exercise-videos';
import { pageMetadata, articleJsonLd } from '@/lib/seo';
import { ShareButtons } from '@/components/blog/ShareButtons';

// Only shareable / linkable videos are the visible (non-hidden) ones.
const videos = allExerciseVideos.filter((v) => !v.hidden);

function getVideo(videoId: string): ExerciseVideo | undefined {
  return videos.find((v) => v.videoId === videoId);
}

/**
 * Landscape OG card image (1280x720) — works for both shorts and full
 * workouts and satisfies `summary_large_image`. maxresdefault always exists
 * for these channel uploads; social scrapers fall back gracefully if not.
 */
function ogThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

/** Pre-render a static page for every visible video. */
export function generateStaticParams() {
  return videos.map((v) => ({ videoId: v.videoId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ videoId: string }>;
}): Promise<Metadata> {
  const { videoId } = await params;
  const video = getVideo(videoId);
  if (!video) {
    return pageMetadata({
      title: 'Video not found',
      description: 'This video is no longer available.',
      path: `/library/${videoId}`,
    });
  }
  return pageMetadata({
    title: video.title,
    description: video.summary,
    path: `/library/${video.videoId}`,
    imagePath: ogThumb(video.videoId),
  });
}

/** Up to 6 related videos: same topic first, then any, excluding current. */
function relatedVideos(current: ExerciseVideo): ExerciseVideo[] {
  const sameTopic = videos.filter(
    (v) => v.videoId !== current.videoId && v.topic === current.topic,
  );
  const others = videos.filter(
    (v) => v.videoId !== current.videoId && v.topic !== current.topic,
  );
  return [...sameTopic, ...others].slice(0, 6);
}

export default async function LibraryVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  const video = getVideo(videoId);
  if (!video) notFound();

  const isShort = video.format === 'short';
  const related = relatedVideos(video);

  const metaText = [
    isShort ? 'Short' : 'Workout',
    video.durationLabel,
    video.topic,
    ...video.bodyParts,
  ]
    .filter(Boolean)
    .join(' · ');

  const jsonLd = articleJsonLd({
    title: video.title,
    description: video.summary,
    path: `/library/${video.videoId}`,
    datePublished: video.publishedAt ?? undefined,
    imagePath: ogThumb(video.videoId),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-stone-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="pt-28 pb-16 md:pt-32">
        <div className="mx-auto max-w-4xl px-6">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
          >
            <ArrowLeft className="size-4" />
            Back to Video Library
          </Link>

          {/* Player */}
          <div
            className={`mt-6 overflow-hidden rounded-2xl bg-black shadow-lg ${
              isShort ? 'mx-auto max-w-sm' : ''
            }`}
          >
            <div
              className="relative w-full"
              style={{ aspectRatio: isShort ? '9 / 16' : '16 / 9' }}
            >
              <iframe
                className="absolute inset-0 size-full border-0"
                src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}

                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>

          {/* Details */}
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              {metaText}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              {video.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
              {video.summary}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#ff0000] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#cc0000]"
              >
                <Youtube className="size-[18px]" />
                Watch on YouTube
              </a>
            </div>

            <div className="mt-8 border-t border-emerald-600/15 pt-6">
              <ShareButtons
                path={`/library/${video.videoId}`}
                title={video.title}
                campaign="library_share"
                label="Share this video"
                enableNativeShare
              />
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-14">
              <h2 className="text-xl font-bold text-stone-900">More from the library</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.videoId}
                    href={`/library/${r.videoId}`}
                    className="group overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative aspect-video w-full bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`}
                        alt={r.title}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-800 group-hover:text-emerald-700">
                        {r.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
