export function exportToCSV<T extends object>(data: T[], filename: string) {
  if (data.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const headers = Object.keys(data[0]) as (keyof T)[];
  const csvRows: string[] = [];

  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map((header) => {
      const rawValue = row[header];

      if (typeof rawValue === 'string') {
        const escaped = rawValue.replace(/"/g, '""');
        return `"${escaped}"`;
      }

      return rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
    });

    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type CSVValue = string | number;
export type CSVRow = Record<string, CSVValue>;

export function importFromCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;

      if (!text) {
        resolve([]);
        return;
      }

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

      if (lines.length <= 1) {
        resolve([]);
        return;
      }

      let headerLine = lines[0];
      if (headerLine.charCodeAt(0) === 0xfeff) {
        headerLine = headerLine.slice(1);
      }

      const headers = parseCSVLine(headerLine);
      const data: CSVRow[] = [];

      for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
        const values = parseCSVLine(lines[lineIndex]);

        if (values.length <= 1) {
          continue;
        }

        const row: CSVRow = {};

        for (let index = 0; index < headers.length; index += 1) {
          const header = headers[index].trim();
          const rawValue = (values[index] || '').trim();

          if (rawValue !== '' && !Number.isNaN(Number(rawValue)) && header !== 'id' && header !== 'documentId' && header !== 'phone') {
            row[header] = Number(rawValue);
          } else {
            row[header] = rawValue;
          }
        }

        data.push(row);
      }

      resolve(data);
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += character;
    }
  }

  result.push(current);
  return result;
}