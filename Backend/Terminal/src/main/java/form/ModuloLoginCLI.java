package form;

import core.BaseDatosFinara;
import core.Consola;

import java.util.Map;
import java.util.Scanner;

/**
 * Interfaz CLI de autenticación (HU-02).
 * Utilizable tanto desde main.java como desde TestLogin.
 */
public class ModuloLoginCLI {

    public static void iniciar(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        iniciarSesion(scanner, baseDatosUsuarios);
    }

    /**
     * Solicita credenciales y retorna el mapa del usuario autenticado o null si falla.
     */
    public static Map<String, String> autenticarInteractivo(
            Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {

        Consola.titulo("INICIO DE SESIÓN SEGURO - FINARA BANK");
        String identificador = Consola.leerLinea(scanner, "Correo electrónico o usuario (0 para cancelar): ");
        if ("0".equals(identificador) || identificador.isEmpty()) {
            return null;
        }
        String password = Consola.leerLinea(scanner, "Contraseña: ");

        LoginService.ResultadoAutenticacion res =
                LoginService.autenticar(baseDatosUsuarios, identificador, password);

        if (baseDatosUsuarios == BaseDatosFinara.getInstancia().getUsuarios()) {
            BaseDatosFinara.guardar();
        }

        if (!res.isAutenticado()) {
            System.out.println("\n[!] " + res.getMensaje());
            if (!res.isCuentaBloqueada() && res.getIntentosRestantes() > 0 && res.getIntentosRestantes() < LoginService.MAX_INTENTOS_FALLIDOS) {
                System.out.println("    Recuerda: al 3er intento fallido la cuenta será bloqueada por seguridad.");
            }
            return null;
        }

        System.out.println("\n[✓] " + res.getMensaje());
        return res.getUsuario();
    }

    public static void iniciarSesion(Scanner scanner, Map<String, Map<String, String>> baseDatosUsuarios) {
        Map<String, String> usuario = autenticarInteractivo(scanner, baseDatosUsuarios);
        if (usuario == null) {
            return;
        }

        boolean sesionActiva = true;
        while (sesionActiva) {
            System.out.println("\n-----------------------------------------");
            System.out.println("  SESIÓN ACTIVA: " + usuario.getOrDefault("nombre", "Cliente"));
            System.out.println("-----------------------------------------");
            System.out.println("1. Gestionar Perfil");
            System.out.println("2. Gestionar Productos / Tarjetas");
            System.out.println("0. Cerrar Sesión");

            int opcion = Consola.leerEntero(scanner, "Seleccione una opción (0-2): ", 0, 2);
            switch (opcion) {
                case 1:
                    ProfileManager.iniciar(scanner, usuario);
                    break;
                case 2:
                    tarjetaPoo.GestorTarjetas.iniciar(scanner, usuario);
                    break;
                case 0:
                    sesionActiva = false;
                    System.out.println("Sesión cerrada correctamente.");
                    break;
            }
        }
    }
}
