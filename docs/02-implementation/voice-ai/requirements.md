# Voice AI — Requirements

**Status:** Draft for review
**Owner:** Shrey.Fit
**Last updated:** 2026-07-07
**Related docs:** `docs/04-architecture/post-launch-roadmap.md` (Tier 1.2), `docs/02-implementation/analytics/requirements.md` (`voice_input_used` event), `docs/03-legal/privacy-policy.md`

> This is the **requirements** doc of the `requirements.md → design.md → tasks.md` triad.
> It defines *what* voice AI should do and *why*, not *how* (that's `design.md`).

---

## 1. Purpose & Goals

Typing is the highest-friction part of using the app — especially:
- **Clients on mobile**, mid- or post-workout, trying to jot notes with sweaty hands.
- **Trainers** writing coaching notes / plan text across many clients (volume problem).
- **Admins** drafting lead replies.

Voice input lets users **speak instead of type** anywhere free text is entered. It is a
low-effort, high-daily-use differentiator that costs little to ship.

**Goals**
- Reduce input friction on the highest-value free-text fields (Mode A).
- Enable hands-free / voice-first messaging in client↔trainer threads (Mode B).
- Ship an MVP at near-zero cost using the browser's built-in speech recognition.
- Establish **one reusable primitive** (`<VoiceInput>`) so voice can be added to any
  field with a one-line change, rather than bespoke integrations.

**Non-goals (this spec)**
- No general-purpose AI chatbot / open-ended fitness Q&A (see §8 Future).
- No voice **commands / navigation** ("go to my workouts") — dictation only.
- No always-listening / wake-word behavior. Voice is explicit, tap-to-start.

---

## 2. Scope — Two Modes

### Mode A — Voice dictation (mic → text into a field)
A microphone button attached to a text input/textarea. User taps it, speaks, and the
transcript is inserted into the field. This is the **primary** deliverable.

### Mode B — Voice messaging
The same primitive applied to the client↔trainer message composers, so a user can
dictate a message and send it. Optional (Phase 2) read-aloud of received messages.

> **Mode C (Voice Q&A assistant) is explicitly out of scope for now** — see §8 Future.

---

## 3. Target Surfaces (inventory)

Confirmed from the codebase. Priority = expected daily use × friction.

### 3.1 Mode A — Client (highest priority)
| Surface | Component | Notes |
|---|---|---|
| Weekly check-in "wins" | `components/client-progress/qualitative-feedback.tsx` | Free-text reflection; ideal for voice. |
| Weekly check-in "struggles" | `components/client-progress/qualitative-feedback.tsx` | Same. |
| Workout completion notes | `components/workouts/MarkCompleteDialog.tsx`, `components/workouts/workout-complete-dialog.tsx` | Captured right after a set — mobile, hands busy. |
| Session notes | `components/sessions/SessionCard.tsx` | "visible to you only" notes. |
| Nutrition question box | `components/nutrition-hub/today-meal-plan.tsx`, `components/nutrition/today-meal-plan.tsx` | "Can I swap the chicken for fish?" — dictate the question (answer routing is future). |
| Profile emergency/medical notes | `app/dashboard/client/profile/page.tsx` | Longer free text. |
| Weight-log notes | `components/activity/WeightLogger.tsx` | Short contextual notes. |

### 3.2 Mode A — Trainer
| Surface | Component |
|---|---|
| Weekly focus / coach notes | `components/trainer/plan/WeeklyFocusEditor.tsx` |
| Nutrition protocol descriptions | `components/trainer/plan/NutritionProtocolEditor.tsx` |
| Daily habits descriptions | `components/trainer/plan/DailyHabitsEditor.tsx` |
| Assignment notes | `app/dashboard/trainer/assignments/create/page.tsx`, `.../edit/[id]/page.tsx` |
| Workout / exercise descriptions & instructions | `app/dashboard/trainer/workouts/create/page.tsx`, `app/dashboard/trainer/exercises/page.tsx` |
| Outreach reminder / task messages | `app/dashboard/trainer/outreach/page.tsx` |
| Trainer profile (philosophy, expertise) | `app/dashboard/trainer/profile/page.tsx` |

### 3.3 Mode A — Admin
| Surface | Component |
|---|---|
| Lead replies | `app/dashboard/admin/leads/page.tsx` |
| Cancellation / pause reasons | `components/membership/CancelSubscriptionDialog.tsx`, `PauseSubscriptionDialog.tsx` |
| Campaign body | `app/dashboard/admin/campaigns/[id]/page.tsx` |

### 3.4 Mode B — Messaging
| Surface | Component |
|---|---|
| Client → trainer messages | `app/dashboard/client/messages/page.tsx` |
| Trainer → client messages | `app/dashboard/trainer/clients-messages/page.tsx` |

> **Explicitly excluded from voice:** password, email, phone, discount-code, and other
> credential/precise fields. Dictation is unreliable and risky for these.

---

## 4. Functional Requirements

- **FR-1 — Mic affordance.** A mic button appears on supported fields. Tapping toggles
  listening on/off.
- **FR-2 — Transcription to field.** Recognized speech is inserted at the cursor
  (append by default; must not silently wipe existing text).
- **FR-3 — Interim feedback.** Show interim (partial) results while speaking; commit
  final text on stop.
- **FR-4 — Editable result.** The transcript lands in the normal editable field — the
  user can fix it by keyboard before saving/sending. Nothing auto-submits from voice
  except where the user explicitly taps send (Mode B).
- **FR-5 — Clear states.** Visual states: idle, listening (animated), processing, error.
- **FR-6 — Keyboard parity.** Every voice-enabled field remains fully usable by keyboard;
  voice is strictly additive.
- **FR-7 — Graceful absence.** On browsers/devices without support, the mic button is
  hidden (or disabled with a tooltip) — no broken UI, no errors.
- **FR-8 — Permission handling.** First use triggers the browser mic-permission prompt;
  a denied/blocked state shows a helpful message with how to re-enable.
- **FR-9 — Language.** Default `en-US`; language is a prop so it can be configured later.
- **FR-10 — Analytics.** Emit `voice_input_used` (per the analytics spec) with context:
  `{ surface, mode, chars_transcribed, duration_ms, engine }`. No transcript content in
  analytics.

---

## 5. Non-Functional Requirements

- **NFR-1 — Cost.** Phase 1 must be **$0 incremental** (browser Web Speech API).
- **NFR-2 — Privacy.** No raw audio is persisted by the app. Transcribed text is treated
  exactly like typed text (same storage, same rules). See §7.
- **NFR-3 — Reusability.** One component + one hook; adding voice to a new field is a
  single-line change.
- **NFR-4 — Accessibility.** Mic button is keyboard-focusable, has an ARIA label, and
  listening state is announced to screen readers. Voice is an alternative input, never
  the only path.
- **NFR-5 — Performance.** No measurable impact on field typing latency; speech modules
  loaded lazily / only when the mic is used.
- **NFR-6 — Resilience.** Recognition errors (no-speech, network, aborted) surface a
  friendly message and return the field to idle without data loss.

---

## 6. Phasing

### Phase 1 — Web Speech MVP (near-zero cost)
- Reusable `<VoiceInput>` component + `useSpeechRecognition` hook using the browser
  **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`).
- Roll out to the **highest-value Mode A fields** (client check-in wins/struggles,
  workout completion notes, nutrition question box) + **Mode B** message composers.
- Feature-detect; hide mic where unsupported (notably non-Chromium browsers vary).

### Phase 2 — Server-side transcription (accuracy + coverage)
- Cloud Function that accepts a short audio clip and returns a transcript via a managed
  STT engine (**AWS Transcribe / Whisper / Bedrock**), for:
  - Browsers without Web Speech support.
  - Higher accuracy on fitness terms, accents, noisy gym environments.
- Same `<VoiceInput>` API; the hook chooses engine (browser vs. server) transparently.
- Audio clip is transient — transcribed and discarded, never stored (see §7).
- Optional **read-aloud (TTS)** of received messages in Mode B.

---

## 7. Privacy & Legal

- **No audio at rest.** Phase 1 audio never leaves the browser. Phase 2 audio is sent to
  the STT function only for transcription and is **not** persisted.
- **Transcript = user text.** The resulting text is stored like any typed note/message and
  governed by existing Firestore rules and the privacy policy.
- **Consent surface.** Mic permission is an explicit OS/browser prompt. Add a short line to
  `docs/03-legal/privacy-policy.md` covering voice-input processing (esp. before Phase 2's
  server transcription ships).
- **No content in analytics.** Only metadata (see FR-10) is logged, never spoken content.

---

## 8. Future (out of scope for this spec)

- **Mode C — Voice Q&A assistant.** Ask a question by voice and get a spoken/typed answer
  grounded **only** in shrey.fit's own content (exercise library, plan, blog) — *not* a
  general fitness chatbot. Parked; cross-referenced to the roadmap's "Content & Discovery
  Ideas → Semantic/hybrid search" (Post-Launch Roadmap §4A). To be specced separately if
  pursued.
- **Voice commands / navigation.** Deferred.
- **Natural-language food logging** ("grilled chicken and rice" → macros) — a related but
  separate AI feature tracked in the roadmap's AI Opportunities.

---

## 9. Open Questions

1. **Phase 1 breadth:** launch on the 4–5 highest-value fields only, or all Mode A fields
   at once? (Recommendation: start narrow, expand on usage data.)
2. **Unsupported browsers:** hide the mic entirely, or show it disabled with a "not
   supported in this browser" tooltip?
3. **Phase 2 engine:** AWS Transcribe vs. Whisper vs. Bedrock — decide when Phase 2 is
   scheduled (depends on cost + accuracy testing).
4. **Read-aloud (TTS):** do we want it in Mode B at all, or is dictation-only sufficient?

---

## 10. Success Metrics

- Adoption: % of eligible submissions (check-ins, workout notes, messages) that used voice.
- Friction: median time-to-complete a check-in/note with vs. without voice.
- Quality: voice-started submissions edited before save (proxy for transcription accuracy).
- Reliability: recognition error rate; unsupported-browser hide rate.
