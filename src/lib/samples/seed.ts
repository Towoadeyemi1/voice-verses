/**
 * The sample library: put in once, the first time the app opens, so the app
 * shows what it does straight away. A church removes it in one click
 * (Services page), or adds it again.
 */
import { ServiceStorage } from '@/lib/serviceStorage';
import { loadTemplates, saveTemplates } from '@/lib/templates';
import { addStarterLook, STARTER_LOOKS } from '@/lib/starters';
import type { MediaItem } from '@/types/service';
import { ALL_SAMPLE_SONGS, buildSampleServices } from './services';

const SEEDED_KEY = 'voice-verses-samples';
export const SAMPLES_CHANGED = 'voice-verses-samples-changed';

const isSampleSong = (m: MediaItem) => m.tags?.includes('sample');

/** Adds the sample services, songs and the looks they use. */
export async function addSamples(): Promise<void> {
  const existing = await ServiceStorage.getMedia();
  for (const s of ALL_SAMPLE_SONGS) {
    if (existing.some((m) => m.id === s.id)) continue;
    const song: MediaItem = {
      id: s.id,
      type: 'song',
      name: s.title,
      author: s.author,
      copyright: s.copyright,
      lyrics: s.lyrics,
      arrangement: s.arrangement,
      tags: ['sample'],
      category: 'Samples',
      createdAt: new Date(),
    };
    await ServiceStorage.saveMediaItem(song);
  }
  const services = await ServiceStorage.getServices();
  for (const service of await buildSampleServices()) {
    if (services.some((x) => x.name === service.name)) continue;
    await ServiceStorage.saveService(service);
  }
  // Looks the Christmas sample uses
  let templates = loadTemplates();
  for (const id of ['starter-scripture-stars', 'starter-lyrics-lights']) {
    const look = STARTER_LOOKS.find((l) => l.look.id === id)?.look;
    if (look) templates = addStarterLook(templates, look);
  }
  saveTemplates(templates);
  localStorage.setItem(SEEDED_KEY, JSON.stringify({ at: new Date().toISOString() }));
  window.dispatchEvent(new Event(SAMPLES_CHANGED));
}

/** Removes every sample service and song. */
export async function removeSamples(): Promise<void> {
  for (const s of await ServiceStorage.getServices()) if (s.sample) await ServiceStorage.deleteService(s.id);
  for (const m of await ServiceStorage.getMedia()) if (isSampleSong(m)) await ServiceStorage.deleteMediaItem(m.id);
  window.dispatchEvent(new Event(SAMPLES_CHANGED));
}

/** The first time the app opens: put the samples in (once; never again after they are removed). */
export async function seedSamplesOnce(): Promise<void> {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return;
    localStorage.setItem(SEEDED_KEY, 'adding');
    await addSamples();
  } catch (e) {
    console.warn('Sample services could not be added:', e);
  }
}

export const hasSamples = async () => (await ServiceStorage.getServices()).some((s) => s.sample);
