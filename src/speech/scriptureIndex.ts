import { BibleParser } from '@/lib/bibleParser';
import { ScriptureIndex } from './scriptureMatcher';

let building: Promise<ScriptureIndex> | null = null;
let ready: ScriptureIndex | null = null;

/**
 * The Bible word index (KJV and WEB), built once in the background the first
 * time listening starts (about a second and a half).
 */
export function loadScriptureIndex(): Promise<ScriptureIndex> {
  if (!building) {
    building = Promise.all([BibleParser.getOfflineBooks('kjv'), BibleParser.getOfflineBooks('web')])
      .then((translations) => ScriptureIndex.build(translations))
      .then((index) => (ready = index));
    building.catch(() => (building = null));
  }
  return building;
}

/** The index if it has finished building; detection simply skips it until then. */
export function scriptureIndex(): ScriptureIndex | null {
  return ready;
}
