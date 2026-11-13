package beneficios;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Servicio encargado de la gestión, asignación aleatoria y consulta de beneficios por cliente (HU-08).
 */
public class ServicioBeneficios {

    private static final List<Beneficio> CATALOGO_GLOBAL_BENEFICIOS = new ArrayList<>();
    // Relaciona el correo/usuario con su lista de beneficios asignados
    private static final Map<String, List<Beneficio>> REPOSITORIO_BENEFICIOS_USUARIO = new HashMap<>();

    static {
        inicializarCatalogo();
    }

    private static void inicializarCatalogo() {
        CATALOGO_GLOBAL_BENEFICIOS.add(new Beneficio("BEN-CB01", "Cashback", "5% Cashback en Supermercados", "Recibe el 5% de reembolso en todas tus compras de víveres los fines de semana.", "Tarjeta Débito", "31/12/2026", "SUPER5-FINARA"));
        CATALOGO_GLOBAL_BENEFICIOS.add(new Beneficio("BEN-DS02", "Descuento", "30% OFF en Restaurantes Aliados", "Disfruta de descuento directo en restaurantes gourmet seleccionados pagando con Finara.", "Tarjeta de Crédito Gold", "15/12/2026", "GOURMET30"));
        CATALOGO_GLOBAL_BENEFICIOS.add(new Beneficio("BEN-PT03", "Puntos Finara", "Doble Puntaje en Compras Online", "Acumula 2x puntos por cada $1.000 COP facturados en tiendas virtuales nacionales.", "Tarjeta de Crédito Gold", "30/11/2026", "PUNTOS2X"));
        CATALOGO_GLOBAL_BENEFICIOS.add(new Beneficio("BEN-TS04", "Tasa Preferencial", "0% Tasa de Interés en Avances", "Primer avance del mes con 0% de interés si se cancela en menos de 15 días.", "Tarjeta Cuenta Corriente", "31/12/2026", "AVANCE0"));
        CATALOGO_GLOBAL_BENEFICIOS.add(new Beneficio("BEN-SG05", "Seguro", "Seguro de Protección de Compras", "Cobertura gratuita de hasta $2.000.000 COP contra daño accidental o robo por 90 días.", "Todos", "Vigencia Anual", "PROTEC-FINARA"));
        CATALOGO_GLOBAL_BENEFICIOS.add(new Beneficio("BEN-VIA06", "Viajes", "Acceso VIP a Salas Lounge", "2 pases de cortesía para salas VIP en aeropuertos nacionales por compras superiores a $500.000.", "Tarjeta de Crédito Gold", "31/01/2027", "VIPPASS-2026"));
        CATALOGO_GLOBAL_BENEFICIOS.add(new Beneficio("BEN-CST07", "Exención", "0 Comisión en Transferencias ACH", "Exención total del cobro de transferencias interbancarias ilimitadas por 3 meses.", "Cuenta de Ahorros", "28/02/2027", "ACH-FREE"));
        CATALOGO_GLOBAL_BENEFICIOS.add(new Beneficio("BEN-ENT08", "Entretenimiento", "2x1 en Boletas de Cine", "Paga una entrada y lleva la segunda gratis todos los miércoles en cines del país.", "Tarjeta Débito", "30/12/2026", "CINE2X1"));
    }

    /**
     * Obtiene los beneficios asignados al cliente. Si no tiene, se le generan de forma aleatoria.
     */
    public static List<Beneficio> obtenerBeneficiosCliente(String correoUsuario) {
        if (correoUsuario == null || correoUsuario.trim().isEmpty()) {
            correoUsuario = "cliente_general";
        }
        correoUsuario = correoUsuario.trim().toLowerCase();

        if (!REPOSITORIO_BENEFICIOS_USUARIO.containsKey(correoUsuario) || REPOSITORIO_BENEFICIOS_USUARIO.get(correoUsuario).isEmpty()) {
            generarBeneficiosAleatoriosParaUsuario(correoUsuario, 3);
        }

        return REPOSITORIO_BENEFICIOS_USUARIO.get(correoUsuario);
    }

    /**
     * Genera beneficios de forma aleatoria para el usuario a partir del catálogo global.
     */
    public static List<Beneficio> generarBeneficiosAleatoriosParaUsuario(String correoUsuario, int cantidad) {
        if (correoUsuario == null || correoUsuario.trim().isEmpty()) {
            correoUsuario = "cliente_general";
        }
        correoUsuario = correoUsuario.trim().toLowerCase();

        List<Beneficio> pool = new ArrayList<>(CATALOGO_GLOBAL_BENEFICIOS);
        Collections.shuffle(pool, new Random());

        int n = Math.min(cantidad, pool.size());
        List<Beneficio> asignados = new ArrayList<>();

        for (int i = 0; i < n; i++) {
            Beneficio base = pool.get(i);
            // Crear instancia fresca para el usuario
            Beneficio b = new Beneficio(
                    base.getIdBeneficio(),
                    base.getCategoria(),
                    base.getTitulo(),
                    base.getDescripcion(),
                    base.getProductoAplica(),
                    base.getVigencia(),
                    base.getCodigoPromocional()
            );
            asignados.add(b);
        }

        REPOSITORIO_BENEFICIOS_USUARIO.put(correoUsuario, asignados);
        return asignados;
    }

    /**
     * Redime un beneficio asignado al usuario mediante su ID o código promocional.
     */
    public static boolean redimirBeneficio(String correoUsuario, String idOCodigo) {
        List<Beneficio> lista = obtenerBeneficiosCliente(correoUsuario);
        if (lista == null || idOCodigo == null) return false;

        String query = idOCodigo.trim().toUpperCase();
        for (Beneficio b : lista) {
            if ((b.getIdBeneficio().equalsIgnoreCase(query) || b.getCodigoPromocional().equalsIgnoreCase(query)) && !b.isRedimido()) {
                b.setRedimido(true);
                return true;
            }
        }
        return false;
    }

    public static List<Beneficio> getCatalogoGlobal() {
        return Collections.unmodifiableList(CATALOGO_GLOBAL_BENEFICIOS);
    }
}
