'use client';

import { useMemo, useState } from 'react';
import {
  exerciseVideos as allExerciseVideos,
  EXERCISE_TOPICS,
  BODY_PARTS,
  type ExerciseVideo,
  type ExerciseTopic,
  type BodyPart,
  type VideoFormat,
} from '@/lib/exercise-videos';

// Only show videos that are not hidden (date cutoff / manual blacklist).
const exerciseVideos = allExerciseVideos.filter((v) => !v.hidden);


type FormatFilter = 'all' | VideoFormat;
type TopicFilter = 'All' | ExerciseTopic;

/**
 * ExerciseGallery
 * - All videos render in portrait (9:16) because this channel's videos are vertical.
 * - Filters: format (All / Full Workouts / Quick Tips), topic (All / Workouts / Nutrition / Mindset),
 *   and body-part chips (only shown/relevant for Workouts).
 * - Click a card -> lightbox loads the youtube-nocookie embed only on click
 *   (facade pattern: fast load, no YouTube cookies until the user watches).
 */
export function ExerciseGallery() {
  const [format, setFormat] = useState<FormatFilter>('all');
  const [topic, setTopic] = useState<TopicFilter>('All');
  const [bodyPart, setBodyPart] = useState<BodyPart | 'All'>('All');
  const [selected, setSelected] = useState<ExerciseVideo | null>(null);

  // Topics present in the data, in canonical order.
  const topicsPresent = useMemo(() => {
    const present = new Set(exerciseVideos.map((v) => v.topic));
    return EXERCISE_TOPICS.filter((t) => present.has(t));
  }, []);

  // Body parts present among Workouts, canonical order.
  const bodyPartsPresent = useMemo(() => {
    const present = new Set<BodyPart>();
    for (const v of exerciseVideos) {
      if (v.topic === 'Workouts') v.bodyParts.forEach((b) => present.add(b));
    }
    return BODY_PARTS.filter((b) => present.has(b));
  }, []);

  const showBodyPartRow = topic === 'All' || topic === 'Workouts';

  const filtered = useMemo(() => {
    return exerciseVideos.filter((v) => {
      if (format !== 'all' && v.format !== format) return false;
      if (topic !== 'All' && v.topic !== topic) return false;
      if (bodyPart !== 'All') {
        if (v.topic !== 'Workouts' || !v.bodyParts.includes(bodyPart)) return false;
      }
      return true;
    });
  }, [format, topic, bodyPart]);

  return (
    <>
      <style jsx>{`
        .ex-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px 80px;
        }
        .ex-filter-group {
          margin-bottom: 16px;
        }
        .ex-filter-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #999;
          margin: 0 0 8px;
        }
        .ex-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ex-chip {
          border: 1px solid #e0e0e0;
          background: #fff;
          color: #444;
          padding: 7px 16px;
          border-radius: 999px;
          font-size: 0.88rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ex-chip:hover {
          border-color: var(--primary, #4caf50);
          color: var(--primary, #4caf50);
        }
        .ex-chip.active {
          background: var(--primary, #4caf50);
          border-color: var(--primary, #4caf50);
          color: #fff;
        }
        .ex-count {
          color: #999;
          font-size: 0.85rem;
          margin: 18px 0 24px;
        }
        .ex-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 24px;
        }
        .ex-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          text-align: left;
          border: none;
          padding: 0;
          font: inherit;
          width: 100%;
        }
        .ex-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
        }
        .ex-thumb {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #000;
          overflow: hidden;
        }
        .ex-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .ex-badges {
          position: absolute;
          top: 8px;
          left: 8px;
          display: flex;
          gap: 6px;
        }
        .ex-badge {
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .ex-duration {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
        }
        .ex-play {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.12);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .ex-card:hover .ex-play {
          opacity: 1;
        }
        .ex-play i {
          color: #fff;
          font-size: 3rem;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
        }
        .ex-body {
          padding: 14px 16px 18px;
        }
        .ex-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        .ex-tag {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--primary, #4caf50);
        }
        .ex-tag.muted {
          color: #aaa;
        }
        .ex-title {
          font-size: 1rem;
          font-weight: 700;
          color: #2d2d2d;
          margin: 0 0 6px;
          line-height: 1.35;
        }
        .ex-summary {
          font-size: 0.88rem;
          line-height: 1.55;
          color: #666;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ex-empty {
          text-align: center;
          color: #888;
          padding: 60px 0;
        }

        /* Lightbox */
        .ex-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow-y: auto;
        }
        .ex-modal {
          background: #fff;
          border-radius: 14px;
          max-width: 420px;
          width: 100%;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }
        .ex-player {
          position: relative;
          width: 100%;
          aspect-ratio: 9 / 16;
          max-height: 70vh;
          background: #000;
        }
        .ex-player iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }
        .ex-modal-body {
          padding: 18px 20px 22px;
        }
        .ex-modal-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #2d2d2d;
          margin: 0 0 10px;
        }
        .ex-modal-summary {
          font-size: 0.92rem;
          line-height: 1.65;
          color: #555;
          margin: 0 0 16px;
        }
        .ex-modal-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .ex-yt-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ff0000;
          color: #fff;
          padding: 9px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.88rem;
          text-decoration: none;
          transition: background 0.2s ease;
        }
        .ex-yt-link:hover {
          background: #cc0000;
        }
        .ex-close {
          margin-left: auto;
          background: #f0f0f0;
          border: none;
          color: #555;
          padding: 9px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
        }
        .ex-close:hover {
          background: #e2e2e2;
        }
      `}</style>

      <div className="ex-wrap">
        {/* Format toggle */}
        <div className="ex-filter-group">
          <p className="ex-filter-label">Format</p>
          <div className="ex-chips">
            {(
              [
                ['all', 'All'],
                ['long', 'Full Workouts'],
                ['short', 'Quick Tips'],
              ] as [FormatFilter, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                className={`ex-chip ${format === val ? 'active' : ''}`}
                onClick={() => setFormat(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic chips */}
        <div className="ex-filter-group">
          <p className="ex-filter-label">Topic</p>
          <div className="ex-chips">
            <button
              className={`ex-chip ${topic === 'All' ? 'active' : ''}`}
              onClick={() => {
                setTopic('All');
              }}
            >
              All
            </button>
            {topicsPresent.map((t) => (
              <button
                key={t}
                className={`ex-chip ${topic === t ? 'active' : ''}`}
                onClick={() => {
                  setTopic(t);
                  if (t !== 'Workouts') setBodyPart('All');
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Body-part chips (only relevant for Workouts) */}
        {showBodyPartRow && bodyPartsPresent.length > 0 && (
          <div className="ex-filter-group">
            <p className="ex-filter-label">Muscle Group</p>
            <div className="ex-chips">
              <button
                className={`ex-chip ${bodyPart === 'All' ? 'active' : ''}`}
                onClick={() => setBodyPart('All')}
              >
                All
              </button>
              {bodyPartsPresent.map((b) => (
                <button
                  key={b}
                  className={`ex-chip ${bodyPart === b ? 'active' : ''}`}
                  onClick={() => setBodyPart(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="ex-count">
          {filtered.length} {filtered.length === 1 ? 'video' : 'videos'}
        </p>

        {filtered.length === 0 ? (
          <p className="ex-empty">No videos match these filters.</p>
        ) : (
          <div className="ex-grid">
            {filtered.map((video) => (
              <button
                key={video.videoId}
                className="ex-card"
                onClick={() => setSelected(video)}
                aria-label={`Play ${video.title}`}
              >
                <div className="ex-thumb">
                  {/* Cards use a 16:9 thumbnail. YouTube reliably provides a
                      landscape thumbnail (hqdefault) for every video, including
                      Shorts (center-cropped), so we always use that here. The
                      portrait oardefault is avoided because it would be clipped
                      in a 16:9 card. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnailFallback}
                    alt={video.title}
                    loading="lazy"
                  />
                  <div className="ex-badges">
                    <span className="ex-badge">
                      {video.format === 'short' ? 'Short' : 'Workout'}
                    </span>
                  </div>
                  {video.durationLabel && (
                    <span className="ex-duration">{video.durationLabel}</span>
                  )}
                  <span className="ex-play">
                    <i className="fas fa-play-circle" />
                  </span>
                </div>
                <div className="ex-body">
                  <div className="ex-tags">
                    <span className="ex-tag">{video.topic}</span>
                    {video.bodyParts.map((b) => (
                      <span key={b} className="ex-tag muted">
                        {b}
                      </span>
                    ))}
                  </div>
                  <h3 className="ex-title">{video.title}</h3>
                  <p className="ex-summary">{video.summary}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div
          className="ex-overlay"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="ex-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ex-player">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${selected.videoId}?autoplay=1&rel=0`}
                title={selected.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="ex-modal-body">
              <h3 className="ex-modal-title">{selected.title}</h3>
              <p className="ex-modal-summary">{selected.summary}</p>
              <div className="ex-modal-actions">
                <a
                  className="ex-yt-link"
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fab fa-youtube" /> Watch on YouTube
                </a>
                <button className="ex-close" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
