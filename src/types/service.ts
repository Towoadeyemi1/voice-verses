import type { TransitionSpec } from '@/lib/transitions';
import { BibleVerse } from './bible';

export type SlideType = 'scripture' | 'lyrics' | 'image' | 'video' | 'announcement' | 'blank';

export interface CountdownConfig {
  enabled: boolean;
  /** Count down a length of time, or to a time of day */
  mode?: 'duration' | 'until';
  durationMinutes: number;
  /** "HH:MM" for mode 'until' */
  untilTime?: string;
  /** Shown with the time, e.g. "Service begins in" */
  message?: string;
  /** How the projector shows it; replaces the 'main' display target */
  projector?: 'full' | 'corner' | 'off';
  displayTargets: ('main' | 'confidence' | 'stream')[];
  alertEnabled: boolean;
  alertType?: 'yellow' | 'red';
  alertThresholdSeconds?: number;
}

export interface BaseSlide {
  id: string;
  type: SlideType;
  title: string;
  backgroundMedia?: {
    type: 'image' | 'video';
    url: string;
    opacity?: number;
  };
  textFormatting?: {
    linesPerSlide?: number;
    fontSize?: 'small' | 'medium' | 'large' | 'xlarge';
    alignment?: 'left' | 'center' | 'right';
  };
  slideNotes?: string; // Notes specific to this slide
  /** A template other than the one assigned for this kind of slide */
  templateId?: string;
  /** How this slide arrives, instead of its look's transition */
  transition?: TransitionSpec;
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
  /** The section's own name, e.g. "Verse 2" or "Pre-Chorus" */
  sectionLabel?: string;
  /** Song credits and CCLI licence, shown small on the song's first slide */
  credits?: string;
}

export interface ImageSlide extends BaseSlide {
  type: 'image';
  imageUrl: string;
  caption?: string;
  displayDuration?: number; // seconds
}

export interface VideoSlide extends BaseSlide {
  type: 'video';
  /** The video in the media library */
  mediaId: string;
  loop: boolean;
  /** Play its sound through this computer */
  sound: boolean;
}

export interface AnnouncementSlide extends BaseSlide {
  type: 'announcement';
  content: string;
  imageUrl?: string;
}

export interface BlankSlide extends BaseSlide {
  type: 'blank';
  placeholder?: string;
}

export type Slide = ScriptureSlide | LyricsSlide | ImageSlide | VideoSlide | AnnouncementSlide | BlankSlide;

export interface ServiceSubsection {
  id: string;
  name: string;
  slides: Slide[];
  countdown?: CountdownConfig;
  autoStartCountdown?: boolean; // for songs vs manual testimonies
  presenterNotes?: string; // Notes visible on confidence monitor
  backgroundMedia?: {
    type: 'image';
    url: string;
    opacity: number;
  };
}

export interface ServiceSection {
  id: string;
  name: string;
  subsections: ServiceSubsection[];
  collapsed?: boolean;
  operatorNotes?: string; // Private notes for operators
}

export interface Service {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  sections: ServiceSection[];
  isTemplate: boolean;
  templateName?: string;
  serviceLogo?: string; // URL or base64 data of service logo
  updatedAt?: string; // ISO time of the last local edit, used to sync the library folder
  // Legacy support
  slides?: Slide[];
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'song' | 'presentation';
  name: string;
  category?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt?: string; // ISO time of the last local edit, used to sync the library folder
  // For images
  url?: string;
  // For videos: the file is kept separately on this computer (IndexedDB 'files')
  mimeType?: string;
  sizeBytes?: number;
  // For songs
  lyrics?: string;
  author?: string;
  copyright?: string;
  /** CCLI song number */
  ccliNumber?: string;
  /** Order of sections to sing, by name, e.g. ["Verse 1", "Chorus", "Verse 2", "Chorus"] */
  arrangement?: string[];
  slides?: LyricsSlide[];
  // For presentations (PowerPoint imports)
  presentationSlides?: ImageSlide[];
}

export interface PresentationMode {
  mode: 'scripture' | 'manual';
  currentService?: Service;
  currentSlideIndex: number;
}
