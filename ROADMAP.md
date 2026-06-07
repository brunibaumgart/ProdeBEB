# Prode Mundial 2026 — ROADMAP

> App que combina hub de información del Mundial 2026 con un sistema de prode de dos modos.
> Mobile-first, deployada en Vercel. **Mundial: 11 jun → 19 jul 2026.**

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Flags | flag-icons (`npm install flag-icons`) |
| Auth | Clerk (Google + email) |
| DB | Neon Postgres (Vercel Marketplace) |
| ORM | Prisma |
| Deploy | Vercel |

---

## Archivos de datos disponibles

| Archivo | Contenido |
|---------|-----------|
| `data/fixture.json` | 104 partidos, 12 grupos, 16 estadios, horarios ARG, bracket completo |
| `data/teams_data.json` | 48 selecciones con iso2, colores, emoji flag, confederación, colores FIFA |
| `data/mundial_2026_jugadores.csv` | 1248 jugadores, posición, club, caps |

### Estructura clave del fixture.json

```
groups: { A: [...], B: [...], ... L: [...] }   ← 12 grupos con nombres de equipos
matches[0..71]:  Group Stage  → home/away = nombre real del equipo
matches[72..87]: Round of 32  → home/away = "1st Group A", "2nd Group B", "3rd best (A/B/C)"
matches[88..95]: Round of 16  → home/away = "Winner M73", "Winner M75"
matches[96..99]: Quarterfinals
matches[100..101]: Semifinals
matches[102]: 3rd Place       → "Loser M101 vs Loser M102"
matches[103]: Final           → "Winner M101 vs Winner M102"
```

### Datos del teams_data.json

```json
{
  "tournament_brand": { "colors": {...}, "flags": { "library": "flag-icons" } },
  "teams": [
    { "name": "Mexico", "name_es": "México", "group": "A",
      "iso2": "MX", "confederation": "CONCACAF",
      "flag_emoji": "🇲🇽", "kit_primary": "#006847", "text_on_primary": "#FFFFFF" }
  ],
  "confederations": { "UEFA": {...}, "CONMEBOL": {...}, ... },
  "rounds": { "Group Stage": { "label_es": "Fase de Grupos" }, ... },
  "positions": { "Portero": { "short": "POR", "color": "#F5A623" }, ... }
}
```

---

## Colores del torneo (usar en tema Tailwind)

```js
// tailwind.config — extraído de teams_data.json → tournament_brand.colors
primary:    '#1A1A2E'   // fondo oscuro principal
blue:       '#0066CC'   // acento azul FIFA
green:      '#00A550'   // acento verde
gold:       '#F5A623'   // acento dorado
red:        '#E8192C'   // acento rojo
bg_dark:    '#0D0D1A'
bg_light:   '#F4F4F4'
```

> Tipografía sugerida: **Inter** (body) + **Bebas Neue** (headings/números grandes)

---

## Schema Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  name      String
  email     String   @unique
  avatar    String?
  createdAt DateTime @default(now())

  predictions    Prediction[]
  bracketEntry   BracketEntry?
  memberships    TournamentMember[]
  createdTournaments Tournament[]
}

model Team {
  id             String  @id @default(cuid())
  name           String  @unique   // "Mexico" — igual que en fixture.json
  nameEs         String            // "México"
  group          String            // "A" .. "L"
  iso2           String            // "MX" — para flag-icons: fi fi-mx
  confederation  String            // "UEFA" | "CONMEBOL" | etc.
  flagEmoji      String
  kitPrimary     String
  kitSecondary   String
  kitThird       String?
  textOnPrimary  String

  players        Player[]
  homeMatches    Match[]  @relation("HomeTeam")
  awayMatches    Match[]  @relation("AwayTeam")

  @@index([group])
}

model Player {
  id                   String @id @default(cuid())
  name                 String
  position             String   // "Portero" | "Defensa" | "Mediocampista" | "Delantero"
  club                 String
  internationalMatches Int
  teamId               String
  team                 Team   @relation(fields: [teamId], references: [id])

  @@index([teamId])
  @@index([position])
}

model Venue {
  id        String  @id @default(cuid())
  name      String  @unique   // "Estadio Azteca"
  city      String
  country   String
  capacity  Int
  lat       Float?
  lon       Float?

  matches   Match[]
}

model Match {
  id         Int      @id   // id del fixture.json (1..104)
  fixtureId  Int      @unique  // igual que id, explícito para claridad
  round      String   // "Group Stage" | "Round of 32" | ...
  roundEs    String   // "Fase de Grupos" | "Ronda de 32" | ...
  matchday   Int?     // 1 | 2 | 3  (solo grupos)
  group      String?  // "A".."L"   (solo grupos)
  date       DateTime // UTC
  timeArg    String   // "16:00" horario Argentina
  venueId    String

  // Equipos reales (null en knockout hasta que se definan)
  homeTeamId String?
  awayTeamId String?

  // Label textual para UI knockout: "1st Group A", "Winner M73", etc.
  homeLabel  String?
  awayLabel  String?

  // Para resolver el bracket: de qué partido y qué posición sale cada equipo
  homeFromMatchId  Int?    // match.id del que sale el equipo local
  awayFromMatchId  Int?    // match.id del que sale el equipo visitante
  homeFromPosition String? // "winner" | "loser" | "1st" | "2nd" | "3rd"
  awayFromPosition String? // idem

  // Resultado real
  homeScore Int?
  awayScore Int?
  status    String   @default("scheduled") // "scheduled" | "live" | "finished"

  venue      Venue  @relation(fields: [venueId], references: [id])
  homeTeam   Team?  @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeam   Team?  @relation("AwayTeam", fields: [awayTeamId], references: [id])

  predictions  Prediction[]
  bracketSlots BracketSlot[]

  updatedAt DateTime @updatedAt

  @@index([date])
  @@index([round])
  @@index([group])
  @@index([status])
}

model Prediction {
  id        String   @id @default(cuid())
  userId    String
  matchId   Int
  predHome  Int
  predAway  Int
  points    Int?     // null hasta que se calcule
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User  @relation(fields: [userId], references: [id])
  match Match @relation(fields: [matchId], references: [id])

  @@unique([userId, matchId])
  @@index([userId])
  @@index([matchId])
}

model BracketEntry {
  id         String    @id @default(cuid())
  userId     String    @unique
  championId String?   // Team.id del campeón predicho
  locked     Boolean   @default(false)
  lockedAt   DateTime?
  createdAt  DateTime  @default(now())

  user  User          @relation(fields: [userId], references: [id])
  slots BracketSlot[]
}

model BracketSlot {
  id             String @id @default(cuid())
  bracketEntryId String
  matchId        Int

  // Equipos predichos por el usuario para este slot
  predHomeTeamId String?
  predAwayTeamId String?
  predHomeScore  Int?
  predAwayScore  Int?
  points         Int?   // null hasta calcular

  bracketEntry BracketEntry @relation(fields: [bracketEntryId], references: [id])
  match        Match        @relation(fields: [matchId], references: [id])

  @@unique([bracketEntryId, matchId])
  @@index([bracketEntryId])
}

model Tournament {
  id           String   @id @default(cuid())
  name         String
  description  String?
  code         String   @unique  // 6 chars uppercase
  isPublic     Boolean  @default(false)
  modeComplete Boolean  @default(true)
  modeMatchday Boolean  @default(true)
  createdById  String
  createdAt    DateTime @default(now())

  createdBy User               @relation(fields: [createdById], references: [id])
  members   TournamentMember[]
}

model TournamentMember {
  id           String   @id @default(cuid())
  userId       String
  tournamentId String
  joinedAt     DateTime @default(now())

  // NO guardar puntos aquí — calcularlos on-the-fly desde Prediction y BracketSlot
  // Materializar solo si hay problemas de performance

  user       User       @relation(fields: [userId], references: [id])
  tournament Tournament @relation(fields: [tournamentId], references: [id])

  @@unique([userId, tournamentId])
  @@index([tournamentId])
}
```

---

## Lógica de puntos

### Prode Fecha a Fecha

```typescript
function calcPointsMatchday(pred: { predHome: number; predAway: number },
                            real: { homeScore: number; awayScore: number }): number {
  const exactMatch = pred.predHome === real.homeScore && pred.predAway === real.awayScore
  if (exactMatch) return 3

  const predResult = Math.sign(pred.predHome - pred.predAway)  // -1 | 0 | 1
  const realResult = Math.sign(real.homeScore - real.awayScore)
  const correctWinner = predResult === realResult

  const correctDiff = (pred.predHome - pred.predAway) === (real.homeScore - real.awayScore)

  let pts = 0
  if (correctWinner) pts += 1
  if (correctDiff && !exactMatch) pts += 1
  return pts
}
// Máximo: 3 pts (exacto). Sin exacto: 0-2 pts.
```

### Prode Completo — Grupos

```
resultado exacto  → 5 pts
ganador correcto  → 2 pts
equipo clasificado (que predije y realmente clasificó) → 2 pts c/u
```

### Prode Completo — Knockout

```
ganador del partido correcto → 3 pts
campeón correcto             → 10 pts
```

### Regla de equipo imposible en bracket

Si el usuario predijo que Argentina gana el Grupo J pero en realidad salió segunda, todos los BracketSlots que dependan de "1st Group J → Argentina" quedan con 0 puntos automáticamente. No se propaga retroactivamente — se evalúa slot a slot.

### Desempate de mejores terceros (determinista)

```
1. Más puntos
2. Mayor diferencia de goles
3. Más goles a favor
4. Nombre del equipo alfabético (tiebreaker final determinista)
```

---

## Rutas de la app

```
/                         Home: partidos del día, countdown, top 5 goleadores
/fixture                  Lista filtrable (grupo / fase / fecha / selección)
/fixture/[matchId]        Detalle: equipos, estadio, hora ARG, resultado
/grupos                   12 tablas de posiciones (se actualizan con resultados)
/selecciones              Grid 48 banderas con grupo y confederación
/selecciones/[slug]       Plantel por posición + próximos partidos
/estadios                 Lista 16 estadios (integrada también en /fixture/[matchId])
/prode                    Hub: acceso a modos + resumen de mis puntos
/prode/fecha              Prode Fecha a Fecha: grilla de partidos a predecir
/prode/completo           Wizard: grupos → bracket → campeón
/torneos                  Mis torneos (públicos + privados)
/torneos/[id]             Leaderboard del torneo
/perfil                   Avatar, stats, historial
/admin                    Cargar resultados reales (protegido por ADMIN_USER_ID)
```

---

## Variables de entorno

```env
DATABASE_URL=                        # Neon Postgres connection string
DIRECT_URL=                          # Neon direct URL (para migraciones Prisma)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=                # Para sincronizar usuario al registrarse
ADMIN_USER_ID=                       # clerkId del admin (puede cargar resultados)
```

---

## FASES DE DESARROLLO

---

### FASE 0 — Setup y seed de datos
> **Meta:** DB poblada y verificada antes de tocar UI. Todo lo demás depende de esto.

#### 0.1 Scaffolding inicial

```bash
npx create-next-app@latest prode-mundial-2026 \
  --typescript --tailwind --app --src-dir --import-alias "@/*"
cd prode-mundial-2026
npx shadcn@latest init
npm install flag-icons
npm install prisma @prisma/client
npm install @clerk/nextjs
```

#### 0.2 Archivos de datos

Copiar a `/data/`:
- `fixture.json`
- `teams_data.json`
- `mundial_2026_jugadores.csv`

#### 0.3 Schema Prisma + conexión Neon

1. Crear proyecto en Neon (Vercel Marketplace → Storage → Neon)
2. Copiar `DATABASE_URL` y `DIRECT_URL` al `.env`
3. Pegar el schema completo en `prisma/schema.prisma`
4. Correr migración inicial:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

#### 0.4 Script de seed

Crear `prisma/seed.ts`. El script debe:

1. **Venues** — leer venues únicos de `fixture.json` → insertar 16 estadios con capacidad hardcodeada:

```typescript
const VENUE_CAPACITIES: Record<string, { capacity: number; lat: number; lon: number }> = {
  'Estadio Azteca':          { capacity: 87523, lat: 19.3030, lon: -99.1506 },
  'Estadio Akron':           { capacity: 48000, lat: 20.6867, lon: -103.4674 },
  'Estadio BBVA':            { capacity: 53500, lat: 25.6693, lon: -100.2436 },
  'AT&T Stadium':            { capacity: 94000, lat: 32.7480, lon: -97.0930 },
  'Mercedes-Benz Stadium':   { capacity: 75000, lat: 33.7554, lon: -84.4009 },
  'MetLife Stadium':         { capacity: 82500, lat: 40.8135, lon: -74.0745 },
  'Gillette Stadium':        { capacity: 63815, lat: 42.0909, lon: -71.2643 },
  'NRG Stadium':             { capacity: 72220, lat: 29.6847, lon: -95.4107 },
  'SoFi Stadium':            { capacity: 70240, lat: 33.9534, lon: -118.3390 },
  'Arrowhead Stadium':       { capacity: 76416, lat: 39.0489, lon: -94.4839 },
  'Hard Rock Stadium':       { capacity: 64767, lat: 25.9580, lon: -80.2389 },
  "Lincoln Financial Field": { capacity: 65827, lat: 39.9008, lon: -75.1675 },
  "Levi's Stadium":          { capacity: 68500, lat: 37.4032, lon: -121.9698 },
  'Lumen Field':             { capacity: 65123, lat: 47.5952, lon: -122.3316 },
  'BMO Field':               { capacity: 45000, lat: 43.6333, lon: -79.4186 },
  'BC Place':                { capacity: 54000, lat: 49.2767, lon: -123.1118 },
}
```

2. **Teams** — leer `teams_data.json` → insertar 48 equipos con todos sus campos

3. **Players** — leer `mundial_2026_jugadores.csv` → mapear `pais` → `team.name` → insertar

   Tabla de mapeo necesaria (nombres del CSV → nombres del fixture/teams):
   ```typescript
   const COUNTRY_NAME_MAP: Record<string, string> = {
     'México': 'Mexico',
     'Sudáfrica': 'South Africa',
     'República Checa': 'Czech Republic',
     'Corea del Sur': 'South Korea',
     'Bosnia y Herzegovina': 'Bosnia & Herzegovina',
     'Catar': 'Qatar',
     'Brasil': 'Brazil',
     'Marruecos': 'Morocco',
     'Escocia': 'Scotland',
     'Haití': 'Haiti',
     'Estados Unidos': 'USA',
     'Países Bajos': 'Netherlands',
     'Japón': 'Japan',
     'Suecia': 'Sweden',
     'Túnez': 'Tunisia',
     'Bélgica': 'Belgium',
     'Costa de Marfil': 'Ivory Coast',
     'Alemania': 'Germany',
     'Curazao': 'Curacao',
     'Ecuador': 'Ecuador',
     'Noruega': 'Norway',
     'Austria': 'Austria',
     'Argelia': 'Algeria',
     'Jordania': 'Jordan',
     'Francia': 'France',
     'Iraq': 'Iraq',
     'Senegal': 'Senegal',
     'Arabia Saudita': 'Saudi Arabia',
     'Uruguay': 'Uruguay',
     'Cabo Verde': 'Cape Verde',
     'España': 'Spain',
     'Croacia': 'Croatia',
     'Ghana': 'Ghana',
     'Panamá': 'Panama',
     'Inglaterra': 'England',
     'Portugal': 'Portugal',
     'Congo': 'DR Congo',
     'Uzbekistán': 'Uzbekistan',
     'Colombia': 'Colombia',
     'Argentina': 'Argentina',
     'Australia': 'Australia',
     'Turquía': 'Turkey',
     'Paraguay': 'Paraguay',
     'Canadá': 'Canada',
     'Nueva Zelanda': 'New Zealand',
     'Irán': 'Iran',
     'Egipto': 'Egypt',
   }
   ```

4. **Matches** — leer `fixture.json` → insertar los 104 partidos:

   Para partidos de grupos: `homeTeamId` / `awayTeamId` se resuelven buscando por `team.name`.

   Para partidos de knockout: `homeTeamId` / `awayTeamId` = null. Se guardan `homeLabel` / `awayLabel` con el texto original ("1st Group A", "Winner M73", "Loser M101") y se parsea `homeFromMatchId` / `homeFromPosition` a partir del label:

   ```typescript
   // Ejemplos de parseo:
   // "1st Group A"     → fromMatchId: null, fromPosition: "1st", fromGroup: "A"
   // "2nd Group B"     → fromMatchId: null, fromPosition: "2nd", fromGroup: "B"
   // "3rd best (A/B/C/D/F)" → fromMatchId: null, fromPosition: "3rd"
   // "Winner M73"      → fromMatchId: 73, fromPosition: "winner"
   // "Loser M101"      → fromMatchId: 101, fromPosition: "loser"
   ```

5. **Torneo público global** — insertar un `Tournament` con `isPublic: true`, `code: "GLOBAL"`.

```bash
# Agregar a package.json:
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }

npx prisma db seed
```

6. **Verificar seed:**

```bash
npx prisma studio
# Verificar: 16 venues, 48 teams, 1248 players, 104 matches, 1 tournament
```

**Entregable Fase 0:** DB poblada y verificada. `npx prisma studio` muestra todos los datos correctos.

---

### FASE 1 — Layout y navegación base
> Sin datos dinámicos todavía. Solo estructura y componentes base.

#### 1.1 Tema Tailwind

Configurar `tailwind.config.ts` con los colores del mundial extraídos de `teams_data.json`:

```typescript
theme: {
  extend: {
    colors: {
      mundial: {
        primary: '#1A1A2E',
        blue:    '#0066CC',
        green:   '#00A550',
        gold:    '#F5A623',
        red:     '#E8192C',
        dark:    '#0D0D1A',
        light:   '#F4F4F4',
      }
    },
    fontFamily: {
      heading: ['Bebas Neue', 'sans-serif'],
      body: ['Inter', 'sans-serif'],
    }
  }
}
```

Agregar Google Fonts en `app/layout.tsx`: Bebas Neue + Inter.

#### 1.2 Layout principal

`app/layout.tsx`:
- Navbar desktop: logo | Fixture | Grupos | Selecciones | Prode (solo si logueado)
- Bottom nav mobile: Home | Fixture | Grupos | Prode | Perfil
- Importar `flag-icons/css/flag-icons.min.css`

#### 1.3 Componentes base (crear en `/components/ui-mundial/`)

- `FlagIcon` — `<span className={`fi fi-${iso2.toLowerCase()}`} />` con fallback emoji
- `TeamBadge` — bandera + nombre del equipo
- `MatchCard` — card de partido con hora, equipos, score, estadio
- `ScoreInput` — input numérico para predicción (0-20, solo enteros)
- `PredictionLock` — indicador visual de partido bloqueado
- `GroupTable` — tabla de posiciones de un grupo
- `PositionBadge` — "POR" | "DEF" | "MED" | "DEL" con color según `teams_data.json`
- `RoundLabel` — "Fase de Grupos" → "GRUPOS", etc. (usando `rounds` de teams_data)
- `CountdownTimer` — countdown en tiempo real a una fecha

#### 1.4 Helpers de datos (crear en `/lib/`)

- `lib/data.ts` — funciones para leer fixture.json y teams_data.json como constantes (para SSG/ISR)
- `lib/prisma.ts` — singleton del cliente Prisma
- `lib/fixtures.ts` — helpers: `getMatchesByDate()`, `getMatchesByGroup()`, `getMatchesByRound()`
- `lib/teams.ts` — `getTeamByName()`, `getTeamBySlug()`, `getTeamFlagCode()`
- `lib/points.ts` — funciones puras de cálculo de puntos (sin DB, testeables)
- `lib/bracket.ts` — `resolveGroupStandings()`, `getBestThirds()`, `resolveBracketSlot()`
- `lib/time.ts` — `toArgentinaTime()`, `isMatchLocked(match, offsetMinutes)`, `matchDateUTC()`

**Entregable Fase 1:** Layout navegable con componentes base. Sin datos reales todavía.

---

### FASE 2 — Sección informativa (sin auth)
> Todo público. Server Components con datos de la DB.

#### 2.1 Home (`/`)

- Próximos 3 partidos del día (o los últimos jugados si no hay más hoy)
- Countdown al próximo partido si hay menos de 2 horas
- Acceso rápido: Grupos | Fixture | Selecciones

```typescript
// app/page.tsx — Server Component
const todayMatches = await prisma.match.findMany({
  where: { date: { gte: startOfDay, lte: endOfDay } },
  include: { homeTeam: true, awayTeam: true, venue: true },
  orderBy: { date: 'asc' }
})
```

#### 2.2 Fixture (`/fixture`)

- Lista de todos los partidos ordenados por fecha
- Filtros: por grupo (A-L) | por fase | por selección
- Filtros como search params (`?grupo=A&fase=Group+Stage`)
- Mostrar: hora ARG, equipos con bandera, score si terminó, estadio
- Agrupar por día

```typescript
// app/fixture/page.tsx
// Usar searchParams para filtrar en el servidor
```

#### 2.3 Detalle de partido (`/fixture/[matchId]`)

- Equipos (banderas, colores de kit)
- Fecha y hora en ARG + UTC
- Estadio: nombre, ciudad, país, capacidad
- Estado: scheduled / live / finished + score
- Si finished: resultado final destacado

#### 2.4 Grupos (`/grupos`)

- 12 tablas (A-L) en grid responsive
- Columnas: pos | equipo | PJ | PG | PE | PP | GF | GC | DG | Pts
- Indicador visual de clasificados (top 2 verde, 3ro gris claro)
- Se calculan en tiempo real desde los `Match.homeScore/awayScore` con `status: 'finished'`

```typescript
// lib/bracket.ts
export function resolveGroupStandings(teams: Team[], matches: Match[]): Standing[] {
  // Calcular PJ, PG, PE, PP, GF, GC, DG, Pts
  // Ordenar: Pts → DG → GF → nombre (determinista)
}
```

#### 2.5 Selecciones (`/selecciones`)

- Grid de 48 cards: bandera grande, nombre en español, grupo, confederación
- Filtro por confederación (tabs: UEFA | CONMEBOL | CONCACAF | CAF | AFC | OFC)
- Usar colores de confederación de `teams_data.json`

#### 2.6 Detalle de selección (`/selecciones/[slug]`)

- Slug = nombre del equipo en kebab-case (`mexico`, `south-korea`, etc.)
- Header: bandera grande, nombre, grupo, confederación, colores de kit
- Próximos partidos del equipo (o últimos si ya terminaron)
- Plantel agrupado por posición con `PositionBadge`
- Tabla de posición actual del grupo

#### 2.7 Estadios (`/estadios`)

- Lista de 16 estadios: nombre, ciudad, país, capacidad
- Card por estadio con cantidad de partidos asignados
- Link a Google Maps usando lat/lon

**Entregable Fase 2:** App navegable con toda la info del mundial. Desplegar en Vercel preview.

---

### FASE 3 — Auth y perfil
> Clerk + sincronización con DB.

#### 3.1 Setup Clerk

```bash
npm install @clerk/nextjs
```

En `app/layout.tsx`: wrappear con `<ClerkProvider>`.
En `middleware.ts`: proteger rutas `/prode/*`, `/torneos/*`, `/perfil`.

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
const isProtected = createRouteMatcher(['/prode(.*)', '/torneos(.*)', '/perfil(.*)'])
export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect()
})
```

#### 3.2 Webhook Clerk → crear User en DB

Endpoint `app/api/webhooks/clerk/route.ts`:

```typescript
// POST /api/webhooks/clerk
// Evento: user.created
// → crear User en DB
// → unir al Tournament público global (isPublic: true)
```

Registrar el webhook en Clerk Dashboard apuntando a `/api/webhooks/clerk`.
Verificar con `CLERK_WEBHOOK_SECRET`.

#### 3.3 Perfil (`/perfil`)

- Avatar (de Clerk) + nombre
- Stats: puntos totales F a F | puntos bracket | predicciones realizadas | % de aciertos
- Últimas 5 predicciones con resultado real vs predicho

**Entregable Fase 3:** Login funcional, usuario en DB al registrarse, unido al torneo global.

---

### FASE 4 — Prode Fecha a Fecha + Admin básico
> El feature más urgente. Debe estar listo antes del 11 de junio.

#### 4.1 Hub del prode (`/prode`)

- Dos cards: "Fecha a Fecha" | "Prode Completo" (con estado: disponible / en progreso / cerrado)
- Mis puntos totales en el torneo global
- Mis últimas predicciones

#### 4.2 Prode Fecha a Fecha (`/prode/fecha`)

Lógica de disponibilidad:
- **Fase de grupos (matches 1-72):** todos disponibles desde el arranque (equipos ya conocidos)
- **Knockout (matches 73-104):** disponible solo cuando `homeTeamId` AND `awayTeamId` son no-null en la DB

Lock automático:
```typescript
// lib/time.ts
export function isMatchLocked(match: Match): boolean {
  const lockTime = new Date(match.date)
  lockTime.setMinutes(lockTime.getMinutes() - 5)  // 5 min antes del kick-off
  return new Date() >= lockTime
}
```

UI:
- Tabs o secciones por jornada/fecha
- Por cada partido disponible: `ScoreInput` home + `ScoreInput` away
- Si bloqueado: mostrar predicción guardada en modo read-only con `PredictionLock`
- Submit con Server Action

#### 4.3 Server Action — guardar predicción

```typescript
// app/actions/predictions.ts
'use server'
export async function savePrediction(matchId: number, predHome: number, predAway: number) {
  // 1. Verificar que el usuario está autenticado (Clerk)
  // 2. Verificar que el partido NO está locked
  // 3. Upsert Prediction (crear o actualizar si aún no está locked)
  // 4. Retornar estado
}
```

#### 4.4 Cálculo de puntos F a F

Se calcula cuando el admin carga el resultado real. Ver Fase 4.6 (admin).

#### 4.5 Historial de predicciones

En `/prode/fecha`: toggle "Ver mis predicciones pasadas"
- Mostrar resultado predicho vs resultado real
- Puntos obtenidos por partido
- Colorear: verde exacto | amarillo ganador | gris 0 pts

#### 4.6 Admin mínimo (`/admin`)

Proteger con:
```typescript
// app/admin/layout.tsx
import { auth } from '@clerk/nextjs/server'
const { userId } = auth()
if (userId !== process.env.ADMIN_USER_ID) redirect('/')
```

UI mínima para esta fase:
- Lista de partidos `status: 'scheduled'` con fecha pasada (candidatos a cargar resultado)
- Formulario: home score + away score + botón "Guardar resultado"

Server Action `app/actions/admin.ts → setMatchResult(matchId, homeScore, awayScore)`:

```typescript
// 1. Actualizar Match: homeScore, awayScore, status = 'finished'
// 2. Calcular puntos para TODAS las Predictions de ese matchId:
//    → llamar a calcPointsMatchday(pred, result) de lib/points.ts
//    → actualizar Prediction.points
// 3. Para knockouts: resolver quién avanza
//    → encontrar el match siguiente que tiene homeFromMatchId o awayFromMatchId = este matchId
//    → determinar el ganador (homeScore > awayScore → home, si empate definir criterio)
//    → actualizar Match.homeTeamId o Match.awayTeamId según corresponda
//    → actualizar el homeLabel/awayLabel del partido siguiente
// 4. Calcular puntos de BracketSlots afectados
```

**IMPORTANTE — criterio de ganador en knockout con empate:**
El fixture no incluye penales. Para el Prode Completo, si predijo empate en tiempo regular en knockout, se considera que predijo correctamente el ganador si el equipo que avanzó es alguno de los dos. Implementar con un flag `winnerId` en Match para los casos de empate.

**Entregable Fase 4:** Prode Fecha a Fecha funcional end-to-end + admin básico operativo.

---

### FASE 5 — Prode Completo (bracket)
> Puede llegar después del 11 de junio — los knockouts arrancan el 28 de junio.

#### 5.1 Wizard 3 pasos (`/prode/completo`)

**Paso 1 — Grupos (matches 1-72):**
- Grid compacto de 12 grupos
- Para cada partido del grupo: inputs de score (pequeños, tipo `1 - 0`)
- Mostrar tabla de posiciones predicha en tiempo real mientras el usuario llena
- El usuario ve instantáneamente qué equipos clasifica según sus predicciones
- Datos precargados si el usuario ya tiene un `BracketEntry` existente

**Paso 2 — Bracket knockout:**
- Armar los 32 cruces automáticamente según las posiciones predichas en Paso 1
- UI de bracket visual (llaves de torneo)
- El usuario predice score de cada cruce
- Los cruces de R16, QF, SF se van desbloqueando a medida que se completan los anteriores
- Si el usuario cambia una predicción de grupos, los cruces que dependan se resetean

**Paso 3 — Campeón:**
- Selector visual de campeón (solo equipos que el usuario predijo que llegan a la final)
- Resumen de todo el bracket antes de confirmar

#### 5.2 Lógica de clasificación (`lib/bracket.ts`)

```typescript
export function resolveGroupStandings(group: string, predictions: PredictionInput[]): Standing[]
export function getBestThirds(allGroupStandings: Record<string, Standing[]>): Team[]
// Desempate determinista: Pts → DG → GF → nombre alfabético
```

```typescript
// Los cruces de Round of 32 están hardcodeados en fixture.json:
// "1st Group A" vs "2nd Group B" → resolver con standings predichos
// "3rd best (A/B/C/D/F)" → tomar el mejor tercero de esos grupos
```

#### 5.3 Lock del bracket

Lock global: **11 de junio 2026 a las 16:00 ARG** (hora del primer partido).

```typescript
const BRACKET_LOCK_DATE = new Date('2026-06-11T19:00:00Z') // 16:00 ARG = 19:00 UTC
```

Server Action `lockBracket(userId)`:
- Verificar que la fecha actual < BRACKET_LOCK_DATE
- Verificar que todos los slots de grupos tienen predicción (no permitir bracket incompleto)
- Setear `BracketEntry.locked = true`, `lockedAt = now()`

#### 5.4 Cálculo de puntos del bracket

Se calcula desde el admin en cada resultado (ver Fase 4.6).

**Entregable Fase 5:** Bracket completo con lock automático el 11 de junio.

---

### FASE 6 — Torneos privados
> Puede ir en paralelo al mundial durante la fase de grupos.

#### 6.1 Mis torneos (`/torneos`)

- Lista de torneos donde participo
- Card por torneo: nombre, cantidad de miembros, mis puntos, mi posición
- Botones: "Crear torneo" | "Unirme con código"

#### 6.2 Crear torneo privado

Modal con: nombre, descripción (opcional), modos activos (toggle F a F / Completo).
Server Action `createTournament()`:
- Generar código único de 6 chars uppercase (`ARGXYZ`)
- Insertar Tournament + TournamentMember del creador

#### 6.3 Unirse a torneo

Input de 6 chars + botón.
Server Action `joinTournament(code)`:
- Buscar torneo por código
- Crear TournamentMember si no existe

#### 6.4 Leaderboard (`/torneos/[id]`)

Query de puntos on-the-fly:

```typescript
// Para Prode Fecha a Fecha:
const memberPoints = await prisma.prediction.groupBy({
  by: ['userId'],
  where: {
    user: { memberships: { some: { tournamentId: id } } },
    points: { not: null }
  },
  _sum: { points: true }
})

// Para Prode Completo:
// Similar con BracketSlot + BracketEntry.championId points
```

UI:
- Tabla: pos | usuario (avatar + nombre) | pts F a F | pts Completo | pts Total
- Tu fila siempre visible (sticky si estás fuera del top visible)
- Top 50 + tu posición

#### 6.5 Admin del torneo

Solo para el creador: ver miembros, expulsar (borrar TournamentMember).

**Entregable Fase 6:** Torneos privados funcionales.

---

### FASE 7 — Admin completo
> Versión más robusta del admin de la Fase 4.

#### 7.1 Dashboard admin (`/admin`)

- Tabs: Partidos | Usuarios | Torneos
- Lista de partidos por estado (scheduled / live / finished)
- Acción "Marcar como LIVE" (solo visual, no afecta puntos)
- Formulario de resultado (ya existe desde Fase 4)

#### 7.2 Estadísticas por partido

Para cada partido finalizado, mostrar:
- Distribución de predicciones (% eligió victoria local / empate / visitante)
- Cuántos acertaron el resultado exacto
- Total de usuarios que predijeron

#### 7.3 Re-cálculo manual de puntos

Botón de emergencia: "Recalcular puntos de este partido" por si algo falló.
Server Action que borra los `points` de ese matchId y los recalcula desde cero.

**Entregable Fase 7:** Admin robusto con estadísticas.

---

### FASE 8 — Polish y deploy producción

#### 8.1 UI/UX

- Skeletons en listas de partidos, tablas de grupos y leaderboards
- Empty states útiles: "Aún no hay partidos finalizados" | "Todavía no predijiste este partido"
- Toast notifications para éxito/error en predicciones
- Animaciones: Framer Motion en transiciones de tabs y aparición de cards

#### 8.2 Performance

- `generateStaticParams` para `/selecciones/[slug]` y `/fixture/[matchId]` (ISR, revalidate: 60)
- `unstable_cache` para queries costosas de standings
- Optimistic updates en predicciones (UI responde antes de que responda el server)

#### 8.3 SEO

- `metadata` dinámico en todas las rutas
- og:image con datos del partido para `/fixture/[matchId]`
- `sitemap.ts` generado

#### 8.4 PWA

```bash
npm install next-pwa
```

- `manifest.json` con nombre, iconos, colores del mundial
- Service worker para cachear assets estáticos
- Permite instalar en celular como app

#### 8.5 Deploy producción

1. Variables de entorno en Vercel (todas las del `.env`)
2. Conectar Neon a Vercel (Vercel Marketplace → ya debería estar)
3. Dominio custom (opcional)
4. Test end-to-end del flujo completo:
   - Registrarse → ver fixture → predecir → cargar resultado desde admin → ver puntos

**Entregable Fase 8:** App en producción lista para el torneo.

---

## Orden de ejecución con Claude Code

```
DÍA 1 (hoy):   Fase 0  → Seed verificado en Neon
DÍA 2:         Fase 1  → Layout + componentes base
DÍA 3:         Fase 2  → Sección informativa completa (fixture, grupos, selecciones)
DÍA 4-5:       Fase 3 + 4 → Auth + Prode Fecha a Fecha + Admin básico
               ⚑ DEADLINE: 11 jun 16:00 ARG — primer partido
DÍA 6-10:      Fase 5  → Prode Completo (bracket)
               (los knockouts arrancan el 28 de junio — hay margen)
DÍA 11-14:     Fase 6  → Torneos privados
DÍA 15-17:     Fase 7 + 8 → Admin robusto + Polish + Deploy producción
```

---

## Decisiones técnicas importantes

| Decisión | Elección | Razón |
|----------|----------|-------|
| Puntos en DB | No materializar en `TournamentMember` | Evita desincronización si el cálculo falla a mitad |
| Match.id | Int del fixture.json como PK | Simple, el fixture es fuente de verdad única |
| Lock del bracket | Fecha hardcodeada como constante | No depende de estado en DB, imposible saltarse |
| Bracket incompleto | Bloquear lock hasta completar grupos | Mejor UX que permitir slots vacíos |
| Equipos imposibles en bracket | 0 pts para slots que dependían de ese equipo | Simple, predecible, documentado |
| Tiebreaker 3ros | Alfabético como último criterio | Determinista aunque no sea deportivamente justo |
| Goles en knockout | Agregar `winnerId` a Match | El fixture no modela tiempo extra/penales |
| Horarios | Guardar en UTC, mostrar ARG en cliente | Evita bugs de zona horaria en servidor |

---

## Notas para Claude Code

- Empezar **siempre** por el seed (Fase 0). Sin datos correctos, todo lo demás es maquetado.
- Usar **Server Components** para todo lo que no necesita interactividad. `'use client'` solo para los inputs de predicción, filtros y countdown.
- El `fixture.json` es la **fuente de verdad** del bracket — los labels "Winner M73" etc. ya tienen toda la información para construir el árbol de dependencias.
- Los componentes de `flag-icons` son simples spans: `<span className="fi fi-ar" />` para Argentina. Escocia es `fi fi-gb-sct`, Inglaterra es `fi fi-gb-eng`.
- Para el bracket visual, no usar librerías externas — implementar con CSS Grid/Flexbox. El fixture tiene exactamente la estructura necesaria para renderizarlo.
- Antes de deployar a producción, verificar que `DIRECT_URL` está seteado en Vercel — Prisma lo necesita para las migraciones en Neon serverless.