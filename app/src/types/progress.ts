/**
 * Shared progress-view types.
 *
 * `TimeRange` previously lived in (and was exported from) the legacy
 * `app/progress/page.tsx` route. Components under `components/client-progress/`
 * imported it from that page, which meant a *page* was acting as a types module
 * — so deleting the dead route broke live components. Hoisting it here removes
 * that coupling and gives the type a stable home.
 */

/** Selectable window for progress charts and metric tabs. */
export type TimeRange = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL';
