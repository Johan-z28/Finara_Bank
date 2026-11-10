package retiros;

import java.util.HashMap;
import java.util.Scanner;

/**
 * Clase ejecutable para pruebas interactivas de retiros de dinero (HU-28).
 */
public class TestRetiros {
    public static void main(String[] args) {
        System.out.println(">>> INICIANDO TEST DEL MÓDULO DE RETIRO DE DINERO (HU-28) <<<");
        Scanner scanner = new Scanner(System.in);
        ModuloRetirosCLI.iniciar(scanner, new HashMap<>());
        scanner.close();
    }
}
