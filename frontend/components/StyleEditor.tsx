'use client';

import { DEFAULT_STYLE, FONT_OPTIONS, HEADING_CASE_OPTIONS, StyleSettings } from '@/lib/websiteTemplates';

const inputClass =
  'w-full px-4 py-3 bg-white/[0.04] text-gray-100 rounded-xl border border-white/10 focus:border-white/40 focus:ring-2 focus:ring-white/25 outline-none transition';

const labelClass = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-2';

function Slider({
  label,
  help,
  value,
  min,
  max,
  onChange,
  suffix = '%',
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className={labelClass}>{label}</label>
        <span className="text-xs text-gray-400">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white"
      />
      <p className="text-xs text-gray-500 mt-1">{help}</p>
    </div>
  );
}

export default function StyleEditor({ value, onChange }: { value: StyleSettings; onChange: (next: StyleSettings) => void }) {
  const style = { ...DEFAULT_STYLE, ...value, gradient: { ...DEFAULT_STYLE.gradient!, ...value.gradient } };
  const set = (patch: Partial<StyleSettings>) => onChange({ ...style, ...patch });
  const setGradient = (patch: Partial<NonNullable<StyleSettings['gradient']>>) =>
    set({ gradient: { ...style.gradient!, ...patch } });

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Style and typography</h2>
          <p className="text-sm text-gray-400 mt-1">
            Change the fonts, colours and feel of your site. Everything starts from the style you picked, and you can reset at any time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_STYLE })}
          className="shrink-0 border border-white/10 hover:bg-white/5 text-gray-300 px-3 py-2 rounded-lg text-xs"
        >
          Reset to style default
        </button>
      </div>

      <section className="space-y-5">
        <p className="text-xs font-medium uppercase tracking-wider text-white">Writing</p>
        <div>
          <label className={labelClass}>Heading font</label>
          <select
            value={style.headingFont || ''}
            onChange={(e) => set({ headingFont: e.target.value || null })}
            className={inputClass}
          >
            <option value="">Style default</option>
            {FONT_OPTIONS.map((font) => (
              <option key={font.key} value={font.key}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Body text font</label>
          <select
            value={style.bodyFont || ''}
            onChange={(e) => set({ bodyFont: e.target.value || null })}
            className={inputClass}
          >
            <option value="">Style default</option>
            {FONT_OPTIONS.map((font) => (
              <option key={font.key} value={font.key}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Heading capitals</label>
          <select
            value={style.headingCase}
            onChange={(e) => set({ headingCase: e.target.value as StyleSettings['headingCase'] })}
            className={inputClass}
          >
            {HEADING_CASE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wider text-white">Colour gradient</p>
        <label className="flex items-center gap-3 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={style.gradient!.enabled}
            onChange={(e) => setGradient({ enabled: e.target.checked })}
            className="h-4 w-4 accent-white"
          />
          Show a gradient behind the top of the page
        </label>
        <div className={`grid grid-cols-2 gap-4 ${style.gradient!.enabled ? '' : 'opacity-40'}`}>
          <div>
            <label className={labelClass}>From</label>
            <input
              type="color"
              value={style.gradient!.from}
              onChange={(e) => setGradient({ from: e.target.value })}
              className="h-11 w-full rounded-xl border border-white/10 bg-transparent"
            />
          </div>
          <div>
            <label className={labelClass}>To</label>
            <input
              type="color"
              value={style.gradient!.to}
              onChange={(e) => setGradient({ to: e.target.value })}
              className="h-11 w-full rounded-xl border border-white/10 bg-transparent"
            />
          </div>
        </div>
        <Slider
          label="Gradient direction"
          help="Turn the gradient around the page. 0 is upwards, 90 is left to right, 180 is downwards."
          value={style.gradient!.angle}
          min={0}
          max={360}
          suffix="°"
          onChange={(angle) => setGradient({ angle })}
        />
      </section>

      <section className="space-y-6">
        <p className="text-xs font-medium uppercase tracking-wider text-white">Look and feel</p>
        <Slider
          label="Brightness"
          help="Lighter or darker across the whole site."
          value={style.brightness!}
          min={60}
          max={140}
          onChange={(brightness) => set({ brightness })}
        />
        <Slider
          label="Contrast"
          help="How strongly light and dark areas stand apart."
          value={style.contrast!}
          min={60}
          max={140}
          onChange={(contrast) => set({ contrast })}
        />
        <Slider
          label="Colour strength"
          help="0 is black and white, 100 is normal, 200 is very vivid."
          value={style.saturation!}
          min={0}
          max={200}
          onChange={(saturation) => set({ saturation })}
        />
        <Slider
          label="Corner sharpness"
          help="0 is soft and very rounded, 100 is sharp and square."
          value={style.corners ?? 50}
          min={0}
          max={100}
          onChange={(corners) => set({ corners })}
        />
        <Slider
          label="Spacing between sections"
          help="Tighter sections on the left, more open space on the right."
          value={style.spacing!}
          min={60}
          max={160}
          onChange={(spacing) => set({ spacing })}
        />
      </section>
    </div>
  );
}
