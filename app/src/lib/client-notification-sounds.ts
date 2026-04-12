// Client Notification Sound System
// Uses Web Audio API synthesis — zero external files, zero dependencies.
// Sounds are designed to be FUN and MOTIVATING for the client (end user),
// distinct from the more neutral trainer-side activity feed sounds.

import type { ClientNotificationType } from '@/types/client-notifications';

// ============================================================
// Sound Category Definitions
// ============================================================

export type ClientSoundCategory =
  | 'celebration'  // 🎊 Login streak, new goal — sparkly ascending burst
  | 'energize'     // 💪 New workout, goal updated — punchy motivating rise
  | 'update'       // 📬 Plan/nutrition/activities updated, new message — warm friendly chime
  | 'nudge'        // 👋 Daily reminders — light bouncy tap, gentle
  | 'overdue'      // ⚠️ Workout overdue — slightly urgent wobble
  | 'payment';     // 💳 Upcoming payment — soft neutral single tone

// Map every ClientNotificationType to a client sound category
export const CLIENT_NOTIFICATION_SOUNDS: Record<ClientNotificationType, ClientSoundCategory> = {
  // 🎊 Celebration — biggest exciting moments
  login_streak:         'celebration',
  goal_added:           'celebration',

  // 💪 Energize — action-oriented, get pumped
  new_workout:          'energize',
  goal_updated:         'energize',

  // 📬 Update — warm, friendly "you got something"
  plan_updated:         'update',
  nutrition_updated:    'update',
  activities_updated:   'update',
  new_message:          'update',
  task_reminder:        'update',

  // 👋 Nudge — light, non-intrusive reminders
  nutrition_reminder:   'nudge',
  steps_reminder:       'nudge',
  habits_reminder:      'nudge',
  weight_reminder:      'nudge',

  // ⚠️ Overdue — urgent but not alarming
  workout_overdue:      'overdue',

  // 💳 Payment — neutral informational
  upcoming_payment:     'payment',
};

// ============================================================
// Sound Recipes (Web Audio API)
// ============================================================

type SoundRecipe = (ctx: AudioContext) => void;

function playTone(
  ctx: AudioContext,
  frequency: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  gainPeak: number,
  gainEnd: number = 0
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.001), startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * 🎊 CELEBRATION — sparkly ascending 4-note burst with shimmer
 * Used for: login_streak, goal_added
 */
const celebration: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  // Primary ascending melody
  playTone(ctx, 523.25, 'sine', t + 0.00, 0.12, 0.22); // C5
  playTone(ctx, 659.25, 'sine', t + 0.09, 0.12, 0.24); // E5
  playTone(ctx, 783.99, 'sine', t + 0.18, 0.14, 0.26); // G5
  playTone(ctx, 1046.5, 'sine', t + 0.27, 0.40, 0.28); // C6 (hold)
  // Shimmer overtone layer (triangle adds sparkle)
  playTone(ctx, 1567.98, 'triangle', t + 0.27, 0.30, 0.10); // G6
  playTone(ctx, 2093.0,  'triangle', t + 0.35, 0.25, 0.07); // C7
};

/**
 * 💪 ENERGIZE — punchy 3-note power rise
 * Used for: new_workout, goal_updated
 */
const energize: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 293.66, 'square', t + 0.00, 0.08, 0.15); // D4 (short punch)
  playTone(ctx, 440.00, 'sine',   t + 0.08, 0.12, 0.22); // A4
  playTone(ctx, 587.33, 'sine',   t + 0.18, 0.12, 0.24); // D5
  playTone(ctx, 880.00, 'sine',   t + 0.28, 0.35, 0.22); // A5 (triumphant hold)
};

/**
 * 📬 UPDATE — warm double chime (friendly "you've got mail" energy)
 * Used for: plan_updated, nutrition_updated, activities_updated, new_message, task_reminder
 */
const update: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 698.46, 'sine', t + 0.00, 0.18, 0.20); // F5
  playTone(ctx, 523.25, 'sine', t + 0.02, 0.18, 0.12); // C5 (harmony)
  playTone(ctx, 880.00, 'sine', t + 0.20, 0.30, 0.20); // A5
  playTone(ctx, 659.25, 'sine', t + 0.22, 0.30, 0.12); // E5 (harmony)
};

/**
 * 👋 NUDGE — light 2-note bouncy tap (gentle, not annoying)
 * Used for: nutrition_reminder, steps_reminder, habits_reminder, weight_reminder
 */
const nudge: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 587.33, 'sine', t + 0.00, 0.10, 0.14); // D5
  playTone(ctx, 783.99, 'sine', t + 0.14, 0.18, 0.16); // G5
};

/**
 * ⚠️ OVERDUE — descending wobble with recovery (urgent but not scary)
 * Used for: workout_overdue
 */
const overdue: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 523.25, 'triangle', t + 0.00, 0.12, 0.20); // C5
  playTone(ctx, 392.00, 'triangle', t + 0.10, 0.18, 0.22); // G4 (drop)
  playTone(ctx, 440.00, 'sine',     t + 0.26, 0.28, 0.18); // A4 (slight recovery)
};

/**
 * 💳 PAYMENT — soft single neutral chime (informational, not alarming)
 * Used for: upcoming_payment
 */
const payment: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 440.00, 'sine', t, 0.22, 0.14);
  playTone(ctx, 550.00, 'sine', t + 0.01, 0.22, 0.08); // slight harmony
};

export const CLIENT_SOUND_RECIPES: Record<ClientSoundCategory, SoundRecipe> = {
  celebration,
  energize,
  update,
  nudge,
  overdue,
  payment,
};

/**
 * Play a sound for a given client notification type.
 * Safely handles SSR (no-op on server), missing AudioContext, and browser autoplay restrictions.
 */
export function playClientNotificationSound(type: ClientNotificationType): void {
  if (typeof window === 'undefined') return;
  try {
    const category = CLIENT_NOTIFICATION_SOUNDS[type];
    if (!category) return;
    const recipe = CLIENT_SOUND_RECIPES[category];
    if (!recipe) return;

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => recipe(ctx));
    } else {
      recipe(ctx);
    }

    // Auto-close after sound finishes (1.5s buffer)
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch {
    // Never crash the app over a sound
  }
}
