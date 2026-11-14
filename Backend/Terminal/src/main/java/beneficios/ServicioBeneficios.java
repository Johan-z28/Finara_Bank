package beneficios;

import core.BaseDatosFinara;
import core.RepositorioCuentas;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Servicio encargado de la gestión, asignación por productos reales y redención de beneficios (HU-08).
 */
public class ServicioBeneficios {

    public static final int PUNTOS_POR_REDENCION = 100;
    private static final List<Beneficio> CATALOGO_GLOBAL_BENEFICIOS = new ArrayList<>();

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
     * Sincroniza sin borrar los beneficios ya asignados/redimidos y retorna la lista del cliente
     * filtrada por sus productos activos reales en RepositorioCuentas.
     */
    public static List<Beneficio> obtenerBeneficiosCliente(String correoUsuario) {
        String correo = normalizar(correoUsuario);
        sincronizarBeneficiosElegibles(correo);
        return BaseDatosFinara.getInstancia().getBeneficiosUsuario(correo);
    }

    /**
     * Agrega beneficios elegibles que correspondan a productos que el cliente posee y que aún no tenga.
     * Nunca elimina beneficios ya asignados ni borra los redimidos.
     */
    public static List<Beneficio> sincronizarBeneficiosElegibles(String correoUsuario) {
        String correo = normalizar(correoUsuario);
        BaseDatosFinara db = BaseDatosFinara.getInstancia();
        RepositorioCuentas repo = db.getRepositorioCuentas();
        List<Beneficio> actuales = db.getBeneficiosUsuario(correo);

        int totalProductos = repo.contarProductosUsuario(correo);
        if (totalProductos == 0) {
            return Collections.emptyList();
        }

        boolean tieneAhorros = repo.tieneProductoTipo(correo, "AHORROS");
        boolean tieneCredito = repo.tieneProductoTipo(correo, "CREDITO");
        boolean tieneCorriente = repo.tieneProductoTipo(correo, "CORRIENTE");

        Set<String> idsExistentes = new HashSet<>();
        for (Beneficio b : actuales) {
            idsExistentes.add(b.getIdBeneficio());
        }

        List<Beneficio> agregados = new ArrayList<>();
        for (Beneficio base : CATALOGO_GLOBAL_BENEFICIOS) {
            if (idsExistentes.contains(base.getIdBeneficio())) {
                continue;
            }
            if (esElegibleParaCliente(base.getProductoAplica(), totalProductos, tieneAhorros, tieneCredito, tieneCorriente)) {
                Beneficio copia = new Beneficio(
                        base.getIdBeneficio(),
                        base.getCategoria(),
                        base.getTitulo(),
                        base.getDescripcion(),
                        base.getProductoAplica(),
                        base.getVigencia(),
                        base.getCodigoPromocional()
                );
                actuales.add(copia);
                agregados.add(copia);
                idsExistentes.add(copia.getIdBeneficio());
            }
        }

        if (!agregados.isEmpty()) {
            BaseDatosFinara.guardar();
        }
        return agregados;
    }

    private static boolean esElegibleParaCliente(
            String productoAplica, int totalProductos,
            boolean tieneAhorros, boolean tieneCredito, boolean tieneCorriente) {

        if (totalProductos <= 0) {
            return false;
        }
        if ("Todos".equalsIgnoreCase(productoAplica)) {
            return true;
        }
        if ("Tarjeta Débito".equalsIgnoreCase(productoAplica) || "Cuenta de Ahorros".equalsIgnoreCase(productoAplica)) {
            return tieneAhorros;
        }
        if ("Tarjeta de Crédito Gold".equalsIgnoreCase(productoAplica)) {
            return tieneCredito;
        }
        if ("Tarjeta Cuenta Corriente".equalsIgnoreCase(productoAplica)) {
            return tieneCorriente;
        }
        return false;
    }

    public static int obtenerPuntosFinara(String correoUsuario) {
        return BaseDatosFinara.getInstancia().getPuntosFinara(normalizar(correoUsuario));
    }

    /**
     * Redime un beneficio disponible para el cliente y suma +100 puntos Finara.
     */
    public static boolean redimirBeneficio(String correoUsuario, String idOCodigo) {
        String correo = normalizar(correoUsuario);
        if (idOCodigo == null || idOCodigo.trim().isEmpty()) {
            return false;
        }
        List<Beneficio> lista = obtenerBeneficiosCliente(correo);
        String query = idOCodigo.trim().toUpperCase();

        for (Beneficio b : lista) {
            if ((b.getIdBeneficio().equalsIgnoreCase(query) || b.getCodigoPromocional().equalsIgnoreCase(query))
                    && !b.isRedimido()) {
                b.setRedimido(true);
                BaseDatosFinara.getInstancia().sumarPuntosFinara(correo, PUNTOS_POR_REDENCION);
                BaseDatosFinara.guardar();
                return true;
            }
        }
        return false;
    }

    public static List<Beneficio> getCatalogoGlobal() {
        return Collections.unmodifiableList(CATALOGO_GLOBAL_BENEFICIOS);
    }

    private static String normalizar(String correo) {
        return (correo == null || correo.trim().isEmpty()) ? "cliente_general" : correo.trim().toLowerCase();
    }
}
