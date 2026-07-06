# Marketing Redesign — Home Page Rebuild + Marketing Style Migration (SDD)

Status: In progress
Owner: Home page redesign
Launch context: App launching soon; home page predates most of the site/app and feels disconnected.

---

## 1. Problem statement

The current home page (`app/src/app/(marketing)/page.tsx`) has only 4 thin sections
(hero with a flat dumbbell icon, empathy block, 3 generic "what you get" cards, 3
testimonials). It:

- Never mentions the **SHREY.FIT app/platform** — the single biggest differentiator and
  the thing that makes Online Coaching + Complete Transformation work for remote clients.
- Shows **no product proof** (no dashboard visuals).
- Surfaces **no credibility** (NASM cert, 100+ lb personal transformation, UW degree,
  Seattle/Ironworks location all live only on other pages).
- Uses the **old `/css/*.css` design system** while the app + FAQ/Library pages use a
  modern emerald-gradient + shadcn look.
- Has a single weak CTA path.

## 2. Goals

1. Rebuild the home page as a **product-led landing page** that showcases the app's richness.
2. Match the **dashboard visual language**: soft emerald→white→teal gradient background,
   white rounded cards with faint green tint + primary-green border + glow-on-hover,
   green accents, Lucide icons, shadcn components.
3. Build fast credibility and a clear dual-CTA funnel (Get Started / Book a Free Intro Call).
4. Establish reusable patterns for the later re-skin of About/Services/Connect (Step 2).

## 3. Non-goals

- No content/pricing changes to Services logic. Prices mirrored from Services page.
- No backend/data changes. Static marketing page.
- Testimonials remain the real, existing ones (real names retained).

## 4. Design system reference (from app)

- Surface: `bg-gradient-to-br from-emerald-50 via-white to-teal-50` (see `.client-surface`
  in `globals.css`).
- Primary green: `--primary: oklch(65% 0.16 151)` → Tailwind `emerald-600`/`emerald-500` family.
- Card: faint green tint, `border-emerald-600/40`, shadow, hover lift + `--shadow-glow`.
- Components available: `Button`, `Card`, `Badge`, `Separator`, `Carousel`, `Tabs`, etc.
- Icons: `lucide-react` (FAQ/Library already use it).
- Fonts: app uses Geist/Inter sans; keep sans-serif.

## 5. Assets

Screenshots in `app/public/assets/screenshots/`:
- `dashboard_main.png`, `dashboard_secondhalf.png`
- `my training plan.png`
- `progress.png`
- `nutrition hub.png`
- `my workouts.png`
- `goals and milestones.png`

Featured in showcase: Dashboard, My Plan, Progress, Nutrition Hub (Workouts + Goals secondary).
Trainer photo: `/assets/Shreyas-profile.jpg` (used on About).

## 6. Home page section spec (new)

Page wrapper: emerald gradient surface, `min-h-screen`. Client component (for interactive
showcase tabs/carousel). Reuses `MarketingNav` + `Footer` from layout.

1. **Hero**
   - Eyebrow: "Personal training + a real fitness app"
   - H1: "Real coaching. Real results. Backed by a real app."
   - Sub: names both 1:1 coaching and the platform; beginner-friendly, sustainable.
   - Dual CTA: **Get Started** → `/signup`; **Book a Free Intro Call** → `/connect`.
   - Credibility strip: NASM Certified · 100+ lbs lost personally · Seattle in-person ·
     Online worldwide.
   - Visual: framed `dashboard_main.png` in a browser-style frame.

2. **Trust bar** — compact row of stat/badges (certified, experience, remote+in-person).

3. **Command Center (the differentiator)** ⭐
   - Eyebrow "More than a coach", H2 "Your entire fitness command center".
   - Intro line (mirrors Services): most trainers use spreadsheets; this is a real app.
   - Feature grid (6, Lucide icons): Your Plan Live, Interactive Workouts, Nutrition Hub,
     Progress Analytics, Goals & Milestones, Direct Coach Chat.
   - **Screenshot showcase**: tabbed/carousel of Dashboard, My Plan, Progress, Nutrition Hub
     with captions. Frames the app as what powers remote coaching.
   - Link → `/services`.

4. **How it works** — 3 steps: Pick your plan → Book your free setup call → Train with your
   live plan in the app.

5. **Why it's different (empathy → solution)** — condensed 2-column: "what goes wrong" vs
   "how I do it differently" anchored on the 100+ lb story + "I build independence".

6. **Plans preview** — 3 tier cards (In-Person $75/session, Online $200/mo, Complete
   $250/mo "Best Value"), each 3–4 bullets; link "Compare all plans" → `/services`.

7. **Testimonials** — the 3 existing real testimonials as clean shadcn cards, initials
   avatars, result sub-line retained.

8. **Final CTA band** — emerald gradient panel, closing dual CTA + reassurance line.

## 7. Implementation notes

- Rewrite `app/src/app/(marketing)/page.tsx` as `'use client'` using Tailwind + shadcn +
  lucide-react + `next/image` + `next/link`. Self-contained; no reliance on `/css/*.css`.
- Keep DOM semantic + responsive (grid → stack on mobile). Reuse `--shadow-glow` via
  utility classes / inline where needed.
- No new dependencies. Use existing `Button`, `Card`, `Badge`, `Separator`, `Tabs`.
- Data: hardcode tier + testimonial + feature arrays at top of file for clarity.

## 8. Acceptance criteria (Step 1)

- [ ] Home page renders all 8 sections in emerald/shadcn style, visually consistent w/ app.
- [ ] App/platform is prominently showcased with real screenshots.
- [ ] Credibility + dual CTAs present; links resolve (/signup, /connect, /services, /about).
- [ ] Real testimonials retained.
- [ ] Responsive on mobile + desktop.
- [ ] `npm run build` / typecheck passes; no reliance on old home CSS.

## 9. Step 2 (after user review) — re-skin About/Services/Connect

Re-skin to emerald/shadcn while **preserving every section, card, table, modal, form**.
Migrate section-by-section; retire old per-page CSS only after verification. Tracked separately.
