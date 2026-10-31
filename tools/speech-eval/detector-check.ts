// Regression check for the verse detector (run in CI, see qa-checks.yml).
// Each line is what a speech engine might produce, and the verse that should
// go on screen (or null for nothing).
const store = new Map<string, string>();
(globalThis as unknown as Record<string, unknown>).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
(globalThis as unknown as Record<string, unknown>).window = globalThis;
const print = console.log.bind(console);
console.log = () => {};
console.warn = () => {};
import { VerseDetectionController } from '@/speech/VerseDetectionController';
import { loadScriptureIndex } from '@/speech/scriptureIndex';
import { plainVerseText } from '@/lib/verseText';

const single: [string, string | null][] = [
  ['Please turn with me to John chapter 3, verse 16.', 'John 3:16'],
  ['LET US LOOK AT ROMANS EIGHT TWENTY EIGHT', 'Romans 8:28'],
  ['Open your Bibles to Philippians 4.13.', 'Philippians 4:13'],
  ['Habakkuk 2 verse 4 says the just shall live by his faith', 'Habakkuk 2:4'],
  ['ZEPHANIAH THREE SEVENTEEN SAYS', 'Zephaniah 3:17'],
  ['Second Timothy three sixteen', '2 Timothy 3:16'],
  ['FIRST JOHN CHAPTER ONE VERSE NINE', '1 John 1:9'],
  ['Look at Ephesians chapter 2 verses 8 and 9', 'Ephesians 2:8'],
  ['Obadiah verse 17 says upon mount Zion', 'Obadiah 1:17'],
  ['Jude verse 24', 'Jude 1:24'],
  ['Turn to Psalm 23', 'Psalms 23:1'],
  ['john 316', 'John 3:16'],
  ['Song of Solomon 2:4', 'Song of Solomon 2:4'],
  ['Turn to 1 Corinthians 13:4. Then the book of Isaiah chapter 53 verse 5 says', 'Isaiah 53:5'],
  ['The service will end at 12:30 today.', null],
  ['We have three announcements and two more songs.', null],
  ['Next week we will continue the series.', null],
  ['Please go back to your seats.', null],
];

let failures = 0;
const check = (label: string, got: string | null, want: string | null) => {
  const ok = got === want;
  if (!ok) failures++;
  print(`${ok ? '✅' : '❌'} ${label} → ${got ?? 'nothing'}${ok ? '' : ` (expected ${want ?? 'nothing'})`}`);
};

(async () => {
  // The Bible word index (read-along and quotes) is built in the background; wait for it here
  await loadScriptureIndex();
  for (const [text, want] of single) {
    let got: string | null = null;
    const detector = new VerseDetectionController({ onVerseDetected: (v) => (got = `${v.book} ${v.chapter}:${v.verse}`) });
    await detector.onTranscript(text, true);
    check(JSON.stringify(text), got, want);
  }

  // A reference split across two speech segments
  let got: string | null = null;
  const detector = new VerseDetectionController({ onVerseDetected: (v) => (got = `${v.book} ${v.chapter}:${v.verse}`) });
  // Live segments arrive seconds apart; the detector debounces anything closer than 0.5 s
  const pause = () => new Promise((r) => setTimeout(r, 600));
  await detector.onTranscript('All scripture, says Second Timothy three', true);
  await pause();
  await detector.onTranscript('sixteen, is given by inspiration of God', true);
  await pause();
  check('reference split across segments', got, '2 Timothy 3:16');

  // Navigation needs the explicit phrase
  got = null;
  await detector.onTranscript('next verse', true);
  check('"next verse" after 2 Timothy 3:16', got, '2 Timothy 3:17');

  // Reading a passage aloud: the screen follows the reading, mid-sentence, and only then
  const session = (start: string) => {
    const shown: string[] = [];
    const suggested: string[] = [];
    const d = new VerseDetectionController({
      onVerseDetected: (v) => shown.push(`${v.book} ${v.chapter}:${v.verse}`),
      onVerseSuggested: (v) => suggested.push(`${v.book} ${v.chapter}:${v.verse}`),
    });
    const say = async (text: string, isFinal = true) => {
      await d.onTranscript(text, isFinal);
      await pause();
    };
    return { shown, suggested, say, ready: start ? say(start).then(() => shown.splice(0)) : Promise.resolve() };
  };
  {
    const s = session('Turn with me to John 3:16');
    await s.ready;
    await s.say('For God so loved the world, that he gave his only begotten Son');
    await s.say('that whosoever believeth in him should not perish, but have everlasting life.');
    // The engine sends the sentence in progress before it is finished
    await s.say('For God sent not his Son into the world', false);
    await s.say('For God sent not his Son into the world to condemn the world, but that the world through him might be saved.');
    await s.say('He that believeth on him is not condemned', false);
    check('reading John 3:16 on through 3:18 (in pieces)', s.shown.join(', '), 'John 3:17, John 3:18');
  }
  {
    const s = session('Psalm 23 verse 1');
    await s.ready;
    await s.say('Yea, though I walk through the valley of the shadow of death, I will fear no evil');
    check('reading ahead from Psalm 23:1 to verse 4', s.shown.join(', '), 'Psalms 23:4');
  }
  {
    const s = session('John 3:16');
    await s.ready;
    await s.say('Do you understand how much God loved the world? He gave everything.');
    check('preaching about John 3:16 stays on it', s.shown.join(', ') || null, null);
  }

  {
    // A quote right after reading a passage, split by the speech engine into two sentences
    const s = session('John 3:18');
    await s.ready;
    await s.say('He that believeth on him is not condemned: but he that believeth not is condemned already.');
    await s.say('Now listen to me, you know what David said, the Lord is my shepherd.');
    await s.say('I shall not want.');
    check('quote after a reading, in two sentences', s.shown.join(', '), 'Psalms 23:1');
  }

  // Quoted without the reference
  const quote = async (text: string) => {
    const s = session('');
    await s.say(text);
    return { shown: s.shown.join(', ') || null, suggested: s.suggested.join(', ') || null };
  };
  check('quote: the Lord is my shepherd', (await quote('As David said, the Lord is my shepherd, I shall not want.')).shown, 'Psalms 23:1');
  check('quote: I can do all things', (await quote('I can do all things through Christ which strengtheneth me')).shown, 'Philippians 4:13');
  check('quote: trust in the Lord (modern wording)', (await quote('Trust in the Lord with all your heart and lean not on your own understanding')).shown, 'Proverbs 3:5');
  check('quote in two gospels is offered, not shown', (await quote('Ask and it shall be given you, seek and ye shall find, knock and it shall be opened unto you')).suggested, 'Matthew 7:7');
  check('sermon talk is not a quote', (await quote('Let us pray together this morning, church, the Lord is good all the time')).shown, null);
  check('a common phrase is not a quote', (await quote('And it came to pass that we went to the market')).shown, null);

  // A called passage: shown from its first verse, followed through it even when the reading is misheard
  {
    const passages: string[] = [];
    const shown: string[] = [];
    const d = new VerseDetectionController({
      onVerseDetected: (v) => shown.push(`${v.book} ${v.chapter}:${v.verse}`),
      onPassageChange: (p) => passages.push(p ? `${p.book} ${p.chapter}:${p.from}-${p.to}` : 'none'),
    });
    await d.onTranscript('Let us read John chapter 5 verses 8 to 13', true);
    await pause();
    await d.onTranscript('Jesus saith unto him, Rise, take up thy bed, and walk.', true);
    await pause();
    // John 5:9, with words misheard all through it
    await d.onTranscript('and immediate lee the man was made hold and took up his bad and walked and on the same day was this sabbath', true);
    await pause();
    await d.onTranscript('the jews therefore said unto him that was cured it is the sabbath day', true);
    await pause();
    check('passage John 5:8-13 called', passages[0] ?? null, 'John 5:8-13');
    check('passage followed through misheard reading', shown.join(', '), 'John 5:8, John 5:9, John 5:10');
  }
  {
    const shown: string[] = [];
    let passage: string | null = null;
    const d = new VerseDetectionController({
      onVerseDetected: (v) => shown.push(`${v.book} ${v.chapter}:${v.verse}`),
      onPassageChange: (p) => (passage = p ? `${p.book} ${p.chapter}:${p.from}-${p.to}` : null),
    });
    await d.onTranscript('Turn with me to Psalm 23', true);
    await pause();
    check('whole chapter called', passage, 'Psalms 23:1-6');
    await d.onTranscript('he maketh me to lie down in green pastures he leadeth me beside the still waters', true);
    await pause();
    check('whole chapter followed', shown.join(', '), 'Psalms 23:1, Psalms 23:2');
  }

  // A reference in a partial transcript with words after it is complete: shown without waiting
  {
    const shown: string[] = [];
    const d = new VerseDetectionController({ onVerseDetected: (v) => shown.push(`${v.book} ${v.chapter}:${v.verse}`) });
    await d.onTranscript('Romans 8:28 tells us that all things', false);
    check('complete reference shown from the first partial', shown.join(', ') || null, 'Romans 8:28');
  }

  // Singing
  const songs = [
    {
      id: 'grace',
      title: 'Amazing Grace',
      lyrics:
        "Verse 1\nAmazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see\n\nVerse 2\n'Twas grace that taught my heart to fear\nAnd grace my fears relieved\nHow precious did that grace appear\nThe hour I first believed\n\nChorus\nMy chains are gone I've been set free\nMy God my Saviour has ransomed me",
    },
    {
      id: 'shepherd',
      title: 'The Lord Is My Shepherd',
      lyrics: 'The Lord is my shepherd I shall not want\nHe makes me down to lie in pastures green\nHe leadeth me the quiet waters by',
    },
    { id: 'waymaker', title: 'Way Maker', lyrics: 'Way maker miracle worker promise keeper\nLight in the darkness my God that is who you are' },
  ];
  {
    const suggested: string[] = [];
    const d = new VerseDetectionController({ onVerseDetected: () => {}, onSongSuggested: (m) => suggested.push(m.song.title) });
    d.setSongLibrary(songs);
    await d.onTranscript('amazing grace how sweet this sound that saved a wretch like me', true);
    check('song recognised from the singing', suggested.join(', ') || null, 'Amazing Grace');
  }
  {
    const shown: string[] = [];
    const suggested: string[] = [];
    let songMode = true;
    const d = new VerseDetectionController({
      onVerseDetected: (v) => shown.push(`${v.book} ${v.chapter}:${v.verse}`),
      onVerseSuggested: (v) => suggested.push(`${v.book} ${v.chapter}:${v.verse}`),
      onSongModeChange: (on) => (songMode = on),
    });
    d.setSongMode(true);
    await d.onTranscript('the Lord is my shepherd I shall not want, I can do all things through Christ', true);
    await pause();
    check('song mode: sung scripture is not shown', shown.join(', ') || suggested.join(', ') || null, null);
    await d.onTranscript('Now turn with me to Romans 8:28', true);
    check('song mode ends with a reference', `${shown.join(', ')} / ${songMode ? 'song' : 'scripture'}`, 'Romans 8:28 / scripture');
  }
  {
    // Following a song on screen, chorus sung twice
    const slides = ['Amazing grace how sweet the sound\nThat saved a wretch like me', 'I once was lost but now am found\nWas blind but now I see', "My chains are gone I've been set free\nMy God my Saviour has ransomed me", "'Twas grace that taught my heart to fear\nAnd grace my fears relieved", "My chains are gone I've been set free\nMy God my Saviour has ransomed me"];
    const moves: number[] = [];
    const d = new VerseDetectionController({ onVerseDetected: () => {}, onLyricsMove: (i) => moves.push(i) });
    d.setSongLibrary(songs);
    let at = 0;
    const sing = async (text: string) => {
      const before = moves.length;
      await d.onTranscript(text, true);
      if (moves.length > before) {
        at = moves[moves.length - 1];
        d.setLiveLyrics(slides, at);
      }
    };
    d.setLiveLyrics(slides, 0);
    await sing('i once was lost but now i found was blind but now i see');
    await sing('my chains are gone i have been set free');
    await sing('twas grace that taught my heart to fear and grace my fears relieved');
    await sing('my chains are gone ive been set free my god my savior has ransomed me');
    check('song followed, chorus the second time', moves.join(', '), '1, 2, 3, 4');
  }

  // Verse text on screen: KJV supplied words kept (shown in italics), margin notes never shown
  const text: [string, string][] = [
    ['God {is} our refuge and strength, a very present help in trouble. {for: or, of}', 'God is our refuge and strength, a very present help in trouble.'],
    ['to them who are the called according to {his} purpose.', 'to them who are the called according to his purpose.'],
    ['the day he heard {them; then} whatsoever proceeded', 'the day he heard them; then whatsoever proceeded'],
    ['under Ashdothpisgah eastward. {Ashdothpisgah; or, the springs of Pisgah, or, the hill}', 'under Ashdothpisgah eastward.'],
    ['by the hand of Moses. {by: Heb. by the hand of}', 'by the hand of Moses.'],
  ];
  for (const [input, want] of text) check(`verse text ${JSON.stringify(input.slice(0, 30))}…`, plainVerseText(input), want);

  if (failures) {
    print(`\n${failures} detector check(s) failed`);
    process.exit(1);
  }
  print('\nAll detector checks passed');
})();
