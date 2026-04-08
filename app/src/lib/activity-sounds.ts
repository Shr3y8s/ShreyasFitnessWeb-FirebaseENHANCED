// Activity Feed Sound System
// Uses Web Audio API synthesis — zero external files, zero dependencies.
// Each sound category has a distinct "personality" tuned to the event urgency/celebration level.

import type { ActivityEventType } from '@/types/activity-feed';

// ============================================================
// Sound Category Definitions
// ============================================================

export type SoundCategory =
  | 'fanfare'      // 🎉 New client signup, purchase — ascending celebratory
  | 'achievement'  // 💪 Workout/goal/milestone complete — triumphant rise
  | 'completion'   // ✅ Nutrition/habits/activities done — soft pleasant ding
  | 'info'         // 📅 Sessions, logins, surveys — neutral single ping
  | 'alert';       // ⚠️ Cancellations — low descending tone

// Map every ActivityEventType to a sound category
export const ACTIVITY_EVENT_SOUNDS: Record<ActivityEventType, SoundCategory> = {
  // 🎉 Fanfare — biggest moments
  new_client_signup:          'fanfare',
  session_purchased:          'fanfare',

  // 💪 Achievement — client hit something significant
  workout_completed:          'achievement',
  goal_completed:             'achievement',
  milestone_completed:        'achievement',

  // ✅ Completion — daily wins, quieter positive feedback
  nutrition_day_completed:    'completion',
  daily_activities_completed: 'completion',
  daily_habits_completed:     'completion',

  // 📅 Info — neutral updates worth knowing
  session_scheduled:          'info',
  checkin_scheduled:          'info',
  session_rescheduled:        'info',
  weight_logged:              'info',
  progress_photo_uploaded:    'info',
  weekly_survey_submitted:    'info',
  client_message_received:    'info',
  client_login:               'info',

  // ⚠️ Alert — something was canceled/lost
  subscription_canceled:      'alert',
  session_canceled:           'alert',
};

// ============================================================
// Sound Recipes (Web Audio API)
// Each recipe is a function that receives an AudioContext and plays a sound.
// ============================================================

type SoundRecipe = (ctx: AudioContext) => void;

/**
 * Helper: creates an oscillator node with a gain envelope and plays it.
 */
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
 * 🎉 FANFARE — ascending 3-note chime with reverb-like tail
 * Used for: new_client_signup, session_purchased
 */
const fanfare: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 523.25, 'sine', t + 0.00, 0.18, 0.28); // C5
  playTone(ctx, 659.25, 'sine', t + 0.12, 0.18, 0.28); // E5
  playTone(ctx, 783.99, 'sine', t + 0.24, 0.30, 0.28); // G5
  playTone(ctx, 1046.5, 'sine', t + 0.34, 0.45, 0.22); // C6 (tail)
};

/**
 * 💪 ACHIEVEMENT — triumphant 2-tone rise
 * Used for: workout_completed, goal_completed, milestone_completed
 */
const achievement: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 440.00, 'sine', t + 0.00, 0.15, 0.22); // A4
  playTone(ctx, 659.25, 'sine', t + 0.10, 0.22, 0.22); // E5
  playTone(ctx, 880.00, 'sine', t + 0.20, 0.35, 0.20); // A5
};

/**
 * ✅ COMPLETION — soft double-ding (gentle, positive)
 * Used for: nutrition_day_completed, daily_activities_completed, daily_habits_completed
 */
const completion: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 698.46, 'sine', t + 0.00, 0.14, 0.18); // F5
  playTone(ctx, 880.00, 'sine', t + 0.16, 0.22, 0.16); // A5
};

/**
 * 📅 INFO — single clean ping (short, unobtrusive)
 * Used for: sessions, logins, surveys, weight, photos, messages
 */
const info: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 600, 'sine', t, 0.18, 0.14);
};

/**
 * ⚠️ ALERT — descending minor-third drop (signals something was lost)
 * Used for: subscription_canceled, session_canceled
 */
const alert: SoundRecipe = (ctx) => {
  const t = ctx.currentTime;
  playTone(ctx, 440.00, 'triangle', t + 0.00, 0.14, 0.20); // A4
  playTone(ctx, 370.00, 'triangle', t + 0.12, 0.28, 0.18); // F#4 (minor third down)
};

export const SOUND_RECIPES: Record<SoundCategory, SoundRecipe> = {
  fanfare,
  achievement,
  completion,
  info,
  alert,
};
