/**
 * The demo on the live screen: what a preacher and a worship
 * leader might say, fed through the real detector as if it had been heard,
 * so a new church sees verses found, followed and predicted, a song followed
 * with the leader's cues, and new singing offered, without a microphone.
 * KJV, a public-domain hymn and words written for the demo only.
 */

export type DemoStep =
  | { kind: 'say'; text: string; wait: number }
  /** Words arriving a few at a time, as speech recognition gives them */
  | { kind: 'read'; text: string; wait: number }
  /** The operator puts a song on (from the sample library) */
  | { kind: 'song'; songId: string; wait: number }
  /** The operator takes the suggestion on offer */
  | { kind: 'take'; wait: number }
  /**
   * The guide points at `target` (a `data-guide` name or a selector) and says `text` aloud
   * (1.19.1); the demo goes on when it has been said. `click`: the pointer clicks it.
   */
  | { kind: 'caption'; text: string; wait: number; target?: string; click?: boolean };

const at = (name: string) => `[data-guide="${name}"]`;

export const DEMO_STEPS: DemoStep[] = [
  { kind: 'caption', text: 'This is a short demo. Watch the pointer: it shows where each thing happens.', wait: 200 },
  { kind: 'caption', text: 'The preacher calls a verse. What Voice Verses hears appears here.', target: at('heard'), wait: 200 },
  { kind: 'say', text: 'Good morning church. Let us open our Bibles to John chapter 3 verse 16.', wait: 1800 },
  { kind: 'caption', text: 'The verse went straight up on Live, because it was said outright.', target: at('live'), wait: 200 },
  { kind: 'caption', text: 'As the preacher reads, the words light up one by one.', target: at('now'), wait: 200 },
  { kind: 'read', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', wait: 1200 },
  { kind: 'read', text: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.', wait: 1500 },
  { kind: 'caption', text: 'The next verse waits in Next, in case the preacher carries on.', target: at('next'), wait: 200 },
  { kind: 'say', text: 'And Paul says the same thing in Romans.', wait: 2600 },
  { kind: 'read', text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.', wait: 2000 },
  { kind: 'caption', text: 'A verse quoted without its reference is offered here, with how sure the app is.', target: '[data-suggestion]', wait: 200 },
  { kind: 'caption', text: 'One click puts it on the screens.', target: '[data-suggestion]', click: true, wait: 0 },
  { kind: 'take', wait: 2000 },
  { kind: 'caption', text: 'Now worship. The words of the hymn follow the singers.', target: at('live'), wait: 200 },
  { kind: 'song', songId: 'sample-song-blessed-assurance', wait: 1200 },
  { kind: 'say', text: 'Blessed assurance Jesus is mine, O what a foretaste of glory divine.', wait: 1200 },
  { kind: 'say', text: 'Heir of salvation purchase of God, born of his spirit washed in his blood.', wait: 2000 },
  { kind: 'caption', text: 'The worship leader calls out a part of the song, and it goes there.', target: at('heard'), wait: 200 },
  { kind: 'say', text: 'Verse two!', wait: 2200 },
  { kind: 'say', text: 'Back to the chorus.', wait: 2500 },
  { kind: 'say', text: 'Morning light is breaking over every hill.', wait: 1000 },
  { kind: 'say', text: 'Grace upon grace is falling on us here.', wait: 2500 },
  { kind: 'caption', text: 'New words that are in no song are offered as a new song.', target: '[data-capture]', wait: 1500 },
  { kind: 'caption', text: 'That was the demo. Press Start listening to do the same with your microphone.', target: at('listen'), wait: 600 },
];
