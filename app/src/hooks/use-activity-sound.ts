'use client';

// use-activity-sound.ts
// Custom hook for playing activity feed sound notifications via Web Audio API.
// - Synthesizes sounds in-browser, no audio files required
// - Persists mute preference in localStorage across sessions
// - Handles browser autoplay policy gracefully (no-ops if context is blocked)

import { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIVITY_EVENT_SOUNDS, SOUND_RECIPES } from '@/lib/activity-sounds';
import type { ActivityEventType } from '@/types/activity-feed';

const STORAGE_KEY = 'activity_feed_sound_enabled';

export function useActivitySound() {
  // Read initial mute preference from localStorage (default: enabled)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  // Lazily created AudioContext — created on first user interaction to satisfy
  // browser autoplay policies (Chrome/Safari require a user gesture first).
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Persist preference whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(soundEnabled));
    }
  }, [soundEnabled]);

  /**
   * Lazily initialise (or resume) the AudioContext.
   * Safe to call repeatedly — reuses the existing context.
   */
  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }

      // Chrome suspends AudioContext when created outside a user gesture.
      // Resume it if needed (will succeed after the first user interaction).
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {
          // Silently ignore — will play on next interaction
        });
      }

      return audioCtxRef.current;
    } catch {
      // Web Audio API not supported or blocked
      return null;
    }
  }, []);

  /**
   * Play the sound associated with a given ActivityEventType.
   * No-ops if: sounds are muted, Web Audio API is unavailable, or context is suspended.
   */
  const playSound = useCallback(
    (eventType: ActivityEventType) => {
      if (!soundEnabled) return;

      const ctx = getAudioContext();
      if (!ctx || ctx.state === 'suspended') return;

      try {
        const category = ACTIVITY_EVENT_SOUNDS[eventType];
        if (!category) return;

        const recipe = SOUND_RECIPES[category];
        if (recipe) {
          recipe(ctx);
        }
      } catch {
        // Silently ignore any audio playback errors
      }
    },
    [soundEnabled, getAudioContext]
  );

  /**
   * Toggle sound on/off. Also unlocks the AudioContext on first call
   * (satisfies browser user-gesture requirement).
   */
  const toggleSound = useCallback(() => {
    // Attempt to unlock AudioContext on user interaction
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    setSoundEnabled((prev) => !prev);
  }, [getAudioContext]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  return {
    soundEnabled,
    playSound,
    toggleSound,
  };
}
