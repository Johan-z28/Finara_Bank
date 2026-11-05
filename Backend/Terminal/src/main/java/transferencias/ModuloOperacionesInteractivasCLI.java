package transferencias;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;

/**
 * Consola interactiva unificada de Finara Bank para:
 * - [HU-06] Transferencias Internas
 * - [HU-28] Retiro de dinero
 * - [HU-05] Consulta y filtrado de movimientos
 */
public class ModuloOperacionesInteractivasCLI {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);

        Map<String, CuentaBancaria> cuentas = new HashMap<>();
        List<MovimientoFinanciero> movimientos = new ArrayList<>();

        // Cuentas de demostración en memoria
        CuentaBancaria cta1 = new CuentaBancaria("4021376783977068", "Juan Velez", "1017200111", "AHORROS", 2500000.0, false);
        CuentaBancaria cta2 = new CuentaBancaria("4021999988887777", "Carlos Gomez", "1020304050", "AHORROS", 800000.0, false);
        CuentaBancaria ctaCte = new CuentaBancaria("4021444455556666", "Finara Tech SAS", "900123456", "CORRIENTE", 5000000.0, false);
        CuentaBancaria tcGold = new CuentaBancaria("4532100020003000", "Juan Velez", "1017200111", 5000000.0, 1500000.0, false);
        CuentaBancaria ctaBloq = new CuentaBancaria("4021111122223333", "Cuenta Bloqueada Demo", "111222333", "AHORROS", 100000.0, true);

        cuentas.put(cta1.getNumero(), cta1);
        cuentas.put(cta2.getNumero(), cta2);
        cuentas.put(ctaCte.getNumero(), ctaCte);
        cuentas.put(tcGold.getNumero(), tcGold);
        cuentas.put(ctaBloq.getNumero(), ctaBloq);

        boolean continuar = true;

        while (continuar) {
            System.out.println("\n=======================================================");
            System.out.println("              FINARA BANK - BANCA EN LÍNEA             ");
            System.out.println("=======================================================");
            System.out.println("1. Ver cuentas y saldos disponibles");
            System.out.println("2. Realizar Transferencia Interna");
            System.out.println("3. Realizar Retiro de Dinero");
            System.out.println("4. Consultar Todos los Movimientos");
            System.out.println("5. Filtrar Movimientos por Número de Cuenta");
            System.out.println("6. Filtrar Movimientos por Tipo de Operación");
            System.out.println("7. Salir");
            System.out.print("Seleccione una opción (1-7): ");

            String opc = scanner.nextLine().trim();

            switch (opc) {
                case "1":
                    mostrarCuentas(cuentas, formatoCOP);
                    break;
                case "2":
                    ejecutarTransferencia(scanner, cuentas, movimientos);
                    break;
                case "3":
                    ejecutarRetiro(scanner, cuentas, movimientos);
                    break;
                case "4":
                    mostrarHistorial(movimientos);
                    break;
                case "5":
                    System.out.print("Ingrese número de cuenta a consultar: ");
                    String num = scanner.nextLine().trim();
                    List<MovimientoFinanciero> filtrados = ServicioMovimientos.consultarPorCuenta(movimientos, num);
                    mostrarHistorial(filtrados);
                    break;
                case "6":
                    System.out.print("Ingrese tipo o categoría (Transferencia / Retiro / Avance): ");
                    String tipo = scanner.nextLine().trim();
                    List<MovimientoFinanciero> porTipo = ServicioMovimientos.filtrarPorTipo(movimientos, tipo);
                    mostrarHistorial(porTipo);
                    break;
                case "7":
                    continuar = false;
                    System.out.println("Saliendo de la consola de pruebas. ¡Hasta luego!");
                    break;
                default:
                    System.out.println("❌ Opción inválida.");
            }
        }

        scanner.close();
    }

    private static void mostrarCuentas(Map<String, CuentaBancaria> cuentas, NumberFormat formatoCOP) {
        System.out.println("\n--- CUENTAS Y PRODUCTOS EN MEMORIA ---");
        for (CuentaBancaria c : cuentas.values()) {
            System.out.println(" • Cuenta N°: " + c.getNumero() + " | Tipo: " + c.getTipo() + " | Titular: " + c.getTitular());
            if ("CREDITO".equals(c.getTipo())) {
                System.out.println("   Cupo Total: " + formatoCOP.format(c.getCupoMaximo()) +
                        " | Deuda: " + formatoCOP.format(c.getDeudaActual()) +
                        " | Cupo Disp: " + formatoCOP.format(c.getCupoDisponible()) +
                        " | Disp Retiro (50%): " + formatoCOP.format(c.getDisponibleParaOperar()) +
                        " | Estado: " + (c.isBloqueada() ? "BLOQUEADA" : "ACTIVA"));
            } else {
                System.out.println("   Saldo: " + formatoCOP.format(c.getSaldo()) +
                        " | Disp para operar: " + formatoCOP.format(c.getDisponibleParaOperar()) +
                        " | Estado: " + (c.isBloqueada() ? "BLOQUEADA" : "ACTIVA"));
            }
            System.out.println("   -------------------------------------------------");
        }
    }

    private static void ejecutarTransferencia(Scanner scanner, Map<String, CuentaBancaria> cuentas, List<MovimientoFinanciero> movimientos) {
        System.out.println("\n--- TRANSFERENCIA INTERNA ENTRE CUENTAS FINARA ---");
        System.out.print("Número de cuenta ORIGEN: ");
        String orig = scanner.nextLine().trim();
        System.out.print("Número de cuenta DESTINO: ");
        String dest = scanner.nextLine().trim();
        System.out.print("Monto a transferir: ");
        double monto = parsear(scanner.nextLine().trim());
        System.out.print("Concepto (opcional): ");
        String concepto = scanner.nextLine().trim();

        ServicioTransferenciasInternas.ResultadoTransferenciaInterna res =
                ServicioTransferenciasInternas.transferir(cuentas, movimientos, orig, dest, monto, concepto);

        if (res.isExitoso()) {
            System.out.println("\n✅ " + res.getMensaje());
            res.getComprobante().imprimirComprobante();
        } else {
            System.out.println("\n❌ ERROR: " + res.getMensaje());
        }
    }

    private static void ejecutarRetiro(Scanner scanner, Map<String, CuentaBancaria> cuentas, List<MovimientoFinanciero> movimientos) {
        System.out.println("\n--- RETIRO DE DINERO ---");
        System.out.print("Número de cuenta o tarjeta para retiro: ");
        String cuenta = scanner.nextLine().trim();
        System.out.print("Monto a retirar: ");
        double monto = parsear(scanner.nextLine().trim());
        System.out.print("Concepto (opcional): ");
        String concepto = scanner.nextLine().trim();

        ServicioRetiros.ResultadoRetiro res =
                ServicioRetiros.retirar(cuentas, movimientos, cuenta, monto, concepto);

        if (res.isExitoso()) {
            System.out.println("\n✅ " + res.getMensaje());
            res.getComprobante().imprimirComprobante();
        } else {
            System.out.println("\n❌ ERROR: " + res.getMensaje());
        }
    }

    private static void mostrarHistorial(List<MovimientoFinanciero> movimientos) {
        System.out.println("\n--- HISTORIAL DE MOVIMIENTOS ---");
        if (movimientos.isEmpty()) {
            System.out.println("No se registran movimientos para los criterios consultados.");
            return;
        }
        for (MovimientoFinanciero m : movimientos) {
            System.out.println(m);
        }
    }

    private static double parsear(String s) {
        try {
            return Double.parseDouble(s.replaceAll("[^0-9.-]", ""));
        } catch (Exception e) {
            return -1.0;
        }
    }
}

