package core;

import java.util.Map;

/**
 * Mantiene el usuario autenticado durante la sesión activa de Finara Bank.
 */
public final class Sesion {
    private static Map<String, String> usuarioActual;

    private Sesion() {
    }

    public static void iniciar(Map<String, String> usuario) {
        usuarioActual = usuario;
    }

    public static void cerrar() {
        usuarioActual = null;
    }

    public static boolean estaAutenticado() {
        return usuarioActual != null && !usuarioActual.isEmpty();
    }

    public static Map<String, String> getUsuarioActual() {
        return usuarioActual;
    }

    public static String getCorreoActual() {
        if (usuarioActual == null) {
            return "";
        }
        String correo = usuarioActual.get("correo");
        if (correo == null || correo.isEmpty()) {
            correo = usuarioActual.get("email");
        }
        return correo == null ? "" : correo.trim().toLowerCase();
    }

    public static String getNombreActual() {
        if (usuarioActual == null) {
            return "Cliente Finara";
        }
        return usuarioActual.getOrDefault("nombre", "Cliente Finara");
    }
}
