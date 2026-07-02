# Especificación de Requisitos de Software (IEEE 830)
## Proyecto: JCueScore - Sistema de Gestión y Marcadores Deportivos (Billar)

---

### 1. Introducción

#### 1.1 Propósito
El propósito de este documento es definir las especificaciones de los requisitos del software (SRS) para el sistema "JCueScore". Este documento servirá como guía para los desarrolladores, administradores del sistema y el cliente final, detallando qué hará el sistema y cuáles son sus restricciones.

#### 1.2 Alcance del Sistema
JCueScore es una plataforma integral (Frontend en Angular, Backend en NestJS) para la gestión de salas de billar deportivo (Tres Bandas, Pool, etc.). Permite gestionar en tiempo real los marcadores de múltiples mesas, realizar un seguimiento de los turnos, gestionar ventas/consumos de productos (tienda), controlar cuentas y deudas de los jugadores, y notificar eventos en vivo a través de WebSockets. 

#### 1.3 Definiciones, Acrónimos y Abreviaturas
- **SPA:** Single Page Application (Aplicación de Página Única).
- **WS:** WebSockets (Tecnología para comunicación en tiempo real).
- **Garitero:** Rol de usuario administrador/gestor del local encargado de abrir mesas, cobrar y vender productos.
- **Mesa:** Dispositivo o pantalla asignada a una mesa física de billar donde se visualiza el marcador en tiempo real.
- **API REST:** Interfaz de Programación de Aplicaciones basada en el protocolo HTTP.

#### 1.4 Referencias
- Estándar IEEE 830-1998 para Especificación de Requisitos de Software.

---

### 2. Descripción General

#### 2.1 Perspectiva del Producto
El sistema funciona bajo una arquitectura Cliente-Servidor:
1. **Frontend (Cliente):** Interfaz web dividida en dos grandes módulos: el *Panel del Garitero* (para gestión de mesas y ventas) y la *Vista de Mesa* (marcador digital para jugadores).
2. **Backend (Servidor):** API construida en NestJS que procesa la lógica de negocio, persiste la información (PostgreSQL/MySQL) y orquesta la comunicación bidireccional mediante WebSockets.

#### 2.2 Funciones del Producto
- **Gestión de Partidas:** Creación, configuración, pausa y finalización de partidas de billar.
- **Marcador en Tiempo Real:** Actualización de puntos, turnos, promedios y rachas con visualización responsiva (E-Sports style).
- **Tienda y Consumo:** Catálogo de productos, adición de consumos a la cuenta de una mesa o jugador.
- **Gestión de Cuentas y Deudas:** Sistema para liquidar el costo de la mesa por tiempo, sumar consumos y asignar deudas a perfiles de usuarios.
- **Gestión de Usuarios (Roles):** Control de acceso (Garitero, Administrador).

#### 2.3 Características de los Usuarios
- **Garitero/Cajero:** Usuario con conocimientos básicos de ofimática, encargado del flujo de caja, asignación de mesas y despacho de productos.
- **Jugadores:** Usuarios finales que interactúan con la interfaz táctil de la pantalla de la mesa para sumar puntos o pedir productos. Necesitan una interfaz altamente intuitiva y botones grandes (Touch-friendly).

#### 2.4 Restricciones Generales
- El sistema requiere de una red local estable o conexión a internet continua para el funcionamiento de los WebSockets.
- Las vistas de mesas deben funcionar en pantallas de tablets (orientación vertical y horizontal).

---

### 3. Requisitos Específicos

#### 3.1 Interfaces Externas
- **Interfaz de Usuario (UI):** Diseño Premium, neón/oscuro (Dark Mode) con componentes *Glassmorphism* para marcadores, y paneles de administración claros y fluidos para el garitero.
- **Interfaz de Hardware:** Pantallas táctiles en las mesas.
- **Interfaces de Comunicación:** Uso de WebSockets para mantener la sincronización en menos de 100ms entre la mesa y el panel del garitero.

#### 3.2 Requisitos Funcionales

**Módulo de Gestión de Mesas (Partidas)**
- **RF-01:** El garitero debe poder visualizar el estado en tiempo real de todas las mesas (Ocupada, Libre, En Pausa).
- **RF-02:** El sistema debe calcular automáticamente el costo de la mesa basado en el tiempo transcurrido desde el inicio de la partida.
- **RF-03:** Los jugadores deben poder incrementar puntos, restar puntos y finalizar entradas (turnos) desde la vista táctil.
- **RF-04:** El sistema debe rotar automáticamente el turno al jugador contrario cuando un jugador finaliza su entrada.

**Módulo de Tienda y Consumos (Pedidos)**
- **RF-05:** Los jugadores deben poder solicitar productos al garitero directamente desde la vista de la mesa.
- **RF-06:** El garitero debe recibir una alerta/notificación en tiempo real de un nuevo pedido.
- **RF-07:** Todos los consumos deben agregarse a la "cuenta activa" de la mesa.

**Módulo de Facturación y Deudas**
- **RF-08:** Al finalizar la partida, el sistema debe presentar un desglose total: Tiempo de juego + Consumos.
- **RF-09:** El garitero debe poder liquidar la cuenta (Pagar) o transferir el saldo a un módulo de "Deudas" asociado a un perfil de cliente.
- **RF-10:** El sistema debe permitir consultar y abonar pagos parciales a las deudas existentes de un cliente.

#### 3.3 Requisitos de Rendimiento
- **RN-01:** La actualización del marcador en la vista del garitero no debe demorar más de 500ms tras la interacción en la pantalla de la mesa.
- **RN-02:** El diseño de la vista de mesa debe garantizar al menos 60 FPS en animaciones y transiciones de CSS (CSS Grid, Flexbox).

#### 3.4 Requisitos de Seguridad
- **RS-01:** Todas las transacciones de cierre de caja y condonación de deudas deben requerir validación de sesión (Token JWT) del Administrador o Garitero autenticado.
- **RS-02:** Las vistas de mesas no deben tener acceso a rutas de administración o contabilidad sin autenticación.

---
*Documento Generado para Proyecto JcueScore*
