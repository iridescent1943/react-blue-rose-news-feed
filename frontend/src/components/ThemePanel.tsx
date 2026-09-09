import rosesRed from '../assets/roses-red.webp';
import rosesPink from '../assets/roses-pink.webp';
import rosesOrange from '../assets/roses-orange.webp';
import rosesYellow from '../assets/roses-yellow.webp';
import rosesGreen from '../assets/roses-green.webp';
import rosesBlue from '../assets/roses-blue.webp';
import rosesPurple from '../assets/roses-purple.webp';

interface Props {
  width?: number;
  activePalette: number;
  onPaletteSelect: (index: number) => void;
}

const PALETTE_NAMES = ['red', 'pink', 'orange', 'yellow', 'green', 'blue', 'purple'];

// Real photos, indexed to match PALETTE_SWATCHES.
const PALETTE_IMAGES = [
  rosesRed,
  rosesPink,
  rosesOrange,
  rosesYellow,
  rosesGreen,
  rosesBlue,
  rosesPurple,
];

const PALETTE_SWATCHES = [
  'linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%)',  // red
  'linear-gradient(135deg, #ffb3c6 0%, #e91e8c 100%)',  // pink
  'linear-gradient(135deg, #ffd580 0%, #f07020 100%)',  // orange
  'linear-gradient(135deg, #fff59d 0%, #fbc02d 100%)',  // yellow
  'linear-gradient(135deg, #a8f0a8 0%, #27ae60 100%)',  // green
  'linear-gradient(135deg, #a0c8ff 0%, #1565c0 100%)',  // blue
  'linear-gradient(135deg, #c9a0f8 0%, #6a1b9a 100%)',  // purple
];

const PALETTE_TITLE_COLORS = [
  '#c0392b',
  '#e91e8c',
  '#f07020',
  '#fbc02d',
  '#27ae60',
  '#1565c0',
  '#6a1b9a',
];

const PALETTE_GLOW_RGB = [
  '224, 80, 80',
  '240, 96, 168',
  '240, 144, 64',
  '224, 192, 64',
  '64, 200, 120',
  '41, 128, 216',
  '142, 53, 184',
];

export function ThemePanel({ width, activePalette, onPaletteSelect }: Props) {
  return (
    <aside className="theme-panel" style={width ? { width: `${width}px` } : undefined}>
      <div className="theme-panel-inner">
        <img
          className="rose-image"
          src={PALETTE_IMAGES[activePalette]}
          alt={`${PALETTE_NAMES[activePalette] ?? ''} roses`}
        />

        <div className="theme-lore">
          <p style={{ fontStyle: 'italic', fontSize: 'clamp(0.76rem, 1.1vw, 0.84rem)', textAlign: 'center' }}>
            Pierre-Joseph Redouté, Les Roses (1827–1833)
            <br />
            Restored by{' '}
            <a
              href="https://www.c82.net/redoute/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit' }}
            >
              Nicholas Rougeux / C82
            </a>
            <br />
            Original artwork: Public Domain
          </p>
        </div>

        <div className="theme-divider" aria-hidden="true">✦ ✦ ✦</div>

        <blockquote
          className="theme-quote"
          style={{ fontStyle: 'normal', fontSize: 'clamp(0.8rem, 1.2vw, 0.92rem)', textAlign: 'center' }}
        >
          In the language of flowers
          <br />
          The blue rose whispers of the{' '}
          <em style={{ color: 'var(--rose-light)', fontStyle: 'italic' }}>unattainable</em> beauty found
          beyond the edges of the ordinary world
        </blockquote>

        <div className="theme-palette-group">
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

                aria-label={`Apply palette ${index + 1}`}
              />
            ))}
          </div>

          <h1 className="theme-title" style={{ color: PALETTE_TITLE_COLORS[activePalette] ?? '#1565c0' }}>
            colour the small one
          </h1>
          <p className="palette-hint">tap a circle to colour the rose</p>
        </div>

        <p className="theme-sidebar-footer">Blue is the Rarest Color in Nature</p>
      </div>
    </aside>
  );
}
