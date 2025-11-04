import { useEffect, useState } from 'react';
import { BibleVerse } from '@/types/bible';

interface ProjectionDisplayProps {
  verse: BibleVerse | null;
}

export const ProjectionDisplay = ({ verse }: ProjectionDisplayProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (verse) {
      setShow(false);
      setTimeout(() => setShow(true), 50);
    }
  }, [verse]);

  if (!verse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-projection-bg text-projection-text">
        <div className="text-center space-y-4 px-8">
          <div className="w-24 h-24 mx-auto rounded-full border-4 border-projection-accent/30 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-projection-accent"
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-3xl text-projection-text/60 font-light">
            Waiting for Scripture...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-projection-bg text-projection-text p-16">
      <div
        className={`max-w-6xl w-full space-y-12 transition-all duration-500 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Verse Text */}
        <div className="text-center">
          <p className="text-5xl md:text-6xl lg:text-7xl leading-relaxed font-serif text-projection-text">
            "{verse.text}"
          </p>
        </div>

        {/* Reference */}
        <div className="text-center pt-8 border-t border-projection-accent/20">
          <p className="text-3xl md:text-4xl font-semibold text-projection-accent">
            {verse.book} {verse.chapter}:{verse.verse}
          </p>
          <p className="text-xl text-projection-text/60 mt-2">King James Version</p>
        </div>
      </div>
    </div>
  );
};
