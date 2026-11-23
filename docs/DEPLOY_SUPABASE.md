# Despliegue de Supabase para el Chinchón digital

Guía paso a paso para aplicar las migraciones y desplegar la Edge Function `chinchon-game` en el proyecto **card-games** (`pqvoolwxgffdmxbvpujs`). Los comandos están pensados para PowerShell en Windows y se ejecutan desde la raíz del repositorio.

> Son cambios sobre el proyecto real de Supabase. Revisa cada paso antes de ejecutarlo.
>
> Con la CLI 3.x, `migration list`, `migration repair` y `db push` trabajan por defecto contra una base local en Docker. Para usar el proyecto vinculado hay que añadir `--remote`, como en los comandos de esta guía. `functions deploy` ya usa el proyecto vinculado.

## Qué se despliega

| Pieza | Archivo | Para qué sirve |
|---|---|---|
| Borrador previo (ya aplicado) | `supabase/migrations/20261121223623_202611210001_create_private_rooms.sql` | Primer borrador de salas que se aplicó en Supabase; se conserva solo para que el historial coincida. |
| Esquema de salas | `supabase/migrations/20261123200000_replace_room_draft_schema.sql` | Borra el borrador y crea salas, jugadores, invitaciones, eventos y RLS tal como los usa la aplicación. |
| Migración de partida | `supabase/migrations/20261123200100_digital_chinchon_games.sql` | Estado privado de la partida, vista común, manos privadas, Realtime, `save_chinchon_game` y bloqueo de nuevas entradas cuando la partida ya ha empezado. |
| Edge Function | `supabase/functions/chinchon-game/` | Árbitro: valida cada jugada con el motor compartido y guarda el resultado. |
| Motor compartido | `supabase/functions/_shared/` | Copia de `src/domain/chinchon.ts`, `physicalGame.ts` y `digitalChinchon.ts`. |

## Paso 1 · Comprobar el acceso anónimo

Los invitados entran con una sesión anónima de Supabase.

1. Abre el panel de Supabase → proyecto **card-games** → **Authentication** → **Sign In / Providers**.
2. Comprueba que **Allow anonymous sign-ins** está activado. Si no lo está, actívalo y guarda.

## Paso 2 · Sincronizar el motor compartido

Cada vez que cambie el dominio hay que copiarlo a la Edge Function:

```powershell
npm run sync:edge
npm test
```

`npm test` falla si las copias de `supabase/functions/_shared` no coinciden con `src/domain`.

## Paso 3 · Iniciar sesión en la CLI de Supabase

No hace falta instalar nada; `npx` descarga la CLI la primera vez.

```powershell
npx supabase --version
npx supabase login
```

`login` abre el navegador para autorizar la CLI con tu cuenta de Supabase.

## Paso 4 · Vincular el repositorio con el proyecto

La primera vez hay que crear `supabase/config.toml` y vincularlo:

```powershell
npx supabase init
npx supabase link --project-ref pqvoolwxgffdmxbvpujs
```

- `init` crea `supabase/config.toml`. Si pregunta por la configuración de VS Code o de Deno, puedes responder que no.
- `link` pide la contraseña de la base de datos del proyecto (Project Settings → Database). Si no la recuerdas, puedes restablecerla desde ahí.
- Conviene añadir `supabase/config.toml` al repositorio. La carpeta `supabase/.temp` que crea la CLI no debe subirse.

## Paso 5 · Revisar qué migraciones tiene ya el proyecto

```powershell
npx supabase migration list --remote
```

La salida tiene una columna **Local** y otra **Remote**. El estado esperado antes de desplegar es:

| Local | Remote |
|---|---|
| `20261121223623` | `20261121223623` |
| `20261123200000` | (vacío) |
| `20261123200100` | (vacío) |

Si aparece alguna versión solo en Remote que no está en el repositorio, no sigas: descárgala con `npx supabase migration fetch --remote`, responde **No** si pregunta si quieres sobrescribir y revísala antes de aplicar nada.

## Paso 6 · Aplicar las migraciones pendientes

Primero, una simulación que no cambia nada:

```powershell
npx supabase db push --dry-run --remote
```

Debe listar exactamente `20261123200000_replace_room_draft_schema.sql` y `20261123200100_digital_chinchon_games.sql`. La primera **borra las tablas del borrador** (y cualquier sala que contengan) antes de crear las definitivas. Si es así, aplícalas:

```powershell
npx supabase db push --remote
```

## Paso 7 · Desplegar la Edge Function

```powershell
npx supabase functions deploy chinchon-game
```

- La función usa la verificación JWT por defecto: solo responde a usuarios con sesión, que en esta aplicación son los invitados anónimos.
- No hace falta configurar secretos: `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente.
- Si el despliegue pide Docker, añade `--use-api` para que el empaquetado se haga en los servidores de Supabase.

Comprueba en el panel → **Edge Functions** que aparece `chinchon-game`.

## Paso 8 · Comprobar Realtime

La migración de partida añade `rooms`, `room_members`, `room_game_public` y `room_game_hands` a la publicación `supabase_realtime`. En el panel → **Database** → **Publications** → `supabase_realtime`, deberían aparecer esas cuatro tablas.

## Paso 9 · Configurar la web publicada

Los workflows de GitHub Pages y de Vercel compilan la aplicación en GitHub Actions y leen la clave pública de Supabase de las **variables del repositorio**. La URL del proyecto va fija en `src/infrastructure/supabase/config.ts`. Sin la clave, la web muestra «Falta la configuración pública de Supabase» y no deja crear salas.

1. En GitHub: repositorio → **Settings** → **Secrets and variables** → **Actions** → pestaña **Variables** → **New repository variable**.
2. Crea `VITE_SUPABASE_ANON_KEY` con la clave **anon** o **publishable** (Supabase → Project Settings → API). Nunca la `service_role` ni una clave `sb_secret_…`.
3. En **Actions**, vuelve a ejecutar los workflows **Deploy Card Games to Vercel** y **Deploy Card Games to GitHub Pages** (botón **Re-run all jobs**) o sube un commit nuevo a `main`.

Esta clave es pública por diseño: acaban dentro del JavaScript que descarga el navegador y la seguridad la ponen las políticas RLS y la Edge Function.

## Paso 10 · Probar en local

1. Crea `.env.local` en la raíz (no se sube al repositorio) con la clave pública del proyecto (Project Settings → API):

   ```
   VITE_SUPABASE_ANON_KEY=<clave anon o publishable>
   ```

2. Arranca la aplicación con `npm run dev`.
3. Abre `http://localhost:5173` en dos navegadores distintos (o uno normal y otro en ventana privada), porque cada jugador necesita su propia identidad local.
4. En el primero: **Modo digital → Chinchón**, escribe un nombre y pulsa **Crear sala**.
5. En el segundo: escribe otro nombre, introduce el código de la sala y pulsa **Entrar**.
6. En el primero, como anfitrión, pulsa **Empezar partida**.

Si algo falla, el panel → **Edge Functions** → `chinchon-game` → **Logs** muestra los errores de la función.

## Cuando cambie algo

| Cambio | Qué hacer |
|---|---|
| Reglas en `src/domain/chinchon.ts`, `physicalGame.ts` o `digitalChinchon.ts` | `npm run sync:edge`, `npm test` y repetir el paso 7. |
| `supabase/functions/chinchon-game/index.ts` | Repetir el paso 7. |
| Nueva migración en `supabase/migrations/` | Repetir los pasos 5 y 6. |
