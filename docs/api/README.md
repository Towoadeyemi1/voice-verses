# The Voice Verses local API

For people who make apps that work with Voice Verses: a Stream Deck or Bitfocus Companion button, a phone remote, a church dashboard (such as the CCCG Dashboard), Planning Center, a captioning or streaming tool, or sermon preparation on a laptop.

The API runs inside the Voice Verses desktop app, on the church network. It works without the internet. It is off until someone in the booth turns it on in **Settings → Other apps and devices**.

- Requests are described in [`openapi.json`](../../electron/api-spec/openapi.json) (OpenAPI 3.1).
- Events are described in [`asyncapi.json`](../../electron/api-spec/asyncapi.json) (AsyncAPI 3.0).
- A running Voice Verses also serves both at `/api/v1/openapi.json` and `/api/v1/asyncapi.json`.

## Finding Voice Verses

- **Bonjour (mDNS):** Voice Verses announces `_voiceverses._tcp`. The TXT record has `api=1`, `path=/api/v1` and `version`.
- **By address:** Settings → Other apps and devices shows it, for example `http://192.168.1.20:47100/api/v1`. The port is the same as the network screens' port (47100 unless the church changed it).

`GET /api/v1` needs no key and returns `{ "name": "Voice Verses", "version": "…", "api": "1", "pairing": true|false }`. `pairing` is true while a pairing code is showing.

## Pairing

1. In Voice Verses, the operator opens Settings → Other apps and devices. They choose whether the device may control the screens, then choose **Show a pairing code**.
2. Your app asks for the six digits and sends them:

   ```http
   POST /api/v1/pair
   Content-Type: application/json

   { "code": "253930", "name": "Stream Deck in the booth" }
   ```

3. The answer has your key. Keep it: it is shown only once, and Voice Verses keeps only a fingerprint (hash) of it.

   ```json
   { "key": "vv1_…", "device": { "id": "dev_…", "name": "Stream Deck in the booth", "scopes": ["read", "control"] } }
   ```

The rules for codes:
- A code works once, for five minutes.
- Five wrong codes use it up.
- After five wrong codes in a minute from one address, that address must wait a minute.

Send the key with every request:

```http
Authorization: Bearer vv1_…
```

The event stream also accepts `?key=`, because a browser's `EventSource` and `WebSocket` can't set headers.

What a key may do (its scopes):

| Scope | Allows |
| --- | --- |
| `read` | What is on (`/live`), the modules, the services, events and webhooks. Every key has it. |
| `control` | `/live/show`, `/next`, `/take`, `/advance`, `/back`, `/clear`, `/logo`. Chosen by the operator when pairing. |
| `write` | Sending in services: `POST /packages`. Chosen by the operator when pairing (**Send in services**). |

The operator can remove a device at any time. Its key stops working at once, and its event streams and webhooks stop.

## Controlling the screens

```http
POST /api/v1/live/show     { "reference": "John 3:16" }    → on the screens now
POST /api/v1/live/next     { "reference": "Romans 8:28" }  → waits in Next
POST /api/v1/live/take                                     → what waits in Next goes live
POST /api/v1/live/advance                                  → the next slide or verse
POST /api/v1/live/back                                     → the slide or verse before
POST /api/v1/live/clear                                    → the words come off the screens
POST /api/v1/live/logo                                     → the logo
```

Each returns `{ "ok": true, "live": { "kind": "verse", "reference": "John 3:16" } }`, or an error with a message you can show as it is:

```json
{ "error": { "code": "not_done", "message": "Nothing is waiting in Next." } }
```

| Status | Meaning |
| --- | --- |
| 401 | Not paired: no key, or the key was removed. |
| 403 | The key isn't allowed to do this. |
| 404 | The reference doesn't exist. |
| 409 | Not possible now: the live screen isn't open, nothing is in Next, or the operator is practising (Training). |
| 504 | Voice Verses didn't answer. |

## Following what happens

```
GET /api/v1/events?types=live.*,verse.found
```

This works as Server-Sent Events. A WebSocket upgrade on the same address sends the same events as text messages. Each event is a [CloudEvents 1.0](https://cloudevents.io) envelope:

```json
{
  "specversion": "1.0",
  "id": "4c1f0e7a-…",
  "source": "voiceverses://app/live",
  "type": "org.voiceverses.live.changed.v1",
  "name": "live.changed",
  "time": "2026-11-22T10:41:07Z",
  "datacontenttype": "application/json",
  "data": { "kind": "verse", "reference": "John 3:16", "translation": "KJV", "text": "For God so loved the world, …" }
}
```

The events are `live.changed`, `next.changed`, `countdown.changed`, `alert.changed`, `listening.started`, `listening.stopped`, `speech.heard`, `verse.found`, `suggestion.offered`, `service.updated`, `service.deleted`, `package.received`, `media.updated`, `media.deleted`, `bible.changed` and `module.registered`. The fields of each are in `asyncapi.json`.

How events behave:
- A change that would break a reader gets a new type (`….v2`) beside the old one.
- Nothing the operator does while practising is ever sent.
- Events never carry sound, pictures or keys. `speech.heard` carries finished sentences only.

`GET /api/v1/live` returns the last `live.changed` and `next.changed` data, for an app that has just started.

## Webhooks

To have events POSTed to your server as they happen:

```http
POST /api/v1/webhooks
{ "url": "https://dashboard.example.org/voice-verses", "types": ["live.*", "service.*"] }
```

The answer includes a `secret`, shown once. How deliveries work:
- Each delivery is `application/cloudevents+json`.
- `X-VoiceVerses-Signature` is `sha256=` followed by the hex HMAC-SHA256 of the body, made with the secret. Check it before trusting a delivery.
- `X-VoiceVerses-Delivery` is the event id.
- Each event is tried three times (now, after 2 s, after 10 s), in order.
- After 20 failed events in a row the webhook stops, and Settings shows that it stopped.
- A device can have at most 10 webhooks.
- `GET /api/v1/webhooks` lists them and `DELETE /api/v1/webhooks/{id}` stops one.

Verifying in Node:

```js
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers['x-voiceverses-signature'] ?? ''));
```

## Services

```
GET /api/v1/services?date=2026-11-22
```

This returns each service of that day with its order: parts and their items, with the number of slides in each. Templates are left out.

### Sending a service in

```http
POST /api/v1/packages
Authorization: Bearer vv1_…   (paired with Send in services)

{ "package": "1.0", "id": "your-id", "service": { "name": "Sunday Celebration", "date": "2026-11-22" }, "order": [ … ], … }
```

A *service package* holds everything one service needs: the order, songs with their words and credits, the scriptures expected, announcements, pictures and notes. It becomes a service on its day. Sending the same `id` again updates that service. The format, what Voice Verses does with each part, and what comes back are in [service-package.md](service-package.md), with an [example](examples/sunday-package.json).

`GET /api/v1/services/{id}/package` gives any service back as a package.

## How it is built

The API is one module of the app, on the same event bus as every other part (`docs/architecture/README.md`, D33 and D34):
- The server is `electron/api.js`, on the network screens' server (`electron/network.js`).
- The Bonjour announcement is `electron/mdns.js`.
- The operator's window passes events and answers commands (`src/modules/localApi.ts`, `src/core/commands.ts`).
- Checks: `tools/checks/api-check.mjs` (CI) and `tools/e2e/local-api.cjs`.
