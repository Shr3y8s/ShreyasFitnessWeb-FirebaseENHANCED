/**
 * JSON-LD renderer — injects a <script type="application/ld+json"> block.
 *
 * Server component, no client JS, no dependencies. Pass a schema.org object
 * (or array of objects) built via the helpers in `@/lib/seo`.
 *
 * Growth & Acquisition — Phase 1 (shareability & SEO).
 */

export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; there is no user-controlled
      // HTML here. This is the Next.js-recommended pattern for structured data.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
