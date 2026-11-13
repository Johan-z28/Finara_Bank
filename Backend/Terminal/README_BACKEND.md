# Finara Bank - Backend de Consola Integrado (`Backend/Terminal`)

Documentación técnica de la auditoría e integración completa del backend de consola de **Finara Bank** en Java SE estándar (sin dependencias externas).

---

## 1. Arquitectura y Flujo Principal

El sistema se centraliza en `main.java` (orquestador), apoyado en el nuevo paquete `core` que provee un **único origen de verdad** en memoria (`BaseDatosFinara`) con persistencia automática en `Backend/Terminal/data/finara_data.bin` mediante serialización estándar de Java (`Serializable`).

```text
main.java (Orquestador)
  ├── core.Consola                  (Scanner único, entrada segura, UTF-8, formato COP)
  ├── core.BaseDatosFinara          (Singleton + persistencia finara_data.bin)
  ├── core.RepositorioCuentas       (Instancias vivas Map<String,String> por usuario)
  ├── core.RepositorioMovimientos   (Historial real INGRESO / EGRESO por usuario)
  ├── core.Sesion                   (Usuario autenticado en sesión activa)
  ├── core.Seguridad                (Hash SHA-256 + salt para contraseñas)
  │
  ├── [Menú Principal]
  │    ├── 1. Registrarse           -> form.signUp
  │    ├── 2. Iniciar sesión        -> form.LoginService (3 intentos, bloqueo, HU-02)
  │    │    └── [Menú Cliente - 12 opciones]
  │    │         ├── 1.  Dashboard                     (dashboard.ModuloDashboardCLI)
  │    │         ├── 2.  Mis cuentas / Saldos          (cuentas.ModuloCuentasCLI)
  │    │         ├── 3.  Solicitar producto            (tarjetaPoo.GestorTarjetas)
  │    │         ├── 4.  Consignar / Pagar tarjeta     (consignaciones.ModuloConsignacionesCLI)
  │    │         ├── 5.  Retirar dinero                (retiros.ModuloRetirosCLI)
  │    │         ├── 6.  Transferencia interna Finara  (transferenciasInternas.ModuloTransferenciasInternasCLI)
  │    │         ├── 7.  Transferencia interbancaria   (transferencias.ModuloTransferenciasCLI)
  │    │         ├── 8.  Consultar movimientos         (movimientos.ModuloMovimientosCLI)
  │    │         ├── 9.  Préstamos                     (Prestamos.GestorPrestamos)
  │    │         ├── 10. Finanzas personales           (Submenú 5 módulos financieros)
  │    │         ├── 11. Mis beneficios                (beneficios.ModuloBeneficiosCLI)
  │    │         └── 12. Mi perfil                     (form.ProfileManager)
  │    └── 3. Panel administrativo    -> admin.crud (autenticación previa + carga demo + desbloqueo)
```

---

## 2. Inventario de Reglas de Negocio Conservadas e Integradas

| Paquete / Módulo | Reglas de negocio conservadas | Puntos de integración en el sistema |
| :--- | :--- | :--- |
| **`form`** (`signUp`, `LoginService`, `ProfileManager`) | • Validación de correo, edad mínima 18 años (`yyyy-M-d`), contraseña ≥ 8 caracteres.<br>• Login por correo o `username`. Máximo 3 intentos fallidos (`MAX_INTENTOS_FALLIDOS = 3`) antes de bloquear la cuenta.<br>• Contraseñas almacenadas con **SHA-256 + salt** (`core.Seguridad`). | Los usuarios se almacenan en `BaseDatosFinara`. `ProfileManager` lee en tiempo real el conteo de productos y saldo consolidado desde `RepositorioCuentas`. Usuarios nuevos inician con **0 productos**. |
| **`tarjetaPoo`** (`GestorTarjetas`, `miTarjeta`) | • **Débito Finara**: aprobación automática.<br>• **Crédito Gold**: ingresos ≥ `$20.000.000` y estrato ≥ 2.<br>• **Cuenta Corriente**: ingresos ≥ `$12.000.000`. | Al aprobar una solicitud, crea el producto real en `RepositorioCuentas` (saldo inicial `$0`; en Crédito asigna `cupoMaximo`, `cupoDisponible` y `deudaActual=0`). |
| **`cuentas`** & **`consignaciones`** | • Enmascaramiento a últimos 4 dígitos.<br>• Abonos a cuentas de ahorros/corriente y pagos a deuda de tarjeta de crédito sin exceder `deudaActual` (restaurando `cupoDisponible`). | Operan directamente sobre las instancias vivas de `RepositorioCuentas` y registran movimientos reales (`INGRESO` / `EGRESO`). |
| **`retiros`** (`ServicioRetiros`) | • **Ahorros**: interés de rendimiento del `1.5%` (`TASA_INTERES_AHORROS = 0.015`).<br>• **Corriente**: sobregiro hasta `20%` (`TOPE_SOBREGIRO_CORRIENTE = 0.20`).<br>• **Crédito**: avance hasta `50%` del cupo disponible (`TOPE_AVANCE_CREDITO = 0.50`).<br>• Validación de cuenta bloqueada y saldo disponible. | Lista únicamente cuentas reales del usuario en sesión; confirma antes de ejecutar; actualiza el saldo compartido y registra movimiento `EGRESO` ("Retiro"). |
| **`transferenciasInternas`** (`ServicioTransferenciasInternas`) | • Comisión `$0` (`COMISION_INTERNA = 0.0`).<br>• Validación origen != destino, cuentas no bloqueadas, sobregiro 20% corriente, avance 50% crédito. | Busca la cuenta destino real entre todos los clientes en `RepositorioCuentas`. Debita origen, acredita destino y registra **ambos** movimientos (origen y destino). |
| **`transferencias`** (`ServicioInterbancario`) | • Comisión fija ACH `$6.500` (`COMISION_ACH = 6500.0`).<br>• Convenio con 13 bancos/billeteras ACH.<br>• Validación número destino (≥ 5 dígitos) y titular beneficiario. | Opera sobre cuenta real del cliente, solicita confirmación incluyendo comisión ACH, debita `monto + $6.500` y registra `EGRESO` en `RepositorioMovimientos`. |
| **`movimientos`** (`ServicioMovimientos`) | • Filtros por número de cuenta (completo o últimos 4), tipo (`INGRESO`/`EGRESO`), categoría y rango de días (7/30/90), más resumen consolidado. | Eliminado el historial demo precargado. Se alimenta 100% de operaciones reales guardadas en `RepositorioMovimientos`. |
| **`Prestamos`** (`GestorPrestamos`, `Prestamos`) | • Tasas mensuales: Libre `1.80%` (`TASA_LIBRE`), Vehículo `1.38%` (`TASA_VEHIVULO`), Hipotecario `1.10%` (`TASA_HIPOTECARIO`).<br>• Fórmula francesa de cuota mensual.<br>• Viabilidad: mínimo `$500.000`; `≤ $5.000.000` `APROBADO`; `≤ $30.000.000` `EN_REVISION`; `> $30.000.000` `RECHAZADO`. | Si es `APROBADO` desembolsa automáticamente en cuenta de ahorros del cliente y registra movimiento `INGRESO` ("Crédito"). Permite pagar cuotas debitando una cuenta real, actualizando `cuotasPagadas`, fecha próxima y estado `PAGADO`. |
| **`presupuestos`** (`GestorPresupuestos`) | • CRUD mensual por período `YYYY-MM`, categorías reales, ingresos vs. gastos, saldo neto y `% consumido`. | Estado persistido por usuario en `BaseDatosFinara`. Su total de ingresos mensuales alimenta automáticamente la asesoría de salud financiera. |
| **`planificacion`** (HU-30) | • Planificación financiera mensual por categorías + meta de ahorro.<br>• Estado de ejecución por categoría: `≤ 85%` Dentro del plan, `85% - 100%` Cerca del límite, `> 100%` Excedido. | Compara las asignaciones planificadas contra los egresos reales del mes tomados de `RepositorioMovimientos`. |
| **`fondoEmergencia`** (`GestorFondoEmergencia`) | • Simulador de 3x (mínima) y 6x (recomendada) sobre gastos fijos (1 a 12 meses). | Estado por usuario en `BaseDatosFinara`. Al registrar abono, debita cuenta real del usuario y registra movimiento `EGRESO`. |
| **`asesoriaEndeudamiento`** (`GestorEndeudamiento`) | • Clasificación por porcentaje de endeudamiento (`≤ 30%` Saludable, `≤ 40%` Precaución, `≤ 50%` Riesgo Alto, `> 50%` Crítico).<br>• Simulador de liquidación Avalancha vs. Bola de Nieve (máx. 600 meses). | Sin obligaciones demo. Sincroniza automáticamente préstamos activos y deudas de tarjeta (`origen = FINARA`, no eliminables manualmente). |
| **`suscripcionesPagos`** (`GestorSuscripcionesPagos`) | • Suscripciones/gastos hormiga (normalización Semanal/Mensual/Anual, pausa/cancelación y ahorro potencial).<br>• Agenda de pagos con estados `PAGADO`, `VENCIDO`, `PROXIMO` (≤ 7 días), `PENDIENTE`. | Estado por usuario en `BaseDatosFinara`. Proyecta automáticamente cuotas próximas de préstamos y pagos de tarjeta de crédito. |
| **`AsesoriaFinanciera`** (`GestorSaludFinanciera`) | • Score base 100 con reglas de liquidez (`<10%`, `10-20%`, `≥20%`), deuda (`>3x`, `0`, intermedia) y fondo de emergencia (`<1`, `1-3`, `≥3` meses). | Pre-carga automáticamente deuda total (desde `asesoriaEndeudamiento`), ahorro acumulado (desde `fondoEmergencia`) e ingresos (desde `presupuestos`), permitiendo ajuste manual. |
| **`beneficios`** (`ServicioBeneficios`) | • Catálogo de 8 beneficios Finara (`BEN-CB01`..`BEN-ENT08`) con códigos promocionales únicos y sistema de puntos (`+100` por redención). | Usuario nuevo inicia con `0` puntos. Filtra beneficios exclusivamente según los productos activos reales del usuario (`RepositorioCuentas`). |
| **`admin`** (`crud`) | • Listar, editar y eliminar clientes registrados por correo. | Requiere autenticación previa con usuario administrador (`finara_banck`, constante en `admin/crud.java`). Incluye **"Cargar datos de demostración"** y desbloqueo de usuarios bloqueados. |

---

## 3. Persistencia y Seguridad

- **Archivo de datos:** `Backend/Terminal/data/finara_data.bin`.
- **Ciclo de persistencia:** Se carga al iniciar `main.java`, se guarda tras cada operación crítica o salida del módulo, y cuenta con un *shutdown hook* para guardar al cerrar la JVM. Si el archivo no existe o está corrupto, el sistema inicia con base limpia sin arrojar excepciones no controladas.
- **Autenticación Administrativa:** Usuario `finara_banck` y contraseña constante definida e indicada con comentario explícito en `admin/crud.java` (`FinaraAdmin2026*`).
- **Hashing:** Contraseñas protegidas con SHA-256 y salt aleatorio (`core.Seguridad`).

---

## 4. Cómo Compilar y Ejecutar

### Opción A — Con Maven
Desde `Backend/Terminal`:
```bash
mvn compile exec:java
```

### Opción B — Con `javac` y `java` (Java 21+)
Desde `Backend/Terminal`:
```bash
javac -encoding UTF-8 -d out $(find src/main/java -name "*.java")
java -cp out main
```
En Windows PowerShell:
```powershell
New-Item -ItemType Directory -Force out | Out-Null
javac -encoding UTF-8 -d out (Get-ChildItem -Path src\main\java -Recurse -Filter *.java | ForEach-Object { $_.FullName })
java -cp out main
```

### Pruebas de Aceptación (Flujo Integral Automatizado)
```powershell
java -cp out core.TestFlujoIntegral
```
