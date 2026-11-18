/**
 * PDF presentations (1.19.7): each page drawn as a picture, exactly as made (pdf.js, offline,
 * loaded only when a PDF is added), with its words kept for finding scriptures and for adding
 * as words. Keynote and Google Slides decks come in this way, saved as PDF.
 */
import type { PresentationPage } from './office';
import { FileReadError } from './office';

/** The widest a page is drawn: enough for a 1080p projector, small enough to save */
const WIDTH = 1920;
const MAX_PAGES = 150;

export interface PdfPage extends PresentationPage {
  /** The page as a JPEG data: URL */
  image: string;
}

export async function readPdf(bytes: Uint8Array, onPage?: (done: number, total: number) => void): Promise<PdfPage[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;
  } catch (error) {
    const name = (error as { name?: string })?.name;
    throw new FileReadError(name === 'PasswordException' ? 'This PDF is protected with a password. Save a copy without one, then add it.' : 'This PDF couldn’t be opened. It may be damaged.');
  }
  const total = Math.min(doc.numPages, MAX_PAGES);
  const pages: PdfPage[] = [];
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new FileReadError('This computer couldn’t draw the PDF.');
  for (let n = 1; n <= total; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(4, WIDTH / base.width) });
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const content = await page.getTextContent();
    const lines: string[] = [];
    let line = '';
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      line += item.str ?? '';
      if (item.hasEOL) {
        if (line.trim()) lines.push(line.trim());
        line = '';
      }
    }
    if (line.trim()) lines.push(line.trim());
    pages.push({ image: canvas.toDataURL('image/jpeg', 0.82), title: lines[0], text: lines.slice(1).join('\n') });
    page.cleanup();
    onPage?.(n, total);
  }
  await doc.destroy();
  return pages;
}
