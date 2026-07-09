import type { Metadata } from 'next';
import { ExerciseGallery } from '@/components/exercises/ExerciseGallery';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Video Library',
  description:
    'Free workout, nutrition, and mindset videos from coach Shrey. Learn proper form and technique across every muscle group.',
  path: '/library',
});


export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-stone-800">
      <section className="pt-28 pb-8 md:pt-32">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Video <span className="text-emerald-600">Library</span>
          </h1>
          <div className="mt-4 h-1 w-20 rounded-full bg-emerald-600" />
          <p className="mt-5 max-w-2xl text-lg text-stone-600">
            Free, no-nonsense fitness content straight from my YouTube channel. Filter by full
            workouts or quick tips, browse by topic and muscle group, and watch proper form,
            nutrition advice, and mindset talks. New videos added regularly.
          </p>
        </div>
      </section>

      <ExerciseGallery />
    </div>
  );
}
