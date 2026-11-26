// Talks to the Voice Verses local API (docs/api/README.md): pairing, commands, and the event
// stream. No Companion code here, so Voice Verses' own tests can drive it (tools/e2e/companion.cjs).
'use strict';

class VoiceVersesError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

class VoiceVersesClient {
  /**
   * @param {{ host: string, port: number, key?: string, onEvent?: (e: object) => void, onState?: (s: 'ok' | 'connecting' | 'lost', why?: string) => void }} o
   */
  constructor(o) {
    this.host = o.host || '127.0.0.1';
    this.port = Number(o.port) || 47100;
    this.key = o.key || '';
    this.onEvent = o.onEvent || (() => {});
    this.onState = o.onState || (() => {});
    this.stopped = false;
    this.abort = null;
    this.retry = null;
  }

  get base() {
    return `http://${this.host}:${this.port}/api/v1`;
  }

  async request(path, { method = 'GET', body } = {}) {
    let res;
    try {
      res = await fetch(this.base + path, {
        method,
        headers: { ...(this.key ? { authorization: `Bearer ${this.key}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new VoiceVersesError(`Voice Verses didn’t answer at ${this.host}:${this.port}. Is it open, with Other apps and devices switched on?`, 0);
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new VoiceVersesError(json?.error?.message || `Voice Verses said ${res.status}`, res.status);
    return json;
  }

  /** Is Voice Verses there? (needs no key) */
  about() {
    return this.request('');
  }

  /** Pairs with the six-digit code shown in Settings → Other apps and devices; keeps and returns the key */
  async pair(code, name = 'Stream Deck') {
    const paired = await this.request('/pair', { method: 'POST', body: { code: String(code).replace(/\D/g, ''), name } });
    this.key = paired.key;
    return paired;
  }

  /** What is on the screens and in Next */
  state() {
    return this.request('/live');
  }

  /** take, clear, logo, advance, back; show and next take { reference } */
  command(name, body) {
    return this.request(`/live/${name}`, { method: 'POST', body });
  }

  /** Follows events (Server-Sent Events), reconnecting by itself */
  follow(types = 'live.*,next.*') {
    this.stopped = false;
    let wait = 1000;
    const connect = async () => {
      if (this.stopped) return;
      this.onState('connecting');
      this.abort = new AbortController();
      try {
        const res = await fetch(`${this.base}/events?types=${encodeURIComponent(types)}&key=${encodeURIComponent(this.key)}`, { signal: this.abort.signal });
        if (res.status === 401) {
          this.onState('lost', 'This button panel is no longer paired. Pair it again with a new code.');
          return;
        }
        if (!res.ok || !res.body) throw new Error(String(res.status));
        this.onState('ok');
        wait = 1000;
        const reader = res.body.getReader();
        const text = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += text.decode(value, { stream: true });
          let cut;
          while ((cut = buffer.indexOf('\n\n')) >= 0) {
            const chunk = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            const data = chunk
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trimStart())
              .join('\n');
            if (data) {
              try {
                this.onEvent(JSON.parse(data));
              } catch {
                // Not an event (a keep-alive): ignore
              }
            }
          }
        }
      } catch {
        // Lost: try again below
      }
      if (this.stopped) return;
      this.onState('lost', 'Lost Voice Verses. Trying again…');
      this.retry = setTimeout(connect, wait);
      wait = Math.min(wait * 2, 30000);
    };
    void connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retry);
    this.abort?.abort();
  }
}

module.exports = { VoiceVersesClient, VoiceVersesError };
