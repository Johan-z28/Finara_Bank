package movimientos;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioMovimientos;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz CLI integrada para consulta de movimientos reales del cliente (HU-05).
 * No precarga historial demo ni permite inventar transacciones falsas.
 */
public class ModuloMovimientosCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] Debe iniciar sesión para consultar sus movimientos.");
            return;
        }
        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "")).toLowerCase();
        String titular = datosUsuario.getOrDefault("nombre", "Cliente Finara");
        RepositorioMovimientos repoMovs = BaseDatosFinara.getInstancia().getRepositorioMovimientos();

        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-CO"));
        formatoCOP.setMaximumFractionDigits(0);

        boolean enModulo = true;
        while (enModulo) {
            List<MovimientoFinanciero> historial = repoMovs.obtenerMovimientosUsuario(correo);
            ServicioMovimientos.ResumenMovimientos res = ServicioMovimientos.calcularResumen(historial);

            Consola.titulo("HISTORIAL DE MOVIMIENTOS Y TRANSACCIONES");
            System.out.println("Cliente: " + titular + " | Movimientos reales registrados: " + res.getTotalTransacciones());
            System.out.println("Ingresos: " + formatoCOP.format(res.getTotalIngresos())
                    + " | Egresos: " + formatoCOP.format(res.getTotalEgresos())
                    + " | Balance Neto: " + formatoCOP.format(res.getBalanceNeto()));
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Ver Todos los Movimientos");
            System.out.println("2. Filtrar por Número de Cuenta (o últimos 4 dígitos)");
            System.out.println("3. Filtrar por Tipo (INGRESO / EGRESO)");
            System.out.println("4. Filtrar por Categoría");
            System.out.println("5. Filtrar por Rango de Fechas (7 / 30 / 90 días)");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-5): ", 0, 5);
            switch (opcion) {
                case 1:
                    imprimirLista(historial, "TODOS LOS MOVIMIENTOS");
                    break;
                case 2:
                    String cuentaFiltro = Consola.leerLinea(scanner, "Número completo o últimos 4 dígitos: ");
                    imprimirLista(ServicioMovimientos.consultarPorCuenta(historial, cuentaFiltro),
                            "MOVIMIENTOS DE CUENTA (" + cuentaFiltro + ")");
                    break;
                case 3:
                    System.out.println("1. INGRESO  |  2. EGRESO");
                    int t = Consola.leerEntero(scanner, "Seleccione (1-2, 0 cancelar): ", 1, 2);
                    if (t == 1 || t == 2) {
                        String tipo = (t == 1) ? "INGRESO" : "EGRESO";
                        imprimirLista(ServicioMovimientos.filtrarPorTipoOperacion(historial, tipo),
                                "MOVIMIENTOS TIPO " + tipo);
                    }
                    break;
                case 4:
                    String cat = Consola.leerLinea(scanner, "Categoría (Depósito, Retiro, Transferencia, Préstamos, Crédito, Pago Tarjeta, Ahorro, ...): ");
                    imprimirLista(ServicioMovimientos.filtrarPorCategoria(historial, cat),
                            "MOVIMIENTOS CATEGORÍA: " + cat);
                    break;
                case 5:
                    int dias = Consola.leerEntero(scanner, "Rango en días (ej. 7, 30, 90): ", 1, 365);
                    if (dias > 0) {
                        imprimirLista(ServicioMovimientos.filtrarPorRangoDias(historial, dias),
                                "MOVIMIENTOS ÚLTIMOS " + dias + " DÍAS");
                    }
                    break;
                case 0:
                    enModulo = false;
                    break;
            }
        }
    }

    private static void imprimirLista(List<MovimientoFinanciero> lista, String titulo) {
        Consola.subtitulo(titulo);
        if (lista.isEmpty()) {
            System.out.println("No hay movimientos registrados que coincidan con este criterio.");
            return;
        }
        for (MovimientoFinanciero m : lista) {
            System.out.println(m.formatoResumenLinea());
        }
        ServicioMovimientos.ResumenMovimientos res = ServicioMovimientos.calcularResumen(lista);
        System.out.println("-------------------------------------------------------");
        System.out.println("Cantidad: " + res.getTotalTransacciones()
                + " | Ingresos: " + Consola.formatoCOP(res.getTotalIngresos())
                + " | Egresos: " + Consola.formatoCOP(res.getTotalEgresos()));
    }
}
