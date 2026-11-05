package transferencias;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;

/**
 * Consola interactiva unificada de Finara Bank:
 * - Transferencias Internas (HU-06)
 * - Transferencias a Otros Bancos ACH (HU-07)
 * - Retiro de Dinero (HU-28)
 * - Consulta y Filtrado de Movimientos (HU-05)
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
            System.out.println("2. Realizar Transferencia Interna (Mismo banco)");
            System.out.println("3. Realizar Transferencia a Otro Banco (Red ACH)");
            System.out.println("4. Realizar Retiro de Dinero");
            System.out.println("5. Consultar Todos los Movimientos");
            System.out.println("6. Filtrar Movimientos por Número de Cuenta");
            System.out.println("7. Filtrar Movimientos por Tipo de Operación");
            System.out.println("8. Salir");
            System.out.print("Seleccione una opción (1-8): ");

            String opc = scanner.nextLine().trim();

            switch (opc) {
                case "1":
                    mostrarCuentas(cuentas, formatoCOP);
                    break;
                case "2":
                    ejecutarTransferenciaInterna(scanner, cuentas, movimientos);
                    break;
                case "3":
                    ejecutarTransferenciaInterbancaria(scanner, cuentas, movimientos, formatoCOP);
                    break;
                case "4":
                    ejecutarRetiro(scanner, cuentas, movimientos);
                    break;
                case "5":
                    mostrarHistorial(movimientos);
                    break;
                case "6":
                    System.out.print("Ingrese número de cuenta a consultar: ");
                    String num = scanner.nextLine().trim();
                    List<MovimientoFinanciero> filtrados = ServicioMovimientos.consultarPorCuenta(movimientos, num);
                    mostrarHistorial(filtrados);
                    break;
                case "7":
                    System.out.print("Ingrese tipo o categoría (Transferencia / Retiro / Interbancaria / Avance): ");
                    String tipo = scanner.nextLine().trim();
                    List<MovimientoFinanciero> porTipo = ServicioMovimientos.filtrarPorTipo(movimientos, tipo);
                    mostrarHistorial(porTipo);
                    break;
                case "8":
                    continuar = false;
                    System.out.println("Saliendo de la banca en línea de Finara Bank. ¡Hasta luego!");
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
                        " | Disp para operar (50%): " + formatoCOP.format(c.getDisponibleParaOperar()) +
                        " | Estado: " + (c.isBloqueada() ? "BLOQUEADA" : "ACTIVA"));
            } else {
                System.out.println("   Saldo: " + formatoCOP.format(c.getSaldo()) +
                        " | Disp para operar: " + formatoCOP.format(c.getDisponibleParaOperar()) +
                        " | Estado: " + (c.isBloqueada() ? "BLOQUEADA" : "ACTIVA"));
            }
            System.out.println("   -------------------------------------------------");
        }
    }

    private static void ejecutarTransferenciaInterna(Scanner scanner, Map<String, CuentaBancaria> cuentas, List<MovimientoFinanciero> movimientos) {
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

    private static void ejecutarTransferenciaInterbancaria(Scanner scanner, Map<String, CuentaBancaria> cuentas,
                                                          List<MovimientoFinanciero> movimientos, NumberFormat formatoCOP) {
        System.out.println("\n--- TRANSFERENCIA A OTRO BANCO (RED ACH) ---");
        System.out.print("Ingrese número de cuenta ORIGEN Finara: ");
        String numOrigen = scanner.nextLine().trim().replaceAll("\\D", "");

        if (!cuentas.containsKey(numOrigen)) {
            System.out.println("❌ La cuenta de origen no existe en Finara Bank.");
            return;
        }

        CuentaBancaria cuentaOrigen = cuentas.get(numOrigen);
        if (cuentaOrigen.isBloqueada()) {
            System.out.println("❌ La cuenta de origen se encuentra bloqueada.");
            return;
        }

        System.out.println("Seleccione el banco de destino:");
        List<String> bancos = ServicioInterbancario.BANCOS_CONVENIO_ACH;
        for (int i = 0; i < bancos.size(); i++) {
            System.out.println(" " + (i + 1) + ". " + bancos.get(i));
        }
        System.out.print("Elija el número del banco (1-" + bancos.size() + "): ");
        String opcBanco = scanner.nextLine().trim();
        String bancoSeleccionado = "";
        try {
            int idx = Integer.parseInt(opcBanco) - 1;
            if (idx >= 0 && idx < bancos.size()) {
                bancoSeleccionado = bancos.get(idx);
            }
        } catch (NumberFormatException ignored) {}

        if (bancoSeleccionado.isEmpty()) {
            System.out.println("❌ Banco inválido. Operación cancelada.");
            return;
        }

        System.out.println("Tipo de cuenta destino:");
        System.out.println(" 1. Cuenta de Ahorros");
        System.out.println(" 2. Cuenta Corriente");
        System.out.print("Opción (1-2): ");
        String tipoDestino = "2".equals(scanner.nextLine().trim()) ? "Cuenta Corriente" : "Cuenta de Ahorros";

        System.out.print("Número de cuenta destino en " + bancoSeleccionado + ": ");
        String numDestino = scanner.nextLine().trim();

        System.out.print("Nombre completo del beneficiario: ");
        String titular = scanner.nextLine().trim();

        System.out.print("Documento del beneficiario: ");
        String doc = scanner.nextLine().trim();

        System.out.print("Monto a enviar (COP): ");
        double monto = parsear(scanner.nextLine().trim());

        System.out.print("Concepto (opcional): ");
        String concepto = scanner.nextLine().trim();

        SolicitudInterbancaria solicitud = new SolicitudInterbancaria(
                bancoSeleccionado, tipoDestino, numDestino, titular, doc, monto, concepto
        );

        // Convertir a estructura compatible para reutilizar ServicioInterbancario
        Map<String, String> cuentaOrigenMap = new HashMap<>();
        cuentaOrigenMap.put("tipo", cuentaOrigen.getTipo());
        cuentaOrigenMap.put("numero", cuentaOrigen.getNumero());
        cuentaOrigenMap.put("saldo", String.valueOf((long) cuentaOrigen.getSaldo()));
        cuentaOrigenMap.put("estado", cuentaOrigen.isBloqueada() ? "BLOQUEADA" : "ACTIVA");

        ServicioInterbancario.ResultadoValidacion validacion =
                ServicioInterbancario.validarTransferenciaInterbancaria(cuentaOrigenMap, solicitud);

        if (!validacion.isValido()) {
            System.out.println("\n❌ ERROR DE VALIDACIÓN: " + validacion.getMensajeError());
            return;
        }

        System.out.println("\n--- RESUMEN PREVIO Y DESGLOSE ACH ---");
        System.out.println(" Monto enviado:      " + formatoCOP.format(monto));
        System.out.println(" Comisión ACH:       " + formatoCOP.format(validacion.getComision()));
        System.out.println(" Total a Debitar:    " + formatoCOP.format(validacion.getTotalDebitar()));
        System.out.print("¿Desea confirmar y procesar la transferencia? (S/N): ");
        String confirm = scanner.nextLine().trim();

        if (!confirm.equalsIgnoreCase("S") && !confirm.equalsIgnoreCase("SI")) {
            System.out.println("❌ Operación cancelada por el usuario.");
            return;
        }

        try {
            ComprobanteTransferencia comp = ServicioInterbancario.procesarTransferenciaInterbancaria(cuentaOrigenMap, solicitud);
            // Aplicar débito en nuestra cuenta POO
            cuentaOrigen.debitarSaldo(validacion.getTotalDebitar());

            // Registrar movimiento en HU-05
            if (movimientos != null) {
                movimientos.add(new MovimientoFinanciero(
                        "MOV-" + System.nanoTime(),
                        comp.getReferencia(),
                        cuentaOrigen.getNumero(),
                        "TRANSFERENCIA_INTERBANCARIA",
                        "Interbancaria",
                        "DEBITO",
                        validacion.getTotalDebitar(),
                        cuentaOrigen.getSaldo(),
                        LocalDateTime.now(),
                        "Transferencia ACH a " + bancoSeleccionado + " •••• " + (numDestino.length() > 4 ? numDestino.substring(numDestino.length() - 4) : numDestino) +
                                " (Comisión: " + formatoCOP.format(validacion.getComision()) + ")"
                ));
            }

            System.out.println("\n✅ Transferencia interbancaria exitosa.");
            comp.imprimirComprobante();

        } catch (Exception e) {
            System.out.println("❌ Error al procesar: " + e.getMessage());
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
