package transferencias;

import java.text.NumberFormat;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;

public class ModuloTransferenciasCLI {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        boolean enModulo = true;
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);

        Map<String, String> cuentaOrigen = new HashMap<>();
        cuentaOrigen.put("tipo", "Cuenta de Ahorros");
        cuentaOrigen.put("numero", "4021376783977068");
        cuentaOrigen.put("saldo", datosUsuario.getOrDefault("saldo", "2500000"));
        cuentaOrigen.put("estado", "ACTIVA");

        while (enModulo) {
            System.out.println("\n=======================================================");
            System.out.println("      MÓDULO DE TRANSFERENCIAS - FINARA BANK (CLI)     ");
            System.out.println("=======================================================");
            double disp = ServicioInterbancario.calcularDisponible(cuentaOrigen);
            System.out.println(" Cuenta Origen: " + cuentaOrigen.get("tipo") + " •••• " + cuentaOrigen.get("numero").substring(12));
            System.out.println(" Saldo Disponible: " + formatoCOP.format(disp));
            System.out.println("-------------------------------------------------------");
            System.out.println("1. Realizar Transferencia a Otro Banco (ACH)");
            System.out.println("2. Consultar Entidades de la Red ACH");
            System.out.println("3. Volver al menú anterior");
            System.out.print("Seleccione una opción (1-3): ");

            String opcion = scanner.nextLine().trim();

            switch (opcion) {
                case "1":
                    ejecutarFlujoInterbancario(scanner, cuentaOrigen);
                    break;
                case "2":
                    System.out.println("\n--- ENTIDADES FINANCIERAS EN CONVENIO ACH ---");
                    List<String> bancos = ServicioInterbancario.BANCOS_CONVENIO_ACH;
                    for (int i = 0; i < bancos.size(); i++) {
                        System.out.println(" [" + (i + 1) + "] " + bancos.get(i));
                    }
                    System.out.println(" Tarifa por transferencia: " + formatoCOP.format(ServicioInterbancario.COMISION_ACH) + " COP");
                    break;
                case "3":
                    enModulo = false;
                    System.out.println("Saliendo del módulo de transferencias...");
                    break;
                default:
                    System.out.println("Opción inválida. Intente de nuevo.");
            }
        }
    }

    private static void ejecutarFlujoInterbancario(Scanner scanner, Map<String, String> cuentaOrigen) {
        NumberFormat formatoCOP = NumberFormat.getCurrencyInstance(new Locale("es", "CO"));
        formatoCOP.setMaximumFractionDigits(0);

        System.out.println("\n--- PASO 1: DATOS DE LA TRANSFERENCIA INTERBANCARIA ---");
        List<String> bancos = ServicioInterbancario.BANCOS_CONVENIO_ACH;
        System.out.println("Seleccione el banco de destino:");
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
        String opcTipo = scanner.nextLine().trim();
        String tipoDestino = opcTipo.equals("2") ? "Cuenta Corriente" : "Cuenta de Ahorros";

        System.out.print("Número de cuenta destino: ");
        String numDestino = scanner.nextLine().trim();

        System.out.print("Nombre completo del beneficiario: ");
        String titular = scanner.nextLine().trim();

        System.out.print("Documento de identidad del beneficiario: ");
        String doc = scanner.nextLine().trim();

        System.out.print("Monto a transferir (COP): ");
        String montoStr = scanner.nextLine().trim().replaceAll("[^0-9]", "");
        double monto = 0;
        try {
            monto = Double.parseDouble(montoStr);
        } catch (NumberFormatException e) {
            System.out.println("❌ Monto no numérico. Operación cancelada.");
            return;
        }

        System.out.print("Concepto (opcional): ");
        String concepto = scanner.nextLine().trim();

        SolicitudInterbancaria solicitud = new SolicitudInterbancaria(
                bancoSeleccionado, tipoDestino, numDestino, titular, doc, monto, concepto
        );

        // PASO 2: Validación y Resumen Previo
        ServicioInterbancario.ResultadoValidacion validacion =
                ServicioInterbancario.validarTransferenciaInterbancaria(cuentaOrigen, solicitud);

        if (!validacion.isValido()) {
            System.out.println("\n❌ ERROR DE VALIDACIÓN: " + validacion.getMensajeError());
            return;
        }

        System.out.println("\n=======================================================");
        System.out.println("         PASO 2: RESUMEN Y DESGLOSE DE COSTOS          ");
        System.out.println("=======================================================");
        System.out.println(" Origen:            " + cuentaOrigen.get("tipo") + " (Finara Bank)");
        System.out.println(" Entidad Receptora: " + solicitud.getBancoDestino() + " (Red ACH)");
        System.out.println(" Beneficiario:      " + solicitud.getTitularBeneficiario() + " - Doc: " + solicitud.getDocumentoBeneficiario());
        System.out.println(" Cuenta Destino:    " + solicitud.getTipoCuentaDestino() + " •••• " + solicitud.getNumeroCuentaDestino());
        System.out.println(" Concepto:          " + (solicitud.getConcepto().isEmpty() ? "Sin concepto" : solicitud.getConcepto()));
        System.out.println("-------------------------------------------------------");
        System.out.println(" Monto a enviar:    " + formatoCOP.format(solicitud.getMonto()));
        System.out.println(" Tarifa de red ACH: " + formatoCOP.format(validacion.getComision()));
        System.out.println(" TOTAL A DEBITAR:   " + formatoCOP.format(validacion.getTotalDebitar()));
        double saldoPosterior = ServicioInterbancario.calcularDisponible(cuentaOrigen) - validacion.getTotalDebitar();
        System.out.println(" Saldo posterior:   " + formatoCOP.format(saldoPosterior));
        System.out.println("=======================================================");
        System.out.print("¿Desea confirmar y procesar la transferencia interbancaria? (S/N): ");
        String confirmacion = scanner.nextLine().trim();

        if (!confirmacion.equalsIgnoreCase("S") && !confirmacion.equalsIgnoreCase("SI")) {
            System.out.println("Transferencia cancelada por el usuario.");
            return;
        }

        // PASO 3: Ejecución y Comprobante
        try {
            ComprobanteTransferencia comprobante =
                    ServicioInterbancario.procesarTransferenciaInterbancaria(cuentaOrigen, solicitud);
            comprobante.imprimirComprobante();
        } catch (Exception e) {
            System.out.println("\n❌ ERROR DURANTE LA TRANSMISIÓN ACH: " + e.getMessage());
        }
    }
}
