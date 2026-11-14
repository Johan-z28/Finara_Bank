package transferencias;

import java.util.Scanner;

public class TestTransferenciaInterbancaria {
    public static void main(String[] args) {
        System.out.println(">>> INICIANDO TEST DEL MÓDULO INTERBANCARIO ACH (HU-07) <<<");
        Scanner scanner = new Scanner(System.in);
        ModuloTransferenciasCLI.iniciar(scanner, new java.util.HashMap<>());
        scanner.close();
    }
}

