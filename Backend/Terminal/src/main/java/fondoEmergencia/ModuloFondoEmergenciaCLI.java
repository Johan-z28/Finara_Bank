package fondoEmergencia;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz de terminal (CLI) integrada para el módulo Fondo de Emergencia (HU-19).
 */
public class ModuloFondoEmergenciaCLI {
    private final GestorFondoEmergencia gestor;
    private final Scanner scanner;

    public ModuloFondoEmergenciaCLI() {
        this(Consola.getScanner());
    }

    public ModuloFondoEmergenciaCLI(Scanner scanner) {
        this.gestor = new GestorFondoEmergencia();
        this.scanner = scanner != null ? scanner : Consola.getScanner();
    }

    public static void main(String[] args) {
        BaseDatosFinara.cargar();
        ModuloFondoEmergenciaCLI cli = new ModuloFondoEmergenciaCLI(Consola.getScanner());
        cli.iniciar("Juan");
    }

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        String correo = datosUsuario != null
                ? datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "Juan"))
                : "Juan";
        ModuloFondoEmergenciaCLI cli = new ModuloFondoEmergenciaCLI(scanner);
        cli.iniciar(correo);
    }

    public void iniciar(String usuarioActivo) {
        String usuario = (usuarioActivo != null && !usuarioActivo.trim().isEmpty()) ? usuarioActivo : "Juan";
        boolean salir = false;

        while (!salir) {
            Consola.titulo("FINARA FINANZAS - FONDO DE EMERGENCIA (HU-19)");
            System.out.println("Usuario: " + usuario);
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Ver estado y progreso del Fondo de Emergencia");
            System.out.println("2. Simular meta sugerida (3 a 12 meses de gastos fijos)");
            System.out.println("3. Configurar / Actualizar meta y cuenta vinculada");
            System.out.println("4. Registrar abono al fondo (debitando cuenta real)");
            System.out.println("5. Proyectar tiempo para alcanzar la meta");
            System.out.println("6. Eliminar meta actual");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-6): ", 0, 6);
            switch (opcion) {
                case 1:
                    verEstadoFondo(usuario);
                    break;
                case 2:
                    simularMetaSugerida();
                    break;
                case 3:
                    configurarMeta(usuario);
                    break;
                case 4:
                    registrarAbono(usuario);
                    break;
                case 5:
                    proyectarTiempoMeta(usuario);
                    break;
                case 6:
                    eliminarMeta(usuario);
                    break;
                case 0:
                    salir = true;
                    break;
            }
        }
    }

    private void verEstadoFondo(String usuario) {
        FondoEmergencia fondo = gestor.obtenerMetaUsuario(usuario);
        if (fondo == null) {
            System.out.println("\n[!] Aún no tienes una meta configurada. Usa la opción 3 para crear tu Fondo de Emergencia.");
            return;
        }

        Consola.subtitulo("RESUMEN DEL FONDO DE EMERGENCIA");
        System.out.println("ID Meta             : " + fondo.getId());
        System.out.println("Estado de Seguridad : " + fondo.getNivelSeguridad());
        System.out.println("Meta Definida       : " + Consola.formatoCOP(fondo.getMetaMonto()) + " (" + fondo.getMesesCobertura() + " meses)");
        System.out.println("Gastos Fijos Base   : " + Consola.formatoCOP(fondo.getGastosFijosMensuales()));
        System.out.println("Cuenta Vinculada    : " + fondo.getCuentaVinculadaId() + " (" + Consola.enmascararCuenta(fondo.getCuentaVinculadaNumero()) + ")");
        System.out.println("Saldo en Fondo      : " + Consola.formatoCOP(fondo.getSaldoActual()));
        System.out.println("Avance              : " + fondo.getPorcentajeReal() + "% (Barra: " + fondo.getPorcentajeAvance() + "%)");
        System.out.println("Monto Faltante      : " + Consola.formatoCOP(fondo.getMontoFaltante()));
        System.out.printf("Meses Cubiertos     : %.1f meses%n", fondo.getMesesCubiertos());
        System.out.println("Última Actualización: " + fondo.getFechaActualizacion());
    }

    private void simularMetaSugerida() {
        Consola.subtitulo("SIMULADOR DE FONDO SUGERIDO");
        double gastos = Consola.leerMonto(scanner, "Gastos fijos mensuales promedio en COP (0 cancelar): ");
        if (gastos <= 0) return;

        int meses = Consola.leerEnteroConDefecto(scanner, "Meses de cobertura deseados (1-12, Enter=6): ", 6, 1, 12);

        GestorFondoEmergencia.ResultadoSimulacion res = gestor.calcularFondoSugerido(gastos, meses);
        System.out.println("\nResultados de la Simulación:");
        System.out.println(" - Gastos Fijos Base          : " + Consola.formatoCOP(res.getGastosFijosMensuales()));
        System.out.println(" - Cobertura Mínima (3 meses) : " + Consola.formatoCOP(res.getCoberturaMinima()));
        System.out.println(" - Cobertura Ideal (6 meses)  : " + Consola.formatoCOP(res.getCoberturaRecomendada()));
        System.out.println(" - Meta Sugerida (" + res.getMesesCobertura() + " meses)   : " + Consola.formatoCOP(res.getTotalSugerido()));
    }

    private void configurarMeta(String usuario) {
        Consola.subtitulo("CONFIGURAR / ACTUALIZAR META");
        double gastos = Consola.leerMonto(scanner, "Gastos fijos mensuales estimados en COP (0 cancelar): ");
        if (gastos <= 0) return;

        int meses = Consola.leerEnteroConDefecto(scanner, "Meses de cobertura objetivo (1-12, Enter=6): ", 6, 1, 12);
        double metaSugerida = gastos * meses;
        System.out.println("Meta sugerida calculada: " + Consola.formatoCOP(metaSugerida));
        double metaOpt = Consola.leerMontoOpcional(scanner, "Meta definitiva en COP (Enter para usar la sugerida): ");
        double metaDefinitiva = (metaOpt <= 0) ? metaSugerida : metaOpt;

        RepositorioCuentas repo = BaseDatosFinara.getInstancia().getRepositorioCuentas();
        List<Map<String, String>> cuentas = repo.obtenerCuentasDebitoODeposito(usuario);
        String ctaId;
        String ctaNum;
        if (!cuentas.isEmpty()) {
            System.out.println("\nSeleccione la cuenta vinculada para aportes al fondo:");
            for (int i = 0; i < cuentas.size(); i++) {
                Map<String, String> c = cuentas.get(i);
                System.out.printf("%d. %-10s %s | Saldo: %s%n",
                        (i + 1), c.get("tipo"), Consola.enmascararCuenta(c.get("numero")),
                        Consola.formatoCOP(RepositorioCuentas.parsearNumero(c.get("saldo"))));
            }
            int idx = Consola.leerEntero(scanner, "Cuenta (1-" + cuentas.size() + ", 0 cancelar): ", 1, cuentas.size());
            if (idx <= 0) return;
            Map<String, String> sel = cuentas.get(idx - 1);
            ctaId = sel.get("tipo");
            ctaNum = sel.get("numero");
        } else {
            ctaId = "SIN_CUENTA";
            ctaNum = "0000";
        }

        double saldoActualPrevio = gestor.obtenerMetaUsuario(usuario) != null
                ? gestor.obtenerMetaUsuario(usuario).getSaldoActual() : 0.0;

        try {
            FondoEmergencia guardado = gestor.guardarMetaUsuario(usuario, metaDefinitiva, gastos, meses, ctaId, ctaNum, saldoActualPrevio);
            BaseDatosFinara.guardar();
            System.out.println("\n[✓] Meta guardada exitosamente (" + guardado.getId() + "). Avance actual: " + guardado.getPorcentajeReal() + "%");
        } catch (IllegalArgumentException e) {
            System.out.println("[!] Error: " + e.getMessage());
        }
    }

    private void registrarAbono(String usuario) {
        FondoEmergencia fondo = gestor.obtenerMetaUsuario(usuario);
        if (fondo == null) {
            System.out.println("\n[!] Primero debes configurar una meta (opción 3).");
            return;
        }

        List<Map<String, String>> cuentas = BaseDatosFinara.getInstancia()
                .getRepositorioCuentas().obtenerCuentasDebitoODeposito(usuario);
        if (cuentas.isEmpty()) {
            System.out.println("\n[!] Necesitas tener al menos una Cuenta de Ahorros o Corriente activa con saldo para realizar abonos reales.");
            return;
        }

        System.out.println("\nSeleccione la cuenta origen para el abono:");
        for (int i = 0; i < cuentas.size(); i++) {
            Map<String, String> c = cuentas.get(i);
            System.out.printf("%d. %-10s %s | Saldo: %s%n",
                    (i + 1), c.get("tipo"), Consola.enmascararCuenta(c.get("numero")),
                    Consola.formatoCOP(RepositorioCuentas.parsearNumero(c.get("saldo"))));
        }
        int idx = Consola.leerEntero(scanner, "Cuenta origen (1-" + cuentas.size() + ", 0 cancelar): ", 1, cuentas.size());
        if (idx <= 0) return;
        Map<String, String> cuentaOrigen = cuentas.get(idx - 1);

        double abono = Consola.leerMonto(scanner, "Valor del abono en COP (0 cancelar): ");
        if (abono <= 0) return;

        if (!Consola.confirmar(scanner, "¿Confirma transferir " + Consola.formatoCOP(abono) + " al Fondo de Emergencia?")) {
            return;
        }

        try {
            FondoEmergencia actualizado = gestor.registrarAbonoDesdeCuenta(usuario, abono, cuentaOrigen);
            System.out.println("[✓] Abono registrado. Saldo del fondo: " + Consola.formatoCOP(actualizado.getSaldoActual())
                    + " (" + actualizado.getPorcentajeReal() + "% de la meta).");
        } catch (Exception e) {
            System.out.println("[X] " + e.getMessage());
        }
    }

    private void proyectarTiempoMeta(String usuario) {
        FondoEmergencia fondo = gestor.obtenerMetaUsuario(usuario);
        if (fondo == null) {
            System.out.println("\n[!] Primero debes configurar una meta (opción 3).");
            return;
        }
        double faltante = fondo.getMontoFaltante();
        if (faltante <= 0) {
            System.out.println("\n[✓] ¡Ya alcanzaste el 100% de tu Fondo de Emergencia!");
            return;
        }

        System.out.println("\nMonto faltante para completar tu meta: " + Consola.formatoCOP(faltante));
        double aporte = Consola.leerMonto(scanner, "¿Cuánto planeas aportar mensualmente? (0 cancelar): ");
        if (aporte <= 0) return;

        int mesesEstimados = gestor.simularMesesParaMeta(faltante, aporte);
        System.out.println("Con aportes mensuales de " + Consola.formatoCOP(aporte)
                + ", completarás tu Fondo de Emergencia en aproximadamente " + mesesEstimados + " mes(es).");
    }

    private void eliminarMeta(String usuario) {
        if (Consola.confirmar(scanner, "¿Estás seguro de eliminar tu meta de Fondo de Emergencia?")) {
            if (gestor.eliminarMetaUsuario(usuario)) {
                BaseDatosFinara.guardar();
                System.out.println("[✓] Meta eliminada correctamente.");
            } else {
                System.out.println("[!] No había ninguna meta configurada.");
            }
        }
    }
}
