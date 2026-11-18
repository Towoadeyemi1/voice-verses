# The service package

One JSON document with everything a service needs:
- the order of service,
- songs with their words and credits,
- the scriptures expected,
- announcements, pictures and notes.

Any app can make one: the CCCG Dashboard, Planning Center, a church's own app, or sermon preparation. Voice Verses turns it into a service on its day.

There are two ways in:
- **Over the church network:** `POST /api/v1/packages`, with a key paired with **Send in services** (see [README.md](README.md)).
- **As a file:** in Voice Verses, open **Services → Import** and pick the `.json` file.

A full example, using public-domain hymns and the KJV, is in [`examples/sunday-package.json`](examples/sunday-package.json). The formal description is the `ServicePackage` schema in [`openapi.json`](../../electron/api-spec/openapi.json).

## The parts

```json
{
  "package": "1.0",
  "id": "cccg-2026-11-22-0900",
  "service": { "name": "Sunday Celebration", "date": "2026-11-22", "time": "09:00", "type": "Sunday service" },
  "source": { "app": "CCCG Dashboard", "updatedAt": "2026-11-20T18:02:00Z" },
  "order": [
    { "part": "Worship", "minutes": 20, "songs": ["amazing-grace", "Holy, Holy, Holy"] },
    { "part": "The Word", "minutes": 40, "scriptures": ["John 3:16"], "slides": [{ "title": "Point 1", "text": "Grace finds us where we are" }] }
  ],
  "expectedScriptures": [{ "reference": "Romans 5:8", "part": "The Word" }, { "reference": "Ephesians 2:8-9" }],
  "songs": [{ "id": "amazing-grace", "title": "Amazing Grace", "writers": "John Newton", "copyright": "Public Domain", "ccli": "", "lyrics": "Verse 1\n…" }],
  "announcements": [{ "id": "youth-night", "title": "Youth night", "text": "Friday at 7pm in the main hall." }],
  "media": [{ "id": "flyer", "kind": "image", "url": "https://example.org/flyer.jpg" }],
  "notes": "Theme: grace."
}
```

| Field | Meaning |
| --- | --- |
| `package` | `"1.0"`. A later `1.x` adds optional fields only; Voice Verses refuses `2.x` rather than guess. |
| `id` | Your own id for this service. Send the same `id` again and Voice Verses **updates** the service it made before, instead of adding another. Without an `id`, each package makes a new service. |
| `service` | The service's `name` and `date` (`YYYY-MM-DD`, the church's local day). Optional: `time` (`HH:MM`) and `type` (e.g. "Sunday service", "Friday Night Prayers"). spirit learns each type separately. A church can have several services on one day. |
| `source.app` | Your app's name. The Services page shows it ("From CCCG Dashboard"). |
| `order` | The parts, in order. Each has a `part` name and, optionally, `minutes`. The minutes are shared by the part's items, which feeds the timeline and Move on by time. Each part can also have: `songs` (ids or titles), `scriptures` (references read in it), `announcements` (ids or titles), `slides` (words, such as sermon points), `media` (picture ids) and `notes` (shown on the stage monitor). |
| `expectedScriptures` | References the preacher is likely to use. Each goes to the `part` it names, or else to the part whose name sounds like the sermon ("The Word", "Sermon", "Message", "Teaching"), or else to a part called "Scriptures expected". |
| `songs` | `title`, and optionally `writers`, `copyright`, `ccli` and `lyrics`. In `lyrics`, sections are separated by blank lines, each starting with its name ("Verse 1", "Chorus"). Optionally `arrangement` gives the order of sections to sing. A song with words also goes into the church's song library, unless one with the same CCLI number or title is there already. A song named only by title is looked up in the library. |
| `announcements` | `title`, and optionally `text` and `image` (a picture's `id` in `media`). Announcements not placed in a part get a part of their own at the end. |
| `media` | Pictures as `http(s)` addresses or `data:image/…` (up to the 4 MB limit for the whole package). Videos, presentations and documents are listed but not used yet: add them to the service from a file. |
| `notes` | Notes for the whole service. |

References are written as people write them: `John 3:16`, `Romans 8:28-30` (one slide per verse, at most 30), `1 Corinthians 13:4`, `Psalm 23` (a chapter alone becomes its first verse). They show in the church's chosen translation.

## What Voice Verses does with the scriptures

Expected scriptures become **scripture slides in their part**. Two things follow:
- **Detection finds them more easily.** Verses in today's plan are surer suggestions: +12% for the verse and +6% for others in its chapter. They are never sure enough to go on screen by themselves. A verse goes up by itself only when the preacher says the reference outright, or the match is 99% sure (the app's first rule).
- **Loading the part puts the first verse in Next**, ready for Take. Predictive Next also uses them when the preacher hints at what is coming.

## What comes back

```json
{ "serviceId": "1795017456266l20b", "created": true, "songsAdded": 2, "warnings": [] }
```

- `201` means a new service. `200` means the service the same `id` made before was updated.
- `warnings` lists what couldn't be used, in plain words, for example `No words for “Unknown Song”: add the song to the library, or send its words.` or `Couldn’t find “Hezekiah 4:4” in the Bible.` The rest of the package is still used.
- `400` means the package isn't readable. The message says what is wrong, for example `service.date: service.date must be YYYY-MM-DD`.

The operator sees a message when a package arrives, for example "Sunday Celebration arrived from CCCG Dashboard".

## A service as a package

`GET /api/v1/services/{id}/package` returns a service in the same format, with its order, songs (words and arrangement), scriptures, announcements and notes. Ids come from `GET /api/v1/services?date=…`. Send it back in to copy a service between computers or apps.

## Copyright

Songs a church sends to its own Voice Verses are covered by the church's own licence (for example CCLI). Voice Verses keeps each song's writers, copyright and CCLI number and shows them on the song's first slide. Examples and tests use public-domain hymns and the KJV only.
