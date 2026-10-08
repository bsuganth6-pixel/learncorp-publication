import { detectRealType, isAllowedImageFile, isAllowedManuscriptFile } from '../fileSignature';

const bytes = (...b: number[]) => Buffer.from([...b, ...Array(16).fill(0)]);

describe('file signature detection (real content, not the declared type)', () => {
  const PDF = bytes(0x25, 0x50, 0x44, 0x46);
  const DOCX = bytes(0x50, 0x4b, 0x03, 0x04);
  const DOC = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  const PNG = bytes(0x89, 0x50, 0x4e, 0x47);
  const JPG = bytes(0xff, 0xd8, 0xff);
  const EXE = bytes(0x4d, 0x5a);

  it('accepts PDF, DOCX and legacy DOC as manuscripts', () => {
    expect([PDF, DOCX, DOC].map(isAllowedManuscriptFile)).toEqual([true, true, true]);
  });
  it('accepts PNG and JPEG as images', () => {
    expect([PNG, JPG].map(isAllowedImageFile)).toEqual([true, true]);
  });
  it('does not mix the two categories', () => {
    expect(isAllowedManuscriptFile(PNG)).toBe(false);
    expect(isAllowedImageFile(PDF)).toBe(false);
  });
  it('rejects executables, text, and empty/short buffers', () => {
    expect(isAllowedManuscriptFile(EXE)).toBe(false);
    expect(isAllowedManuscriptFile(Buffer.from('hello world'))).toBe(false);
    expect(isAllowedManuscriptFile(Buffer.alloc(0))).toBe(false);
    expect(detectRealType(Buffer.from([0x25]))).toBeNull();
  });
});
