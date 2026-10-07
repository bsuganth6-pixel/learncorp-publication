// Verifies a file's real type from its magic bytes rather than trusting the
// client-declared mimetype, which is easy to spoof on a multipart upload.

const SIGNATURES: Record<string, { bytes: number[]; offset?: number }[]> = {
  pdf: [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  docx: [{ bytes: [0x50, 0x4b, 0x03, 0x04] }], // ZIP container (docx/xlsx/pptx)
  doc: [{ bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }], // legacy OLE
  png: [{ bytes: [0x89, 0x50, 0x4e, 0x47] }],
  jpg: [{ bytes: [0xff, 0xd8, 0xff] }],
};

function matches(buffer: Buffer, sig: { bytes: number[]; offset?: number }): boolean {
  const offset = sig.offset || 0;
  if (buffer.length < offset + sig.bytes.length) return false;
  return sig.bytes.every((byte, i) => buffer[offset + i] === byte);
}

export function detectRealType(buffer: Buffer): string | null {
  for (const [type, sigs] of Object.entries(SIGNATURES)) {
    if (sigs.some((sig) => matches(buffer, sig))) return type;
  }
  return null;
}

export function isAllowedManuscriptFile(buffer: Buffer): boolean {
  const type = detectRealType(buffer);
  return type === 'pdf' || type === 'docx' || type === 'doc';
}

export function isAllowedImageFile(buffer: Buffer): boolean {
  const type = detectRealType(buffer);
  return type === 'png' || type === 'jpg';
}
