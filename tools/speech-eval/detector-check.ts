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
import { BibleParser } from '@/lib/bibleParser';
import { setApiBibleKey, setChosenApiBibles, versesFromApiBibleJson, versesFromBracketed, versesFromNltHtml } from '@/lib/onlineBibles';
import { parseSongSelectFile } from '@/lib/songSelectImport';
import { parseSongSections } from '@/lib/songs';
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

  // Songs downloaded from SongSelect
  {
    const txt = `Way Maker\n\nVerse 1\nYou are here moving in our midst\nI worship You I worship You\n\nChorus\nWay maker miracle worker promise keeper\nLight in the darkness my God that is who You are\n\nVerse 2\nYou are here touching every heart\nI worship You I worship You\n\nCCLI Song # 7115744\nOsinachi Kalu Okoro Egbu\n© 2016 Integrity Music Europe (Admin. by Integrity Music)\nFor use solely with the SongSelect® Terms of Use. All rights reserved. www.ccli.com\nCCLI License # 1234567`;
    const song = parseSongSelectFile('way-maker.txt', txt);
    check('SongSelect .txt: title, number, writer, copyright', song && `${song.name} | ${song.ccliNumber} | ${song.author} | ${song.copyright}`, 'Way Maker | 7115744 | Osinachi Kalu Okoro Egbu | © 2016 Integrity Music Europe (Admin. by Integrity Music)');
    check('SongSelect .txt: sections', song && parseSongSections(song.lyrics).map((x) => x.label).join(', '), 'Verse 1, Chorus, Verse 2');
    const usr = `[File]\nType=SongSelect Import File\nVersion=3.0\n[S A2936948]\nTitle=10,000 Reasons (Bless The Lord)\nAuthor=Jonas Myrin | Matt Redman\nCopyright=2011 Thankyou Music\nFields=Verse 1/tChorus\nWords=The sun comes up it's a new day dawning/nIt's time to sing Your song again/tBless the Lord O my soul/nO my soul\n`;
    const u = parseSongSelectFile('10000-reasons.usr', usr);
    check('SongSelect .usr: title, number, writers', u && `${u.name} | ${u.ccliNumber} | ${u.author}`, '10,000 Reasons (Bless The Lord) | 2936948 | Jonas Myrin, Matt Redman');
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

  if (failures) {
    print(`\n${failures} detector check(s) failed`);
    process.exit(1);
  }
  print('\nAll detector checks passed');
})();
