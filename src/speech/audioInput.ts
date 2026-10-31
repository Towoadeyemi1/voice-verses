/**
 * Opening the microphone, or one channel of a multichannel input.
 *
 * Many churches feed the sound desk into the computer over USB (or an audio
 * interface) as one device with many channels: drums, keys, choir, pulpit...
 * Speech recognition needs only the preacher's channel, so the operator picks
 * it and the other channels are ignored. Other apps (e.g. a DAW recording the
 * service) can use the same device at the same time.
 */

/** Ask for this many channels; the browser gives as many as the device has (Web Audio handles up to 32). */
export const MAX_CHANNELS = 32;

export interface MicrophoneChoice {
  deviceId: string | null;
  /** 0-based channel of a multichannel device, or null for the device's normal (first) input */
  channel: number | null;
}

export async function openMicrophone({ deviceId, channel }: MicrophoneChoice): Promise<MediaStream> {
  const audio: MediaTrackConstraints =
    channel === null
      ? { echoCancellation: false, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
      : // A desk feed is already clean; processing would also mix the channels down
        { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: MAX_CHANNELS } };
  if (deviceId && deviceId !== 'default') {
    const devices = await navigator.mediaDevices.enumerateDevices();
    if (devices.some((d) => d.kind === 'audioinput' && d.deviceId === deviceId)) {
      audio.deviceId = { exact: deviceId };
    }
  }
  return navigator.mediaDevices.getUserMedia({ audio });
}

/** How many channels the opened input really has. */
export function channelCountOf(stream: MediaStream): number {
  return stream.getAudioTracks()[0]?.getSettings().channelCount ?? 1;
}

/** Input devices with their names (asks for microphone permission first so names are shown). */
export async function listMicrophones(): Promise<MediaDeviceInfo[]> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // Without permission, devices are listed without names
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  // "default" and "communications" are aliases of real devices listed separately
  return devices.filter((d) => d.kind === 'audioinput' && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications');
}

/**
 * AudioWorklet that copies one channel of the input out of the audio thread.
 * Created with channelCountMode 'explicit' and 'discrete' interpretation so the
 * channels arrive separately instead of being mixed together.
 */
export const CAPTURE_WORKLET = `
class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.channel = (options.processorOptions && options.processorOptions.channel) || 0;
  }
  process(inputs) {
    const input = inputs[0];
    const samples = input && (input[this.channel] || input[0]);
    if (samples) this.port.postMessage(samples.slice(0));
    return true;
  }
}
registerProcessor('capture-processor', CaptureProcessor);
`;

/** An AudioWorkletNode that delivers the chosen channel's samples. */
export async function createChannelCapture(
  context: AudioContext,
  source: MediaStreamAudioSourceNode,
  channels: number,
  channel: number,
): Promise<AudioWorkletNode> {
  const moduleUrl = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'application/javascript' }));
  await context.audioWorklet.addModule(moduleUrl);
  URL.revokeObjectURL(moduleUrl);
  const node = new AudioWorkletNode(context, 'capture-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCount: Math.max(1, channels),
    channelCountMode: 'explicit',
    channelInterpretation: 'discrete',
    processorOptions: { channel: Math.min(channel, Math.max(0, channels - 1)) },
  });
  source.connect(node);
  return node;
}
