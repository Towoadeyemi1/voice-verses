/**
 * The one-minute demo on the live screen: what a preacher and a worship
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
  | { kind: 'caption'; text: string; wait: number };

export const DEMO_STEPS: DemoStep[] = [
  { kind: 'caption', text: 'The preacher calls a verse', wait: 600 },
  { kind: 'say', text: 'Good morning church. Let us open our Bibles to John chapter 3 verse 16.', wait: 2200 },
  { kind: 'caption', text: 'Voice Verses follows the reading word by word', wait: 300 },
  { kind: 'read', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', wait: 1500 },
  { kind: 'read', text: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.', wait: 2000 },
  { kind: 'caption', text: 'A hint of what comes next: the likely verse waits in Next', wait: 300 },
  { kind: 'say', text: 'And Paul says the same thing in Romans.', wait: 3200 },
  { kind: 'caption', text: 'A verse quoted without its reference is offered, with how sure the app is', wait: 300 },
  { kind: 'read', text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.', wait: 2500 },
  { kind: 'caption', text: 'The operator puts it up with one click', wait: 900 },
  { kind: 'take', wait: 2500 },
  { kind: 'caption', text: 'Worship: the song follows the singers', wait: 300 },
  { kind: 'song', songId: 'sample-song-blessed-assurance', wait: 1500 },
  { kind: 'say', text: 'Blessed assurance Jesus is mine, O what a foretaste of glory divine.', wait: 1500 },
  { kind: 'say', text: 'Heir of salvation purchase of God, born of his spirit washed in his blood.', wait: 2500 },
  { kind: 'caption', text: 'The worship leader calls a cue', wait: 300 },
  { kind: 'say', text: 'Verse two!', wait: 2500 },
  { kind: 'say', text: 'Back to the chorus.', wait: 3000 },
  { kind: 'caption', text: 'New words that are in no song are offered as a new song', wait: 300 },
  { kind: 'say', text: 'Morning light is breaking over every hill.', wait: 1200 },
  { kind: 'say', text: 'Grace upon grace is falling on us here.', wait: 3500 },
];
