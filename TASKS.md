# Tareas por fases

## Convenciones

- Cada tarea debe terminar con una evidencia verificable.
- Las decisiones pendientes deben resolverse antes de tareas que dependen de ellas.
- No marcar una tarea como hecha solo por haber creado el archivo o el componente.
- Las tareas descritas aquí son planificación; no constituyen implementación.

## Fase 0 — Decisiones

- [ ] Definir el alcance de reglas de chinchón.
- [ ] Definir el alcance de reglas de póker.
- [ ] Elegir el mecanismo inicial de invitación.
- [ ] Elegir el modelo de invitados.
- [ ] Elegir el framework web.
- [ ] Elegir backend, persistencia y tiempo real.
- [ ] Definir límites de reconexión y caducidad de sala.
- [ ] Definir acciones permitidas para deshacer por ronda.
- [ ] Confirmar pantallas mínimas y tamaños de soporte.

**Criterio de salida:** ninguna tarea de diseño o construcción importante tiene una dependencia crítica sin dueño o respuesta.

## Fase 1 — Fundación visual

- [ ] Crear estructura responsive de aplicación.
- [ ] Implementar navegación principal.
- [ ] Crear componente de carta española.
- [ ] Crear componente de carta americana.
- [ ] Crear vista de galería de cartas.
- [ ] Crear estados visuales de lobby y mesa.
- [ ] Crear componentes de turno, ronda y puntuación.
- [ ] Añadir estados de carga, éxito y error.
- [ ] Verificar móvil, tablet y escritorio.
- [ ] Verificar teclado y contraste básico.

**Criterio de salida:** los recorridos principales pueden navegarse sin backend y los componentes representan ambas barajas.

## Fase 2 — Modo físico

- [ ] Crear configuración de jugadores.
- [ ] Crear selección de baraja y juego.
- [ ] Crear asignación inicial de turnos.
- [ ] Permitir avanzar y retroceder turno según las reglas confirmadas.
- [ ] Registrar puntos por ronda.
- [ ] Mostrar puntuación acumulada.
- [ ] Permitir deshacer una acción válida dentro de la ronda.
- [ ] Confirmar el cierre de ronda.
- [ ] Recuperar estado local ante una recarga si se confirma su persistencia.

**Criterio de salida:** una partida física ficticia puede completarse y corregirse sin reiniciar toda la ronda.

## Fase 3 — Motores de juego

- [ ] Crear entidades comunes de partida, ronda y turno.
- [ ] Crear interfaz común de motor de juego.
- [ ] Añadir reglas básicas acordadas de chinchón.
- [ ] Añadir reglas básicas acordadas de póker.
- [ ] Añadir casos de empates o cierre de ronda.
- [ ] Prohibir acciones fuera de turno.
- [ ] Añadir pruebas unitarias de reglas normales.
- [ ] Añadir pruebas de casos límite y acciones inválidas.

**Criterio de salida:** ambos motores pueden ejecutar casos acordados y rechazar acciones incompatibles.

## Fase 4 — Partida digital privada

- [ ] Crear una sala privada.
- [ ] Generar invitación mediante el mecanismo confirmado.
- [ ] Validar acceso por invitación.
- [ ] Permitir entrar como invitado.
- [ ] Sincronizar estado de la sala.
- [ ] Sincronizar acciones y turnos.
- [ ] Mostrar estado de conexión.
- [ ] Permitir reincorporación al asiento.
- [ ] Evitar duplicar jugadores al reconectar.
- [ ] Persistir el estado mínimo necesario.

**Criterio de salida:** dos clientes pueden unirse, jugar, desconectarse y reincorporarse sin perder el estado.

## Fase 5 — Pulido

- [ ] Revisar todas las rutas en móvil.
- [ ] Revisar todas las rutas en escritorio.
- [ ] Corregir problemas de contraste y foco.
- [ ] Revisar textos de error y acciones.
- [ ] Añadir mensajes claros de reconexión.
- [ ] Ejecutar pruebas de aceptación del MVP.
- [ ] Ejecutar pruebas de recuperación ante cierre y pérdida de conexión.
- [ ] Documentar limitaciones conocidas.

**Criterio de salida:** el flujo principal puede completarse sin acciones ocultas ni pérdida inesperada de estado.

## Preguntas abiertas que bloquean inicio

- ¿Qué reglas concretas entran en chinchón y póker para el MVP?
- ¿Qué mecanismo de invitación es el más sencillo de entregar y mantener?
- ¿Los invitados tienen identidad persistente o solo por sesión?
- ¿Cuál será el stack elegido?
- ¿Qué representa exactamente “deshacer” y hasta cuándo puede aplicarse?
- ¿Qué sucede si un jugador desconectado no vuelve?
