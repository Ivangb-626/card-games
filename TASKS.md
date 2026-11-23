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
- [x] Confirmar validez de 24 horas para códigos y enlaces de invitación.
- [x] Confirmar invitados temporales e identidad persistida localmente.
- [x] Confirmar sala de 30 minutos y persistencia tras cerrar navegador.
- [x] Confirmar deshacer por ronda y permisos del administrador.
- [x] Confirmar Supabase Postgres, Supabase Realtime y RLS por pertenencia a sala.
- [x] Confirmar el modelo de eventos con jugador, tipo, datos, versión, fecha y checkpoints por ronda.
- [x] Confirmar pausa indefinida tras 30 segundos, control temporal o expulsión por el anfitrión y ausencia de ventajas.
- [x] Confirmar el alcance inicial de Texas Hold'em digital: partida básica completa de 2-9 jugadores.
- [x] Confirmar que torneos, recompensas y variantes de Texas Hold'em quedan fuera del alcance inicial.
- [x] Definir pantallas mínimas, estados y matriz de soporte responsive en `DESIGN_GUIDELINES.md`.

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

- [x] Crear configuración y validación de 2–4 jugadores para Chinchón físico.
- [x] Permitir 5–6 jugadores en el marcador físico, con aviso de que no es lo tradicional.
- [x] Mostrar un contador individual por jugador.
- [x] Permitir sumar o restar un punto a cualquier contador en cualquier momento.
- [x] Guardar y recuperar los contadores en el almacenamiento local.
- [x] Migrar puntuaciones guardadas anteriormente al marcador simple.
- [x] Llevar el marcador por rondas: indicador de ronda, puntos por ronda y «Cerrar ronda».
- [x] Acumular totales con mínimo -50 (victoria) y eliminación a 101.
- [x] Permitir el reenganche entre rondas con la puntuación más alta en juego.
- [ ] Verificar el marcador en móvil desde 320 px, teclado y lector de pantalla.
- [ ] Configurar PWA y validar operación offline del modo físico.

**Criterio de salida:** una partida física permite gestionar jugadores, introducir y cerrar rondas, acumular puntuaciones y reengancharse entre rondas, sin turnos.

## Fase 3 — Motores de juego

- [ ] Crear entidades comunes de partida, ronda y turno.
- [ ] Crear interfaz común de motor de juego.
- [x] Añadir reglas básicas acordadas de chinchón.
- [x] Implementar el motor de chinchón como primer hito.
- [ ] Preparar el motor extensible de Texas Hold'em.
- [ ] Añadir Texas Hold'em completo como segundo hito digital.
- [ ] Cubrir ciegas, fichas, apuestas, turnos, all-in y resolución automática en Texas Hold'em inicial.
- [ ] Excluir torneos, recompensas y variantes del alcance inicial de Texas Hold'em.
- [ ] Añadir casos de empates o cierre de ronda.
- [x] Prohibir acciones fuera de turno.
- [x] Añadir pruebas unitarias de reglas normales.
- [x] Añadir pruebas de casos límite y acciones inválidas.

**Criterio de salida:** ambos motores pueden ejecutar casos acordados y rechazar acciones incompatibles.

## Fase 4 — Partida digital privada

- [x] Crear una sala privada.
- [ ] Generar invitación mediante código corto y enlace compartible con validez de 24 horas.
- [x] Validar acceso por invitación.
- [x] Permitir entrar como invitado.
- [x] Sincronizar estado de la sala.
- [x] Sincronizar acciones y turnos.
- [ ] Mostrar estado de conexión.
- [ ] Mostrar jugadores como ausentes fuera del turno o por elección.
- [ ] Permitir reincorporación al asiento.
- [ ] Pausar indefinidamente la partida si no vuelve en 30 segundos.
- [ ] Permitir al anfitrión jugar temporalmente por el jugador ausente o expulsarlo.
- [x] Mantener las mismas mecánicas para anfitrión y demás jugadores.
- [x] Evitar duplicar jugadores al reconectar.
- [ ] Persistir eventos, checkpoints y estado mínimo necesario en Supabase Postgres.
- [x] Sincronizar salas mediante Supabase Realtime.
- [x] Aplicar RLS para restringir cada sala a sus jugadores.
- [ ] Recuperar puntos y estado para continuar desde la siguiente ronda.
- [ ] Caducar salas a los 30 minutos.
- [ ] Añadir español e inglés.

**Criterio de salida:** dos clientes pueden unirse, jugar, desconectarse y reincorporarse sin perder el estado.

### Pendiente del Chinchón digital (tras el primer hito jugable)

- [ ] Desplegar las migraciones y la Edge Function siguiendo `docs/DEPLOY_SUPABASE.md` y probar una partida real con dos o más dispositivos.
- [ ] Enlace compartible con el código de la sala (además del código).
- [ ] Estado de conexión real de cada jugador (presencia de Realtime).
- [ ] Pausa automática a los 30 segundos sin volver y reanudación.
- [ ] Que el anfitrión pueda jugar temporalmente por un ausente o expulsarlo.
- [ ] Deshacer dentro de la ronda y corrección del anfitrión tras el cierre, con checkpoints por ronda (sin exponer manos ocultas en `room_checkpoints`).
- [ ] Acabar la partida a mano desde la sala digital, como en el modo físico.
- [ ] Expulsar o sustituir a quien abandona antes de empezar.
- [ ] Reordenar la mano manualmente (ahora se agrupa automáticamente por combinaciones).
- [ ] Animaciones de robo y descarte, y avisos de turno.
- [ ] Confirmar si se permite más de un comodín por combinación (ahora, como mucho uno).
- [ ] Revisar la interfaz de la mesa en móvil, teclado y lector de pantalla.

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

- ¿Cómo se resuelve el reenganche en empates y variantes configurables?
- ¿Cómo se aplica el permiso de administrador para deshacer acciones después de confirmar el cierre en el modo físico?
