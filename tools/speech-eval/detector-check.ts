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
import { readingPosition, readingTokens, wordsAhead } from '@/speech/readingTracker';
import { words as stems } from '@/speech/scriptureMatcher';
import { parseRich, wrapSelection } from '@/lib/richText';
import { BibleParser } from '@/lib/bibleParser';
import { setApiBibleKey, setChosenApiBibles, versesFromApiBibleJson, versesFromBracketed, versesFromNltHtml } from '@/lib/onlineBibles';
import { parseSongSelectFile } from '@/lib/songSelectImport';
import { parseSongSections } from '@/lib/songs';
import { cueTarget, parseWorshipCue } from '@/speech/worshipCues';
import { addLine, captureSlide, draftLyrics, tidyLine } from '@/lib/spontaneousSong';
import { scriptureHint } from '@/speech/scriptureHints';
import { predictNext } from '@/lib/predictNext';
import { crossReferences, setCrossReferenceData } from '@/lib/crossReferences';
import crossReferenceData from '@/data/cross-references.json';
import { duplicateService, nextSunday } from '@/lib/duplicateService';

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
  // A chapter alone is not a verse: it waits for the verse (see "a chapter called" below)
  ['Turn to Psalm 23', null],
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
  // Not word for word (modern wording): offered, at the top of the list, rather than shown
  check('quote: trust in the Lord (modern wording)', (await quote('Trust in the Lord with all your heart and lean not on your own understanding')).suggested?.split(', ')[0] ?? null, 'Proverbs 3:5');
  {
    const q = await quote('Ask and it shall be given you, seek and ye shall find, knock and it shall be opened unto you');
    check('quote in two gospels is offered, not shown', `${q.shown ?? 'not shown'} / ${q.suggested}`, 'not shown / Matthew 7:7, Luke 11:9');
  }
  {
    // Part of a verse: offered with how sure it is
    const scores: string[] = [];
    const d = new VerseDetectionController({ onVerseDetected: () => {}, onVerseSuggested: (v, info) => scores.push(`${v.book} ${v.chapter}:${v.verse} ${Math.round((info.score ?? 0) * 100)}%`) });
    await d.onTranscript('for God so loved the world that he gave his only begotten son', true);
    check('part of a verse is offered with a confidence below 99%', scores[0]?.replace(/\d+%$/, (m) => (parseInt(m) < 99 && parseInt(m) > 30 ? 'ok' : m)) ?? null, 'John 3:16 ok');
  }
  check('sermon talk is not a quote', (await quote('Let us pray together this morning, church, the Lord is good all the time')).shown, null);
  // A story told in the preacher's own words, with the names in it: offered while still talking, never shown by itself
  {
    const story = async (parts: string[], partial = false) => {
      const shown: string[] = [];
      const offered: { ref: string; score: number }[] = [];
      const d = new VerseDetectionController({
        onVerseDetected: (v) => shown.push(`${v.book} ${v.chapter}:${v.verse}`),
        onVerseSuggested: (v, info) => offered.push({ ref: `${v.book} ${v.chapter}:${v.verse}`, score: info.score ?? 0 }),
      });
      for (const [i, text] of parts.entries()) {
        await d.onTranscript(text, !(partial && i === parts.length - 1));
        await pause();
      }
      return { shown, offered };
    };
    const told: [string, string[], RegExp][] = [
      ['Peter walking on the water', ['Peter stepped out of the boat onto the waves and began to sink when he saw the wind'], /^Matthew 14:(2[89]|3[01])$/],
      ['Zacchaeus up the tree', ['Zacchaeus the tax collector was too short to see over the crowd so he climbed up a sycamore tree'], /^Luke 19:[2-4]$/],
      ['David and Goliath', ['little David with only a sling and a stone brought down the giant Goliath'], /^1 Samuel 17:(4[0-9]|50|51)$/],
      ['Daniel and the lions', ['God shut the mouths of the lions so they could not hurt Daniel'], /^Daniel 6:2[0-3]$/],
      ['Elijah on Carmel', ['Elijah called down fire from heaven on mount Carmel and it consumed the offering and licked up the water'], /^1 Kings 18:(19|2[0-9]|3[0-9])$/],
      ['the woman and the hem', ['the woman with the issue of blood pushed through the crowd and touched the hem of his garment'], /^(Matthew 9:2[01]|Mark 5:2[5-9]|Luke 8:4[3-4])$/],
      ['Lazarus four days dead', ['Martha said Lord by now he stinks, Lazarus has been dead four days'], /^John 11:(1[7-9]|39)$/],
      ['five loaves and two fish', ['Jesus took five loaves and two fishes and fed five thousand men'], /^(Matthew 14:1[5-9]|Matthew 14:2[01]|Matthew 16:9|Mark 6:(3[5-9]|4[0-4])|Mark 8:19|Luke 9:1[2-7]|John 6:([5-9]|1[0-3]))$/],
      ['the Red Sea parted', ['Moses stretched out his rod and the Red Sea parted and Israel crossed over on dry ground'], /^Exodus 14:(1[5-9]|2[0-9])$/],
      ['the walls of Jericho', ['Joshua and the people marched around Jericho seven times, they shouted and the walls fell down flat'], /^Joshua 6:([2-5]|1[0-9]|20)$/],
    ];
    for (const [label, parts, want] of told) {
      const r = await story(parts);
      // The suggestion bar shows the surest first
      const top = [...r.offered].sort((x, y) => y.score - x.score)[0];
      check(`story: ${label} is offered`, top && want.test(top.ref) ? 'offered' : `${top?.ref ?? 'nothing'}`, 'offered');
      check(`story: ${label} is not shown by itself`, r.shown.join(', ') || null, null);
    }
    // Offered from the sentence still being spoken (a partial), not only once it ends
    {
      const r = await story(['Peter stepped out of the boat onto the waves and began to sink when he saw the wind'], true);
      check('story: offered while the sentence is still being spoken', r.offered.some((o) => /^Matthew 14:/.test(o.ref)) ? 'offered' : r.offered[0]?.ref ?? 'nothing', 'offered');
    }
    // "Help me find it": the story told before it is searched at once
    {
      const r = await story([
        'You know Gideon, he wanted a sign so he laid a fleece out overnight',
        'and asked for dew on the fleece but dry ground all around',
        'Somebody help me find it',
      ]);
      check('"help me find it" finds the story told before it', r.offered.some((o) => /^Judges 6:3[6-9]|^Judges 6:40/.test(o.ref)) ? 'offered' : r.offered.map((o) => o.ref).join(', ') || 'nothing', 'offered');
    }
    // Ordinary sermon talk brings nothing
    for (const text of [
      'Good morning church, it is good to be in the house of the Lord today, please greet your neighbour',
      'We are going to have lunch after the service in the fellowship hall, everyone is welcome',
      'God is faithful and he loves you more than you could ever know',
      'Paul was a great apostle and we can all learn something from his life',
      'Turn off your phones and let us open our hearts to what the Spirit is saying this morning',
    ]) {
      const r = await story([text]);
      // (a short phrase from a verse may still be offered faintly by the quote search, below 45%)
      check(`story: ordinary talk brings nothing (${text.slice(0, 30)}…)`, r.offered.filter((o) => o.score >= 0.45).map((o) => o.ref).join(', ') || r.shown.join(', ') || null, null);
    }
  }

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
    // Verse 1 is not pushed: the verse being read goes up
    check('whole chapter: the verse being read goes up, not verse 1', shown.join(', '), 'Psalms 23:2');
  }

  // "Somewhere in Isaiah 53": which verse? The one he reads, quotes, paraphrases or names
  {
    const chapter = async (call: string, then: string[]) => {
      const shown: string[] = [];
      const offered: string[] = [];
      let called: string | null = null;
      const d = new VerseDetectionController({
        onVerseDetected: (v) => shown.push(`${v.book} ${v.chapter}:${v.verse}`),
        onVerseSuggested: (v) => offered.push(`${v.book} ${v.chapter}:${v.verse}`),
        onChapterCalled: (c) => (called = `${c.book} ${c.chapter}`),
      });
      await d.onTranscript(call, true);
      await pause();
      const before = shown.join(', ') || null;
      for (const t of then) {
        await d.onTranscript(t, true);
        await pause();
      }
      return { before, called, shown: shown.join(', ') || null, offered };
    };
    {
      const r = await chapter('There is a word somewhere in Isaiah 53', []);
      check('a chapter called: nothing goes up yet', r.before, null);
      check('a chapter called: it is loaded to choose from', r.called, 'Isaiah 53');
    }
    check('a chapter called, then a verse of it read', (await chapter('Somewhere in Isaiah 53', ['he was wounded for our transgressions, he was bruised for our iniquities'])).shown, 'Isaiah 53:5');
    check('a chapter called, then "verse 5"', (await chapter('Turn to Isaiah 53', ['look at verse 5 with me'])).shown, 'Isaiah 53:5');
    check('a chapter called, then "verse five" in words', (await chapter('Turn to Isaiah 53', ['verse five'])).shown, 'Isaiah 53:5');
    {
      // In his own words: the verse of that chapter it sounds like is offered first
      const r = await chapter('Isaiah 53 says it', ['he never opened his mouth, he was led like a lamb to be slaughtered']);
      check('a chapter called, then paraphrased: that verse', r.shown ?? r.offered[0] ?? null, 'Isaiah 53:7');
    }
    check('"John 5 from verse 8" still goes up at verse 8', (await chapter('John 5 from verse 8', [])).before, 'John 5:8');
    {
      // The same words in four books: the one in today's plan comes first
      const offered: { ref: string; score: number }[] = [];
      const d = new VerseDetectionController({ onVerseDetected: () => {}, onVerseSuggested: (v, i) => offered.push({ ref: `${v.book} ${v.chapter}:${v.verse}`, score: i.score ?? 0 }) });
      const plain = [...offered];
      await d.onTranscript('the just shall live by faith', true);
      const before = [...offered].sort((a, b) => b.score - a.score)[0]?.ref ?? null;
      offered.length = 0;
      plain.length = 0;
      const planned = new VerseDetectionController({ onVerseDetected: () => {}, onVerseSuggested: (v, i) => offered.push({ ref: `${v.book} ${v.chapter}:${v.verse}`, score: i.score ?? 0 }) });
      planned.setPlanned([{ book: 'Galatians', chapter: 3, verse: 11 }]);
      await planned.onTranscript('the just shall live by faith', true);
      const after = [...offered].sort((a, b) => b.score - a.score)[0]?.ref ?? null;
      check('a verse in today\'s plan comes first', `${before === 'Galatians 3:11' ? 'already first' : 'not first'} → ${after}`, `not first → Galatians 3:11`);
      // Never sure enough to go up by itself through context alone
      check('context never makes a guess go up', String(offered.every((o) => o.score < 0.99)), 'true');
    }
  }

  // Reading a called passage word by word: at the end of each verse the next comes up
  {
    const shown: string[] = [];
    const progress: number[] = [];
    const d = new VerseDetectionController({
      onVerseDetected: (v) => shown.push(`${v.book} ${v.chapter}:${v.verse}`),
      onReadingProgress: (p) => p.verse.verse === 1 && progress.push(p.word),
    });
    await d.onTranscript('Romans 12 verses 1 and 2', true);
    await pause();
    await d.onTranscript('I beseech you therefore brethren by the mercies of God', false);
    await d.onTranscript('I beseech you therefore brethren by the mercies of God that ye present your bodies a living sacrifice', false);
    await d.onTranscript('I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service.', true);
    await pause();
    check('word follower moves through the verse', progress.length >= 3 && progress.every((w, i) => i === 0 || w > progress[i - 1]) ? 'forward' : progress.join(','), 'forward');
    check('end of verse 1 brings up verse 2 (passage 1-2)', shown.join(', '), 'Romans 12:1, Romans 12:2');
  }
  {
    // A single verse read to the end waits; "next" on its own moves on
    const shown: string[] = [];
    const d = new VerseDetectionController({ onVerseDetected: (v) => shown.push(`${v.book} ${v.chapter}:${v.verse}`) });
    await d.onTranscript('Philippians 4:13', true);
    await pause();
    await d.onTranscript('I can do all things through Christ which strengtheneth me.', true);
    await pause();
    check('single verse read to the end waits', shown.join(', '), 'Philippians 4:13');
    await d.onTranscript('Next.', true);
    await pause();
    await d.onTranscript('We will meet again next week.', true);
    check('"next" on its own moves on (not "next week")', shown.join(', '), 'Philippians 4:13, Philippians 4:14');
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
        "Verse 1\nAmazing grace how sweet the sound\nThat saved a wretch like me\nI once was lost but now am found\nWas blind but now I see\n\nVerse 2\n'Twas grace that taught my heart to fear\nAnd grace my fears relieved\nHow precious did that grace appear\nThe hour I first believed\n\nChorus\nPraise God from whom all blessings flow\nPraise Him all creatures here below",
    },
    {
      id: 'shepherd',
      title: 'The Lord Is My Shepherd',
      lyrics: 'The Lord is my shepherd I shall not want\nHe makes me down to lie in pastures green\nHe leadeth me the quiet waters by',
    },
    { id: 'holy', title: 'Holy, Holy, Holy', lyrics: 'Holy holy holy Lord God Almighty\nEarly in the morning our song shall rise to Thee' },
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
    const slides = ['Amazing grace how sweet the sound\nThat saved a wretch like me', 'I once was lost but now am found\nWas blind but now I see', 'Praise God from whom all blessings flow\nPraise Him all creatures here below', "'Twas grace that taught my heart to fear\nAnd grace my fears relieved", 'Praise God from whom all blessings flow\nPraise Him all creatures here below'];
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
    await sing('praise god from whom all blessings flow');
    await sing('twas grace that taught my heart to fear and grace my fears relieved');
    await sing('praise god from whom all blessings flow praise him all creatures here below');
    check('song followed, chorus the second time', moves.join(', '), '1, 2, 3, 4');
  }

  // Worship leader voice cues
  {
    const cue = (t: string) => {
      const c = parseWorshipCue(t);
      return c ? (c.kind === 'section' ? `${c.section}${c.number ?? ''}` : c.kind) : null;
    };
    const cues: [string, string | null][] = [
      ['One more time!', 'again'],
      ['come on church, sing it again', 'again'],
      ["let's sing that again", 'again'],
      ['again', 'again'],
      ['last time', 'again'],
      ['go to the bridge', 'bridge'],
      ['Back to the chorus', 'chorus'],
      ['sing the chorus church', 'chorus'],
      ['Bridge!', 'bridge'],
      ['pre-chorus', 'pre-chorus'],
      ['verse two', 'verse2'],
      ["let's go to the second verse", 'verse2'],
      ['take it from the top', 'top'],
      // Sung lines and speech that are not cues
      ['Christ will come again', null],
      ['again and again', null],
      ['and we will sing it again and again forever more to the King of all the earth', null],
      ['join the chorus of the angels', null],
      ['be thou my vision O Lord of my heart', null],
      ['go to the verse', null],
    ];
    for (const [text, want] of cues) check(`cue ${JSON.stringify(text)}`, cue(text), want);

    // Verse 1, Chorus, Verse 2, Chorus, Bridge, Chorus (two slides each)
    const labels = ['Verse 1', 'Verse 1', 'Chorus', 'Chorus', 'Verse 2', 'Verse 2', 'Chorus', 'Chorus', 'Bridge', 'Bridge', 'Chorus', 'Chorus'];
    const go = (t: string, at: number, justArrived = false) => cueTarget(parseWorshipCue(t)!, labels, at, { justArrived });
    check('one more time at the end of a chorus: its start', go('one more time', 3), 2);
    check('one more time just after the song moved on: the section just sung', go('one more time', 4, true), 2);
    check('one more time at the start of a section sung a while: stay', go('one more time', 4), null);
    check('go to the bridge', go('go to the bridge', 5), 8);
    check('back to the chorus from the bridge: the next chorus', go('back to the chorus', 9), 10);
    check('back to the chorus after the last one: the last one', go('back to the chorus', 11), 10);
    check('verse two', go('verse two', 1), 4);
    check('from the top', go('from the top', 9), 0);
    check('a section the song does not have: stay', go('go to the tag', 3), null);

    // In the controller: the cue moves the lyrics once, as soon as it is heard
    const moves: string[] = [];
    const d = new VerseDetectionController({ onVerseDetected: () => {}, onLyricsMove: (i, c) => moves.push(`${i}${c ? `:${c.kind}` : ''}`) });
    const slides = labels.map((l, i) => `${l} line ${i}`);
    d.setLiveLyrics(slides, 5, labels);
    await d.onTranscript('go to the', false);
    await d.onTranscript('go to the bridge', false);
    await d.onTranscript('go to the bridge', true);
    check('cue acted on once, from the partial', moves.join(', '), '8:section');
    d.setLiveLyrics(slides, 8, labels.map(() => ''));
    await d.onTranscript('one more time', true);
    check('no section names: "one more time" is not guessed', moves.length, 1);
  }

  // Spontaneous worship: singing that is in no song is offered, then captured line by line
  {
    const offers: string[][] = [];
    const captured: string[] = [];
    const d = new VerseDetectionController({ onVerseDetected: () => {}, onNewSinging: (l) => offers.push(l), onCapturedLine: (l) => captured.push(l) });
    d.setSongLibrary(songs);
    d.setSongMode(true);
    await d.onTranscript('amazing grace how sweet the sound that saved a wretch like me', true);
    check('a library song is not offered as new', offers.length, 0);
    // Words written for this test (never copyrighted lyrics)
    await d.onTranscript('morning light is breaking over every hill', true);
    await d.onTranscript('grace upon grace is falling on us here', true);
    check('two new lines in a row: offered as a new song', offers.map((o) => o.length).join(','), '2');
    await d.onTranscript('we will rest within your mercy', true);
    check('offered once, not every line', offers.length, 1);
    d.setCapturing(true);
    await d.onTranscript('we will rest within your mercy', true);
    await d.onTranscript('yeah', true);
    check('while capturing, each sung line is passed on', captured.join(' | '), 'we will rest within your mercy');

    check('tidy line', tidyLine('grace upon grace is falling .'), 'Grace upon grace is falling');
    check('fillers alone are dropped', tidyLine('oh oh yeah'), null);
    let lines: string[] = [];
    for (const l of ['morning light is breaking', 'grace upon grace is falling', 'grace upon grace is falling', 'we will rest in your mercy', 'grace upon grace is falling', 'morning light is breaking', 'grace upon grace is falling']) lines = addLine(lines, l);
    check('a line heard twice in a row is kept once', lines.length, 6);
    check('slides show two lines, changing every second line', captureSlide(lines.slice(0, 3), 'Sung live', 'c')?.content, 'We will rest in your mercy');
    const draft = draftLyrics(lines);
    check('lines sung three times become the chorus', draft.lyrics, 'Verse 1\nMorning light is breaking\nWe will rest in your mercy\n\nChorus\nGrace upon grace is falling');
    check('chorus after each verse', draft.arrangement.join(', '), 'Verse 1, Chorus');
  }

  // Predictive Next: hints of where the preacher is going, and the likely verse
  {
    const hint = (t: string) => scriptureHint(t)?.books.join(' / ') ?? null;
    const hints: [string, string | null][] = [
      ['and Paul says the same thing in Romans', 'Romans'],
      ['turn with me to the book of Acts', 'Acts'],
      ['over in Isaiah the prophet says', 'Isaiah'],
      ['first Corinthians tells us', '1 Corinthians'],
      ['as David wrote', 'Psalms'],
      ['Jesus said', 'Matthew / Mark / Luke / John'],
      ['the gospel of John', 'John'],
      // Not hints
      ['the Romans built roads everywhere', null],
      ['I got a new job last week', null],
      ['their acts of kindness', null],
      ['mark my words', null],
      ['Romans 8:28 says', null],
    ];
    for (const [text, want] of hints) check(`hint ${JSON.stringify(text)}`, hint(text), want);

    setCrossReferenceData(crossReferenceData as Record<string, string[]>);
    const ref = (s: string) => {
      const m = s.match(/^(.+) (\d+):(\d+)$/)!;
      return { book: m[1], chapter: Number(m[2]), verse: Number(m[3]) };
    };
    const show = (p: { book: string; chapter: number; verse: number } | undefined) => (p ? `${p.book} ${p.chapter}:${p.verse}` : null);
    check('cross-references load (John 3:16)', crossReferences(ref('John 3:16')).length > 3, true);
    check('John 3:16, "in Romans": a Romans cross-reference', show(predictNext({ books: ['Romans'], live: ref('John 3:16') })[0]), 'Romans 5:8');
    check('the plan wins over cross-references', show(predictNext({ books: ['Romans'], live: ref('John 3:16'), outline: [ref('Romans 10:9')] })[0]), 'Romans 10:9');
    check('nothing in that book: no guess', show(predictNext({ books: ['Obadiah'], live: ref('John 3:16') })[0]), null);
    check('a verse already shown is not predicted', show(predictNext({ books: ['Romans'], live: ref('John 3:16'), recent: [ref('Romans 5:8')] })[0]) !== 'Romans 5:8', true);

    // In the controller: a hint is passed on once, and never shows a verse
    const seen: string[] = [];
    const shown: string[] = [];
    const d = new VerseDetectionController({ onVerseDetected: (v) => shown.push(v.reference ?? ''), onScriptureHint: (h) => seen.push(h.books.join('/')) });
    await d.onTranscript('and Paul says the same thing in Romans', false);
    await d.onTranscript('and Paul says the same thing in Romans', true);
    check('hint passed on once', seen.join(', '), 'Romans');
    check('a hint shows nothing by itself', shown.length, 0);
    // The sentence still being spoken: "Paul says…" waits, as it may go on to name the book
    const early: string[] = [];
    const e = new VerseDetectionController({ onVerseDetected: () => {}, onScriptureHint: (h) => early.push(h.books[0]) });
    await e.onTranscript('and Paul says the same thing', false);
    await e.onTranscript('and Paul says the same thing in Romans', false);
    check('a writer named mid-sentence waits for the book', early.join(', '), 'Romans');
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

  // Songs downloaded from SongSelect
  {
    // Public-domain hymns in SongSelect's formats (never copyrighted lyrics in the repo)
    const txt = `Holy, Holy, Holy\n\nVerse 1\nHoly holy holy Lord God Almighty\nEarly in the morning our song shall rise to Thee\n\nChorus\nHoly holy holy merciful and mighty\nGod in three persons blessed Trinity\n\nVerse 2\nHoly holy holy all the saints adore Thee\nCasting down their golden crowns around the glassy sea\n\nCCLI Song # 1156\nJohn Bacchus Dykes | Reginald Heber\nPublic Domain\nFor use solely with the SongSelect® Terms of Use. All rights reserved. www.ccli.com\nCCLI License # 1234567`;
    const song = parseSongSelectFile('holy-holy-holy.txt', txt);
    check('SongSelect .txt: title, number, writer, copyright', song && `${song.name} | ${song.ccliNumber} | ${song.author} | ${song.copyright}`, 'Holy, Holy, Holy | 1156 | John Bacchus Dykes, Reginald Heber | Public Domain');
    check('SongSelect .txt: sections', song && parseSongSections(song.lyrics).map((x) => x.label).join(', '), 'Verse 1, Chorus, Verse 2');
    const usr = `[File]\nType=SongSelect Import File\nVersion=3.0\n[S A25376]\nTitle=It Is Well With My Soul\nAuthor=Horatio Gates Spafford | Philip Paul Bliss\nCopyright=Public Domain\nFields=Verse 1/tChorus\nWords=When peace like a river attendeth my way/nWhen sorrows like sea billows roll/tIt is well with my soul/nIt is well it is well with my soul\n`;
    const u = parseSongSelectFile('it-is-well.usr', usr);
    check('SongSelect .usr: title, number, writers', u && `${u.name} | ${u.ccliNumber} | ${u.author}`, 'It Is Well With My Soul | 25376 | Horatio Gates Spafford, Philip Paul Bliss');
    check('SongSelect .usr: sections', u && parseSongSections(u.lyrics).map((x) => `${x.label}:${x.lines.length}`).join(', '), 'Verse 1:2, Chorus:2');
  }

  // Duplicating a service for next Sunday
  {
    check('next Sunday after a Wednesday', nextSunday(new Date(2026, 9, 28)).toDateString(), new Date(2026, 10, 1).toDateString());
    check('next Sunday after a Sunday is a week on', nextSunday(new Date(2026, 10, 1)).toDateString(), new Date(2026, 10, 8).toDateString());
    const original = { id: 's', name: 'Sunday Service', date: new Date(2026, 10, 1), startTime: '10:00', isTemplate: false, sections: [{ id: 'a', name: 'Worship', subsections: [{ id: 'b', name: 'Song', slides: [{ id: 'c', type: 'blank', title: '' }] }] }] } as unknown as import('@/types/service').Service;
    const copy = duplicateService(original, new Date(2026, 10, 8));
    const ids = [copy.id, copy.sections[0].id, copy.sections[0].subsections[0].id, copy.sections[0].subsections[0].slides[0].id];
    check('duplicate has new ids everywhere and keeps the content', `${ids.every((id) => !['s', 'a', 'b', 'c'].includes(id))} ${copy.name} ${copy.sections[0].subsections[0].name} ${original.id}`, 'true Sunday Service Song s');
  }

  // Online translations: each service's chapter text becomes verses
  {
    const esv = versesFromBracketed('[16] For God so loved the world, that he gave his only Son. [17] For God did not send his Son into the world to condemn the world. (ESV)');
    check('ESV chapter text → verses', `${esv.get(16)} | ${esv.get(17)}`, 'For God so loved the world, that he gave his only Son. | For God did not send his Son into the world to condemn the world.');
    const nlt = versesFromNltHtml('<h2 class="bk_ch_name">John 3</h2><h3 class="subhead">Nicodemus Visits Jesus</h3><verse_export orig="john_3_16" bk="John" ch="3" vn="16"><span class="vn">16</span>For this is how God loved the world: He gave<a class="a-tn">*</a><span \nclass="tn"><span class="tn-ref">3:16</span> Or <em>For God loved the world so much</em>.</span> his one and only Son.</verse_export><verse_export orig="john_3_17" bk="John" ch="3" vn="17"><span class="vn">17</span>God sent his Son into the world not to judge the world, but to save the world through him.</verse_export>');
    check('NLT HTML → verses (no headings, footnotes or numbers)', `${nlt.get(16)} | ${nlt.get(17)}`, 'For this is how God loved the world: He gave his one and only Son. | God sent his Son into the world not to judge the world, but to save the world through him.');
    const api = versesFromApiBibleJson([{ type: 'tag', items: [{ type: 'text', text: 'For God so loved the world, ', attrs: { verseId: 'JHN.3.16' } }, { type: 'tag', items: [{ type: 'text', text: 'that he gave his only begotten Son.', attrs: { verseId: 'JHN.3.16' } }] }, { type: 'text', text: 'For God did not send His Son.', attrs: { verseId: 'JHN.3.17' } }] }]);
    check('API.Bible JSON → verses', `${api.get(16)} | ${api.get(17)}`, 'For God so loved the world, that he gave his only begotten Son. | For God did not send His Son.');

    // A licensed API.Bible translation end to end (the service stood in for)
    const realFetch = globalThis.fetch;
    const asked: string[] = [];
    globalThis.fetch = (async (url: string, init?: { headers?: Record<string, string> }) => {
      asked.push(`${url.replace(/\?.*$/, '')} key=${init?.headers?.['api-key']}`);
      return new Response(JSON.stringify({ data: { content: [{ type: 'text', text: 'For God so loved the world that He gave His only begotten Son.', attrs: { verseId: 'JHN.3.16' } }], copyright: 'NKJV © Thomas Nelson' }, meta: { fumsToken: 'tok' } }), { status: 200 });
    }) as typeof fetch;
    setApiBibleKey('church-key');
    setChosenApiBibles([{ id: 'nkjv-id', abbreviation: 'NKJV', name: 'New King James Version' }]);
    BibleParser.setVersion('api:nkjv-id');
    const verse = await BibleParser.getVerse('John', 3, 16);
    await BibleParser.getVerse('John', 3, 17);
    check('NKJV from API.Bible: verse, label, one request per chapter', `${verse?.text} | ${BibleParser.getVersionLabel()} | ${asked.length} ${asked[0]}`, 'For God so loved the world that He gave His only begotten Son. | NKJV | 1 https://rest.api.bible/v1/bibles/nkjv-id/chapters/JHN.3 key=church-key');
    globalThis.fetch = realFetch;
    BibleParser.setVersion('kjv');
  }

  // The word follower with a fast reader
  {
    const verse = 'And immediately the man was made whole, and took up his bed, and walked: and on the same day was the sabbath.';
    const tokens = readingTokens(verse);
    const at = (said: string) => { const i = readingPosition(tokens, stems(said)); return i < 0 ? '-' : tokens[i].text; };
    check('fast reader: a long jump between results is followed', at('and immediately the man was made whole and took up his bed and walked and on the same'), 'same');
    check('misheard words are skipped', at('and immediately the man was maid hole and took up his bad and walked'), 'walked:');
    check('the last word heard is not held back', at('and immediately the man'), 'man');
    check('a common word alone does not jump ahead', at('and the'), 'And');
    check('preaching about it does not move it', at('you see church the man had waited for thirty eight years'), 'man');
    const t0 = 1_000_000;
    const history = [{ word: 2, at: t0 }, { word: 8, at: t0 + 2000 }]; // 3 words a second
    check('pace carries the light on between results (capped)', `${wordsAhead(history, t0 + 2400)} ${wordsAhead(history, t0 + 3500)} ${wordsAhead(history, t0 + 6000)}`, '1 3 0');
  }

  // Word formatting in slide text
  {
    const show = (t: string) => parseRich(t).map((r) => `${r.text}${r.bold ? '[b]' : ''}${r.italic ? '[i]' : ''}${r.underline ? '[u]' : ''}${r.highlight ? '[h]' : ''}${r.color ? `[${r.color}]` : ''}`).join('|');
    check('bold, italic, highlight, colour', show('Amazing **grace**, how *sweet* the ==sound== [#ff0000]Jesus[/]'), 'Amazing |grace[b]|, how |sweet[i]| the |sound[h]| |Jesus[#ff0000]');
    check('a lone star or price stays as typed', show('Tickets 5*2 = £10'), 'Tickets 5*2 = £10');
    check('wrapping selected words', wrapSelection('he is risen', 6, 11, '**').value, 'he is **risen**');
  }

  if (failures) {
    print(`\n${failures} detector check(s) failed`);
    process.exit(1);
  }
  print('\nAll detector checks passed');
})();
