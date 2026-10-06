# Guía de Contribución y Flujo de Trabajo (Git Flow)

Este documento establece las reglas fundamentales de desarrollo colaborativo para el proyecto integrador (Capstone). Todo miembro del equipo (incluyendo asistentes de inteligencia artificial) debe apegarse a estas directrices para asegurar la calidad del código, evitar conflictos y facilitar la integración.

## Las Reglas de Oro

* **La rama `main` es intocable:** El código en `main` debe ser siempre la versión final y estable. Ningún miembro del equipo (ni humano ni IA) debe subir cambios o archivos directamente a esta rama mediante `git push origin main` o desde la interfaz web de GitHub.
* **Todo trabajo requiere su propia rama:** Ya sea para avanzar en una nueva fase, integrar una base de datos o corregir un error, siempre se debe crear una rama descriptiva a partir de `main` (ej. `feature/fase-3-auth` o `fix/login-error`).
* **Commits semánticos:** Queda prohibido usar el botón de subir archivos desde la web con mensajes genéricos. Se debe usar la terminal o editor de código para enviar *commits* que expliquen qué cambió exactamente (ej. `feat: agregar script de conexión a PostgreSQL`, `fix: reparar botón de reserva`, `docs: actualizar README`).
* **Integración mediante Pull Requests (PR):** Para pasar el código de una rama de trabajo a `main`, se debe abrir un PR en GitHub. Esto permite que los compañeros revisen el código, detecten errores y lo aprueben antes de fusionarlo.

## 📝 Convenciones de Nomenclatura (Para el equipo nuevo)

Dado que somos nuevos usando Git Flow, debemos usar **Nombres Semánticos** para nuestras Ramas y Commits. Esto nos permite saber exactamente qué hace un cambio con solo leer la primera palabra.

### Tipos de Ramas y Commits permitidos:

* **`feat`** (Feature / Funcionalidad): Úsalo cuando agregas algo NUEVO a la aplicación (ej. una nueva pantalla, un nuevo botón, una nueva tabla en base de datos).
  * *Rama:* `git checkout -b feat/pantalla-login`
  * *Commit:* `git commit -m "feat: crear pantalla de login de usuarios"`
* **`fix`** (Arreglo): Úsalo EXCLUSIVAMENTE cuando corrijas un error, un fallo o un bug.
  * *Rama:* `git checkout -b fix/error-botones`
  * *Commit:* `git commit -m "fix: corregir botones que no hacían clic en el perfil"`
* **`chore`** (Mantenimiento / Tareas): Úsalo para cambios de organización, limpieza, mover archivos, actualizar herramientas, cosas que no cambian el código funcional de la aplicación.
  * *Rama:* `git checkout -b chore/limpieza-carpetas`
  * *Commit:* `git commit -m "chore: mover documentos de la Fase 1 a la carpeta docs_universidad"`
* **`docs`** (Documentación): Úsalo cuando edites guías, archivos README o añadas comentarios para que los demás lean.
  * *Rama:* `git checkout -b docs/mejorar-guia`
  * *Commit:* `git commit -m "docs: actualizar instrucciones en el archivo CONTRIBUTING.md"`
* **`style`** (Estilos): Úsalo cuando modifiques la apariencia visual (CSS/Tailwind) sin cambiar la lógica interna.
  * *Rama:* `git checkout -b style/colores-botones`
  * *Commit:* `git commit -m "style: aplicar color verde neón a todos los botones principales"`

**Regla de oro antes de escribir:** *¿Estoy agregando algo nuevo (feat), arreglando algo roto (fix) o solo limpiando/organizando (chore)?*

## Cómo Funciona (Ciclo de Ejecución)

Para cada nueva tarea asignada en el proyecto, se debe seguir este flujo exacto:

1. **Sincronizar (Pull):** Antes de escribir una sola línea de código, asegúrate de tener la versión más reciente del repositorio para evitar conflictos.
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Ramificar (Branch):** Crea una rama aislada para tu tarea.
   ```bash
   git checkout -b feature/nombre-de-tu-tarea
   ```

3. **Trabajar y Confirmar (Commit):** Escribe tu código. A medida que completes pequeños hitos lógicos, guarda los cambios con mensajes claros.
   ```bash
   git add .
   git commit -m "feat: crear estructura de carpetas para la nueva API"
   ```

4. **Subir al Repositorio (Push):** Envía tu rama local al servidor de GitHub.
   ```bash
   git push origin feature/nombre-de-tu-tarea
   ```

5. **Revisar y Fusionar (Pull Request & Merge):**
   * Ve a la página del repositorio en GitHub.
   * Abre un *Pull Request* comparando tu rama `feature/...` contra `main`.
   * Pide a un compañero que apruebe los cambios. Una vez aprobado, presiona **Merge pull request**.
   * Borra la rama de *feature* en GitHub para mantener la lista de ramas limpia.
