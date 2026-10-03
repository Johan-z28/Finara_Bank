import java.util.ArrayList;
import java.util.List;

public class CuentaController {

    public List<Cuenta> obtenerCuentasUsuarioAutenticado(String idUsuarioAutenticado, String idUsuarioSolicitante) {
        if (idUsuarioSolicitante == null || !idUsuarioSolicitante.equals(idUsuarioAutenticado)) {
            throw new SecurityException("Acceso no autorizado: No tiene permiso para consultar estas cuentas.");
        }

        List<Cuenta> todasLasCuentas = lectorJson.obtenerTodasLasCuentas();
        List<Cuenta> cuentasDelUsuario = new ArrayList<>();

        for (Cuenta cuenta : todasLasCuentas) {
            if (cuenta.getIdUsuario().equals(idUsuarioAutenticado)) {
                cuentasDelUsuario.add(cuenta);
            }
        }

        return cuentasDelUsuario;
    }
}