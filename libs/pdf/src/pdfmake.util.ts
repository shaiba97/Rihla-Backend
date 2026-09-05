import * as fs from 'fs';
import * as path from 'path';
// CJS interop: `import * as` would drop the pdfmake singleton's prototype
// methods, so use the `require`-style import which binds the instance directly.
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
import pdfMake = require('pdfmake');
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

/**
 * pdfmake 0.3.11 already shapes logical Arabic into presentation forms and
 * reverses RTL runs (via its embedded pdfkit + fontkit), so we feed plain
 * logical Unicode — no arabic-reshaper / bidi-js preprocessing.
 */

let configured = false;
let fontPaths: { regular: string; bold: string } | null = null;

export function setupPdfmake(): { regular: string; bold: string } | null {
  if (configured) return fontPaths;
  configured = true;

  // ts-node, plain-tsc, webpack bundle, and process.cwd() layouts all place
  // the fonts under a `fonts/` directory near (or at) the app root.
  const baseCandidates = [
    __dirname,
    path.join(__dirname, '..'),
    path.join(__dirname, '..', '..'),
    path.join(__dirname, '..', '..', '..'),
    process.cwd(),
  ];

  for (const base of baseCandidates) {
    const regular = path.join(base, 'fonts', 'Tajawal-Regular.ttf');
    const bold = path.join(base, 'fonts', 'Tajawal-Bold.ttf');
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      fontPaths = { regular, bold };
      break;
    }
  }

  if (!fontPaths) return null;

  // Font files are read from the local filesystem at render time; logo images
  // are always embedded as data URIs so remote fetching stays disabled.
  pdfMake.setLocalAccessPolicy(() => true);
  pdfMake.setUrlAccessPolicy(() => false);
  pdfMake.addFonts({
    Tajawal: {
      normal: fontPaths.regular,
      bold: fontPaths.bold,
      italics: fontPaths.regular,
      bolditalics: fontPaths.bold,
    },
  });

  return fontPaths;
}

export async function renderPdf(
  document: TDocumentDefinitions,
): Promise<Buffer> {
  const createdPdf = pdfMake.createPdf(document);
  const buffer = await createdPdf.getBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
