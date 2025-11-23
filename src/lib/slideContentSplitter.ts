/**
 * Utility functions to automatically split long slide content into multiple slides
 * to ensure everything fits on screen without scrolling
 */

import { ScriptureSlide, LyricsSlide, AnnouncementSlide } from '@/types/service';
import { BibleVerse } from '@/types/bible';

// Maximum character count per slide based on font size
const MAX_CHARS_PER_SLIDE = {
  small: 800,
  medium: 600,
  large: 400,
  xlarge: 300,
};

/**
 * Splits long scripture text into multiple slides if needed
 */
export function splitScriptureSlide(
  verse: BibleVerse,
  fontSize: 'small' | 'medium' | 'large' | 'xlarge' = 'large'
): ScriptureSlide[] {
  const maxChars = MAX_CHARS_PER_SLIDE[fontSize];
  const text = verse.text;

  // If text fits in one slide, return single slide
  if (text.length <= maxChars) {
    return [{
      id: `slide-${Date.now()}-${verse.verse}`,
      type: 'scripture',
      title: `${verse.book} ${verse.chapter}:${verse.verse}`,
      verse,
      textFormatting: { fontSize },
    }];
  }

  // Split by sentences first, then by word boundaries if needed
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const slides: ScriptureSlide[] = [];
  let currentChunk = '';
  let chunkNumber = 1;

  sentences.forEach((sentence, index) => {
    const trimmedSentence = sentence.trim();
    
    // If adding this sentence exceeds max, save current chunk and start new one
    if (currentChunk && (currentChunk + ' ' + trimmedSentence).length > maxChars) {
      slides.push({
        id: `slide-${Date.now()}-${verse.verse}-part${chunkNumber}`,
        type: 'scripture',
        title: `${verse.book} ${verse.chapter}:${verse.verse} (${chunkNumber}/${Math.ceil(text.length / maxChars)})`,
        verse: {
          ...verse,
          text: currentChunk.trim(),
        },
        textFormatting: { fontSize },
      });
      currentChunk = trimmedSentence;
      chunkNumber++;
    } else {
      // Add sentence to current chunk
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }

    // If this is the last sentence, add remaining chunk
    if (index === sentences.length - 1 && currentChunk) {
      slides.push({
        id: `slide-${Date.now()}-${verse.verse}-part${chunkNumber}`,
        type: 'scripture',
        title: `${verse.book} ${verse.chapter}:${verse.verse}${slides.length > 0 ? ` (${chunkNumber}/${chunkNumber})` : ''}`,
        verse: {
          ...verse,
          text: currentChunk.trim(),
        },
        textFormatting: { fontSize },
      });
    }
  });

  return slides.length > 0 ? slides : [{
    id: `slide-${Date.now()}-${verse.verse}`,
    type: 'scripture',
    title: `${verse.book} ${verse.chapter}:${verse.verse}`,
    verse,
    textFormatting: { fontSize },
  }];
}

/**
 * Splits long lyrics content into multiple slides if needed
 */
export function splitLyricsContent(
  content: string,
  songTitle: string,
  section: 'verse' | 'chorus' | 'bridge' | 'outro' | undefined,
  fontSize: 'small' | 'medium' | 'large' | 'xlarge' = 'large',
  slideNumber: number = 1,
  totalSlides: number = 1
): LyricsSlide[] {
  const maxChars = MAX_CHARS_PER_SLIDE[fontSize];

  // If content fits in one slide, return single slide
  if (content.length <= maxChars) {
    return [{
      id: `slide-${Date.now()}-${slideNumber}`,
      type: 'lyrics',
      title: songTitle,
      songTitle,
      slideNumber,
      totalSlides,
      content,
      section,
      textFormatting: { fontSize },
    }];
  }

  // Split by lines, keeping them together in chunks
  const lines = content.split('\n');
  const slides: LyricsSlide[] = [];
  let currentChunk = '';
  let partNumber = 1;

  lines.forEach((line, index) => {
    const lineWithBreak = line + '\n';
    
    // If adding this line exceeds max, save current chunk and start new one
    if (currentChunk && (currentChunk + lineWithBreak).length > maxChars) {
      slides.push({
        id: `slide-${Date.now()}-${slideNumber}-part${partNumber}`,
        type: 'lyrics',
        title: songTitle,
        songTitle,
        slideNumber: slideNumber + partNumber - 1,
        totalSlides: totalSlides + Math.ceil(content.length / maxChars) - 1,
        content: currentChunk.trim(),
        section,
        textFormatting: { fontSize },
      });
      currentChunk = lineWithBreak;
      partNumber++;
    } else {
      currentChunk += lineWithBreak;
    }

    // If this is the last line, add remaining chunk
    if (index === lines.length - 1 && currentChunk.trim()) {
      slides.push({
        id: `slide-${Date.now()}-${slideNumber}-part${partNumber}`,
        type: 'lyrics',
        title: songTitle,
        songTitle,
        slideNumber: slideNumber + partNumber - 1,
        totalSlides: totalSlides + partNumber - 1,
        content: currentChunk.trim(),
        section,
        textFormatting: { fontSize },
      });
    }
  });

  return slides;
}

/**
 * Splits long announcement content into multiple slides if needed
 */
export function splitAnnouncementSlide(
  title: string,
  content: string,
  imageUrl: string | undefined,
  fontSize: 'small' | 'medium' | 'large' | 'xlarge' = 'large'
): AnnouncementSlide[] {
  const maxChars = MAX_CHARS_PER_SLIDE[fontSize];

  // If content fits in one slide, return single slide
  if (content.length <= maxChars) {
    return [{
      id: `slide-${Date.now()}`,
      type: 'announcement',
      title,
      content,
      imageUrl,
      textFormatting: { fontSize },
    }];
  }

  // Split by paragraphs, then by sentences if needed
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  const slides: AnnouncementSlide[] = [];
  let currentChunk = '';
  let partNumber = 1;

  paragraphs.forEach((paragraph, index) => {
    const paragraphWithBreaks = paragraph.trim() + '\n\n';
    
    // If adding this paragraph exceeds max, save current chunk and start new one
    if (currentChunk && (currentChunk + paragraphWithBreaks).length > maxChars) {
      slides.push({
        id: `slide-${Date.now()}-part${partNumber}`,
        type: 'announcement',
        title: `${title}${slides.length > 0 ? ` (${partNumber})` : ''}`,
        content: currentChunk.trim(),
        imageUrl: partNumber === 1 ? imageUrl : undefined, // Only show image on first slide
        textFormatting: { fontSize },
      });
      currentChunk = paragraphWithBreaks;
      partNumber++;
    } else {
      currentChunk += paragraphWithBreaks;
    }

    // If this is the last paragraph, add remaining chunk
    if (index === paragraphs.length - 1 && currentChunk.trim()) {
      slides.push({
        id: `slide-${Date.now()}-part${partNumber}`,
        type: 'announcement',
        title: `${title}${slides.length > 1 ? ` (${partNumber})` : ''}`,
        content: currentChunk.trim(),
        imageUrl: partNumber === 1 ? imageUrl : undefined,
        textFormatting: { fontSize },
      });
    }
  });

  return slides.length > 0 ? slides : [{
    id: `slide-${Date.now()}`,
    type: 'announcement',
    title,
    content,
    imageUrl,
    textFormatting: { fontSize },
  }];
}
