import { verseTextParts } from '@/lib/verseText';

/** Verse text with the KJV's supplied words in italics instead of braces. */
export const VerseText = ({ text }: { text: string }) => (
  <>
    {verseTextParts(text).map((part, i) => (part.italic ? <em key={i}>{part.text}</em> : part.text))}
  </>
);
