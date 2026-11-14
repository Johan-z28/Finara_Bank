package Prestamos;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;
import core.RepositorioMovimientos;

import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.UUID;

/**
 * Gestor integrado de Préstamos Finara Bank.
 * Conserva tasas y umbrales de viabilidad; desembolsa automáticamente préstamos aprobados
 * en cuenta de ahorros y permite pagar cuotas desde cuentas reales.
 */
public class GestorPrestamos {
    public static final double TASA_LIBRE = 0.018;        // 1.80% mes vencido
    public static final double TASA_VEHIVULO = 0.0138;    // 1.38% mes vencido
    public static final double TASA_HIPOTECARIO = 0.0110; // 1.10% mes vencido

    public static final double MONTO_MINIMO = 500_000.0;
    public static final double MONTO_AUTO_APROBACION = 5_000_000.0;
    public static final double MONTO_MAXIMO_REVISION = 30_000_000.0;

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] Debe iniciar sesión para acceder al módulo de préstamos.");
            return;
        }
        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "")).toLowerCase();
        String titular = datosUsuario.getOrDefault("nombre", "Cliente Finara");

        GestorPrestamos gestor = new GestorPrestamos();
        boolean enModulo = true;

        while (enModulo) {
            List<Prestamos> misPrestamos = gestor.obtenerPrestamos(correo);
            double deudaActiva = gestor.calcularDeudaTotalActiva(correo);

            Consola.titulo("MÓDULO DE PRÉSTAMOS - FINARA BANK");
            System.out.println("Cliente: " + titular + " | Solicitudes: " + misPrestamos.size()
                    + " | Saldo pendiente estimado: " + Consola.formatoCOP(deudaActiva));
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Solicitar nuevo préstamo");
            System.out.println("2. Ver mis préstamos y solicitudes");
            System.out.println("3. Pagar cuota de préstamo activo");
            System.out.println("4. Ver historial de cuotas pagadas");
            System.out.println("0. Volver al menú anterior");

            int op = Consola.leerEntero(scanner, "Seleccione una opción (0-4): ", 0, 4);
            switch (op) {
                case 1:
                    solicitarPrestamoMenu(scanner, gestor, correo);
                    break;
                case 2:
                    mostrarPrestamos(misPrestamos);
                    break;
                case 3:
                    pagarCuotaMenu(scanner, gestor, correo);
                    break;
                case 4:
                    mostrarHistorialPagos(misPrestamos);
                    break;
                case 0:
                    enModulo = false;
                    break;
            }
        }
    }

    public double calcularCuota(double monto, int meses, double tasaMensual) {
        if (meses <= 0 || monto <= 0) {
            return 0;
        }
        if (tasaMensual <= 0) {
            return monto / meses;
        }
        double factor = Math.pow(1 + tasaMensual, meses);
        return (monto * tasaMensual * factor) / (factor - 1);
    }

    public double obtenerTasaPorTipo(String tipoId) {
        if ("vehiculo".equalsIgnoreCase(tipoId)) {
            return TASA_VEHIVULO;
        }
        if ("hipotecario".equalsIgnoreCase(tipoId)) {
            return TASA_HIPOTECARIO;
        }
        return TASA_LIBRE;
    }

    public String obtenerNombreTipo(String tipoId) {
        if ("vehiculo".equalsIgnoreCase(tipoId)) return "Vehículo Finara";
        if ("hipotecario".equalsIgnoreCase(tipoId)) return "Hipotecario Vivienda";
        return "Crédito de Libre Inversión";
    }

    public Prestamos solicitarPrestamo(String correo, double monto, int meses, String tipoId, String concepto) {
        if (monto < MONTO_MINIMO) {
            throw new IllegalArgumentException("El monto mínimo de préstamo es " + Consola.formatoCOP(MONTO_MINIMO) + ".");
        }
        if (meses < 6 || meses > 240) {
            throw new IllegalArgumentException("El plazo debe estar entre 6 y 240 meses.");
        }

        double tasa = obtenerTasaPorTipo(tipoId);
        double cuota = calcularCuota(monto, meses, tasa);
        String tasaStr = String.format(java.util.Locale.US, "%.2f%% M.V.", tasa * 100);

        String estado;
        boolean activo = false;
        if (monto <= MONTO_AUTO_APROBACION) {
            estado = "APROBADO";
            activo = true;
        } else if (monto <= MONTO_MAXIMO_REVISION) {
            estado = "EN_REVISION";
        } else {
            estado = "RECHAZADO";
        }

        BaseDatosFinara db = BaseDatosFinara.getInstancia();
        RepositorioCuentas repo = db.getRepositorioCuentas();
        Map<String, String> cuentaAhorros = null;

        if ("APROBADO".equals(estado)) {
            cuentaAhorros = repo.buscarCuentaAhorrosActiva(correo);
            if (cuentaAhorros == null) {
                throw new IllegalStateException(
                        "Su préstamo cumple aprobación automática, pero necesita tener una Cuenta de Ahorros activa para el desembolso. "
                                + "Solicítela primero en 'Solicitar producto'.");
            }
        }

        String radicado = "FIN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String conceptoFinal = (concepto == null || concepto.trim().isEmpty())
                ? obtenerNombreTipo(tipoId) : concepto.trim();

        Prestamos nuevo = new Prestamos(radicado, monto, meses, cuota, tasaStr, estado, conceptoFinal, tipoId.toLowerCase(), activo);

        if ("APROBADO".equals(estado) && cuentaAhorros != null) {
            double saldoPrevio = RepositorioCuentas.parsearNumero(cuentaAhorros.get("saldo"));
            double nuevoSaldo = saldoPrevio + monto;
            RepositorioCuentas.actualizarSaldo(cuentaAhorros, nuevoSaldo);
            nuevo.setCuentaDesembolso(cuentaAhorros.get("numero"));

            db.getRepositorioMovimientos().registrarMovimiento(
                    correo,
                    radicado,
                    cuentaAhorros.get("numero"),
                    "Ahorros",
                    "Crédito",
                    "INGRESO",
                    monto,
                    nuevoSaldo,
                    "Desembolso préstamo " + radicado + " (" + conceptoFinal + ")"
            );
        }

        db.getPrestamosUsuario(correo).add(0, nuevo);
        BaseDatosFinara.guardar();
        return nuevo;
    }

    public List<Prestamos> obtenerPrestamos(String correo) {
        return BaseDatosFinara.getInstancia().getPrestamosUsuario(correo);
    }

    public double calcularDeudaTotalActiva(String correo) {
        double total = 0.0;
        for (Prestamos p : obtenerPrestamos(correo)) {
            if ("APROBADO".equalsIgnoreCase(p.getEstado()) && p.isActivo()) {
                total += p.getSaldoPendienteEstimado();
            }
        }
        return total;
    }

    public void pagarCuota(String correo, Prestamos prestamo, Map<String, String> cuentaOrigen) {
        if (prestamo == null || !"APROBADO".equalsIgnoreCase(prestamo.getEstado()) || !prestamo.isActivo()) {
            throw new IllegalArgumentException("El préstamo seleccionado no está activo para pago.");
        }
        if (cuentaOrigen == null || RepositorioCuentas.esBloqueada(cuentaOrigen)) {
            throw new IllegalArgumentException("Cuenta origen inválida o bloqueada.");
        }
        if ("CREDITO".equalsIgnoreCase(cuentaOrigen.get("tipo"))) {
            throw new IllegalArgumentException("Pague las cuotas desde una Cuenta de Ahorros o Corriente.");
        }

        double valorCuota = prestamo.getCuotaMensual();
        double disponible = transferenciasInternas.ServicioTransferenciasInternas.calcularDisponible(cuentaOrigen);
        if (valorCuota > disponible) {
            throw new IllegalArgumentException("Fondos insuficientes en la cuenta seleccionada. Cuota: "
                    + Consola.formatoCOP(valorCuota) + " | Disponible: " + Consola.formatoCOP(disponible));
        }

        double saldoAnterior = RepositorioCuentas.parsearNumero(cuentaOrigen.get("saldo"));
        double nuevoSaldo = saldoAnterior - valorCuota;
        RepositorioCuentas.actualizarSaldo(cuentaOrigen, nuevoSaldo);

        prestamo.registrarPagoCuota(valorCuota, cuentaOrigen.get("numero"));

        String ref = "CUO-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        RepositorioMovimientos movs = BaseDatosFinara.getInstancia().getRepositorioMovimientos();
        movs.registrarMovimiento(
                correo,
                ref,
                cuentaOrigen.get("numero"),
                cuentaOrigen.getOrDefault("tipo", "AHORROS"),
                "Préstamos",
                "EGRESO",
                valorCuota,
                nuevoSaldo,
                "Pago cuota #" + prestamo.getCuotasPagadas() + "/" + prestamo.getMeses() + " préstamo " + prestamo.getRadicado()
        );
        BaseDatosFinara.guardar();
    }

    private static void solicitarPrestamoMenu(Scanner scanner, GestorPrestamos gestor, String correo) {
        Consola.subtitulo("SOLICITAR PRÉSTAMO FINARA");
        System.out.println("Líneas disponibles:");
        System.out.println("1. Libre Inversión  (1.80% mensual)");
        System.out.println("2. Vehículo         (1.38% mensual)");
        System.out.println("3. Hipotecario      (1.10% mensual)");
        System.out.println("0. Cancelar");
        System.out.println("Nota: Monto mínimo " + Consola.formatoCOP(MONTO_MINIMO)
                + " | <= $5M Aprobación automática | $5M-$30M En revisión | >$30M Rechazado.");

        int tipoOp = Consola.leerEntero(scanner, "Seleccione línea (0-3): ", 0, 3);
        if (tipoOp <= 0) return;

        String tipoId = (tipoOp == 2) ? "vehiculo" : (tipoOp == 3 ? "hipotecario" : "libre");

        double monto = Consola.leerMonto(scanner, "Monto solicitado en COP (mínimo 500000, 0 cancelar): ");
        if (monto <= 0) return;
        if (monto < MONTO_MINIMO) {
            System.out.println("[!] El monto mínimo permitido es " + Consola.formatoCOP(MONTO_MINIMO) + ".");
            return;
        }

        int meses = Consola.leerEntero(scanner, "Plazo en meses (6 - 240, 0 cancelar): ", 6, 240);
        if (meses <= 0) return;

        String concepto = Consola.leerLinea(scanner, "Concepto / destino del crédito (opcional): ");

        double tasa = gestor.obtenerTasaPorTipo(tipoId);
        double cuota = gestor.calcularCuota(monto, meses, tasa);

        System.out.println("\n--- SIMULACIÓN PREVIA ---");
        System.out.println("Línea          : " + gestor.obtenerNombreTipo(tipoId));
        System.out.println("Monto          : " + Consola.formatoCOP(monto));
        System.out.println("Plazo          : " + meses + " meses");
        System.out.println("Tasa mensual   : " + String.format("%.2f%%", tasa * 100));
        System.out.println("Cuota estimada : " + Consola.formatoCOP(cuota) + "/mes");

        if (!Consola.confirmar(scanner, "¿Confirma radicar esta solicitud de préstamo?")) {
            System.out.println("Solicitud cancelada.");
            return;
        }

        try {
            Prestamos p = gestor.solicitarPrestamo(correo, monto, meses, tipoId, concepto);
            System.out.println("\n=== RESULTADO DE LA SOLICITUD ===");
            System.out.println("Radicado : " + p.getRadicado());
            System.out.println("Estado   : " + p.getEstado());
            System.out.println("Cuota    : " + Consola.formatoCOP(p.getCuotaMensual()) + "/mes");
            if ("APROBADO".equals(p.getEstado())) {
                System.out.println("[✓] ¡Desembolso acreditado en su Cuenta de Ahorros "
                        + Consola.enmascararCuenta(p.getCuentaDesembolso()) + "!");
            } else if ("EN_REVISION".equals(p.getEstado())) {
                System.out.println("[i] Solicitud entre $5M y $30M enviada a estudio de comité.");
            } else {
                System.out.println("[X] Solicitud rechazada por superar el monto máximo permitido ($30.000.000).");
            }
        } catch (Exception e) {
            System.out.println("\n[X] " + e.getMessage());
        }
    }

    private static void mostrarPrestamos(List<Prestamos> lista) {
        Consola.subtitulo("MIS PRÉSTAMOS Y SOLICITUDES");
        if (lista.isEmpty()) {
            System.out.println("No tienes solicitudes ni préstamos registrados.");
            return;
        }
        for (int i = 0; i < lista.size(); i++) {
            Prestamos p = lista.get(i);
            System.out.printf("%d. [%s] %-12s | Monto: %s | Cuota: %s | Cuotas: %d/%d | Próx: %s%n",
                    (i + 1),
                    p.getRadicado(),
                    p.getEstado(),
                    Consola.formatoCOP(p.getMonto()),
                    Consola.formatoCOP(p.getCuotaMensual()),
                    p.getCuotasPagadas(),
                    p.getMeses(),
                    p.getFechaProximaCuota() != null ? p.getFechaProximaCuota().toString() : "N/A");
            if (p.getConcepto() != null && !p.getConcepto().isEmpty()) {
                System.out.println("   Concepto: " + p.getConcepto() + " | Tasa: " + p.getTasaInteres());
            }
        }
    }

    private static void pagarCuotaMenu(Scanner scanner, GestorPrestamos gestor, String correo) {
        List<Prestamos> todos = gestor.obtenerPrestamos(correo);
        java.util.List<Prestamos> activos = new java.util.ArrayList<>();
        for (Prestamos p : todos) {
            if ("APROBADO".equalsIgnoreCase(p.getEstado()) && p.isActivo()) {
                activos.add(p);
            }
        }

        if (activos.isEmpty()) {
            System.out.println("\n[i] No tienes préstamos activos con cuotas pendientes por pagar.");
            return;
        }

        Consola.subtitulo("PAGAR CUOTA DE PRÉSTAMO");
        for (int i = 0; i < activos.size(); i++) {
            Prestamos p = activos.get(i);
            System.out.printf("%d. [%s] %s | Cuota #%d/%d | Valor: %s%n",
                    (i + 1), p.getRadicado(), p.getConcepto(),
                    (p.getCuotasPagadas() + 1), p.getMeses(), Consola.formatoCOP(p.getCuotaMensual()));
        }
        System.out.println("0. Cancelar");

        int idxP = Consola.leerEntero(scanner, "Seleccione préstamo (0-" + activos.size() + "): ", 1, activos.size());
        if (idxP <= 0) return;
        Prestamos seleccionado = activos.get(idxP - 1);

        List<Map<String, String>> cuentas = BaseDatosFinara.getInstancia()
                .getRepositorioCuentas().obtenerCuentasDebitoODeposito(correo);
        if (cuentas.isEmpty()) {
            System.out.println("[!] No tienes cuentas de ahorros o corriente disponibles para debitar el pago.");
            return;
        }

        System.out.println("\nSeleccione cuenta para debitar " + Consola.formatoCOP(seleccionado.getCuotaMensual()) + ":");
        for (int i = 0; i < cuentas.size(); i++) {
            Map<String, String> c = cuentas.get(i);
            System.out.printf("%d. %-10s %s | Saldo: %s%n",
                    (i + 1), c.get("tipo"), Consola.enmascararCuenta(c.get("numero")),
                    Consola.formatoCOP(RepositorioCuentas.parsearNumero(c.get("saldo"))));
        }
        System.out.println("0. Cancelar");

        int idxC = Consola.leerEntero(scanner, "Cuenta origen (0-" + cuentas.size() + "): ", 1, cuentas.size());
        if (idxC <= 0) return;
        Map<String, String> cuentaOrigen = cuentas.get(idxC - 1);

        if (!Consola.confirmar(scanner, "¿Confirma el pago de la cuota por " + Consola.formatoCOP(seleccionado.getCuotaMensual()) + "?")) {
            System.out.println("Pago cancelado.");
            return;
        }

        try {
            gestor.pagarCuota(correo, seleccionado, cuentaOrigen);
            System.out.println("\n[✓] ¡Cuota pagada exitosamente!");
            System.out.println("    Préstamo : " + seleccionado.getRadicado() + " (" + seleccionado.getCuotasPagadas() + "/" + seleccionado.getMeses() + ")");
            System.out.println("    Estado   : " + seleccionado.getEstado());
            System.out.println("    Saldo cuenta origen: " + Consola.formatoCOP(RepositorioCuentas.parsearNumero(cuentaOrigen.get("saldo"))));
        } catch (Exception e) {
            System.out.println("\n[X] " + e.getMessage());
        }
    }

    private static void mostrarHistorialPagos(List<Prestamos> lista) {
        Consola.subtitulo("HISTORIAL DE CUOTAS PAGADAS");
        boolean alguno = false;
        for (Prestamos p : lista) {
            if (!p.getPagosRealizados().isEmpty()) {
                alguno = true;
                System.out.println("Préstamo " + p.getRadicado() + " (" + p.getConcepto() + "):");
                for (String reg : p.getPagosRealizados()) {
                    System.out.println("  • " + reg);
                }
            }
        }
        if (!alguno) {
            System.out.println("Aún no se han registrado pagos de cuotas.");
        }
    }
}
