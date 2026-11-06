/**
 * Service templates (1.18.1): a starting order for a type of service. A church
 * can keep several per type, made from scratch, from the app's ready-made order
 * for that type, or from a service or template it already has. A new service
 * made from one gets everything in it with new ids, on the day chosen.
 */
import type { Service } from '@/types/service';
import { duplicateService } from '@/lib/duplicateService';
import { serviceType } from '@/lib/serviceTypes';
import { readyOrderFor, serviceFromStarter } from '@/lib/starters';

/** A template's name: its own, else the service's. */
export const templateName = (t: Service) => t.templateName?.trim() || t.name;

/**
 * A template made from a service or another template. With `keepSlides` false
 * only the order is kept (sections, parts, their timers and notes), not the
 * songs, verses and slides in it.
 */
export function templateFrom(source: Service, name: string, type: string, keepSlides = true): Service {
  const copy = duplicateService(source, new Date(source.date));
  if (!keepSlides) copy.sections = copy.sections.map((sec) => ({ ...sec, subsections: sec.subsections.map((it) => ({ ...it, slides: [] })) }));
  return { ...copy, id: `template-${copy.id}`, name, templateName: name, type, isTemplate: true, sample: undefined };
}

/** A template from the app's ready-made order for a type (when there is one), else an empty one. */
export function templateForType(type: string, name: string): Service {
  const ready = readyOrderFor(type);
  const base: Service = ready ? serviceFromStarter(ready, new Date()) : { id: `${Date.now()}`, name, date: new Date(), startTime: '10:00', sections: [], isTemplate: false };
  return templateFrom({ ...base, type }, name, type, false);
}

/** A service from a template, on the day given: everything in it, with new ids. */
export function serviceFromTemplate(t: Service, date: Date): Service {
  const copy = duplicateService(t, date);
  return { ...copy, name: templateName(t), type: t.type ?? serviceType(t), templateName: undefined };
}
