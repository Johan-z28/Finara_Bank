package Prestamos;

import core.BaseDatosFinara;
import core.Consola;

import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

/**
 * Punto de entrada compatible para pruebas aisladas del módulo de Préstamos.
 */
public class MainPrestamo {

    public static void iniciar(Scanner scanner, Map<String, String> datosUsuario) {
        GestorPrestamos.iniciar(scanner, datosUsuario);
    }

    public static void main(String[] args) {
        BaseDatosFinara.cargar();
        Map<String, String> demoUser = new HashMap<>();
        demoUser.put("nombre", "Cliente Prueba Préstamos");
        demoUser.put("correo", "pruebas.prestamos@finara.com");
        GestorPrestamos.iniciar(Consola.getScanner(), demoUser);
    }
}
