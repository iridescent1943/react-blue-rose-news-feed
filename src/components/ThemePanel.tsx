interface Props {
  width?: number;
  activePalette: number;
  onPaletteSelect: (index: number) => void;
}

const PALETTE_SWATCHES = [
  'linear-gradient(135deg, #dcecff 0%, #a8ccfb 100%)',
  'linear-gradient(135deg, #c5defe 0%, #7fb4f5 100%)',
  'linear-gradient(135deg, #9ec7fb 0%, #4e98ea 100%)',
  'linear-gradient(135deg, #78b0f3 0%, #2f7fd7 100%)',
  'linear-gradient(135deg, #5f9fe8 0%, #1f5fb5 100%)',
  'linear-gradient(135deg, #447fc9 0%, #173f84 100%)',
];

export function ThemePanel({ width, activePalette, onPaletteSelect }: Props) {
  return (
    <aside className="theme-panel" style={width ? { width: `${width}px` } : undefined}>
      <div className="theme-panel-inner">
        <h1 className="theme-title">The Blue Rose</h1>
        <p className="theme-subtitle">B612</p>

        <div className="theme-divider" aria-hidden="true">✦ ✦ ✦</div>

        <div className="theme-lore">
          <p>
            In the language of flowers, the blue rose whispers of the
            <em> unattainable</em> — beauty found beyond the edges of the ordinary world.
          </p>
        </div>

        <div className="theme-divider" aria-hidden="true">✦ ✦ ✦</div>

        <blockquote className="theme-quote">
          "A rose by any other name would smell as sweet — but a blue rose
          carries a dream no other colour dares to hold."
        </blockquote>

        <div className="theme-palette" aria-label="Colour palette">
          {PALETTE_SWATCHES.map((gradient, index) => (
            <button
              key={gradient}
              type="button"
              className={`swatch ${activePalette === index ? 'active' : ''}`}
              style={{ backgroundImage: gradient }}
              onClick={() => onPaletteSelect(index)}
              title={`Apply palette ${index + 1}`}
              aria-label={`Apply palette ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
