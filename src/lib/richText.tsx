import { CSSProperties, ReactNode } from 'react';

/**
 * Formatting single words in slide text, typed the way people already write:
 *   **bold**   *italic*   __underline__   ==highlighted==   [#ffcc00]in a colour[/]
 * Anything else is shown as typed. Line breaks are kept.
 */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean;
  color?: string;
}

const TOKEN = /(\*\*|__|==|\*|\[#[0-9a-fA-F]{3,8}\]|\[\/\])/g;

export function parseRich(text: string): Run[] {
  const runs: Run[] = [];
  const state: Omit<Run, 'text'> = {};
  const colors: string[] = [];
  let last = 0;
  // Only treat a marker as formatting when it is closed later on (a lone "*" stays a star)
  const closes = (marker: string, from: number) => text.indexOf(marker, from) >= 0;
  for (const match of text.matchAll(TOKEN)) {
    const token = match[0];
    const at = match.index ?? 0;
    const end = at + token.length;
    const push = () => at > last && runs.push({ ...state, color: colors[colors.length - 1], text: text.slice(last, at) });
    const toggle = (key: 'bold' | 'italic' | 'underline' | 'highlight') => {
      if (!state[key] && !closes(token, end)) return false;
      push();
      state[key] = !state[key];
      last = end;
      return true;
    };
    if (token === '**') toggle('bold');
    else if (token === '*') toggle('italic');
    else if (token === '__') toggle('underline');
    else if (token === '==') toggle('highlight');
    else if (token === '[/]') {
      if (!colors.length) continue;
      push();
      colors.pop();
      last = end;
    } else if (closes('[/]', end)) {
      push();
      colors.push(token.slice(1, -1));
      last = end;
    }
  }
  if (last < text.length) runs.push({ ...state, color: colors[colors.length - 1], text: text.slice(last) });
  return runs.filter((r) => r.text);
}

/** Slide text with its word formatting. `highlight` is the colour of ==marked== words. */
export const RichText = ({ text, highlight = '#f5c451' }: { text: string; highlight?: string }): ReactNode => (
  <>
    {parseRich(text).map((run, i) => {
      const style: CSSProperties = {};
      if (run.bold) style.fontWeight = 800;
      if (run.italic) style.fontStyle = 'italic';
      if (run.underline) style.textDecoration = 'underline';
      if (run.color) style.color = run.color;
      if (run.highlight) style.color = highlight;
      return Object.keys(style).length ? (
        <span key={i} style={style}>
          {run.text}
        </span>
      ) : (
        run.text
      );
    })}
  </>
);

/** Wraps the selected part of a text field's value in a marker (for the formatting buttons). */
export function wrapSelection(value: string, start: number, end: number, open: string, close = open): { value: string; start: number; end: number } {
  if (start === end) return { value, start, end };
  const inner = value.slice(start, end);
  return { value: value.slice(0, start) + open + inner + close + value.slice(end), start: start + open.length, end: end + open.length };
}
