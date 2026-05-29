interface Props {
  width?: number;
  activePalette: number;
  onPaletteSelect: (index: number) => void;
}

const PALETTE_SWATCHES = [
  'linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%)',  // red
  'linear-gradient(135deg, #ffb3c6 0%, #e91e8c 100%)',  // pink
  'linear-gradient(135deg, #ffd580 0%, #f07020 100%)',  // orange
  'linear-gradient(135deg, #a8f0a8 0%, #27ae60 100%)',  // green
  'linear-gradient(135deg, #a0c8ff 0%, #1565c0 100%)',  // blue
  'linear-gradient(135deg, #c9a0f8 0%, #6a1b9a 100%)',  // purple
];

const PALETTE_TITLE_COLORS = [
  '#c0392b',
  '#e91e8c',
  '#f07020',
  '#27ae60',
  '#1565c0',
  '#6a1b9a',
];

const PALETTE_GLOW_RGB = [
  '224, 80, 80',
  '240, 96, 168',
  '240, 144, 64',
  '64, 200, 120',
  '41, 128, 216',
  '142, 53, 184',
];

export function ThemePanel({ width, activePalette, onPaletteSelect }: Props) {
  return (
    <aside className="theme-panel" style={width ? { width: `${width}px` } : undefined}>
      <div className="theme-panel-inner">
        <div
          className="rose-svg"
          role="img"
          aria-label="Blue rose"
          style={{
            background: PALETTE_SWATCHES[activePalette] ?? 'transparent',
            width: '200px',
            height: '250px',
          }}
        />
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
              style={{
                backgroundImage: gradient,
                '--swatch-glow-rgb': PALETTE_GLOW_RGB[index] ?? '120, 180, 255',
              } as React.CSSProperties}
              onClick={() => onPaletteSelect(index)}
              title={`Apply palette ${index + 1}`}
              aria-label={`Apply palette ${index + 1}`}
            />
          ))}
        </div>

        <h1 className="theme-title" style={{ color: PALETTE_TITLE_COLORS[activePalette] ?? '#1565c0' }}>
          colour the small one
        </h1>
        <p className="palette-hint">tap a circle to colour the rose</p>
      </div>
    </aside>
  );
}
