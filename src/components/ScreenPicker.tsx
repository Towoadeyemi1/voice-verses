/** Which screens something goes on: all of them, or any mix of projector, stage monitor and stream. */
export interface Screens {
  projector: boolean;
  stage: boolean;
  stream: boolean;
}

const LABELS: [keyof Screens, string][] = [
  ['projector', 'Projector'],
  ['stage', 'Stage monitor'],
  ['stream', 'Stream'],
];

export const chipClass = (on: boolean) =>
  `min-h-9 px-3.5 rounded-full text-[13px] font-semibold transition ${on ? 'bg-card text-foreground shadow-sm ring-1 ring-foreground/30' : 'bg-muted/60 text-muted-foreground hover:text-foreground'}`;

/** "Projector and stage monitor", "All screens"… */
export const describeScreens = (s: Screens) => {
  const names = LABELS.filter(([k]) => s[k]).map(([, l]) => l.toLowerCase());
  if (names.length === 3) return 'all screens';
  if (!names.length) return 'no screen';
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

export const ScreenPicker = ({ value, onChange }: { value: Screens; onChange: (s: Screens) => void }) => {
  const all = value.projector && value.stage && value.stream;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Screens">
      <button type="button" role="checkbox" aria-checked={all} className={chipClass(all)} onClick={() => onChange({ projector: !all, stage: !all, stream: !all })}>
        All screens
      </button>
      {LABELS.map(([key, label]) => (
        <button key={key} type="button" role="checkbox" aria-checked={value[key]} className={chipClass(value[key] && !all)} onClick={() => onChange({ ...value, [key]: all ? true : !value[key], ...(all ? { projector: key === 'projector', stage: key === 'stage', stream: key === 'stream' } : {}) })}>
          {label}
        </button>
      ))}
    </div>
  );
};
