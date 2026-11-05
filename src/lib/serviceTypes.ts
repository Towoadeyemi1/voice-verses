/**
 * Types of service (1.18.0). Each service has one; spirit learns each type's
 * order, timings and habits separately (a Friday Night Prayers is not run like
 * a Sunday service). The church can use its own names; these come ready.
 */
import type { Service } from '@/types/service';

export const SERVICE_TYPES = [
  'Sunday service',
  'Communion Sunday',
  'Thanksgiving Sunday',
  'Midweek service',
  'Bible study',
  'Friday Night Prayers',
  'Prayer and Fasting',
  'Youth Day',
  "Children's service",
  'Special event',
  'Conference',
  'Christmas',
  'New Year',
  'Easter',
  'Wedding',
  'Funeral',
  'Dedication',
] as const;

// What a service's name says about its type, checked in this order
const CLUES: [RegExp, string][] = [
  [/christmas|carol|nativity/i, 'Christmas'],
  [/new year|crossover|watch ?night|31st night/i, 'New Year'],
  [/easter|good friday|resurrection/i, 'Easter'],
  [/wedding|marriage|holy matrimony/i, 'Wedding'],
  [/funeral|memorial|burial|thanksgiving for the life/i, 'Funeral'],
  [/dedication|christening|naming/i, 'Dedication'],
  [/fasting/i, 'Prayer and Fasting'],
  [/friday.*pray|night.*pray|vigil/i, 'Friday Night Prayers'],
  [/communion|lord'?s (supper|table)/i, 'Communion Sunday'],
  [/thanksgiving/i, 'Thanksgiving Sunday'],
  [/youth/i, 'Youth Day'],
  [/child|kids/i, "Children's service"],
  [/conference|convention|summit/i, 'Conference'],
  [/crusade|revival|outreach|concert|special/i, 'Special event'],
  [/bible study/i, 'Bible study'],
  [/midweek|wednesday|tuesday|thursday/i, 'Midweek service'],
  [/sunday|lord'?s day/i, 'Sunday service'],
];

/** The service's type: the one chosen for it, else what its name and day say. */
export function serviceType(svc: Pick<Service, 'name' | 'date'> & { type?: string } | null | undefined): string {
  if (!svc) return 'Sunday service';
  if (svc.type?.trim()) return svc.type.trim();
  const clue = CLUES.find(([re]) => re.test(svc.name));
  if (clue) return clue[1];
  const day = new Date(svc.date).getDay();
  if (day === 0) return 'Sunday service';
  if (day === 5 && /pray/i.test(svc.name)) return 'Friday Night Prayers';
  return day === 6 ? 'Special event' : 'Midweek service';
}

/** The types to offer: the ready ones and any the church has used. */
export function knownTypes(services: { type?: string }[] = []): string[] {
  const own = services.map((s) => s.type?.trim()).filter((t): t is string => !!t && !(SERVICE_TYPES as readonly string[]).includes(t));
  return [...SERVICE_TYPES, ...new Set(own)];
}
