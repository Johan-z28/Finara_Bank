package presupuestos;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Servicio gestor para Presupuestos Mensuales y análisis de Regla 50/30/20 (HU-18 / HU-23).
 */
public class GestorPresupuestos {
    private static final List<String> CATEGORIAS_NECESIDADES = Arrays.asList(
            "vivienda", "alimentacion", "transporte", "educacion", "salud"
    );
    private static final List<String> CATEGORIAS_DESEOS = Arrays.asList(
            "entretenimiento", "otros_gastos"
    );

    private List<ItemPresupuesto> items;
    private AtomicInteger secuenciaId;

    public GestorPresupuestos() {
        this.items = new ArrayList<>();
        this.secuenciaId = new AtomicInteger(1);
    }

    public static class ResumenPresupuesto {
        private double totalIngresos;
        private double totalGastos;
        private double saldoNeto;
        private int porcentajeGastado;
        private boolean esDeficit;
        private boolean esSuperavit;

        // Análisis Regla 50/30/20
        private double necesidadesReal;
        private double necesidadesIdeal50;
        private double deseosReal;
        private double deseosIdeal30;
        private double ahorroReal;
        private double ahorroIdeal20;

        public ResumenPresupuesto(double totalIngresos, double totalGastos, double necesidadesReal, double deseosReal) {
            this.totalIngresos = totalIngresos;
            this.totalGastos = totalGastos;
            this.saldoNeto = totalIngresos - totalGastos;
            this.porcentajeGastado = totalIngresos > 0
                    ? (int) Math.round((totalGastos / totalIngresos) * 100.0)
                    : (totalGastos > 0 ? 100 : 0);
            this.esDeficit = this.saldoNeto < 0;
            this.esSuperavit = this.saldoNeto > 0;

            this.necesidadesReal = necesidadesReal;
            this.necesidadesIdeal50 = totalIngresos * 0.50;
            this.deseosReal = deseosReal;
            this.deseosIdeal30 = totalIngresos * 0.30;
            this.ahorroReal = Math.max(0.0, this.saldoNeto);
            this.ahorroIdeal20 = totalIngresos * 0.20;
        }

        public double getTotalIngresos() { return totalIngresos; }
        public double getTotalGastos() { return totalGastos; }
        public double getSaldoNeto() { return saldoNeto; }
        public int getPorcentajeGastado() { return porcentajeGastado; }
        public boolean isEsDeficit() { return esDeficit; }
        public boolean isEsSuperavit() { return esSuperavit; }

        public double getNecesidadesReal() { return necesidadesReal; }
        public double getNecesidadesIdeal50() { return necesidadesIdeal50; }
        public double getDeseosReal() { return deseosReal; }
        public double getDeseosIdeal30() { return deseosIdeal30; }
        public double getAhorroReal() { return ahorroReal; }
        public double getAhorroIdeal20() { return ahorroIdeal20; }
    }

    public String obtenerPeriodoActual() {
        return YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }

    public ItemPresupuesto crearItem(String username, String tipo, String categoria,
                                     String descripcion, double monto, String periodo) {
        String userNorm = normalizarUsuario(username);
        String periodoFinal = (periodo == null || periodo.trim().isEmpty()) ? obtenerPeriodoActual() : periodo.trim();
        String id = "PRE-" + System.currentTimeMillis() + "-" + secuenciaId.getAndIncrement();

        ItemPresupuesto nuevo = new ItemPresupuesto(id, userNorm, tipo, categoria, descripcion, monto, periodoFinal);
        items.add(0, nuevo);
        return nuevo;
    }

    public List<ItemPresupuesto> obtenerPorUsuarioYPeriodo(String username, String periodo) {
        String userNorm = normalizarUsuario(username);
        List<ItemPresupuesto> resultado = new ArrayList<>();

        for (ItemPresupuesto item : items) {
            boolean coincideUsuario = item.getUsername().equalsIgnoreCase(userNorm);
            boolean coincidePeriodo = (periodo == null || periodo.trim().isEmpty()) || item.getPeriodo().equals(periodo.trim());
            if (coincideUsuario && coincidePeriodo) {
                resultado.add(item);
            }
        }
        return resultado;
    }

    public ItemPresupuesto actualizarItem(String id, String tipo, String categoria,
                                          String descripcion, double monto, String periodo) {
        ItemPresupuesto objetivo = buscarPorId(id);
        if (objetivo == null) {
            throw new IllegalArgumentException("El rubro de presupuesto no existe: " + id);
        }

        if (tipo != null && !tipo.trim().isEmpty()) {
            objetivo.setTipo(tipo);
        }
        if (categoria != null && !categoria.trim().isEmpty()) {
            objetivo.setCategoria(categoria);
        }
        if (descripcion != null) {
            objetivo.setDescripcion(descripcion);
        }
        if (monto > 0) {
            objetivo.setMonto(monto);
        } else {
            throw new IllegalArgumentException("El monto debe ser mayor a cero.");
        }
        if (periodo != null && !periodo.trim().isEmpty()) {
            objetivo.setPeriodo(periodo);
        }

        return objetivo;
    }

    public boolean eliminarItem(String id) {
        ItemPresupuesto objetivo = buscarPorId(id);
        if (objetivo == null) {
            throw new IllegalArgumentException("El rubro de presupuesto no fue encontrado: " + id);
        }
        return items.remove(objetivo);
    }

    public ResumenPresupuesto calcularResumen(String username, String periodo) {
        List<ItemPresupuesto> lista = obtenerPorUsuarioYPeriodo(username, periodo);
        double totalIngresos = 0.0;
        double totalGastos = 0.0;
        double necesidades = 0.0;
        double deseos = 0.0;

        for (ItemPresupuesto item : lista) {
            if ("INGRESO".equals(item.getTipo())) {
                totalIngresos += item.getMonto();
            } else if ("GASTO".equals(item.getTipo())) {
                totalGastos += item.getMonto();
                if (CATEGORIAS_NECESIDADES.contains(item.getCategoria())) {
                    necesidades += item.getMonto();
                } else if (CATEGORIAS_DESEOS.contains(item.getCategoria())) {
                    deseos += item.getMonto();
                } else {
                    deseos += item.getMonto();
                }
            }
        }

        return new ResumenPresupuesto(totalIngresos, totalGastos, necesidades, deseos);
    }

    public ItemPresupuesto buscarPorId(String id) {
        if (id == null) return null;
        for (ItemPresupuesto item : items) {
            if (item.getId().equals(id)) {
                return item;
            }
        }
        return null;
    }

    private String normalizarUsuario(String username) {
        return (username == null || username.trim().isEmpty()) ? "juan" : username.trim().toLowerCase();
    }
}
