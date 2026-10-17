// Vanilla/CreditoSimulador.js

export function obtenerTasaInteres(cuotas) {
    const n = parseInt(cuotas, 10);
    // 🚀 CORRECCIÓN: 1 o 2 cuotas aplican 0% de interés
    if (n <= 2) return 0.0;
    if (n >= 3 && n <= 6) return 0.019; // 1.9% mensual
    if (n >= 7) return 0.023;           // 2.3% mensual
    return 0.0;
}

export function calcularCuotaMensual(monto, cuotas) {
    const capital = parseFloat(monto);
    const n = parseInt(cuotas, 10);

    if (isNaN(capital) || capital <= 0 || isNaN(n) || n <= 0) {
        return { cuotaMensual: 0, totalPagar: 0, tasaMensualPorcentaje: 0, interesesTotales: 0 };
    }

    const tasa = obtenerTasaInteres(n);

    // Si la tasa es 0% (1 o 2 cuotas)
    if (tasa === 0) {
        const cuota = capital / n;
        return {
            cuotaMensual: cuota,
            totalPagar: capital,
            tasaMensualPorcentaje: 0,
            interesesTotales: 0
        };
    }

    const cuotaMensual = (capital * tasa) / (1 - Math.pow(1 + tasa, -n));
    const totalPagar = cuotaMensual * n;
    const interesesTotales = totalPagar - capital;

    return {
        cuotaMensual,
        totalPagar,
        tasaMensualPorcentaje: (tasa * 100).toFixed(1),
        interesesTotales
    };
}

export function obtenerTarjetaCreditoExclusiva() {
    let userProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
    let cuentas = JSON.parse(localStorage.getItem("finara_cuentas")) || [];

    // 🚀 BÚSQUEDA EXCLUSIVA DE TARJETA DE CRÉDITO (Desvincula Débito/Ahorros/Corriente)
    let tarjetaEnPerfil = (userProfile.tarjetasAprobadas || []).find(t => {
        const tipo = String(t.tipo || '').toUpperCase();
        return tipo.includes("CRÉDITO") || tipo.includes("CREDITO");
    });

    let tarjetaEnCuentas = cuentas.find(c => {
        const tipo = String(c.tipo || '').toUpperCase();
        return tipo === "TARJETA_CREDITO" || tipo.includes("CRÉDITO") || tipo.includes("CREDITO");
    });

    return tarjetaEnPerfil || tarjetaEnCuentas || null;
}

export function ejecutarCompraTarjetaCredito({ numeroTarjeta, establecimiento, monto, cuotas }) {
    const montoNum = parseFloat(monto);
    const numCuotas = parseInt(cuotas, 10);

    let userProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
    let cuentas = JSON.parse(localStorage.getItem("finara_cuentas")) || [];

    // Obtener estrictamente la tarjeta de crédito
    let tarjeta = obtenerTarjetaCreditoExclusiva();

    if (!tarjeta) {
        return { 
            exito: false, 
            mensaje: "No tienes una Tarjeta de Crédito activa para realizar compras." 
        };
    }

    // 🚀 Extraer el cupo disponible real del producto crédito
    let cupoActual = 3000000; // Valor por defecto del cupo
    if (typeof tarjeta.saldo === 'number') {
        cupoActual = tarjeta.saldo;
    } else if (typeof tarjeta.cupoDisponible === 'number') {
        cupoActual = tarjeta.cupoDisponible;
    } else if (tarjeta.cupoDisponible || tarjeta.saldo) {
        const valLimpio = String(tarjeta.cupoDisponible || tarjeta.saldo).replace(/[^0-9.-]+/g, "");
        const num = parseFloat(valLimpio);
        if (!isNaN(num) && num > 0) cupoActual = num;
    }

    if (montoNum > cupoActual) {
        return { 
            exito: false, 
            mensaje: `Cupo insuficiente en tu Tarjeta de Crédito. Tu cupo disponible es de $ ${cupoActual.toLocaleString("es-CO")}.` 
        };
    }

    const calculo = calcularCuotaMensual(montoNum, numCuotas);

    // Actualizar Cupo y Deuda de la Tarjeta de Crédito en finara_cuentas
    const nuevoCupo = cupoActual - montoNum;
    let deudaActual = parseFloat(tarjeta.deudaActual || 0);
    const nuevaDeuda = deudaActual + calculo.totalPagar;

    let tarjetaActualizada = false;
    cuentas = cuentas.map(c => {
        const tipo = String(c.tipo || '').toUpperCase();
        if (tipo === "TARJETA_CREDITO" || tipo.includes("CREDITO")) {
            c.saldo = nuevoCupo;
            c.cupoDisponible = `$ ${nuevoCupo.toLocaleString("es-CO")}`;
            c.deudaActual = nuevaDeuda;
            tarjetaActualizada = true;
        }
        return c;
    });

    if (Array.isArray(userProfile.tarjetasAprobadas)) {
        userProfile.tarjetasAprobadas.forEach(t => {
            const tipo = String(t.tipo || '').toUpperCase();
            if (tipo.includes("CREDITO")) {
                t.cupoDisponible = nuevoCupo;
                t.deudaActual = nuevaDeuda;
            }
        });
    }

    // Guardar los cambios actualizados
    localStorage.setItem("userProfile", JSON.stringify(userProfile));
    localStorage.setItem("finara_cuentas", JSON.stringify(cuentas));

    // Registrar el movimiento exclusivo
    let movimientos = JSON.parse(localStorage.getItem("finara_movimientos")) || [];
    const numTarjetaRef = tarjeta.numero || tarjeta.numeroTarjeta || "4021";
    const nuevoMovimiento = {
        id: "COMPRA-" + Math.floor(100000 + Math.random() * 900000),
        cuentaId: tarjeta.id || "TC-01",
        cuentaNumero: numTarjetaRef,
        fecha: new Date().toISOString(),
        tipo: "EGRESO",
        categoria: "Compra TC",
        descripcion: `Compra en ${establecimiento || 'Establecimiento'} (${numCuotas} cuotas)`,
        valor: montoNum,
        detalles: {
            cuotas: numCuotas,
            cuotaMensual: Math.round(calculo.cuotaMensual),
            tasa: `${calculo.tasaMensualPorcentaje}%`,
            totalDiferido: Math.round(calculo.totalPagar)
        }
    };

    movimientos.unshift(nuevoMovimiento);
    localStorage.setItem("finara_movimientos", JSON.stringify(movimientos));

    return { exito: true, calculo, movimiento: nuevoMovimiento, nuevoCupo, nuevaDeuda };
}