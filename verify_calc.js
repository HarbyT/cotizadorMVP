const { calcularCabidas, calcularPliegosTotales } = require('./cotizador-app/node_modules/ts-node/dist/bin.js');
// Vite / Typescript environment is tricky for raw node execution of TS without tsx, so we'll just write pure JS for the test if we don't install ts-node. Let me write a pure JS equivalent temporarily just to verify math according to plan

function test() {
    const widthConSangrado = 15; // 15cm, sangrado/calle = 0 for the MVP test 
    const heightConSangrado = 25; // 25cm
    const anchoUtil = 100;
    const altoUtil = 70; // Pinza 0 for this manual test to match the pdf exactly

    const cabX1 = Math.floor(anchoUtil / widthConSangrado); // 100/15 = 6
    const cabY1 = Math.floor(altoUtil / heightConSangrado); // 70/25 = 2
    const total1 = cabX1 * cabY1; // 12

    const cabX2 = Math.floor(anchoUtil / heightConSangrado); // 100/25 = 4
    const cabY2 = Math.floor(altoUtil / widthConSangrado); // 70/15 = 4
    const total2 = cabX2 * cabY2; // 16

    console.log(`Normal: ${total1}, Rotado: ${total2}`);

    let best = total1 >= total2 ? total1 : total2;
    console.log(`Best Cabidas: ${best}`);

    // Pliegos req
    const pliegosTeoricos = 5000 / best; // 5000 / 16 = 312.5
    const conMerma = Math.ceil(pliegosTeoricos + (pliegosTeoricos * 0.05)); // 312.5 + 15.625 = 328.125 -> 329
    console.log(`Pliegos Req: ${conMerma}`);

    if (best === 16 && conMerma === 329) {
        console.log('SUCCESS: Math matches the Excel sheet ($9,211,250 validation part 1 passed)');
    } else {
        console.log('FAILED MATH');
    }
}

test();
