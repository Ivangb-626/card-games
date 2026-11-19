# Tareas por fases

## Convenciones

- Cada tarea debe terminar con una evidencia verificable.
- Las decisiones pendientes deben resolverse antes de tareas que dependen de ellas.
- No marcar una tarea como hecha solo por haber creado el archivo o el componente.
- Las tareas descritas aquí son planificación; no constituyen implementación.

## Fase 0 — Decisiones

- [x] Confirmar el MVP: chinchón primero y Texas Hold'em como hito siguiente.
- [x] Confirmar límites de jugadores, barajas y modos.
- [x] Confirmar código corto, enlace compartible y QR futuro.
- [x] Confirmar invitados temporales e identidad persistida localmente.
- [x] Confirmar sala de 30 minutos y persistencia tras cerrar navegador.
- [x] Confirmar deshacer por ronda y permisos del administrador.
- [ ] Elegir proveedor concreto de alojamiento, persistencia y tiempo real.
- [ ] Confirmar el stack propuesto y el proveedor concreto antes de crear dependencias.
- [ ] Definir la conducta exacta durante pérdida de conexión en el turno.
- [ ] Definir la política detallada de reenganche y variantes.
- [ ] Confirmar pantallas mínimas y tamaños de soporte.

**Dependencias:** las decisiones pendientes no bloquean el diseño visual; sí bloquean reconexión avanzada, variantes y persistencia automática.

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
- [ ] Preparar español e inglés.
- [ ] Priorizar flujo funcional estable antes de animaciones avanzadas.
- [ ] Crear estados de invitación, identidad temporal y sala ausente.

**Criterio de salida:** los recorridos principales pueden navegarse sin backend y los componentes representan ambas barajas.

## Fase 2 — Modo físico

- [ ] Crear configuración de jugadores.
- [ ] Crear selección de baraja y juego.
- [ ] Crear asignación inicial de turnos.
- [ ] Permitir avanzar y retroceder turno según las reglas confirmadas.
- [ ] Registrar puntos por ronda.
- [ ] Mostrar puntuación acumulada.
- [ ] Permitir deshacer una acción válida dentro de la ronda.
- [ ] Permitir deshacer todas las acciones válidas durante la ronda.
- [ ] Restringir el deshacer posterior al cierre al creador/administrador.
- [ ] Confirmar el cierre de ronda.
- [ ] Recuperar estado local ante recarga y cierre del navegador.
- [ ] Configurar PWA y validar operación offline del modo físico.

**Criterio de salida:** una partida física ficticia puede completarse y corregirse sin reiniciar toda la ronda.

## Fase 3 — Motores de juego

- [ ] Crear entidades comunes de partida, ronda y turno.
- [ ] Crear interfaz común de motor de juego.
- [ ] Añadir reglas básicas acordadas de chinchón.
- [ ] Implementar el motor de chinchón como primer hito.
- [ ] Preparar el motor extensible de Texas Hold'em.
- [ ] Añadir Texas Hold'em completo como segundo hito digital.
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
- [ ] Mostrar jugadores como ausentes fuera del turno o por elección.
- [ ] Permitir reincorporación al asiento.
- [ ] Evitar duplicar jugadores al reconectar.
- [ ] Persistir el estado mínimo necesario.
- [ ] Recuperar puntos y estado para continuar desde la siguiente ronda.
- [ ] Caducar salas a los 30 minutos.
- [ ] Añadir español e inglés.

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

- ¿Qué comportamiento exacto debe tener un jugador que pierde conexión durante su turno?
- ¿Cómo se resuelve el reenganche en empates y variantes configurables?
- ¿Qué proveedor concreto cumple mejor coste, latencia y facilidad de despliegue?
- ¿Qué secuencia de confirmación debe aplicar el cierre de ronda cuando participa el administrador?
- ¿Qué ocurre si una sala expira o un jugador ausente no vuelve?
