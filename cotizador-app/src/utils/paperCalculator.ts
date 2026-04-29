export interface CalcParams {
    anchoPieza: number;
    altoPieza: number;
    anchoPliego: number;
    altoPliego: number;
    pinza: number; // Gripper margin required by machine (e.g 1.5cm)
    sangrado: number; // Bleed margin
    calle: number; // Spacing between cuts
}

export interface CalcResult {
    modo: 'Normal' | 'Girado';
    cabidasX: number;
    cabidasY: number;
    totalCabidas: number;
    areaUtilizada: number;
    areaTotal: number;
    porcentajeAprovechamiento: number;
}

export function calcularCabidas(params: CalcParams): CalcResult {
    const { anchoPieza, altoPieza, anchoPliego, altoPliego, pinza, calle, sangrado } = params;

    // Tamaño de la pieza con su sangrado completo (ancho y alto) y calle
    // Asumimos que el sangrado y calle aplican en todas las direcciones inter-pieza
    const widthConSangrado = anchoPieza + (sangrado * 2) + calle;
    const heightConSangrado = altoPieza + (sangrado * 2) + calle;

    // Calculamos el área útil real de la máquina para el pliego dadas las pinzas
    // El pliego debe entrar considerando el enganche ('pinza') que la máquina toma en un borde (normalmente a lo largo del ancho)
    // Reducimos el alto útil por la pinza.
    const altoUtil = altoPliego - pinza;
    const anchoUtil = anchoPliego;

    // Option 1: Normal Orientation
    const cabX1 = Math.floor(anchoUtil / widthConSangrado);
    const cabY1 = Math.floor(altoUtil / heightConSangrado);
    const total1 = cabX1 * cabY1;

    // Option 2: Rotated Orientation (The piece is rotated 90 degrees)
    const cabX2 = Math.floor(anchoUtil / heightConSangrado);
    const cabY2 = Math.floor(altoUtil / widthConSangrado);
    const total2 = cabX2 * cabY2;

    let bestResult: CalcResult;

    if (total1 >= total2) {
        bestResult = {
            modo: 'Normal',
            cabidasX: cabX1,
            cabidasY: cabY1,
            totalCabidas: total1,
            areaUtilizada: (anchoPieza * altoPieza) * total1,
            areaTotal: anchoPliego * altoPliego,
            porcentajeAprovechamiento: 0
        };
    } else {
        bestResult = {
            modo: 'Girado',
            cabidasX: cabX2,
            cabidasY: cabY2,
            totalCabidas: total2,
            areaUtilizada: (anchoPieza * altoPieza) * total2,
            areaTotal: anchoPliego * altoPliego,
            porcentajeAprovechamiento: 0
        };
    }

    bestResult.porcentajeAprovechamiento = (bestResult.areaUtilizada / bestResult.areaTotal) * 100;
    return bestResult;
}

// Cálculo secundario para pliegos totales requeridos incluyendo merma
export function calcularPliegosTotales(cantidadDeseada: number, cabidasPorPliego: number, porcentajeMerma: number = 0.05): number {
    if (cabidasPorPliego <= 0) return 0;

    const pliegosTeoricos = cantidadDeseada / cabidasPorPliego;
    const mermaPliegos = pliegosTeoricos * porcentajeMerma;

    return Math.ceil(pliegosTeoricos + mermaPliegos);
}
