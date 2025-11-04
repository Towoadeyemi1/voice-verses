import { ProjectionDisplay } from '@/components/ProjectionDisplay';
import { BibleVerse } from '@/types/bible';

const Projection = () => {
  // In a real app, this would sync with the control panel via WebSocket or shared state
  const mockVerse: BibleVerse = {
    book: 'John',
    chapter: 3,
    verse: 16,
    text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
  };

  return <ProjectionDisplay verse={mockVerse} />;
};

export default Projection;
