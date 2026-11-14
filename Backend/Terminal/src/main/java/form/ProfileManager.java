package form;

import core.BaseDatosFinara;
import core.Consola;
import core.RepositorioCuentas;
import core.Seguridad;

import java.util.Map;
import java.util.Scanner;

/**
 * Gestión del perfil personal del usuario autenticado.
 * Lee el número real de productos y saldo consolidado desde RepositorioCuentas.
 */
public class ProfileManager {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        gestionarPerfil(scanner, datosUsuario);
    }

    public static void gestionarPerfil(Scanner scanner, Map<String, String> datosUsuario) {
        if (datosUsuario == null || datosUsuario.isEmpty()) {
            System.out.println("[!] No hay usuario autenticado.");
            return;
        }

        String correo = datosUsuario.getOrDefault("correo", datosUsuario.getOrDefault("email", "usuario@finara.com"));
        datosUsuario.put("correo", correo);
        datosUsuario.put("email", correo);

        boolean enPerfil = true;
        while (enPerfil) {
            RepositorioCuentas repo = BaseDatosFinara.getInstancia().getRepositorioCuentas();
            int cantProductos = repo.contarProductosUsuario(correo);
            double saldoTotal = repo.calcularSaldoConsolidado(correo);
            datosUsuario.put("productosActivos", String.valueOf(cantProductos));
            datosUsuario.put("saldoDisponible", Consola.formatoCOP(saldoTotal));

            Consola.titulo("MI PERFIL - FINARA BANK");
            System.out.println("1. Ver datos personales y resumen financiero");
            System.out.println("2. Editar información personal");
            System.out.println("3. Cambiar contraseña");
            System.out.println("0. Volver");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-3): ", 0, 3);
            switch (opcion) {
                case 1:
                    verDatosPersonales(datosUsuario, cantProductos, saldoTotal);
                    break;
                case 2:
                    editarInformacionPersonal(scanner, datosUsuario);
                    break;
                case 3:
                    cambiarContrasena(scanner, datosUsuario);
                    break;
                case 0:
                    enPerfil = false;
                    break;
            }
        }
    }

    private static void verDatosPersonales(Map<String, String> datosUsuario, int cantProductos, double saldoTotal) {
        Consola.subtitulo("INFORMACIÓN PERSONAL Y FINANCIERA");
        System.out.println("Nombre completo     : " + datosUsuario.getOrDefault("nombre", "N/A"));
        System.out.println("Documento           : " + datosUsuario.getOrDefault("documento", "N/A"));
        System.out.println("Fecha de nacimiento : " + datosUsuario.getOrDefault("fechaNacimiento", "N/A"));
        System.out.println("Rol en el banco     : " + datosUsuario.getOrDefault("rol", "Cliente"));
        System.out.println("Estado de cuenta    : " + datosUsuario.getOrDefault("estado", "ACTIVA"));
        System.out.println("Productos activos   : " + cantProductos);
        System.out.println("Saldo consolidado   : " + Consola.formatoCOP(saldoTotal));

        Consola.subtitulo("DATOS DE CONTACTO");
        System.out.println("Correo electrónico  : " + datosUsuario.getOrDefault("correo", "N/A"));
        System.out.println("Usuario (username)  : " + datosUsuario.getOrDefault("username", "N/A"));
        System.out.println("Teléfono móvil      : " + datosUsuario.getOrDefault("telefono", "N/A"));
        System.out.println("Dirección           : " + datosUsuario.getOrDefault("direccion", "N/A"));
    }

    private static void editarInformacionPersonal(Scanner scanner, Map<String, String> datosUsuario) {
        Consola.subtitulo("EDITAR INFORMACIÓN PERSONAL");
        System.out.println("Deje el campo en blanco y presione Enter si no desea modificarlo.");

        String nuevoNombre = Consola.leerLinea(scanner,
                "Nombre actual (" + datosUsuario.getOrDefault("nombre", "") + "): ");
        if (!nuevoNombre.isEmpty()) {
            datosUsuario.put("nombre", nuevoNombre);
        }

        String nuevoTelefono = Consola.leerLinea(scanner,
                "Teléfono actual (" + datosUsuario.getOrDefault("telefono", "") + "): ");
        if (!nuevoTelefono.isEmpty()) {
            datosUsuario.put("telefono", nuevoTelefono);
        }

        String nuevaDireccion = Consola.leerLinea(scanner,
                "Dirección actual (" + datosUsuario.getOrDefault("direccion", "") + "): ");
        if (!nuevaDireccion.isEmpty()) {
            datosUsuario.put("direccion", nuevaDireccion);
        }

        BaseDatosFinara.guardar();
        System.out.println("[✓] Información personal actualizada correctamente.");
    }

    private static void cambiarContrasena(Scanner scanner, Map<String, String> datosUsuario) {
        Consola.subtitulo("CAMBIAR CONTRASEÑA");
        String passwordGuardada = datosUsuario.getOrDefault("password", "");

        String passActual = Consola.leerLinea(scanner, "Contraseña actual (0 para cancelar): ");
        if ("0".equals(passActual)) {
            return;
        }
        if (!Seguridad.verificarPassword(passActual, passwordGuardada)) {
            System.out.println("[!] Error: La contraseña actual ingresada es incorrecta.");
            return;
        }

        String nuevaPass = Consola.leerLinea(scanner, "Nueva contraseña (mínimo 8 caracteres): ");
        if (nuevaPass.length() < 8) {
            System.out.println("[!] Error: La nueva contraseña debe tener al menos 8 caracteres.");
            return;
        }

        if (Seguridad.verificarPassword(nuevaPass, passwordGuardada)) {
            System.out.println("[!] Error: La nueva contraseña debe ser diferente a la actual.");
            return;
        }

        String confirmPass = Consola.leerLinea(scanner, "Confirmar nueva contraseña: ");
        if (!nuevaPass.equals(confirmPass)) {
            System.out.println("[!] Error: La confirmación no coincide.");
            return;
        }

        datosUsuario.put("password", Seguridad.hashPassword(nuevaPass));
        BaseDatosFinara.guardar();
        System.out.println("[✓] Contraseña actualizada de forma segura.");
    }
}
