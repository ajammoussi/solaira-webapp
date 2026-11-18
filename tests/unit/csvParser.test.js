import { parseCSV } from '../../lib/utils/csvParser';

describe('parseCSV', () => {
  it('returns an empty array for empty input', () => {
    expect(parseCSV('')).toEqual([]);
    expect(parseCSV(undefined)).toEqual([]);
  });

  it('returns an empty array when there is only a header row', () => {
    expect(parseCSV('a,b,c')).toEqual([]);
  });

  it('parses a simple table into objects', () => {
    const rows = parseCSV('a,b\n1,2\n3,4');
    expect(rows).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  });

  it('coerces numeric values and keeps strings as strings', () => {
    const [row] = parseCSV('value,label\n42,hello');
    expect(row.value).toBe(42);
    expect(row.label).toBe('hello');
  });

  it('strips surrounding double quotes', () => {
    const [row] = parseCSV('label\n"quoted value"');
    expect(row.label).toBe('quoted value');
  });

  it('handles CRLF line endings', () => {
    const rows = parseCSV('a,b\r\n1,2\r\n3,4\r\n');
    expect(rows).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  });

  it('keeps missing trailing fields as empty strings', () => {
    const [row] = parseCSV('a,b,c\n1');
    expect(row).toEqual({ a: 1, b: '', c: '' });
  });

  it('preserves non-numeric strings such as ISO timestamps', () => {
    const [row] = parseCSV('timestamp\n2025-06-01T00:00:00');
    expect(row.timestamp).toBe('2025-06-01T00:00:00');
  });
});
