import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScreenShape } from '@/hooks/use-screen-shape';
import { describeShape, setShape, ShapeId, shapeRatio, SHAPES } from '@/lib/screenShapes';
import type { Output } from '@/lib/templates';

/**
 * The shape of one output's screen (16:9, ultrawide, 4:3, any size) and, on a
 * screen wider than 16:9, whether the design spreads across it or stays in
 * the middle with the background filling the sides.
 */
export const ScreenShapePicker = ({ output, label = 'Screen shape' }: { output: Output; label?: string }) => {
  const shape = useScreenShape(output);
  const wide = shapeRatio(shape, undefined, output) > 16 / 9 + 0.02;
  const id = `shape-${output}`;

  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] items-end">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
        <Select value={shape.id} onValueChange={(v) => setShape(output, { ...shape, id: v as ShapeId, width: shape.width ?? 3440, height: shape.height ?? 1440 })}>
          <SelectTrigger id={id} className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHAPES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.id === 'auto' ? `Match the screen (${describeShape({ id: 'auto' }, output)} now)` : s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {shape.id === 'custom' && (
        <div className="flex items-center gap-1.5">
          <Input
            aria-label="Width"
            type="number"
            min={100}
            className="h-9 w-24"
            value={shape.width ?? ''}
            onChange={(e) => setShape(output, { ...shape, width: Number(e.target.value) || undefined })}
          />
          <span className="text-muted-foreground">×</span>
          <Input
            aria-label="Height"
            type="number"
            min={100}
            className="h-9 w-24"
            value={shape.height ?? ''}
            onChange={(e) => setShape(output, { ...shape, height: Number(e.target.value) || undefined })}
          />
        </div>
      )}
      {wide && (
        <div className="sm:col-span-2 flex rounded-lg bg-muted p-0.5 text-xs">
          {(
            [
              ['spread', 'Spread the design across the screen'],
              ['middle', 'Keep it in the middle (background fills the sides)'],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => setShape(output, { ...shape, layout: value })}
              className={`flex-1 rounded-md px-2 py-1.5 transition ${(shape.layout ?? 'spread') === value ? 'bg-background shadow font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
