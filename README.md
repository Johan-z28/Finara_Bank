# 🏦 Finara Bank — Banca Digital e Inteligencia Financiera

Plataforma web multipágina orientada a facilitar la gestión financiera personal, ofreciendo consulta de saldos, transferencias, historial de movimientos, gestión de créditos, beneficios exclusivos y asistencia financiera inteligente mediante un ChatBot integrado.

---

## 👥 Equipo de Trabajo y Roles

* **Yull Sebastián Mesa Tangarife** — QA / Scrum Master
* **Johan Zapata Cifuentes** — Frontend / Product Owner
* **Mariana Sánchez Manco** — Frontend
* **Juan Manuel Vélez Buitrago** — Backend

---

## 🛑 Descripción del Problema

Los usuarios de la banca tradicional frecuentemente enfrentan interfaces complejas, burocracia innecesaria, falta de transparencia en sus movimientos y poca claridad sobre la rentabilidad de sus productos. Además, la ausencia de un canal de soporte o asesoría financiera accesible en tiempo real impide a las personas tomar decisiones informadas sobre sus ahorros, créditos e inversiones cotidianas.

---

## 🎯 Objetivo Principal

Desarrollar una plataforma bancaria web segura, intuitiva y moderna que permita a los usuarios administrar sus cuentas de ahorros, corrientes y tarjetas de crédito, consultar movimientos en tiempo real y recibir asistencia personalizada 24/7 mediante un asistente virtual con inteligencia artificial.

---

## 📦 Alcance del Proyecto

### Lo que SÍ incluye:
* **Landing Page Interactiva:** Vista pública con presentación de productos financieros (Ahorros, Corriente, Crédito e Inversión), beneficios, simulación 3D de tarjetas y formulario de contacto.
* **Módulo de Autenticación:** Registro de nuevos usuarios y login con persistencia de sesión local (`localStorage`).
* **Panel de Control (Dashboard):** Vista principal con saludo personalizado, foto/avatar de perfil, visualización y alternancia de privacidad del saldo total.
* **Gestión de Cuentas y Secciones Independentes:**
  * Consulta de Saldos y Cuentas asociadas.
  * Transferencias entre cuentas y usuarios.
  * Historial estructurado de Movimientos.
  * Generación de códigos para Retiros sin tarjeta.
  * Solicitud y simulación de Créditos.
  * Catálogo de Beneficios, Cashback y puntos acumularles.
  * Configuración del Perfil de usuario.
* **Finara Assistant Bot:** ChatBot interactivo para orientación financiera 24/7.

### Lo que NO incluye:
* Procesamiento o transacciones monetarias bancarias reales en entornos de producción (simulación controlada en entorno de desarrollo).
* Integración directa con pasarelas de pago o redes interbancarias reales (ACH / SWIFT).
* Validación biométrica ni firmas digitales legales para la aprobación inmediata de créditos.

---

## ⚙️ Requerimientos Funcionales Principales

1. **Autenticación e Identidad:** Registro de nuevos clientes, inicio y cierre de sesión, y almacenamiento local del perfil (`userName`, `userAvatar`).
2. **Navegación Modular Multipágina (MPA):** Navegación fluida con Sidebar lateral adaptativo y Navbar superior dinámico compartidos en todas las subpáginas.
3. **Privacidad de Saldos:** Opción de ocultar/mostrar valores monetarios sensibles mediante control interactivo (`toggle eye`).
4. **Asistencia Virtual (ChatBot):** Módulo de chat interactivo integrado para resolver dudas sobre presupuesto, productos y educación financiera.
5. **Diseño Responsive:** Adaptabilidad completa para dispositivos móviles, tablets y computadoras de escritorio.

---

## 🏗️ Arquitectura y Componentes Tecnológicos

El proyecto está estructurado bajo una arquitectura modular desacoplada:

* **Interfaz de Usuario (Frontend):** Desarrollo web dinámico utilizando HTML5 semántico, CSS3 modular (con soporte de variables globales y Flexbox/Grid) y JavaScript ES6+ estructurado con arquitectura de módulos (`type="module"`).
* **Backend API:** Capa de servicios y lógica de negocio implementada con **Java (Spring Boot)** estructurada mediante arquitectura RESTful.
* **Persistencia (Base de Datos):** Base de datos relacional (MySQL / PostgreSQL) para la gestión segura de entidades (Usuarios, Cuentas, Transacciones, Créditos).

---

## 📄 Licencia y Derechos

© 2026 **Finara Bank** Todos los derechos reservados.