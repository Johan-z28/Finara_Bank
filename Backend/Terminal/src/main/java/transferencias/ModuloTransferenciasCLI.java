package transferencias;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;
import core.RepositorioMovimientos;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz CLI integrada para Transferencias Interbancarias ACH (HU-07).
 * Debita el saldo real del cliente (monto + $6.500 COP) y registra movimiento EGRESO.
 */
public class ModuloTransferenciasCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] Debe iniciar sesión para realizar transferencias ACH.");
            return;
        }
        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "")).toLowerCase();
        RepositorioCuentas repo = BaseDatosFinara.getInstancia().getRepositorioCuentas();
        RepositorioMovimientos repoMovs = BaseDatosFinara.getInstancia().getRepositorioMovimientos();

        boolean enModulo = true;
        while (enModulo) {
            List<Map<String, String>> cuentas = repo.obtenerCuentasUsuario(correo);
            Consola.titulo("TRANSFERENCIAS INTERBANCARIAS ACH - FINARA BANK");
            if (cuentas.isEmpty()) {
                System.out.println("[!] No tienes productos activos en este momento.");
                System.out.println("    Solicita primero una Cuenta o Tarjeta desde el menú principal.");
                return;
            }

            System.out.println("Tarifa red ACH: " + Consola.formatoCOP(ServicioInterbancario.COMISION_ACH));
            System.out.println("1. Realizar Transferencia a Otros Bancos (ACH)");
            System.out.println("2. Consultar Bancos y Billeteras en Convenio");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-2): ", 0, 2);
            switch (opcion) {
                case 1:
                    ejecutarTransferenciaACH(scanner, correo, cuentas, repoMovs);
                    break;
                case 2:
                    mostrarBancos();
                    break;
                case 0:
                    enModulo = false;
                    break;
            }
        }
    }

    private static void mostrarBancos() {
        Consola.subtitulo("ENTIDADES EN CONVENIO ACH");
        int i = 1;
        for (String b : ServicioInterbancario.BANCOS_CONVENIO_ACH) {
            System.out.println(" " + (i++) + ". " + b);
        }
    }

    private static void ejecutarTransferenciaACH(
            Scanner scanner, String correo, List<Map<String, String>> cuentas, RepositorioMovimientos repoMovs) {

        System.out.println("\nSeleccione su producto origen:");
        for (int i = 0; i < cuentas.size(); i++) {
            Map<String, String> c = cuentas.get(i);
            System.out.printf("%d. %-10s %s | Disp.: %s%n",
                    (i + 1), c.get("tipo"), Consola.enmascararCuenta(c.get("numero")),
                    Consola.formatoCOP(ServicioInterbancario.calcularDisponible(c)));
        }
        System.out.println("0. Cancelar");
        int idxCuenta = Consola.leerEntero(scanner, "Producto origen (0-" + cuentas.size() + "): ", 1, cuentas.size());
        if (idxCuenta <= 0) {
            System.out.println("Operación cancelada.");
            return;
        }
        Map<String, String> cuentaOrigen = cuentas.get(idxCuenta - 1);

        mostrarBancos();
        int totalBancos = ServicioInterbancario.BANCOS_CONVENIO_ACH.size();
        int idxBanco = Consola.leerEntero(scanner, "Seleccione entidad destino (1-" + totalBancos + ", 0 cancelar): ", 1, totalBancos);
        if (idxBanco <= 0) {
            System.out.println("Operación cancelada.");
            return;
        }
        String bancoDestino = ServicioInterbancario.BANCOS_CONVENIO_ACH.get(idxBanco - 1);

        System.out.println("Tipo de cuenta destino: 1. Ahorros  |  2. Corriente");
        int tipoOpt = Consola.leerEntero(scanner, "Seleccione (1-2, 0 cancelar): ", 1, 2);
        if (tipoOpt <= 0) {
            System.out.println("Operación cancelada.");
            return;
        }
        String tipoDestino = (tipoOpt == 2) ? "Corriente" : "Ahorros";

        String numCuentaDestino = Consola.leerLineaObligatoria(scanner, "Número de cuenta/celular destino (mín. 5 dígitos, 0 cancelar): ");
        if (numCuentaDestino == null) return;

        String titularDestino = Consola.leerLineaObligatoria(scanner, "Nombre del titular beneficiario (0 cancelar): ");
        if (titularDestino == null) return;

        String docDestino = Consola.leerLinea(scanner, "Documento del beneficiario (opcional): ");

        double monto = Consola.leerMonto(scanner, "Monto a transferir en COP (0 cancelar): ");
        if (monto <= 0) return;

        String concepto = Consola.leerLinea(scanner, "Concepto (opcional): ");

        SolicitudInterbancaria solicitud = new SolicitudInterbancaria(
                bancoDestino, tipoDestino, numCuentaDestino, titularDestino, docDestino, monto, concepto
        );

        ServicioInterbancario.ResultadoValidacion val =
                ServicioInterbancario.validarTransferenciaInterbancaria(cuentaOrigen, solicitud);
        if (!val.isValido()) {
            System.out.println("\n[X] VALIDACIÓN FALLIDA: " + val.getMensajeError());
            return;
        }

        System.out.println("\n--- RESUMEN TRANSFERENCIA ACH ---");
        System.out.println("Origen        : " + cuentaOrigen.get("tipo") + " " + Consola.enmascararCuenta(cuentaOrigen.get("numero")));
        System.out.println("Destino       : " + bancoDestino + " (" + tipoDestino + " " + Consola.enmascararCuenta(numCuentaDestino) + ")");
        System.out.println("Beneficiario  : " + titularDestino);
        System.out.println("Monto         : " + Consola.formatoCOP(monto));
        System.out.println("Comisión ACH  : " + Consola.formatoCOP(val.getComision()));
        System.out.println("Total debitar : " + Consola.formatoCOP(val.getTotalDebitar()));
        if (!Consola.confirmar(scanner, "¿Confirma realizar esta transferencia interbancaria?")) {
            System.out.println("Operación cancelada por el usuario.");
            return;
        }

        try {
            ComprobanteTransferencia comp =
                    ServicioInterbancario.procesarTransferenciaInterbancaria(cuentaOrigen, solicitud);
            comp.imprimirComprobante();

            String desc = "Transferencia ACH a " + bancoDestino + " (" + titularDestino + ")"
                    + (concepto.isEmpty() ? "" : " - " + concepto);
            repoMovs.registrarMovimiento(
                    correo, comp.getReferencia(), cuentaOrigen.get("numero"),
                    cuentaOrigen.get("tipo"), "Transferencia ACH", "EGRESO",
                    comp.getTotalDebitado(), comp.getSaldoRestante(), desc
            );
            BaseDatosFinara.guardar();
        } catch (Exception e) {
            System.out.println("\n[X] Error procesando transferencia ACH: " + e.getMessage());
        }
    }
}
