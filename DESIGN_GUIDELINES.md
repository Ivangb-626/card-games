# Guías de diseño

## Dirección estética

La interfaz debe sentirse moderna, expresiva y legible. La inspiración es conceptual y puede tomar referencias de energía visual, jerarquía y tactilidad de Balatro, Marvel Snap y Hearthstone, pero no debe copiar elementos identificables, nombres, ilustraciones, marcas ni activos.

La prioridad inicial es una interfaz funcional bien diseñada. Las mejoras visuales avanzadas y las animaciones se añadirán después de que el flujo básico sea estable.

## Principios

- Claridad antes que decoración.
- Cada carta debe ser identificable a primera vista.
- Las acciones principales deben tener un lugar estable.
- El turno activo debe destacarse sin bloquear toda la pantalla.
- La textura y la profundidad deben reforzar la jerarquía, no distraer.
- Las animaciones deben ser rápidas y útiles.
- El diseño debe reducir el riesgo de misclicks.

## Layout responsive

### Matriz de soporte

La interfaz soporta desde 320 px hasta escritorio amplio. Los cortes describen el layout, no limitan el zoom del navegador.

| Clase | Ancho CSS | Comportamiento principal |
|---|---:|---|
| Móvil | 320–520 px | Una columna, controles apilados cuando sea necesario y acciones al alcance del pulgar. No se oculta información imprescindible del juego. |
| Tablet | 521–850 px | Se priorizan mesa y cartas propias; los paneles secundarios pueden pasar debajo de la mesa. |
| Escritorio | 851–1439 px | Mesa amplia con jugadores e información de ronda visibles en paralelo. |
| Escritorio amplio | 1440 px o más | El contenido queda centrado y limitado a 1440 px; no se estiran las cartas ni los párrafos. |

Los puntos de corte vigentes en CSS son 520 px y 850 px. La hoja usa un ancho máximo de 1440 px.

### Pantallas y estados mínimos

| Flujo | Estados que debe representar | Acción principal | Tratamiento de error |
|---|---|---|---|
| Configuración | Sin jugadores, 2–4 jugadores válidos, nombre vacío o repetido, configuración lista | Añadir/editar jugadores e iniciar | Error asociado al campo; no se inicia con datos inválidos |
| Lobby | Sin sala, esperando jugadores, listo para comenzar, sala expirada | Comenzar o volver | Explicar si falta un requisito y conservar los datos introducidos |
| Mesa y turno | Turno propio, turno ajeno, jugador ausente, ronda en curso | Acción válida para el estado actual | Rechazar la acción con motivo junto al control |
| Puntuación y cierre | Puntuación en edición, resumen de ronda, confirmación, ronda confirmada, partida finalizada | Revisar y confirmar el resumen | Mantener la edición reversible hasta confirmar; la secuencia exacta de cierre sigue pendiente |
| Invitación y acceso | Invitación válida, código inválido, invitación caducada, acceso rechazado | Unirse o volver | Indicar el problema y ofrecer volver a inicio |
| Conexión | Conectado, reconectando, ausente, pausa indefinida, reingreso | Reintentar o reanudar | Conservar asiento y estado; mostrar las acciones disponibles al anfitrión |
| Continuidad física | Estado local cargado, guardado, error al recuperar, uso offline | Continuar o iniciar partida | No reemplazar un guardado recuperable sin explicar el problema |

Los estados sin backend pueden mostrarse con datos de demostración, pero deben identificarse como tales. La interfaz no debe presentar una sala de ejemplo como sala real.

### Escritorio

- Mesa central amplia.
- Jugadores y acciones secundarias alrededor de la mesa.
- Información de ronda visible sin abrir menús.

### Tablet

- Priorizar la mesa y las cartas propias.
- Mantener acciones principales en una zona fija o fácilmente alcanzable.
- Reducir elementos decorativos antes que contenido esencial.

### Móvil

- Una acción principal por contexto.
- Cartas grandes y escalables.
- Evitar menús profundos durante el turno.
- Evitar depender de gestos ocultos.
- Mantener textos y controles fuera de las zonas de gesto del sistema.

## Barajas y cartas

- Baraja española: palos, valores y numeración claramente definidos.
- Baraja americana: palos, rango y comunicación visual consistentes.
- Diferenciar valor y categoría para evitar confusión.
- Mantener una relación de aspecto estable.
- Mostrar el reverso con un patrón original.
- Usar imágenes o ilustraciones propias o licencias verificadas.

## Estados

Diseñar explícitamente:

- Lobby vacío.
- Esperando jugadores.
- Jugador conectado y desconectado.
- Turno propio y turno ajeno.
- Acción válida, inválida y pendiente.
- Confirmación reversible.
- Final de ronda.
- Final de partida.
- Error de invitación o acceso.
- Reconexión.
- Jugador ausente.
- Partida pausada indefinidamente tras 30 segundos sin retorno.
- Control temporal del jugador ausente por el anfitrión.
- Expulsión de un jugador ausente.
- Sala próxima a expirar.
- Identidad temporal y entrada por invitación.
- Continuación offline en modo físico.

## Interacción

- Confirmar acciones con consecuencias duraderas.
- Mostrar el efecto antes de confirmar cuando sea posible.
- Permitir deshacer en el contexto donde ocurrió el error.
- Nunca mover a otro turno sin feedback visible.
- Proporcionar suficiente área táctil.
- Mantener el foco visible en navegación por teclado.
- Asociar errores con el campo o acción que los produjo.
- Permitir deshacer dentro de la ronda sin reiniciar la partida.
- Restringir la función posterior al cierre solo al creador/administrador.
- Mostrar el estado de conexión y la ausencia sin representar al jugador como desconectado del juego.
- Explicar la pausa indefinida y ofrecer al anfitrión las acciones de control temporal o expulsión.
- Indicar siempre que el anfitrión no obtiene ventajas mecánicas.

## Color

- Construir paletas con contraste AA como mínimo.
- Reservar el color rojo para peligro o error.
- Reservar verde o otro color distinto para éxito y turno disponible.
- No usar solo el color para comunicar estado.
- Definir modo claro u oscuro solo si las decisiones de plataforma lo permiten.

## Tipografía

- Título corto y alto contraste.
- Texto de reglas legible.
- Valores de cartas y puntos con jerarquía clara.
- Evitar texto diminuto en móviles.
- Preferir familias disponibles en el sistema o recursos incluidos, evitando licencias desconocidas.

## Animación

- Duración breve para repartir, recoger y cambiar turno.
- Reducir movimiento cuando el sistema lo solicite.
- Evitar animaciones que oculten el estado actual.
- Animar el cambio de estado, no elementos decorativos sin propósito.

## Accesibilidad

- Nombre accesible para cada carta y acción.
- Contraste suficiente.
- Navegación completa con teclado.
- Anuncios para cambios de turno y reconexiones.
- Feedback visual además de sonido.
- Contenido no dependiente de temporización visual cuando sea posible.
- Textos disponibles inicialmente en español e inglés.
- El idioma seleccionado también se refleja en `html[lang]` y en los nombres accesibles.
- Todo control debe conservar un foco visible y un área táctil cómoda; los filtros y selectores deben anunciar su estado seleccionado.
- Los errores se asocian al campo o acción correspondiente y no se comunican solo mediante color.

## Propuestas pendientes

- Paleta concreta y tipografía.
- Identidad visual sin copiar referencias.
- Iconografía propia.
- Sonido.
- Preferencias visuales.
- Modo claro y/o oscuro.
- Ilustraciones de juegos y barajas.
