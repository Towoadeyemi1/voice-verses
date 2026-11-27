---
name: foundation
description: >
  The owner's one foundation for ALL software work, for online services and
  desktop apps alike: working with the owner (requests in their words, real
  users only on their word, never touch real people's data or settings
  unasked, plain language, say what was and wasn't verified), product,
  design (with an exact design kit: tokens, CSS, bundled fonts, a reference
  page), writing, accessibility, architecture, security, AI and voice, data,
  testing, documentation, shipping and lessons learned. Use whenever
  designing, building, reviewing, testing, documenting or releasing any app,
  website, backend, database, AI feature or screen, or starting a new project.
---

# Foundation

Read `references/FOUNDATION.md` before designing or changing any software for
this user, starting with section 0 (which shape the app is, and how the rules
are used). Its rules are the default for every project. A project's own
CLAUDE.md may override a rule only by naming it and giving the reason.

For any screen, use the design kit in `design/`: `foundation.css` (every
token and part, both themes, bundled fonts in `design/fonts/`) and
`reference.html` (how each part should look). Copy the folder into a new
project as `docs/foundation/design/`.

## The fourteen that matter most
1. **Real users get a change only on the owner's word.** Online service:
   staging first, production when the owner says go. Desktop app: review and
   merge; the owner publishes releases. Never change anything affecting real
   people (records, settings, messages, calls) without asking.
2. **Plain language and a recommendation, not a survey.** Record each request
   in the owner's words with its status. Report what was verified, what
   wasn't, and what was cleaned up.
3. **No server of our own.** Online service: managed Postgres with RLS, Edge
   Functions, static hosting, deploy scripts with `--env`. Desktop app: one
   download, works offline, no backend. Moving off a server:
   `references/MIGRATE-OFF-SERVER.md`.
4. **Security is enforced where the data is.** RLS on every table with the
   full policy set; login-required functions call one gate first; the
   business and the person come from the verified token, never the body.
   Desktop: keys in the system keychain, every IPC call checks its sender.
5. **RLS is one boundary.** SECURITY DEFINER functions, public endpoints and
   OAuth callbacks each need their own gate, and they fail closed.
6. **The AI model is never the gate,** and AI suggests rather than acts alone
   on what matters. Post-filter what the model writes for promises the prompt
   makes.
7. **One source of truth** for prices, limits, lists and public-function
   flags; a test fails on a second copy.
8. **Test the path, not the code.** Run it against the real system, nothing
   stubbed. Fail on refused requests and console errors. Assert the page shows
   its data.
9. **Every guard is proven to bite;** every test is seen to fail. "Flaky" is
   not a cause.
10. **Anything that decides who sees or does what is red-teamed before it's
    trusted**, and the attempts are recorded.
11. **Cost is architecture:** per-customer budgets, platform ceilings,
    fail-closed counters, arithmetic in the commit.
12. **Design with the kit:** like Apple; light is Provilion's bright look,
    dark is warm graphite; cards always have a visible edge; Provilion itself
    keeps its own design unchanged; one bold thing per screen;
    one line of text with the rest behind "How it works"; colour means
    something and has words; fonts bundled. Measured at 390px and desktop,
    light and dark. A mock-up and the owner's yes only for a new app or a
    major redesign.
13. **Never confidently wrong:** act alone only when certain, otherwise
    suggest with how sure and why; what the app imports is reviewed by a
    person first.
14. **A feature ships complete:** tests, guards, ledgers, translations, docs
    and the in-app assistant's knowledge, in one change. Then commit and push.

Run the checklists in section 16 of the reference before calling anything done.
