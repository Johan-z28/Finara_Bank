package movimientos;

import java.util.HashMap;
import java.util.Scanner;

/**
 * Clase ejecutable para pruebas interactivas de consulta de movimientos (HU-05).
 */
public class TestMovimientos {
    public static void main(String[] args) {
        System.out.println(">>> INICIANDO TEST DEL MÓDULO DE CONSULTA DE MOVIMIENTOS (HU-05) <<<");
        Scanner scanner = new Scanner(System.in);
        ModuloMovimientosCLI.iniciar(scanner, new HashMap<>());
        scanner.close();
    }
}
