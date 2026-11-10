# Registro de Tiempos (Time Entry App)

Aplicación frontend moderna desarrollada en **React (Vite + TypeScript + Tailwind CSS)** para la captura de actividades y registro de horas (facturables y no facturables). 

Esta aplicación opera de manera independiente como una SPA (Single Page Application) y se comunica con un backend basado en **Zoho Catalyst** para el manejo de sesión, persistencia de registros y consulta de catálogos (Clientes, Proyectos, Abogados y Tareas).

## Características Principales

* **Selección Dinámica:** Combobox interactivos con soporte de búsqueda para clientes, proyectos y abogados.
* **Cronómetro y Modo Manual:** Captura de tiempo exacto usando un reloj en vivo o captura manual de horas.
* **Revisión Ortográfica Integrada:** Detección de errores ortográficos en la descripción de las actividades con sugerencias.
* **Sistema de Temas Dinámico:** Permite cambiar la paleta de colores de la aplicación al vuelo (Navy, Coral, Esmeralda, Púrpura, Ámbar).
* **Almacenamiento en Caché:** Persistencia inteligente de catálogos en `localStorage` segmentados por organización y cliente para un rendimiento más rápido y menor uso de la API.

---

## ⚠️ Parámetro de URL Requerido (`organization_id`)

La aplicación **requiere estrictamente** recibir el identificador de la organización a la que se va a conectar a través de la URL.

**Ejemplo de uso correcto:**
```text
http://localhost:5173/?organization_id=636939444
```

### ¿Para qué sirve?
El `organization_id` funciona como la llave de enrutamiento y autenticación del inquilino (tenant). Todo el frontend utiliza este parámetro dinámicamente para construir las llamadas al backend de Catalyst, asegurándose de extraer y depositar la información a la organización correcta.

Ejemplos de llamadas:
* `GET /server/time_entry_services/{organization_id}/clientes`
* `GET /server/time_entry_services/{organization_id}/proyectos`
* `GET /server/time_entry_services/{organization_id}/abogados`

Si la aplicación se abre sin dicho parámetro, mostrará una pantalla de error (Status Modal) bloqueando su uso hasta que se provea una organización válida.

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```
