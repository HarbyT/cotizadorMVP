const XLSX = require('xlsx');
const fs = require('fs');

try {
    const workbook = XLSX.readFile('c:/cotizadorMVP/MVPHuellasCotizador.xlsx');
    const result = {};
    for (let sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        result[sheetName] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    }
    fs.writeFileSync('c:/cotizadorMVP/excel_data.json', JSON.stringify(result, null, 2));
    console.log('Successfully wrote to excel_data.json');
} catch (error) {
    console.error('Error reading excel:', error);
}
