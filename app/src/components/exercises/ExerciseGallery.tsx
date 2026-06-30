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
import styles from './ExerciseGallery.module.css';

// Only show videos that are not hidden (date cutoff / manual blacklist).
const exerciseVideos = allExerciseVideos.filter((v) => !v.hidden);

type FormatFilter = 'all' | VideoFormat;
type TopicFilter = 'All' | ExerciseTopic;

// Landscape thumbnail fallbacks for full workouts: sd -> hq.
function landscapeFallbacks(videoId: string) {
  return [
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ];
}

/**
 * ExerciseGallery
 * - Shorts render as 9:16 portrait cards (true vertical thumbnail).
 * - Full workouts render as 16:9 landscape cards.
 * - "All" view shows two sections (Full Workouts, then Quick Tips).
 * - Click a card -> lightbox loads the youtube-nocookie embed only on click.
 * Styles are in a CSS Module to avoid the global marketing stylesheet
 * overriding scoped styles.
 */
export function ExerciseGallery() {
  const [format, setFormat] = useState<FormatFilter>('all');
  const [topic, setTopic] = useState<TopicFilter>('All');
  const [bodyPart, setBodyPart] = useState<BodyPart | 'All'>('All');
  const [selected, setSelected] = useState<ExerciseVideo | null>(null);

  const topicsPresent = useMemo(() => {
    const present = new Set(exerciseVideos.map((v) => v.topic));
    return EXERCISE_TOPICS.filter((t) => present.has(t));
  }, []);

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

  const longVideos = filtered.filter((v) => v.format === 'long');
  const shortVideos = filtered.filter((v) => v.format === 'short');

  const sections: { key: VideoFormat; label: string; videos: ExerciseVideo[] }[] = [];
  if (format === 'all' || format === 'long') {
    sections.push({ key: 'long', label: 'Full Workouts', videos: longVideos });
  }
  if (format === 'all' || format === 'short') {
    sections.push({ key: 'short', label: 'Quick Tips', videos: shortVideos });
  }

  const renderCard = (video: ExerciseVideo) => {
    const isShort = video.format === 'short';
    // Shorts: portrait oardefault (true vertical), fallback to landscape hq.
    // Longs: API-verified landscape thumbnail (always exists), sd/hq fallbacks.
    const primarySrc = isShort ? video.thumbnail : video.thumbnailFallback;
    const fallbacks = isShort
      ? [video.thumbnailFallback]
      : landscapeFallbacks(video.videoId);

    const metaText = [
      isShort ? 'Short' : 'Workout',
      video.durationLabel,
      video.topic,
      ...video.bodyParts,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <button
        key={video.videoId}
        className={styles.card}
        onClick={() => setSelected(video)}
        aria-label={`Play ${video.title}`}
      >
        <div
          className={`${styles.thumb} ${
            isShort ? styles.thumbPortrait : styles.thumbLandscape
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={primarySrc}
            alt={video.title}
            loading="lazy"
            data-fallback-index="0"
            onError={(e) => {
              const img = e.currentTarget;
              const i = parseInt(img.dataset.fallbackIndex || '0', 10);
              if (i < fallbacks.length) {
                img.dataset.fallbackIndex = String(i + 1);
                img.src = fallbacks[i];
              }
            }}
          />
          <div className={styles.badges}>
            <span className={styles.badge}>{isShort ? 'Short' : 'Workout'}</span>
          </div>
          {video.durationLabel && (
            <span className={styles.duration}>{video.durationLabel}</span>
          )}
          <span className={styles.play}>
            <i className="fas fa-play-circle" />
          </span>
        </div>
        <div className={styles.body}>
          <p className={styles.meta}>{metaText}</p>
          <h3
            className={`${styles.title} ${
              isShort ? styles.titleOneLine : styles.titleTwoLine
            }`}
          >
            {video.title}
          </h3>
          <p
            className={`${styles.summary} ${
              isShort ? styles.summaryTwoLine : styles.summaryThreeLine
            }`}
          >
            {video.summary}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.filtersCard}>
        <h2 className={styles.filtersHeading}>
          <i className="fas fa-sliders-h" /> Filters
        </h2>

        {/* Format toggle */}
        <div className={styles.filterGroup}>
          <p className={styles.filterLabel}>Format</p>
          <div className={styles.chips}>
            {(
              [
                ['all', 'All'],
                ['long', 'Full Workouts'],
                ['short', 'Quick Tips'],
              ] as [FormatFilter, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                className={`${styles.chip} ${format === val ? styles.chipActive : ''}`}
                onClick={() => setFormat(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic chips */}
        <div className={styles.filterGroup}>
          <p className={styles.filterLabel}>Topic</p>
          <div className={styles.chips}>
            <button
              className={`${styles.chip} ${topic === 'All' ? styles.chipActive : ''}`}
              onClick={() => setTopic('All')}
            >
              All
            </button>
            {topicsPresent.map((t) => (
              <button
                key={t}
                className={`${styles.chip} ${topic === t ? styles.chipActive : ''}`}
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
          <div className={styles.filterGroup}>
            <p className={styles.filterLabel}>Muscle Group</p>
            <div className={styles.chips}>
              <button
                className={`${styles.chip} ${bodyPart === 'All' ? styles.chipActive : ''}`}
                onClick={() => setBodyPart('All')}
              >
                All
              </button>
              {bodyPartsPresent.map((b) => (
                <button
                  key={b}
                  className={`${styles.chip} ${bodyPart === b ? styles.chipActive : ''}`}
                  onClick={() => setBodyPart(b)}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <hr className={styles.divider} />

      {filtered.length === 0 ? (
        <p className={styles.empty}>No videos match these filters.</p>
      ) : (
        sections.map((section, idx) =>
          section.videos.length > 0 ? (
            <section key={section.key}>
              {idx > 0 && <hr className={styles.divider} />}
              <h2 className={styles.sectionTitle}>{section.label}</h2>
              <div
                className={`${styles.grid} ${
                  section.key === 'short' ? styles.gridPortrait : styles.gridLandscape
                }`}
              >
                {section.videos.map(renderCard)}
              </div>
            </section>
          ) : null
        )
      )}

      {selected && (
        <div
          className={styles.overlay}
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`${styles.modal} ${
              selected.format === 'short' ? styles.modalShort : styles.modalLong
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`${styles.player} ${
                selected.format === 'short' ? styles.playerShort : styles.playerLong
              }`}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${selected.videoId}?autoplay=1&rel=0`}
                title={selected.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className={styles.modalBody}>
              <h3 className={styles.modalTitle}>{selected.title}</h3>
              <p className={styles.modalSummary}>{selected.summary}</p>
              <div className={styles.modalActions}>
                <a
                  className={styles.ytLink}
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fab fa-youtube" /> Watch on YouTube
                </a>
                <button className={styles.close} onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
