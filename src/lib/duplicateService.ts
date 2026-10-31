import { Service } from '@/types/service';

const fresh = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** The Sunday after `from` (a week on if `from` is itself a Sunday). */
export function nextSunday(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (7 - d.getDay() || 7));
  return d;
}

/**
 * A copy of a service for another day: everything in it (sections, items,
 * slides, timers, notes) with new ids, so the copy and the original never get
 * mixed up on screen or when the library syncs.
 */
export function duplicateService(service: Service, date: Date): Service {
  const copy: Service = JSON.parse(JSON.stringify(service));
  copy.id = fresh('svc');
  copy.date = date;
  copy.isTemplate = false;
  copy.updatedAt = undefined;
  copy.sections = (copy.sections ?? []).map((section) => ({
    ...section,
    id: fresh('sec'),
    subsections: section.subsections.map((item) => ({
      ...item,
      id: fresh('item'),
      slides: item.slides.map((slide) => ({ ...slide, id: fresh('slide') })),
    })),
  }));
  if (copy.slides) copy.slides = copy.slides.map((slide) => ({ ...slide, id: fresh('slide') }));
  return copy;
}
