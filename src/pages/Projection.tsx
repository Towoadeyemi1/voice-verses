import { useState, useEffect } from 'react';
import { ProjectionDisplay } from '@/components/ProjectionDisplay';
import { BibleVerse } from '@/types/bible';
import { syncService } from '@/lib/syncService';

const Projection = () => {
  const [verse, setVerse] = useState<BibleVerse | null>(null);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((message) => {
      if (message.type === 'VERSE_UPDATE' && message.data.verse) {
        setVerse(message.data.verse);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return <ProjectionDisplay verse={verse} />;
};

export default Projection;
