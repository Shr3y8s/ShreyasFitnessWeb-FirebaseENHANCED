import { ExerciseGallery } from '@/components/exercises/ExerciseGallery';

export const metadata = {
  title: 'Exercise Library - SHREY.FIT',
  description:
    'Free exercise and workout videos from coach Shrey. Learn proper form and technique for chest, back, shoulders, arms, and legs.',
};

export default function ExercisesPage() {
  return (
    <>
      <style>{`
        .ex-page-header .container {
          text-align: left;
          max-width: 1000px;
          padding: 0 20px;
        }
        .ex-page-header h1 {
          font-size: 2.8rem;
          margin-bottom: 20px;
          position: relative;
          display: inline-block;
        }
        .ex-page-header h1:after {
          content: "";
          display: block;
          width: 80px;
          height: 3px;
          background-color: var(--primary);
          margin: 15px 0;
        }
        .ex-header-subtitle {
          max-width: 800px;
          margin: 0;
          font-size: 1.1rem;
          line-height: 1.7;
          color: var(--dark-gray);
          font-weight: 400;
        }
        @media (max-width: 768px) {
          .ex-page-header h1 { font-size: 2.2rem; }
          .ex-header-subtitle { font-size: 1rem; }
        }
      `}</style>

      <section className="page-header ex-page-header">
        <div className="container">
          <h1>
            Exercise <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Video Library</span>
          </h1>
          <p className="ex-header-subtitle">
            Free, no-nonsense fitness content straight from my YouTube channel.
            Filter by full workouts or quick tips, browse by topic and muscle group,
            and watch proper form, nutrition advice, and mindset talks. New videos
            added regularly.
          </p>

        </div>
      </section>

      <ExerciseGallery />
    </>
  );
}
