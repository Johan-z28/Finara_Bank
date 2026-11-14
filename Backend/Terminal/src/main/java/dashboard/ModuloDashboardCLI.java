package dashboard;

import Prestamos.GestorPrestamos;
import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;
import movimientos.MovimientoFinanciero;
import suscripcionesPagos.GestorSuscripcionesPagos;
import suscripcionesPagos.PagoPendiente;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Dashboard consolidado del cliente Finara Bank.
 */
public class ModuloDashboardCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] Debe iniciar sesión para ver el Dashboard.");
            return;
        }
        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "")).toLowerCase();
        String titular = datosUsuario.getOrDefault("nombre", "Cliente Finara");

        boolean enDashboard = true;
        while (enDashboard) {
            BaseDatosFinara db = BaseDatosFinara.getInstancia();
            RepositorioCuentas repoCuentas = db.getRepositorioCuentas();
            int cantProductos = repoCuentas.contarProductosUsuario(correo);
            double saldoConsolidado = repoCuentas.calcularSaldoConsolidado(correo);
            double deudaTarjetas = repoCuentas.calcularDeudaTotalTarjetas(correo);
            double deudaPrestamos = new GestorPrestamos().calcularDeudaTotalActiva(correo);
            double deudaTotal = deudaTarjetas + deudaPrestamos;

            List<MovimientoFinanciero> ultimos5 = db.getRepositorioMovimientos().obtenerUltimos(correo, 5);
            List<PagoPendiente> pagosProximos = new GestorSuscripcionesPagos().obtenerPagosProximosOVencidos(correo);

            Consola.titulo("DASHBOARD FINARA BANK - " + titular.toUpperCase());
            System.out.println("Saldo consolidado   : " + Consola.formatoCOP(saldoConsolidado));
            System.out.println("Productos activos   : " + cantProductos);
            System.out.println("Deuda total         : " + Consola.formatoCOP(deudaTotal)
                    + " (Tarjetas: " + Consola.formatoCOP(deudaTarjetas)
                    + " | Préstamos: " + Consola.formatoCOP(deudaPrestamos) + ")");

            if (cantProductos == 0) {
                System.out.println("\n[i] Bienvenido a Finara Bank. Aún no tienes productos financieros activos.");
                System.out.println("    Usa el atajo '1. Solicitar producto' para abrir tu primera cuenta o tarjeta.");
            }

            Consola.subtitulo("ÚLTIMOS 5 MOVIMIENTOS");
            if (ultimos5.isEmpty()) {
                System.out.println("Sin movimientos reales registrados aún.");
            } else {
                for (MovimientoFinanciero m : ultimos5) {
                    System.out.println(" • " + m.formatoResumenLinea());
                }
            }

            Consola.subtitulo("PAGOS PRÓXIMOS A VENCER / VENCIDOS (" + pagosProximos.size() + ")");
            if (pagosProximos.isEmpty()) {
                System.out.println("No tienes pagos urgentes dentro de los próximos 7 días.");
            } else {
                for (PagoPendiente p : pagosProximos) {
                    System.out.printf(" • [%s] %-24s | Vence: %s | %s%n",
                            p.getEstadoPago(), p.getNombre(), p.getFechaVencimiento(), Consola.formatoCOP(p.getMonto()));
                }
            }

            System.out.println("\n--- ATAJOS RÁPIDOS ---");
            System.out.println("1. Solicitar producto       4. Transferencia interna Finara");
            System.out.println("2. Consignar / Pagar tarj.  5. Transferencia interbancaria ACH");
            System.out.println("3. Retirar dinero           6. Consultar todos mis movimientos");
            System.out.println("0. Volver al menú cliente");

            int op = Consola.leerEntero(scanner, "Seleccione atajo (0-6): ", 0, 6);
            switch (op) {
                case 1:
                    tarjetaPoo.GestorTarjetas.iniciar(scanner, datosUsuario);
                    break;
                case 2:
                    consignaciones.ModuloConsignacionesCLI.iniciar(scanner, datosUsuario);
                    break;
                case 3:
                    retiros.ModuloRetirosCLI.iniciar(scanner, datosUsuario);
                    break;
                case 4:
                    transferenciasInternas.ModuloTransferenciasInternasCLI.iniciar(scanner, datosUsuario);
                    break;
                case 5:
                    transferencias.ModuloTransferenciasCLI.iniciar(scanner, datosUsuario);
                    break;
                case 6:
                    movimientos.ModuloMovimientosCLI.iniciar(scanner, datosUsuario);
                    break;
                case 0:
                    enDashboard = false;
                    break;
            }
        }
    }
}
