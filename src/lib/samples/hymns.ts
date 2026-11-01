/**
 * Public-domain hymns for the sample library (words written before 1929).
 * Never put copyrighted lyrics here: the repository is public.
 */
export interface SampleSong {
  id: string;
  title: string;
  author: string;
  lyrics: string;
  arrangement?: string[];
  copyright?: string;
}

const PD = 'Public Domain';

export const SAMPLE_HYMNS: SampleSong[] = [
  {
    id: 'sample-song-amazing-grace',
    title: 'Amazing Grace',
    author: 'John Newton',
    lyrics: `Verse 1
Amazing grace! how sweet the sound
That saved a wretch like me!
I once was lost, but now am found;
Was blind, but now I see.

Verse 2
'Twas grace that taught my heart to fear,
And grace my fears relieved;
How precious did that grace appear
The hour I first believed!

Verse 3
Through many dangers, toils and snares
I have already come;
'Tis grace hath brought me safe thus far,
And grace will lead me home.`,
  },
  {
    id: 'sample-song-holy-holy-holy',
    title: 'Holy, Holy, Holy',
    author: 'Reginald Heber',
    lyrics: `Verse 1
Holy, holy, holy! Lord God Almighty!
Early in the morning our song shall rise to Thee;
Holy, holy, holy, merciful and mighty!
God in three Persons, blessed Trinity!

Verse 2
Holy, holy, holy! All the saints adore Thee,
Casting down their golden crowns around the glassy sea;
Cherubim and seraphim falling down before Thee,
Which wert, and art, and evermore shalt be.`,
  },
  {
    id: 'sample-song-blessed-assurance',
    title: 'Blessed Assurance',
    author: 'Fanny Crosby',
    lyrics: `Verse 1
Blessed assurance, Jesus is mine!
O what a foretaste of glory divine!
Heir of salvation, purchase of God,
Born of His Spirit, washed in His blood.

Refrain
This is my story, this is my song,
Praising my Saviour all the day long;
This is my story, this is my song,
Praising my Saviour all the day long.

Verse 2
Perfect submission, perfect delight,
Visions of rapture now burst on my sight;
Angels descending bring from above
Echoes of mercy, whispers of love.`,
    arrangement: ['Verse 1', 'Refrain', 'Verse 2', 'Refrain'],
  },
  {
    id: 'sample-song-it-is-well',
    title: 'It Is Well with My Soul',
    author: 'Horatio Spafford',
    lyrics: `Verse 1
When peace, like a river, attendeth my way,
When sorrows like sea billows roll;
Whatever my lot, Thou hast taught me to say,
It is well, it is well with my soul.

Refrain
It is well with my soul,
It is well, it is well with my soul.

Verse 2
Though Satan should buffet, though trials should come,
Let this blest assurance control,
That Christ has regarded my helpless estate,
And hath shed His own blood for my soul.`,
    arrangement: ['Verse 1', 'Refrain', 'Verse 2', 'Refrain'],
  },
  {
    id: 'sample-song-doxology',
    title: 'The Doxology',
    author: 'Thomas Ken',
    lyrics: `Verse 1
Praise God, from whom all blessings flow;
Praise Him, all creatures here below;
Praise Him above, ye heavenly host;
Praise Father, Son, and Holy Ghost.`,
  },
  {
    id: 'sample-song-be-thou-my-vision',
    title: 'Be Thou My Vision',
    author: 'Irish, translated by Mary Byrne; versed by Eleanor Hull',
    lyrics: `Verse 1
Be Thou my Vision, O Lord of my heart;
Naught be all else to me, save that Thou art;
Thou my best Thought, by day or by night,
Waking or sleeping, Thy presence my light.

Verse 2
High King of Heaven, my victory won,
May I reach Heaven's joys, O bright Heaven's Sun!
Heart of my own heart, whatever befall,
Still be my Vision, O Ruler of all.`,
  },
].map((s) => ({ ...s, copyright: PD }));
