import java.util.ArrayList;
import java.util.List;

public class lectorJson {

    public static List<Cuenta> obtenerTodasLasCuentas() {
        List<Cuenta> listaCuentas = new ArrayList<>();

        listaCuentas.add(new Cuenta("C001", "U001", "Cuenta de Ahorros", "123456789012", 2500000.00));
        listaCuentas.add(new Cuenta("C002", "U001", "Cuenta Corriente", "987654321098", 850000.50));
        listaCuentas.add(new Cuenta("C003", "U002", "Cuenta de Ahorros", "555566667777", 1200000.00));

        return listaCuentas;
    }
}