import opentype from 'opentype.js';
import latinUrl from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-700-normal.woff?url';
import vietUrl from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-700-normal.woff?url';

// Licensed font (SIL OFL) split into unicode subsets; glyphs are looked up across subsets.
let fonts: opentype.Font[] = [];

export async function loadFonts(): Promise<void> {
  const load = async (url: string) => {
    const buf = await fetch(url).then((r) => r.arrayBuffer());
    return opentype.parse(buf);
  };
  fonts = await Promise.all([load(latinUrl), load(vietUrl)]);
}

export function fontsReady() {
  return fonts.length > 0;
}

export interface GlyphRun {
  commands: opentype.PathCommand[];
  missing: string[];
}

/** Lay out text using the first subset font that contains each glyph. */
export function layoutText(text: string, size: number): GlyphRun {
  const commands: opentype.PathCommand[] = [];
  const missing: string[] = [];
  let x = 0;
  // NFC so that "ệ" uses precomposed glyphs instead of combining marks.
  for (const ch of Array.from(text.normalize('NFC'))) {
    if (ch === ' ') {
      const f = fonts[0];
      x += (f.charToGlyph(' ').advanceWidth ?? f.unitsPerEm * 0.25) * (size / f.unitsPerEm);
      continue;
    }
    const font = fonts.find((f) => f.charToGlyphIndex(ch) > 0);
    if (!font) {
      missing.push(ch);
      continue;
    }
    const glyph = font.charToGlyph(ch);
    const path = glyph.getPath(x, 0, size);
    commands.push(...path.commands);
    x += (glyph.advanceWidth ?? 0) * (size / font.unitsPerEm);
  }
  return { commands, missing: Array.from(new Set(missing)) };
}
