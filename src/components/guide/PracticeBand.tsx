import { useEffect, useState } from 'react';
import { PRACTICE_CHANGED, practising, setPractice } from '@/lib/practice';
import '@/components/settings/settings.css';

/** The band along the bottom while practising (1.19.0), on any page, over the guide too. */
export function PracticeBand() {
  const [on, setOn] = useState(practising);
  useEffect(() => {
    const sync = () => setOn(practising());
    window.addEventListener(PRACTICE_CHANGED, sync);
    return () => window.removeEventListener(PRACTICE_CHANGED, sync);
  }, []);
  if (!on) return null;
  return (
    <div className="vv-practice-band" role="status" data-practice-band>
      Practice: nothing goes to the projector, stream, stage or ProPresenter
      <button type="button" onClick={() => setPractice(false)}>
        End practice
      </button>
    </div>
  );
}
