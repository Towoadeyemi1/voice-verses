/**
 * The modules Voice Verses starts with (1.19.4, D33): each registers what it answers, sends and
 * listens for, and the ones that subscribe start listening. Called once by the operator window.
 * A connector or importer added later registers itself here the same way.
 */
import { registerModule, type ModuleManifest } from './registry';
import { startProPresenterModule } from '@/modules/proPresenter';
import { startLocalApiModule } from '@/modules/localApi';

export const MODULES: ModuleManifest[] = [
  { id: 'live', name: 'Live', version: '1.0', description: 'What the screens show, and what waits in Next.', answers: ['live.show', 'live.next', 'live.take', 'live.clear', 'live.advance', 'live.back', 'live.logo'], emits: ['live.changed', 'next.changed'], listens: ['verse.found'] },
  { id: 'outputs', name: 'Screens and outputs', version: '1.0', description: 'The projector, lower third and stage, with countdowns and alerts over them.', answers: ['displays', 'identify', 'countdown', 'alert'], emits: ['countdown.changed', 'alert.changed'], listens: ['live.changed'] },
  { id: 'listening', name: 'Listening', version: '1.0', description: 'Hears the preacher on the chosen input, on this computer.', answers: ['start', 'stop', 'mute', 'inputs'], emits: ['listening.started', 'listening.stopped', 'speech.heard'], listens: [] },
  { id: 'detection', name: 'Detection', version: '1.0', description: 'Finds the verses said, read, quoted or told, and offers what it is unsure of.', answers: ['find a reference', 'search a quote'], emits: ['verse.found', 'suggestion.offered'], listens: ['speech.heard'] },
  { id: 'bibles', name: 'Bibles', version: '1.0', description: 'KJV, ASV and WEB on this computer; ESV, NLT and API.Bible over the internet.', answers: ['verse', 'chapter', 'translations'], emits: ['bible.changed'], listens: [] },
  { id: 'services', name: 'Services', version: '1.0', description: 'Services, their order, templates and types.', answers: ['services.list', 'services.receive', 'services.package'], emits: ['service.updated', 'service.deleted', 'package.received'], listens: [] },
  { id: 'library', name: 'Songs and media', version: '1.0', description: 'Songs with their credits, pictures and videos.', answers: ['songs', 'media'], emits: ['media.updated', 'media.deleted'], listens: [] },
  { id: 'spirit', name: 'spirit', version: '1.0', description: 'Gets the next part ready and learns how the church runs its services.', answers: ['what next', 'pause'], emits: [], listens: ['live.changed', 'speech.heard'] },
  { id: 'api', name: 'Other apps and devices', version: '1.0', description: 'The local API: paired apps and devices on the church network read what is on, follow the events and control the screens.', answers: ['pair', 'events', 'webhooks'], emits: [], listens: ['*'] },
  { id: 'propresenter', name: 'ProPresenter', version: '1.0', description: 'Sends what the screens show into ProPresenter: linked text, the NDI picture or the message.', answers: ['test', 'clear'], emits: [], listens: ['live.changed'] },
];

let started = false;

export function startModules(): void {
  if (started) return;
  started = true;
  for (const m of MODULES) registerModule(m);
  startProPresenterModule();
  startLocalApiModule();
}
