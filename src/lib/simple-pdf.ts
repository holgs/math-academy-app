function escapePdfText(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');
}

function buildPageStream(lines: string[]) {
  const safe = lines.map((line) => `(${escapePdfText(line)}) Tj`).join('\nT*\n');
  return `BT\n/F1 11 Tf\n14 TL\n40 800 Td\n${safe}\nET`;
}

export function createSimplePdfFromLines(lines: string[], linesPerPage = 52): Buffer {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) {
    pages.push(['Documento vuoto']);
  }

  type Obj = { id: number; body: string };
  const objs: Obj[] = [];

  const catalogId = 1;
  const pagesId = 2;
  let nextId = 3;

  const pageIds: number[] = [];
  const contentIds: number[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageIds.push(pageId);
    contentIds.push(contentId);
  }

  const fontId = nextId++;

  objs.push({ id: catalogId, body: `<< /Type /Catalog /Pages ${pagesId} 0 R >>` });
  objs.push({
    id: pagesId,
    body: `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
  });

  for (let i = 0; i < pages.length; i++) {
    const pageId = pageIds[i];
    const contentId = contentIds[i];
    const stream = buildPageStream(pages[i]);
    objs.push({
      id: pageId,
      body: `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    });
    objs.push({
      id: contentId,
      body: `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
    });
  }

  objs.push({ id: fontId, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });
  objs.sort((a, b) => a.id - b.id);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objs) {
    offsets[obj.id] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  const maxId = objs[objs.length - 1].id;
  pdf += `xref\n0 ${maxId + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= maxId; i++) {
    const off = offsets[i] || 0;
    pdf += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
