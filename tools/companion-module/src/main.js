// Voice Verses for Bitfocus Companion: Stream Deck (and any Companion surface) buttons for the
// live screen. Pair once with the six-digit code from Voice Verses → Settings → Other apps and
// devices; then Take, Clear, Logo, Back, Forward, show a verse or put one in Next. Take lights
// green when something waits in Next; Clear lights red while something is on the screens.
'use strict';

const { InstanceBase, InstanceStatus, runEntrypoint, combineRgb } = require('@companion-module/base');
const { VoiceVersesClient } = require('./client');

const RED = combineRgb(255, 69, 58);
const GREEN = combineRgb(48, 209, 88);
const GRAPHITE = combineRgb(41, 39, 46);
const WHITE = combineRgb(255, 255, 255);
const BLACK = combineRgb(0, 0, 0);

class VoiceVersesInstance extends InstanceBase {
  async init(config) {
    this.config = config;
    this.live = null;
    this.next = null;
    this.setActionDefinitions(this.actions());
    this.setFeedbackDefinitions(this.feedbacks());
    this.setVariableDefinitions([
      { variableId: 'live', name: 'What is on the screens' },
      { variableId: 'next', name: 'What waits in Next' },
    ]);
    this.setPresetDefinitions(this.presets());
    await this.connect();
  }

  async configUpdated(config) {
    this.config = config;
    this.client?.stop();
    await this.connect();
  }

  async destroy() {
    this.client?.stop();
  }

  getConfigFields() {
    return [
      { type: 'static-text', id: 'about', width: 12, label: 'Pairing', value: 'In Voice Verses, open Settings → Other apps and devices, switch it on, switch on Control the screens, and choose Show a pairing code. Type the six digits below and save.' },
      { type: 'textinput', id: 'host', label: 'The Voice Verses computer', width: 8, default: '127.0.0.1', tooltip: 'Its address on the church network, from Settings → Other apps and devices. 127.0.0.1 when Companion runs on the same computer.' },
      { type: 'number', id: 'port', label: 'Port', width: 4, default: 47100, min: 1, max: 65535 },
      { type: 'textinput', id: 'code', label: 'Pairing code (six digits, used once)', width: 6, default: '' },
      { type: 'textinput', id: 'name', label: 'Name shown in Voice Verses', width: 6, default: 'Stream Deck' },
      { type: 'textinput', id: 'key', label: 'Key (filled in when paired; leave it)', width: 12, default: '' },
    ];
  }

  async connect() {
    const { host, port, code, name, key } = this.config;
    this.client = new VoiceVersesClient({
      host,
      port,
      key,
      onEvent: (e) => this.event(e),
      onState: (s, why) => {
        if (s === 'ok') this.updateStatus(InstanceStatus.Ok);
        else if (s === 'connecting') this.updateStatus(InstanceStatus.Connecting);
        else this.updateStatus(why?.includes('no longer paired') ? InstanceStatus.BadConfig : InstanceStatus.ConnectionFailure, why);
      },
    });
    try {
      if (!key && code) {
        this.updateStatus(InstanceStatus.Connecting, 'Pairing…');
        const paired = await this.client.pair(code, name || 'Stream Deck');
        this.config = { ...this.config, key: paired.key, code: '' };
        this.saveConfig(this.config);
        if (!paired.device.scopes.includes('control')) this.log('warn', 'Paired to see only: buttons can’t control the screens. Pair again with Control the screens switched on.');
      }
      if (!this.client.key) {
        this.updateStatus(InstanceStatus.BadConfig, 'Not paired yet: type the pairing code from Voice Verses.');
        return;
      }
      const now = await this.client.state();
      this.live = now.live;
      this.next = now.next;
      this.changed();
      this.client.follow('live.*,next.*');
    } catch (e) {
      this.updateStatus(e.status === 401 || e.status === 403 ? InstanceStatus.BadConfig : InstanceStatus.ConnectionFailure, e.message);
      this.log('error', e.message);
    }
  }

  event(e) {
    const name = String(e.type || '').replace(/^org\.voiceverses\./, '').replace(/\.v\d+$/, '');
    if (name === 'live.changed') this.live = e.data;
    if (name === 'next.changed') this.next = e.data;
    this.changed();
  }

  changed() {
    const describe = (x) => (!x || x.kind === 'clear' || x.kind === 'none' ? '' : x.kind === 'logo' ? 'Logo' : x.reference || x.title || x.kind);
    this.setVariableValues({ live: describe(this.live), next: describe(this.next) });
    this.checkFeedbacks('on_screens', 'next_ready');
  }

  async run(name, body) {
    try {
      await this.client.command(name, body);
    } catch (e) {
      this.log('warn', e.message);
    }
  }

  actions() {
    const ref = { type: 'textinput', id: 'reference', label: 'Verse (e.g. John 3:16)', default: 'John 3:16', useVariables: true };
    const withRef = (cmd) => async (a, ctx) => this.run(cmd, { reference: await ctx.parseVariablesInString(String(a.options.reference || '')) });
    return {
      take: { name: 'Take: what waits in Next goes on the screens', options: [], callback: () => this.run('take') },
      clear: { name: 'Clear: the words come off the screens', options: [], callback: () => this.run('clear') },
      logo: { name: 'Logo on the screens', options: [], callback: () => this.run('logo') },
      advance: { name: 'Forward: the next slide or verse', options: [], callback: () => this.run('advance') },
      back: { name: 'Back: the slide or verse before', options: [], callback: () => this.run('back') },
      show: { name: 'Show a verse now', options: [ref], callback: withRef('show') },
      next: { name: 'Put a verse in Next', options: [ref], callback: withRef('next') },
    };
  }

  feedbacks() {
    return {
      on_screens: {
        type: 'boolean',
        name: 'Something is on the screens (red, like Live)',
        defaultStyle: { bgcolor: RED, color: WHITE },
        options: [],
        callback: () => !!this.live && this.live.kind !== 'clear',
      },
      next_ready: {
        type: 'boolean',
        name: 'Something waits in Next (green, like Next)',
        defaultStyle: { bgcolor: GREEN, color: BLACK },
        options: [],
        callback: () => !!this.next && this.next.kind !== 'none',
      },
    };
  }

  presets() {
    const button = (id, text, actionId, feedbackId, options = {}) => ({
      type: 'button',
      category: 'Live',
      name: text.replace(/\n/g, ' ').replace(/\$\([^)]*\)/g, '').trim(),
      style: { text, size: '18', color: WHITE, bgcolor: GRAPHITE },
      steps: [{ down: [{ actionId, options }], up: [] }],
      feedbacks: feedbackId ? [{ feedbackId, options: {}, style: feedbackId === 'next_ready' ? { bgcolor: GREEN, color: BLACK } : { bgcolor: RED, color: WHITE } }] : [],
    });
    return {
      take: button('take', `TAKE\n$(${this.label}:next)`, 'take', 'next_ready'),
      clear: button('clear', 'CLEAR', 'clear', 'on_screens'),
      logo: button('logo', 'LOGO', 'logo'),
      back: button('back', '◀\nBACK', 'back'),
      advance: button('advance', 'NEXT\n▶', 'advance'),
      john316: { ...button('john316', 'John\n3:16', 'show'), category: 'Verses', steps: [{ down: [{ actionId: 'show', options: { reference: 'John 3:16' } }], up: [] }] },
      onAir: { ...button('onAir', `LIVE\n$(${this.label}:live)`, 'clear', 'on_screens'), name: 'On the screens (press to clear)' },
    };
  }
}

runEntrypoint(VoiceVersesInstance, []);
