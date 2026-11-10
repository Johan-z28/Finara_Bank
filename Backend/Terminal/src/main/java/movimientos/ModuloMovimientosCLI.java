package movimientos;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;

/**
 * Módulo CLI interactivo para consulta de movimientos (HU-05).
 * Compatible 100% con main.java mediante iniciar(scanner, datosUsuario).
 */
public class ModuloMovimientosCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

        // Datos en memoria precargados para auditoría
        List<MovimientoFinanciero> historial = precargarHistorialDemo(datosUsuario);

        boolean enModulo = true;

        while (enModulo) {
            ServicioMovimientos.ResumenMovimientos resumen = ServicioMovimientos.calcularResumen(historial);

            System.out.println("\n=====================================================================================================================");
            System.out.println("                               MÓDULO DE CONSULTA DE MOVIMIENTOS - FINARA BANK                                       ");
            System.out.println("=====================================================================================================================");
            System.out.println(" Total Movimientos: " + resumen.getTotalTransacciones() +
                    " | Total Ingresos: " + formatoCOP.format(resumen.getTotalIngresos()) +
                    " | Total Egresos: " + formatoCOP.format(resumen.getTotalEgresos()) +
                    " | Balance Neto: " + formatoCOP.format(resumen.getBalanceNeto()));
            System.out.println("---------------------------------------------------------------------------------------------------------------------");
            System.out.println("1. Ver Todos los Movimientos");
            System.out.println("2. Filtrar por Número de Cuenta (o últimos 4 dígitos)");
            System.out.println("3. Filtrar por Tipo de Operación (INGRESO / EGRESO)");
            System.out.println("4. Filtrar por Categoría (Transferencia, Retiro, Pago, Depósito)");
            System.out.println("5. Filtrar por Periodo (Últimos 7 días / 30 días)");
            System.out.println("6. Registrar Nuevo Movimiento de Prueba");
            System.out.println("7. Volver al menú anterior");
            System.out.print("Seleccione una opción (1-7): ");

            String opcion = scanner.nextLine().trim();

            switch (opcion) {
                case "1":
                    imprimirTabla(historial, formatoCOP, dtf);
                    break;
                case "2":
                    System.out.print("Ingrese número de cuenta (ej. 7068 o 4021376783977068): ");
                    String num = scanner.nextLine().trim();
                    List<MovimientoFinanciero> porCuenta = ServicioMovimientos.consultarPorCuenta(historial, num);
                    imprimirTabla(porCuenta, formatoCOP, dtf);
                    break;
                case "3":
                    System.out.print("Seleccione tipo (1. INGRESO, 2. EGRESO): ");
                    String tipoOp = "1".equals(scanner.nextLine().trim()) ? "INGRESO" : "EGRESO";
                    List<MovimientoFinanciero> porTipo = ServicioMovimientos.filtrarPorTipoOperacion(historial, tipoOp);
                    imprimirTabla(porTipo, formatoCOP, dtf);
                    break;
                case "4":
                    System.out.print("Ingrese categoría a buscar (Transferencia, Retiro, Pago, Depósito, Rendimiento): ");
                    String cat = scanner.nextLine().trim();
                    List<MovimientoFinanciero> porCat = ServicioMovimientos.filtrarPorCategoria(historial, cat);
                    imprimirTabla(porCat, formatoCOP, dtf);
                    break;
                case "5":
                    System.out.print("Seleccione periodo (1. Últimos 7 días, 2. Últimos 30 días): ");
                    int dias = "1".equals(scanner.nextLine().trim()) ? 7 : 30;
                    List<MovimientoFinanciero> porPeriodo = ServicioMovimientos.filtrarPorRangoDias(historial, dias);
                    imprimirTabla(porPeriodo, formatoCOP, dtf);
                    break;
                case "6":
                    registrarMovimientoManual(scanner, historial);
                    break;
                case "7":
                    enModulo = false;
                    System.out.println("Saliendo del módulo de consulta de movimientos...");
                    break;
                default:
                    System.out.println("❌ Opción inválida.");
            }
        }
    }

    private static void imprimirTabla(List<MovimientoFinanciero> lista, NumberFormat formatoCOP, DateTimeFormatter dtf) {
        if (lista.isEmpty()) {
            System.out.println("\nℹ No se encontraron movimientos para los criterios seleccionados.");
            return;
        }

        System.out.println("\n+---------------------+--------------+------------+----------------+------------+----------------+----------------+------------------------------+");
        System.out.println("| Fecha y Hora        | ID Mov       | Cuenta     | Categoría      | Tipo       | Monto          | Saldo Result.  | Detalle                      |");
        System.out.println("+---------------------+--------------+------------+----------------+------------+----------------+----------------+------------------------------+");
        for (MovimientoFinanciero m : lista) {
            m.imprimirFila(formatoCOP, dtf);
        }
        System.out.println("+---------------------+--------------+------------+----------------+------------+----------------+----------------+------------------------------+");
    }

    private static void registrarMovimientoManual(Scanner scanner, List<MovimientoFinanciero> historial) {
        System.out.println("\n--- REGISTRAR MOVIMIENTO MANUAL DE PRUEBA ---");
        System.out.print("Número de cuenta (ej. 4021376783977068): ");
        String cta = scanner.nextLine().trim();
        System.out.print("Categoría (ej. Transferencia, Retiro, Depósito): ");
        String cat = scanner.nextLine().trim();
        System.out.print("Tipo (1. INGRESO, 2. EGRESO): ");
        String tipo = "1".equals(scanner.nextLine().trim()) ? "INGRESO" : "EGRESO";
        System.out.print("Monto (COP): ");
        double valor = Double.parseDouble(scanner.nextLine().trim().replaceAll("[^0-9]", ""));
        System.out.print("Saldo Resultante estimado (COP): ");
        double saldo = Double.parseDouble(scanner.nextLine().trim().replaceAll("[^0-9]", ""));
        System.out.print("Descripción del movimiento: ");
        String desc = scanner.nextLine().trim();

        String id = "MOV-" + (1000 + (int)(Math.random() * 9000));
        String ref = "REF-" + System.currentTimeMillis();

        historial.add(0, new MovimientoFinanciero(id, ref, cta, "Cuenta de Ahorros", cat, tipo, valor, saldo, LocalDateTime.now(), desc));
        System.out.println("✔ Movimiento registrado con éxito.");
    }

    private static List<MovimientoFinanciero> precargarHistorialDemo(Map<String, String> datosUsuario) {
        List<MovimientoFinanciero> lista = new ArrayList<>();
        LocalDateTime ahora = LocalDateTime.now();

        lista.add(new MovimientoFinanciero("MOV-9821", "REF-8831", "4021376783977068", "Cuenta de Ahorros", "Retiro", "EGRESO", 200000, 3300000, ahora.minusHours(3), "Retiro cajero automático"));
        lista.add(new MovimientoFinanciero("MOV-9820", "REF-8830", "4021376783977068", "Cuenta de Ahorros", "Rendimiento", "INGRESO", 3000, 3500000, ahora.minusHours(3), "Rendimiento 1.5% retiro"));
        lista.add(new MovimientoFinanciero("MOV-9755", "REF-8742", "4021376783977068", "Cuenta de Ahorros", "Transferencia", "EGRESO", 450000, 3497000, ahora.minusDays(1), "Transferencia a Carlos Gomez"));
        lista.add(new MovimientoFinanciero("MOV-9610", "REF-8601", "4021376783977068", "Cuenta de Ahorros", "Depósito", "INGRESO", 1500000, 3947000, ahora.minusDays(3), "Pago de nómina quincenal"));
        lista.add(new MovimientoFinanciero("MOV-9540", "REF-8519", "4021444455556666", "Cuenta Corriente", "Pago", "EGRESO", 800000, 4200000, ahora.minusDays(5), "Pago de servicios públicos"));
        lista.add(new MovimientoFinanciero("MOV-9420", "REF-8412", "4532100020003000", "Tarjeta de Crédito", "Avance", "EGRESO", 500000, 4500000, ahora.minusDays(10), "Avance de efectivo TC"));

        return lista;
    }
}
