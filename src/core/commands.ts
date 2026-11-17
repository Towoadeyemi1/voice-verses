/**
 * Commands a module answers (1.19.5, D33): the other half of the event bus. A module says
 * `answer('live.take', fn)`; the local API (and later anything else) calls `ask('live.take')`.
 * A command nobody answers right now (the live screen isn't open) says so instead of failing
 * silently. Commands that change the room are refused while practising (D31).
 */
import { practising } from '@/lib/practice';

export type CommandResult = { ok: true; result?: unknown } | { ok: false; status: number; message: string };
type Answer = (body: Record<string, unknown>) => unknown | Promise<unknown>;

/** A refusal with an HTTP-like status and words for the person using the other app. */
export class CommandError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const answers = new Map<string, Answer>();

/** Answers a command until the returned function is called. The latest answer wins. */
export function answer(command: string, fn: Answer): () => void {
  answers.set(command, fn);
  return () => {
    if (answers.get(command) === fn) answers.delete(command);
  };
}

export const answered = (): string[] => [...answers.keys()].sort();

/** Commands that act on the room: refused while the operator is practising. */
const ROOM = /^live\./;

export async function ask(command: string, body: Record<string, unknown> = {}): Promise<CommandResult> {
  const fn = answers.get(command);
  if (!fn) {
    return command.startsWith('live.')
      ? { ok: false, status: 409, message: 'The live screen isn’t open in Voice Verses.' }
      : { ok: false, status: 404, message: `Voice Verses doesn’t know “${command}”.` };
  }
  if (ROOM.test(command) && practising()) return { ok: false, status: 409, message: 'Voice Verses is in practice (Training). Try again when it ends.' };
  try {
    const result = await fn(body ?? {});
    return { ok: true, result: result === undefined ? undefined : JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    if (error instanceof CommandError) return { ok: false, status: error.status, message: error.message };
    console.error(`Answering ${command} failed`, error);
    return { ok: false, status: 500, message: 'Voice Verses couldn’t do that.' };
  }
}
