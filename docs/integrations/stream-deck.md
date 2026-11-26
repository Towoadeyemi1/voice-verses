# Stream Deck buttons (Bitfocus Companion)

Voice Verses has a module for [Bitfocus Companion](https://bitfocus.io/companion), the free app that runs a Stream Deck (and many other button panels). With it, a Stream Deck in the booth can Take, Clear, show the logo, go forward and back, and show a verse, and its buttons light up like the live screen: **red while something is on the screens**, **green while something waits in Next**.

It uses the app's connection for other apps and devices (Settings → Other apps and devices, [the API](../api/README.md)). It works on the church network without the internet, and only a Stream Deck someone in the booth paired can use it.

## What you need

- The Voice Verses desktop app (the web version has no connection for other devices).
- Companion 3.1 or later, on the Voice Verses computer or on any computer on the same network.
- The module file **voice-verses-companion.tgz**, attached to each Voice Verses release on GitHub.

## Set it up (once)

1. **In Companion,** open **Modules**, choose **Import module package** and pick `voice-verses-companion.tgz`.
2. **In Voice Verses,** open Settings → **Other apps and devices**, switch it on, switch on **Control the screens**, and choose **Show a pairing code**. The six digits work once, for five minutes.
3. **In Companion,** open **Connections**, add **Voice Verses**, and fill in:
   - **The Voice Verses computer:** `127.0.0.1` when Companion runs on the same computer, or the address shown in Settings → Other apps and devices.
   - **Port:** 47100 unless it was changed in Settings → Screens.
   - **Pairing code:** the six digits.
   - **Name shown in Voice Verses:** for example "Stream Deck in the booth".
4. Save. The connection turns green, the code is cleared and Companion keeps the key it was given. Voice Verses lists the Stream Deck under **What is paired**.

To stop the Stream Deck using Voice Verses, choose **Remove** next to it in Voice Verses. Companion then says "This button panel is no longer paired"; to pair it again, show a new code and type it in the connection.

## The buttons

In Companion, open **Buttons → Presets → Voice Verses** and drag them onto the Stream Deck:

| Button | What it does | Lights |
| --- | --- | --- |
| **TAKE** (with what waits in Next) | Puts what waits in Next on the screens, exactly like Take on the live screen | Green while something waits in Next |
| **CLEAR** | Takes the words off the screens | Red while something is on the screens |
| **LOGO** | Shows the logo | |
| **BACK** / **FORWARD** | The slide or verse before or after | |
| **John 3:16** | An example of a verse button: change the verse in its options | |
| **LIVE** (with what is on the screens) | Shows what is on now; press it to clear | Red while something is on the screens |

Any button can also use these **actions**: Take, Clear, Logo, Forward, Back, **Show a verse now**, **Put a verse in Next** (type the verse, for example `Romans 8:28`), and these **feedbacks**: *Something is on the screens* (red) and *Something waits in Next* (green). The variables `$(voice-verses:live)` and `$(voice-verses:next)` hold what is on the screens and what waits in Next, for button text.

## Good to know

- A button does exactly what the same button on the live screen does. While someone practises in Training, buttons can't change the screens.
- If the connection drops (the computer restarts, the network blinks), the module connects again by itself, starting after a second and waiting up to 30 seconds between tries.
- A Stream Deck paired with **Control the screens** off can only show what is on; its buttons don't change anything, and Companion's log says so.

## For the people who build it

The module is in `tools/companion-module/` (plain JavaScript, `@companion-module/base` 1.15). `npm ci && npm run package` there makes the `.tgz`; the release workflow does the same and attaches it. Companion requires a module's source to be under the MIT licence, so this folder alone has its own `LICENSE`. `tools/e2e/companion.cjs` loads the module as Companion does against the real desktop app and checks pairing, every action, the lights, the variables and removal.
