# The church app feed: what Voice Verses reads from your church management app

For the developers of the church's own management app. Voice Verses (the presentation app in the booth) checks your app for what each upcoming service needs: the choir's songs, the announcement team's announcements, and the creative team's pictures and media. spirit, Voice Verses' learning autopilot, places them in each service's order. The media team approves or adjusts the draft before the service.

You build **one read-only HTTPS endpoint**. Voice Verses does everything else.

Status: version 1 of this feed. Voice Verses reads it from 1.21.0. Until then, use the example below to build and test.

## 1. The request

```
GET https://<your-app>/voice-verses/v1/services?from=2026-11-08&to=2026-11-22
Authorization: Bearer <key>
If-None-Match: "<etag from the last answer>"      (optional)
```

- **`from` / `to`:** the services to return, by date (inclusive, in the church's local time). Voice Verses asks for today and the next 14 days.
- **Key:** your app makes a key for "Voice Verses". A volunteer pastes it into Voice Verses (Settings → Church app).
  - On the desktop app, the key is kept locked with the computer's own key store.
  - It is sent only to your app's host, and only over HTTPS. Read-only access is enough.
- **When Voice Verses asks:**
  - every 30 minutes while it is open
  - when someone presses **Check now**
  - when a service is opened
  
  The interval can be changed in Settings. If you send an `ETag`, answer `304 Not Modified` when nothing changed.
- **Answers:**
  - `200` with the JSON below.
  - `304` when nothing has changed.
  - `401` or `403` when the key is wrong. Voice Verses then says so in plain words.
  - Anything else is retried later; Voice Verses keeps its last copy and works offline from it.

## 2. The answer

```json
{
  "version": 1,
  "church": "Example Church",
  "generatedAt": "2026-11-05T21:00:00Z",
  "services": [
    {
      "id": "svc-2026-11-09-first",
      "date": "2026-11-09",
      "start": "10:00",
      "name": "Sunday Celebration",
      "type": "Sunday service",
      "updatedAt": "2026-11-05T20:41:00Z",
      "status": "planned",
      "notes": "Communion this week. Guest speaker: Pastor A. Example.",
      "items": [
        { "id": "part-worship", "kind": "part", "name": "Worship", "minutes": 25 },
        {
          "id": "song-381", "kind": "song", "team": "Choir", "part": "Worship", "order": 1,
          "title": "Amazing Grace",
          "author": "John Newton",
          "copyright": "Public domain",
          "ccli": "22025",
          "lyrics": "Verse 1\nAmazing grace! How sweet the sound\nThat saved a wretch like me!\n\nVerse 2\n'Twas grace that taught my heart to fear,\nAnd grace my fears relieved;",
          "arrangement": ["Verse 1", "Verse 2", "Verse 1"],
          "updatedAt": "2026-11-04T18:00:00Z"
        },
        {
          "id": "ann-77", "kind": "announcement", "team": "Announcements", "part": "Notices", "order": 2,
          "title": "Youth retreat",
          "body": "14–16 November. Sign up at the welcome desk.",
          "image": { "url": "https://<your-app>/files/ann-77.jpg", "sha256": "9f2c…", "mimeType": "image/jpeg" },
          "showFrom": "2026-11-02", "showUntil": "2026-11-16"
        },
        {
          "id": "media-12", "kind": "media", "team": "Creative", "part": "Offering",
          "title": "Offering background",
          "url": "https://<your-app>/files/offering-loop.mp4",
          "mimeType": "video/mp4", "sizeBytes": 48211022, "sha256": "4be1…",
          "use": "background"
        },
        { "id": "read-1", "kind": "scripture", "part": "The word", "reference": "Philippians 4:13" }
      ],
      "removed": ["ann-61"]
    }
  ]
}
```

### A service

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable for this service, never reused. Voice Verses links its own service to it. |
| `date`, `start` | yes | Local date `YYYY-MM-DD` and start time `HH:MM`. |
| `name` | yes | As people say it ("Sunday Celebration", "Friday Night Prayers"). |
| `type` | yes | The kind of service. spirit learns each type's order and habits separately. Use the church's own names, consistently, e.g.: Sunday service, Communion Sunday, Thanksgiving Sunday, Midweek, Bible study, Friday Night Prayers, Prayer and Fasting, Youth Day, Christmas, New Year, Easter, Conference, Wedding, Funeral, Dedication. |
| `updatedAt` | yes | When anything in this service last changed (ISO 8601). |
| `status` | no | `planned` (default) or `cancelled`. A cancelled service is set aside in Voice Verses; nothing is deleted. |
| `notes` | no | Plain text for the media team. |
| `items` | yes | Everything the teams have added (below), in any order. |
| `removed` | no | Ids of items taken out since earlier answers. |

### An item

Every item has `id` (stable), `kind`, and optionally:
- `part`: the part of the service it belongs to, by name.
- `order`: its place within that part.
- `team`: who added it.
- `updatedAt`.

Without `part` or `order`, spirit places the item itself from what it has learned for this type of service, and the media team checks it.

| `kind` | Fields |
| --- | --- |
| `part` | `name`, `minutes` (optional). The order of service, when your app plans it. Parts come in the order given. |
| `song` | `title`, `lyrics` (sections separated by a blank line; a first line such as `Chorus` or `Verse 2` names the section), and optionally `arrangement`, `author`, `copyright`, `ccli`. |
| `announcement` | `title`, `body`, and optionally `image`, `showFrom` and `showUntil` (dates it may be shown). |
| `media` | `url`, `mimeType`, `title`, and optionally `sizeBytes`, `sha256` and `use`: `slide` (default), `background` or `countdown`. Pictures `image/jpeg`, `image/png` or `image/webp`; videos `video/mp4` or `video/webm`. |
| `scripture` | `reference`, as said aloud: `John 3:16`, `Psalm 23`, `Romans 8:28-39`. Voice Verses shows it in the church's chosen translation. |

## 3. Files

- Voice Verses downloads each `url` (`image.url` too) once, with the same key, and keeps it on the computer so the service works without internet.
- Give a new `url` or `sha256` when a file changes; Voice Verses does not fetch an unchanged file again.
- Files of up to 2 GB are fine. Send video in a format the computer can play: H.264 MP4 is the safest.

## 4. What Voice Verses does with it

1. It makes or updates its own service for each `id`, with the given `type`.
2. **spirit drafts the order:**
   - It uses your `part` items when there are any, and otherwise the order it has learned for that type.
   - It places each song, announcement and file, and marks anything it placed itself.
3. The service shows as **Waiting for your OK**. The media team looks through it, then approves it or moves things.
4. spirit notes each change and asks why in one tap, for example "Announcements go after the offering on Communion Sundays". Next time the same reason applies, it places things that way.
5. Later changes from your app are merged in and marked as new. Nothing the media team changed by hand is overwritten.

## 5. Lyrics and copyright

Song lyrics are the church's own licensed copies (for example under its CCLI licence). Voice Verses keeps them only in the church's library and credits each song (title, writers, copyright, CCLI number). Please send `author`, `copyright` and `ccli` whenever you have them.

## 6. Testing it

When this feed is built into Voice Verses (1.21.0), Settings → Church app will have:
- **Try it:** reads your endpoint once and lists what it found, item by item, with any problem in plain words, such as "Song 'Amazing Grace' has no lyrics".
- **A built-in example:** the example above, for trying Voice Verses before your endpoint is ready.
