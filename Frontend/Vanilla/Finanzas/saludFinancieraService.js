export function calcularSaludFinanciera(datos) {
    const { ingresosMensuales, gastosMensuales, deudaTotal, ahorroActual, metaPrincipal } = datos;

    let score = 100;
    const recomendaciones = [];
    const puntosFuertes = [];
    const oportunidadesMejora = [];

    // 1. Regla de Liquidez / Capacidad de Ahorro
    const flujoLibre = ingresosMensuales - gastosMensuales;
    const porcentajeAhorro = ingresosMensuales > 0 ? (flujoLibre / ingresosMensuales) * 100 : 0;

    if (porcentajeAhorro < 10) {
        score -= 30;
        oportunidadesMejora.push("Tus gastos fijos consumen casi la totalidad de tus ingresos, dejando poco margen de maniobra.");
    } else if (porcentajeAhorro >= 20) {
        puntosFuertes.push("Tienes una excelente capacidad de ahorro mensual superior al 20%.");
    } else {
        score -= 15;
        oportunidadesMejora.push("Tu margen de ahorro es moderado; intenta optimizar tus gastos hormiga.");
    }

    // 2. Regla de Endeudamiento
    if (ingresosMensuales > 0 && deudaTotal > ingresosMensuales * 3) {
        score -= 30;
        oportunidadesMejora.push("El nivel de tus deudas es elevado en relación con tus ingresos actuales.");
        recomendaciones.push("Prioriza el pago de deudas con mayores tasas de interés (método avalancha o bola de nieve).");
    } else if (deudaTotal === 0) {
        puntosFuertes.push("¡Felicitaciones! Te encuentras libre de deudas activas.");
    } else {
        score -= 10;
        recomendaciones.push("Mantén tus pagos al día para evitar sobrecargar tus finanzas con intereses.");
    }

    // 3. Regla del Fondo de Emergencia (mínimo 3 meses de gastos básicos)
    const mesesColchon = gastosMensuales > 0 ? ahorroActual / gastosMensuales : 0;

    if (mesesColchon < 1) {
        score -= 25;
        oportunidadesMejora.push("No cuentas con un fondo de emergencia sólido para imprevistos.");
        recomendaciones.push("Destina una pequeña parte de tus ingresos mensuales a construir un fondo de emergencia equivalente a 3 meses de tus gastos fijos.");
    } else if (mesesColchon >= 3) {
        puntosFuertes.push("Tienes un fondo de emergencia saludable que cubre 3 o más meses de tus gastos.");
    } else {
        score -= 10;
        recomendaciones.push("Estás cerca de la meta de tu fondo de emergencia, ¡continúa ahorrando con constancia!");
    }

    // Asegurar que el score no baje de 0 ni suba de 100
    score = Math.max(0, Math.min(100, score));

    // Determinar nivel de salud
    let nivelSalud = "Crítico";
    if (score >= 80) nivelSalud = "Excelente";
    else if (score >= 60) nivelSalud = "Saludable / Estable";
    else if (score >= 40) nivelSalud = "En Observación";

    return {
        score,
        nivelSalud,
        puntosFuertes,
        oportunidadesMejora,
        recomendaciones
    };
}