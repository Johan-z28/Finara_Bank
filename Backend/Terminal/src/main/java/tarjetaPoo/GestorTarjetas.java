package tarjetaPoo;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;

import java.util.List;
import java.util.Map;
import java.util.Scanner;

/**
 * Gestor de solicitud y consulta de productos y tarjetas Finara Bank.
 * Al aprobar una solicitud crea el producto real compartido en RepositorioCuentas.
 */
public class GestorTarjetas {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        gestionarMenuTarjetas(scanner, datosUsuario);
    }

    public static void gestionarMenuTarjetas(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] Debe iniciar sesión para gestionar sus productos.");
            return;
        }
        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "usuario@finara.com")).toLowerCase();
        String titular = datosUsuario.getOrDefault("nombre", "Cliente Finara");

        boolean continuar = true;
        while (continuar) {
            Consola.titulo("SOLICITUD Y GESTIÓN DE PRODUCTOS Y TARJETAS");
            System.out.println("Cliente: " + titular + " (" + correo + ")");
            System.out.println("1. Solicitar nuevo producto / tarjeta");
            System.out.println("2. Ver mis productos y tarjetas activos");
            System.out.println("0. Volver al menú anterior");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-2): ", 0, 2);
            switch (opcion) {
                case 1:
                    solicitarTarjeta(scanner, correo, titular, datosUsuario);
                    break;
                case 2:
                    verMisTarjetas(correo);
                    break;
                case 0:
                    continuar = false;
                    break;
            }
        }
    }

    private static void solicitarTarjeta(Scanner scanner, String correo, String titular, Map<String, String> datosUsuario) {
        Consola.subtitulo("CATÁLOGO DE PRODUCTOS FINARA");
        System.out.println("1. Tarjeta Débito + Cuenta de Ahorros Finara (Aprobación inmediata)");
        System.out.println("2. Tarjeta de Crédito Gold (Ingresos mínimos: " + Consola.formatoCOP(20000000) + ", Estrato >= 2)");
        System.out.println("3. Tarjeta Cuenta Corriente (Ingresos mínimos: " + Consola.formatoCOP(12000000) + ")");
        System.out.println("0. Cancelar");

        int tipoOp = Consola.leerEntero(scanner, "Seleccione el producto deseado (0-3): ", 0, 3);
        if (tipoOp <= 0) {
            System.out.println("Solicitud cancelada.");
            return;
        }

        double ingresos = Consola.leerMonto(scanner, "Ingrese sus ingresos mensuales en COP (ej. 3500000, 0 para cancelar): ");
        if (ingresos <= 0) {
            System.out.println("Solicitud cancelada.");
            return;
        }

        int estrato = Consola.leerEntero(scanner, "Ingrese su estrato socioeconómico (1-6, 0 para cancelar): ", 1, 6);
        if (estrato <= 0) {
            System.out.println("Solicitud cancelada.");
            return;
        }

        miTarjeta nuevaTarjeta;
        String tipoCuentaCrear;
        double cupo = 0.0;

        if (tipoOp == 1) {
            nuevaTarjeta = new TarjetaDebito();
            tipoCuentaCrear = "AHORROS";
        } else if (tipoOp == 2) {
            nuevaTarjeta = new TarjetaCredito();
            tipoCuentaCrear = "CREDITO";
            cupo = Math.min(50_000_000.0, Math.max(5_000_000.0, ingresos * 0.5));
        } else {
            nuevaTarjeta = new TarjetaCorriente();
            tipoCuentaCrear = "CORRIENTE";
        }

        if (!nuevaTarjeta.validarYAprobar(ingresos, estrato)) {
            System.out.println("\n[X] Solicitud rechazada para: " + nuevaTarjeta.getTitulo());
            System.out.println("    Motivo: No cumple con las políticas de ingresos o estrato exigidas.");
            return;
        }

        BaseDatosFinara db = BaseDatosFinara.getInstancia();
        RepositorioCuentas repo = db.getRepositorioCuentas();
        Map<String, String> cuentaAsociada;

        if ("AHORROS".equals(tipoCuentaCrear)) {
            Map<String, String> ahorrosExistente = repo.buscarCuentaAhorrosActiva(correo);
            if (ahorrosExistente != null && !"si".equalsIgnoreCase(ahorrosExistente.get("tieneDebito"))) {
                cuentaAsociada = ahorrosExistente;
                cuentaAsociada.put("tieneDebito", "si");
            } else {
                cuentaAsociada = repo.crearCuenta(correo, titular, "AHORROS", 0.0, 0.0);
                cuentaAsociada.put("tieneDebito", "si");
            }
        } else {
            cuentaAsociada = repo.crearCuenta(correo, titular, tipoCuentaCrear, 0.0, cupo);
        }

        nuevaTarjeta.setNumeroTarjeta(cuentaAsociada.get("numero"));
        db.getTarjetasUsuario(correo).add(nuevaTarjeta);
        datosUsuario.put("productosActivos", String.valueOf(repo.contarProductosUsuario(correo)));
        BaseDatosFinara.guardar();

        System.out.println("\n[✓] ¡FELICIDADES! Su producto ha sido APROBADO y activado:");
        System.out.println("    Producto : " + nuevaTarjeta.getTitulo());
        System.out.println("    Cuenta N°: " + Consola.enmascararCuenta(cuentaAsociada.get("numero"))
                + " (N° completo: " + cuentaAsociada.get("numero") + ")");
        if ("CREDITO".equals(tipoCuentaCrear)) {
            System.out.println("    Cupo aprobado: " + Consola.formatoCOP(cupo));
        } else {
            System.out.println("    Saldo inicial: " + Consola.formatoCOP(RepositorioCuentas.parsearNumero(cuentaAsociada.get("saldo"))));
        }
    }

    private static void verMisTarjetas(String correo) {
        BaseDatosFinara db = BaseDatosFinara.getInstancia();
        List<miTarjeta> tarjetas = db.getTarjetasUsuario(correo);
        RepositorioCuentas repo = db.getRepositorioCuentas();
        List<Map<String, String>> cuentas = repo.obtenerCuentasUsuario(correo);

        Consola.subtitulo("MIS PRODUCTOS Y TARJETAS ACTIVOS");
        if (tarjetas.isEmpty() && cuentas.isEmpty()) {
            System.out.println("Aún no tienes productos ni tarjetas activos.");
            System.out.println("Usa la opción 1 para solicitar tu primera Tarjeta Débito, Corriente o Crédito Gold.");
            return;
        }

        for (miTarjeta t : tarjetas) {
            System.out.println(" • " + t.getTitulo() + " | Producto " + Consola.enmascararCuenta(t.getNumeroTarjeta()));
        }
        System.out.println("-------------------------------------------------------");
        System.out.println("Total productos registrados: " + cuentas.size());
    }
}
