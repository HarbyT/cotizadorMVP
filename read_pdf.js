const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('c:/cotizadorMVP/COTIZACIONES 2026 (2).pdf');

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('c:/cotizadorMVP/pdf_data.txt', data.text);
    console.log('Successfully wrote to pdf_data.txt');
}).catch(function (error) {
    console.error(error);
});
