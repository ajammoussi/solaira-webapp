/**
 * Simple CSV Parser
 * Converts CSV text to array of objects
 */
export const parseCSV = (text) => {
  if (!text) return [];

  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const entry = {};

    headers.forEach((header, index) => {
      // Remove quotes if present
      let value = values[index] ? values[index].trim() : '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      // Try to convert to number if possible
      if (value !== '' && !isNaN(Number(value))) {
        entry[header] = Number(value);
      } else {
        entry[header] = value;
      }
    });

    return entry;
  });
};
