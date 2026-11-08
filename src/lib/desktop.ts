/**
 * Bridge exposed by the Electron preload script (electron/preload.cjs).
 * Undefined when running in a normal browser.
 */
export type SecretName = 'openai' | 'anthropic';

export interface SerializedRequest {
  url: string;
  method: string;
  headers: [string, string][];
  body?: string;
}

export interface SerializedResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
}

export type SpeechWorkerEvent =
  | { type: 'partial'; session: number; text: string }
  | { type: 'final'; session: number; text: string; start: number; end: number }
  | { type: 'progress'; session: number; seconds: number }
  | { type: 'done'; session: number }
  | { type: 'error'; session?: number; message: string };

export interface ProPresenterConnection {
  host: string;
  port: number;
}

export interface ProPresenterStatus {
  name: string;
  version: string;
  hasMessage: boolean;
  /** The message exists and has {Verse} and {Reference} tokens (or ProPresenter doesn't list its tokens) */
  messageReady: boolean;
  /** ProPresenter didn't say which tokens the message has: send a test verse to check */
  tokensUnconfirmed?: boolean;
  /** The token names ProPresenter reports for the message */
  tokens?: string[];
}

export interface ProPresenterThemeSlide {
  id: { uuid: string; name: string; index: number };
  label: string;
}

export interface NetworkStatus {
  running: boolean;
  port: number;
  viewers: number;
  /** Addresses other devices can open, e.g. http://192.168.1.20:47100/ */
  urls: string[];
}

export interface DisplayInfo {
  id: number;
  label: string;
  width: number;
  height: number;
  /** The display with the menu bar / taskbar (the operator's screen) */
  primary: boolean;
}

export type ScreenOutput = 'projection' | 'confidence' | 'lowerThird';
/** Which display each output is shown on; null for off */
export type ScreenConfig = Record<ScreenOutput, number | null>;

/** A Blackmagic DeckLink port (each connector of a card is listed by the driver as a device) */
export interface DeckLinkDevice {
  name: string;
  canOutput: boolean;
}
export interface DeckLinkDevices {
  available: boolean;
  /** Why not: 'drivers' (Desktop Video not installed), 'not-built' or 'platform' (not on this system yet) */
  reason?: 'drivers' | 'not-built' | 'platform';
  devices: DeckLinkDevice[];
}
/** The DeckLink port and video format for each output sent out over SDI */
export type DeckLinkConfig = Record<ScreenOutput, { device: string; mode: string } | null>;
export type DeckLinkStatus = Record<
  ScreenOutput,
  { state: 'sending'; device: string; mode: string; framesPerSecond: number } | { state: 'error'; message: string } | { state: 'off' }
>;

/** Whether NDI® can be sent from here; reason 'runtime' when the free NDI Runtime isn't installed */
export interface NdiAvailability {
  available: boolean;
  reason?: 'runtime' | 'error';
  message?: string | null;
  version?: string;
  /** Each output's source name, e.g. "Voice Verses Projector"; receivers show "MACHINE (name)" */
  names: Record<ScreenOutput, string>;
  machine: string;
}
/** Which outputs are sent as NDI sources */
export type NdiConfig = Record<ScreenOutput, boolean>;
export type NdiStatus = Record<ScreenOutput, { state: 'sending'; name: string; receivers: number; framesPerSecond: number; seeThrough: boolean } | { state: 'off' }>;

export interface DesktopBridge {
  platform: string;
  getVersion(): Promise<string>;
  /** Keeps the computer and screens awake while listening */
  setListening(listening: boolean): Promise<void>;
  /** A newer version exists but this build can't install it itself (unsigned macOS build) */
  onUpdateAvailable(callback: (info: { version: string; url: string }) => void): () => void;
  secrets: {
    has(name: SecretName): Promise<boolean>;
    set(name: SecretName, value: string): Promise<void>;
    clear(name: SecretName): Promise<void>;
    /** Sends the request from the main process with the stored key added; the key never reaches the page. */
    fetch(name: SecretName, request: SerializedRequest): Promise<SerializedResponse>;
  };
  /** Microphone access from the computer (missing in desktop apps older than 1.7.0) */
  microphone?: {
    /** 'granted', 'denied', 'restricted', 'not-determined' or 'unknown' */
    status(): Promise<string>;
    /** Asks the person (macOS); true when allowed */
    ask(): Promise<boolean>;
    /** Opens the computer's microphone privacy settings */
    openSettings(): Promise<void>;
  };
  speech: {
    /** Whether the bundled on-device speech models are installed */
    isAvailable(): Promise<boolean>;
    /** 'live' streams microphone audio; 'file' transcribes a recording as fast as possible */
    start(mode: 'live' | 'file'): Promise<number>;
    /** 16 kHz mono samples */
    sendAudio(session: number, samples: Float32Array): void;
    /** No more audio: transcribe what is left, then send 'done' */
    finish(session: number): void;
    stop(session: number): void;
    onEvent(callback: (event: SpeechWorkerEvent) => void): () => void;
  };
  proPresenter: {
    status(connection: ProPresenterConnection): Promise<ProPresenterStatus>;
    themes(connection: ProPresenterConnection): Promise<ProPresenterThemeSlide[]>;
    /** Creates the "Voice Verses" message using the given theme slide */
    createMessage(connection: ProPresenterConnection, theme: ProPresenterThemeSlide['id']): Promise<ProPresenterStatus>;
    /** Shows the verse; `messagesOn` false: ProPresenter took it but its Messages layer shows nothing (null: it can't say) */
    /** `hiddenInProPresenter`: someone pressed Hide there since the last verse, so it was not sent (`force` sends anyway) */
    show(connection: ProPresenterConnection, verse: { reference: string; text: string; stage: boolean; force?: boolean }): Promise<{ messagesOn: boolean | null; hiddenInProPresenter?: boolean } | void>;
    clear(connection: ProPresenterConnection, options: { stage: boolean }): Promise<void>;
    /** ProPresenter running on this computer, found without typing a port (older desktop versions don't have it) */
    find?(): Promise<{ host: string; port: number; version: string; name: string } | null>;
    /** Every ProPresenter on this computer and the local network (Bonjour, then each address on the usual ports and `ports`) */
    search?(options?: { ports?: number[] }): Promise<{ host: string; port: number; version: string; name: string; here: boolean }[]>;
    /** Makes sure the "Voice Verses" message exists (best-suited theme), and says what is ready */
    setUp?(connection: ProPresenterConnection): Promise<ProPresenterStatus & { theme: string | null }>;
    /** What ProPresenter says about the Voice Verses message, its layers, screens and Look (older desktop versions don't have it) */
    diagnose?(connection: ProPresenterConnection): Promise<{ checks: { state: 'ok' | 'warn' | 'problem'; title: string; detail: string }[] }>;
  };
  screens: {
    displays(): Promise<DisplayInfo[]>;
    get(): Promise<ScreenConfig>;
    set(config: ScreenConfig): Promise<ScreenConfig>;
    /** A big number and name on every display for a few seconds (older desktop versions don't have it) */
    identify?(): Promise<number>;
  };
  /** Outputs sent straight out of a DeckLink card's SDI ports (older desktop versions don't have it) */
  decklink?: {
    devices(): Promise<DeckLinkDevices>;
    get(): Promise<DeckLinkConfig>;
    set(config: DeckLinkConfig): Promise<DeckLinkConfig>;
    status(): Promise<DeckLinkStatus>;
    test(output: ScreenOutput): Promise<boolean>;
  };
  /** Outputs sent as NDI® sources, through the NDI Runtime if the computer has it (older desktop versions don't have it) */
  ndi?: {
    availability(): Promise<NdiAvailability>;
    get(): Promise<NdiConfig>;
    set(config: NdiConfig): Promise<NdiConfig>;
    status(): Promise<NdiStatus>;
  };
  network: {
    configure(options: { enabled: boolean; port?: number }): Promise<NetworkStatus>;
    status(): Promise<NetworkStatus>;
    hasMedia(id: string): Promise<boolean>;
    putMedia(id: string, mime: string, bytes: ArrayBuffer): Promise<void>;
    publish(state: unknown): void;
  };
  library: {
    getFolder(): Promise<string | null>;
    chooseFolder(): Promise<string | null>;
    forgetFolder(): Promise<void>;
    list(dir: 'services' | 'media'): Promise<string[]>;
    read(path: string): Promise<string | null>;
    write(path: string, text: string): Promise<void>;
    /** Called when files in the library folder change on disk (e.g. synced from another computer). */
    onChange(callback: () => void): () => void;
  };
}

declare global {
  interface Window {
    voiceVerses?: DesktopBridge;
  }
}

export const desktop: DesktopBridge | null =
  typeof window !== 'undefined' ? window.voiceVerses ?? null : null;

export const isDesktop = desktop !== null;
