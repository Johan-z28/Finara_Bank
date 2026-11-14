package transferenciasInternas;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;
import core.RepositorioMovimientos;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz CLI integrada para Transferencias Internas Finara (HU-06).
 * Busca destinos reales en RepositorioCuentas y registra movimientos en origen y destino.
 */
public class ModuloTransferenciasInternasCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] Debe iniciar sesión para realizar transferencias.");
            return;
        }
        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "")).toLowerCase();
        RepositorioCuentas repo = BaseDatosFinara.getInstancia().getRepositorioCuentas();
        RepositorioMovimientos repoMovs = BaseDatosFinara.getInstancia().getRepositorioMovimientos();

        boolean enModulo = true;
        while (enModulo) {
            List<Map<String, String>> misCuentas = repo.obtenerCuentasUsuario(correo);
            Consola.titulo("TRANSFERENCIAS INTERNAS FINARA ($0 COMISIÓN)");
            if (misCuentas.isEmpty()) {
                System.out.println("[!] No tienes productos activos en Finara Bank.");
                System.out.println("    Solicita primero una cuenta desde 'Solicitar producto'.");
                return;
            }

            System.out.println("1. Realizar Transferencia a Cuenta Finara (Propia o de Terceros)");
            System.out.println("2. Consultar Saldo Disponible para Transferir");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-2): ", 0, 2);
            switch (opcion) {
                case 1:
                    ejecutarTransferencia(scanner, correo, misCuentas, repo, repoMovs);
                    break;
                case 2:
                    mostrarDisponibles(misCuentas);
                    break;
                case 0:
                    enModulo = false;
                    break;
            }
        }
    }

    private static void mostrarDisponibles(List<Map<String, String>> cuentas) {
        Consola.subtitulo("DISPONIBILIDAD PARA TRANSFERENCIA");
        for (Map<String, String> c : cuentas) {
            System.out.println(" • " + c.get("tipo") + " " + Consola.enmascararCuenta(c.get("numero"))
                    + " (N° " + c.get("numero") + ") -> Disponible: "
                    + Consola.formatoCOP(ServicioTransferenciasInternas.calcularDisponible(c)));
        }
    }

    private static void ejecutarTransferencia(
            Scanner scanner,
            String correoOrigen,
            List<Map<String, String>> misCuentas,
            RepositorioCuentas repo,
            RepositorioMovimientos repoMovs) {

        System.out.println("\nSeleccione la cuenta de origen:");
        for (int i = 0; i < misCuentas.size(); i++) {
            Map<String, String> c = misCuentas.get(i);
            System.out.printf("%d. %-10s %s | Disp.: %s%n",
                    (i + 1), c.get("tipo"), Consola.enmascararCuenta(c.get("numero")),
                    Consola.formatoCOP(ServicioTransferenciasInternas.calcularDisponible(c)));
        }
        System.out.println("0. Cancelar");
        int idx = Consola.leerEntero(scanner, "Cuenta origen (0-" + misCuentas.size() + "): ", 1, misCuentas.size());
        if (idx <= 0) {
            System.out.println("Transferencia cancelada.");
            return;
        }
        Map<String, String> origen = misCuentas.get(idx - 1);

        String numDestino = Consola.leerLineaObligatoria(scanner, "Ingrese el número de cuenta Finara de destino (16 dígitos, 0 cancelar): ");
        if (numDestino == null) {
            System.out.println("Transferencia cancelada.");
            return;
        }

        Map<String, String> destino = repo.buscarCuentaPorNumero(numDestino);
        if (destino == null) {
            System.out.println("\n[X] La cuenta Finara #" + numDestino + " no existe en el sistema.");
            return;
        }
        if ("CREDITO".equalsIgnoreCase(destino.get("tipo"))) {
            System.out.println("\n[X] No es posible transferir saldo directamente hacia una Tarjeta de Crédito. Use la opción 'Consignar / Pagar tarjeta'.");
            return;
        }
        if (RepositorioCuentas.esBloqueada(destino)) {
            System.out.println("\n[X] La cuenta destino se encuentra bloqueada y no puede recibir fondos.");
            return;
        }

        String correoDestino = repo.buscarCorreoDuenoCuenta(numDestino);
        System.out.println("    Titular destino verificado: " + destino.getOrDefault("titular", "Cliente Finara")
                + " (" + destino.get("tipo") + ")");

        double monto = Consola.leerMonto(scanner, "Monto a transferir en COP (0 para cancelar): ");
        if (monto <= 0) {
            System.out.println("Transferencia cancelada.");
            return;
        }

        String concepto = Consola.leerLinea(scanner, "Concepto / referencia (opcional): ");

        ServicioTransferenciasInternas.ResultadoValidacion val =
                ServicioTransferenciasInternas.validarTransferencia(origen, destino, monto);
        if (!val.isValido()) {
            System.out.println("\n[X] VALIDACIÓN FALLIDA: " + val.getMensajeError());
            return;
        }

        System.out.println("\n--- RESUMEN Y CONFIRMACIÓN ---");
        System.out.println("Origen       : " + origen.get("tipo") + " " + Consola.enmascararCuenta(origen.get("numero")));
        System.out.println("Destino      : " + destino.getOrDefault("titular", "") + " - " + Consola.enmascararCuenta(destino.get("numero")));
        System.out.println("Monto        : " + Consola.formatoCOP(monto) + " (Comisión $0)");
        if (!Consola.confirmar(scanner, "¿Confirma ejecutar esta transferencia?")) {
            System.out.println("Transferencia cancelada por el usuario.");
            return;
        }

        try {
            ComprobanteTransferenciaInterna comp =
                    ServicioTransferenciasInternas.procesarTransferencia(origen, destino, monto, concepto);
            comp.imprimirComprobante();

            String descOrigen = (concepto.isEmpty() ? "Transferencia a " : concepto + " - ")
                    + destino.getOrDefault("titular", "Cliente Finara");
            repoMovs.registrarMovimiento(
                    correoOrigen, comp.getReferencia(), origen.get("numero"),
                    origen.get("tipo"), "Transferencia", "EGRESO", monto,
                    comp.getSaldoResultanteOrigen(), descOrigen
            );

            if (correoDestino != null && !correoDestino.isEmpty()) {
                double nuevoSaldoDest = RepositorioCuentas.parsearNumero(destino.get("saldo"));
                String descDestino = (concepto.isEmpty() ? "Transferencia recibida de " : concepto + " - de ")
                        + origen.getOrDefault("titular", "Cliente Finara");
                repoMovs.registrarMovimiento(
                        correoDestino, comp.getReferencia(), destino.get("numero"),
                        destino.get("tipo"), "Transferencia", "INGRESO", monto,
                        nuevoSaldoDest, descDestino
                );
            }
            BaseDatosFinara.guardar();
        } catch (Exception e) {
            System.out.println("\n[X] Error procesando transferencia: " + e.getMessage());
        }
    }
}
