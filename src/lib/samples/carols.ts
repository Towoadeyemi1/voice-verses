/** Public-domain carols for the sample Christmas service. */
import type { SampleSong } from './hymns';

export const SAMPLE_CAROLS: SampleSong[] = [
  {
    id: 'sample-song-joy-to-the-world',
    title: 'Joy to the World',
    author: 'Isaac Watts',
    copyright: 'Public Domain',
    lyrics: `Verse 1
Joy to the world! the Lord is come;
Let earth receive her King;
Let every heart prepare Him room,
And heaven and nature sing.

Verse 2
He rules the world with truth and grace,
And makes the nations prove
The glories of His righteousness,
And wonders of His love.`,
  },
  {
    id: 'sample-song-silent-night',
    title: 'Silent Night',
    author: 'Joseph Mohr, translated by John Freeman Young',
    copyright: 'Public Domain',
    lyrics: `Verse 1
Silent night, holy night,
All is calm, all is bright
Round yon virgin mother and child.
Holy infant so tender and mild,
Sleep in heavenly peace,
Sleep in heavenly peace.

Verse 2
Silent night, holy night,
Son of God, love's pure light;
Radiant beams from Thy holy face
With the dawn of redeeming grace,
Jesus, Lord, at Thy birth,
Jesus, Lord, at Thy birth.`,
  },
  {
    id: 'sample-song-o-come-all-ye-faithful',
    title: 'O Come, All Ye Faithful',
    author: 'John Francis Wade, translated by Frederick Oakeley',
    copyright: 'Public Domain',
    lyrics: `Verse 1
O come, all ye faithful, joyful and triumphant,
O come ye, O come ye to Bethlehem;
Come and behold Him, born the King of angels.

Refrain
O come, let us adore Him,
O come, let us adore Him,
O come, let us adore Him,
Christ the Lord.

Verse 2
Sing, choirs of angels, sing in exultation,
Sing, all ye citizens of heaven above!
Glory to God, glory in the highest.`,
    arrangement: ['Verse 1', 'Refrain', 'Verse 2', 'Refrain'],
  },
];
