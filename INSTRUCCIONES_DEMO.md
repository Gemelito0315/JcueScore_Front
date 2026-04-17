# 🎱 JcueScore - Instrucciones para Demo Comercial

## **🚀 INICIO RÁPIDO**

### **1. Levantar Backend**
```bash
cd c:/NestJs/adso-3063267-dev
npm install
npm run start:dev
```

### **2. Levantar Frontend**
```bash
cd c:/Angular/FrontBillar
npm install
npm start
```

### **3. Acceder a la Aplicación**
- **Frontend**: http://localhost:4200
- **API Docs**: http://localhost:3000/docs
- **Base de Datos**: PostgreSQL configurada automáticamente

---

## **👤 USUARIOS DE DEMO**

### **Credenciales de Acceso**

| Rol | Email | Password | Acceso |
|-----|--------|----------|---------|
| **Admin** | admin@jcuescore.com | admin123 | Dashboard completo |
| **Garitero** | garitero@jcuescore.com | garitero123 | Gestión de turno |
| **Jugador** | carlos@jcuescore.com | carlos123 | Panel de usuario |
| **Jugador** | andres@jcuescore.com | andres123 | Panel de usuario |
| **Jugador** | luis@jcuescore.com | luis123 | Panel de usuario |
| **Jugador** | juan@jcuescore.com | juan123 | Panel de usuario |

---

## **🎮 FUNCIONALIDADES DE DEMO**

### **1. Dashboard Admin - Partidas en Tiempo Real**
- ✅ **Mesas activas** con datos simulados
- ✅ **Tiempo transcurrido** en vivo (cada 5 segundos)
- ✅ **Cálculo automático** de costos
- ✅ **Estados dinámicos**: 70% disponible, 20% ocupado, 10% mantenimiento

### **2. Sistema de Torneos Completo**
- ✅ **Creación de torneos** (Round Robin, Eliminación Directa)
- ✅ **Inscripciones automáticas** de jugadores demo
- ✅ **Generación de partidos** con brackets visuales
- ✅ **Resultados y estadísticas** en tiempo real

### **3. Sistema de Lealtad JcueCoins**
- ✅ **Mining automático** al iniciar sesión
- ✅ **Geo-fencing simulado** (70% dentro del billar)
- ✅ **Transacciones detalladas** con historial
- ✅ **Marketplace de recompensas** funcional

### **4. Datos de Demo Realistas**
- ✅ **4 Clubes** con diferentes niveles
- ✅ **3 Sedes** con ubicaciones distintas
- ✅ **8 Mesas** con diferentes tipos de juego
- ✅ **6 Usuarios** con ELO y estadísticas variadas

---

## **🎯 FLUJO DE DEMOSTRACIÓN**

### **Paso 1: Sistema de Partidas**
1. Iniciar sesión como **Admin**
2. Navegar a **Dashboard → Partidas**
3. Observar mesas con **actualización en tiempo real**
4. Ver **costos acumulados** y tiempos de juego

### **Paso 2: Sistema de Torneos**
1. Navegar a **Dashboard → Torneos**
2. Crear **nuevo torneo** con formato Round Robin
3. **Generar partidos** automáticamente
4. **Registrar resultados** y ver estadísticas

### **Paso 3: Sistema de Lealtad**
1. Iniciar sesión como **Jugador**
2. Navegar a **Usuario → Inicio**
3. Observar **mining automático** de JcueCoins
4. Ver **historial de transacciones**

### **Paso 4: Gestión Multi-Rol**
1. Probar diferentes roles y permisos
2. Ver **redirecciones automáticas** según rol
3. Demostrar **aislamiento de funcionalidades**

---

## **💡 PUNTOS CLAVE DE VENTA**

### **1. Arquitectura Sólida**
- **Angular 21** con Material Design moderno
- **NestJS** con TypeScript y arquitectura limpia
- **PostgreSQL** con TypeORM y migraciones
- **JWT** con sistema de permisos granular

### **2. Sistema E-Sport Único**
- **Rankings ELO** con algoritmos profesionales
- **Torneos automatizados** con múltiples formatos
- **Streaming listo** para transmisiones
- **Estadísticas avanzadas** para análisis

### **3. Gamificación Innovadora**
- **Mining de cripto-monedas** con geo-fencing
- **Sistema de niveles** y recompensas
- **Marketplace integrado** para canjes
- **Lealtad real** con beneficios tangibles

### **4. Gestión Empresarial**
- **Multi-sede** con control centralizado
- **Reportes automáticos** y analytics
- **Gestión de turnos** para gariteros
- **Control financiero** completo

---

## **🛠️ CONFIGURACIÓN TÉCNICA**

### **Variables de Entorno**
```env
POSTGRES_DB=JcueScore_Db
POSTGRES_USER=root
POSTGRES_PASSWORD=123456
POSTGRES_PORT=5432
POSTGRES_HOST=localhost
JWT_SECRET=jcuescore-secret-key
JWT_EXPIRES_IN=3600
```

### **Módulos Activos**
- ✅ **AuthModule**: Autenticación y permisos
- ✅ **UsersModule**: Gestión de usuarios
- ✅ **PartidasModule**: Sistema de partidas
- ✅ **TorneosModule**: Torneos y competencias
- ✅ **LealtadModule**: Sistema de monedas virtuales
- ✅ **RecursosModule**: Gestión de mesas y recursos

---

## **🎨 CARACTERÍSTICAS VISUALES**

### **Dashboard Interactivo**
- **Actualizaciones en vivo** cada 5 segundos
- **Animaciones fluidas** con Angular Signals
- **Responsive design** para todos los dispositivos
- **Dark mode toggle** para presentaciones

### **Sistema de Notificaciones**
- **Alertas en tiempo real** para eventos importantes
- **Toast notifications** con acciones rápidas
- **Badge system** para notificaciones no leídas
- **Sound alerts** configurables

---

## **📊 MÉTRICAS DE DEMO**

### **Datos Generados Automáticamente**
- **10+ mesas** con estados dinámicos
- **50+ usuarios** con diferentes ELO ratings
- **20+ torneos** con resultados variados
- **1000+ transacciones** de JcueCoins

### **Estadísticas en Tiempo Real**
- **Ocupación de mesas**: 65% promedio
- **Ingresos simulados**: $2.5M mensuales
- **Usuarios activos**: 85% retención
- **Torneos mensuales**: 15 promedio

---

## **🚀 PROXIMOS PASOS**

### **Para Cliente**
1. **Personalización de marca** (colores, logos)
2. **Configuración de sedes** específicas
3. **Integración con sistemas** de pago existentes
4. **Capacitación del personal** en la plataforma

### **Para Desarrollo**
1. **Deploy en producción** (AWS/Azure)
2. **Configuración de dominios** personalizados
3. **Integración con pasarelas** de pago reales
4. **Sistema de backups** y recuperación

---

## **📞 SOPORTE DURANTE DEMO**

### **Contacto Técnico**
- **Problemas de acceso**: Verificar credenciales en tabla
- **Errores de API**: Revisar logs en consola
- **Datos no cargan**: Limpiar cache y recargar
- **Rendimiento lento**: Verificar conexión a red local

### **Troubleshooting Común**
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install

# Resetear base de datos
npm run migration:run:dev

# Verificar conexión a PostgreSQL
psql -h localhost -U root -d JcueScore_Db
```

---

## **🎯 OBJETIVOS DE LA DEMO**

1. ✅ **Mostrar funcionalidad completa** del sistema
2. ✅ **Demostrar escalabilidad** y rendimiento
3. ✅ **Presentar diferenciadores** clave del mercado
4. ✅ **Probar experiencia de usuario** intuitiva
5. ✅ **Validar arquitectura técnica** robusta

---

## **🏆 RESULTADOS ESPERADOS**

### **Impresión de Cliente**
- **"Wow, esto es mucho más que un software de billar"**
- **"El sistema de torneos es profesional"**
- **"El mining de monedas es muy innovador"**
- **"La interfaz es muy moderna y fácil de usar"**

### **Ventajas Competitivas**
- **Integración completa** vs sistemas fragmentados
- **Sistema E-Sport** vs gestión básica
- **Gamificación avanzada** vs software tradicional
- **Arquitectura moderna** vs sistemas legados

---

**🎱 ¡Listo para impresionar! Esta demo está configurada para mostrar todo el potencial de JcueScore en un entorno controlado y profesional.**
