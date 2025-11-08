import { BibleVerse } from './bible';

export type SlideType = 'scripture' | 'lyrics' | 'image' | 'announcement';

export interface BaseSlide {
  id: string;
  type: SlideType;
  title: string;
}

export interface ScriptureSlide extends BaseSlide {
  type: 'scripture';
  verse: BibleVerse;
  verseRange?: { start: number; end: number };
}

export interface LyricsSlide extends BaseSlide {
  type: 'lyrics';
  songTitle: string;
  slideNumber: number;
  totalSlides: number;
  content: string;
  section?: 'verse' | 'chorus' | 'bridge' | 'outro';
}

export interface ImageSlide extends BaseSlide {
  type: 'image';
  imageUrl: string;
  caption?: string;
  displayDuration?: number; // seconds
}

export interface AnnouncementSlide extends BaseSlide {
  type: 'announcement';
  content: string;
  imageUrl?: string;
}

export type Slide = ScriptureSlide | LyricsSlide | ImageSlide | AnnouncementSlide;

export interface Service {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  slides: Slide[];
  isTemplate: boolean;
  templateName?: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'song';
  name: string;
  category?: string;
  tags?: string[];
  createdAt: Date;
  // For images
  url?: string;
  // For songs
  lyrics?: string;
  slides?: LyricsSlide[];
}

export interface PresentationMode {
  mode: 'scripture' | 'manual';
  currentService?: Service;
  currentSlideIndex: number;
}
