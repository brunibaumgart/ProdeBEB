# Reglas de pasajes — ProdeBEB

Documento oficial sobre **cómo avanzan los equipos** en el Mundial FIFA 2026 dentro de ProdeBEB: clasificación de grupos, mejores terceros, armado del bracket y resolución de cruces en el **Prode Completo**.

Para las reglas de puntuación, ver [REGLAS-PUNTAJES.md](./REGLAS-PUNTAJES.md).

---

## Formato del torneo

| Fase | Partidos | Equipos |
|------|----------|---------|
| Fase de grupos | M1–M72 | 48 (12 grupos × 4) |
| Dieciseisavos de final | M73–M88 | 32 → 16 |
| Octavos de final | M89–M96 | 16 → 8 |
| Cuartos de final | M97–M100 | 8 → 4 |
| Semifinales | M101–M102 | 4 → 2 |
| Tercer puesto | M103 | 2 (perdedores de semis) |
| Final | M104 | 2 → 1 campeón |

**Clasificados a eliminatorias:** 2 primeros por grupo (24) + 8 mejores terceros = **32 equipos**.

---

## Fase de grupos

Cada grupo juega **6 partidos** (todos contra todos).  
Fuente de datos: `data/fixture.json` + resultados reales en la base de datos.

### Orden de la tabla (criterios FIFA 2026)

ProdeBEB implementa los desempates oficiales en este orden:

#### Paso 1 — Enfrentamientos directos (mini-liga)

Entre equipos empatados en puntos, se calcula una mini-tabla **solo con los partidos entre ellos**:

1. Más puntos
2. Mayor diferencia de goles
3. Más goles a favor

Si persiste el empate entre un subgrupo, se repite el paso 1. Si no alcanza, se pasa al paso 2.

#### Paso 2 — Estadísticas generales del grupo

1. Mayor diferencia de goles en todo el grupo
2. Más goles a favor
3. Fair play (puntos de conducta; hoy usa 0 si no hay tarjetas cargadas)
4. Ranking FIFA (abril 2026, `data/fifa_rankings.json`)

### Mejores terceros (8 clasificados)

Los 12 terceros del grupo compiten por **8 lugares**.  
**No** se usa head-to-head entre grupos distintos. Criterios:

1. Más puntos
2. Mayor diferencia de goles
3. Más goles a favor
4. Fair play
5. Ranking FIFA

Implementación: `src/lib/bracket/tiebreakers.ts`, `src/lib/bracket.ts` → `getBestThirds`.

---

## Anexo C — Asignación de terceros en dieciseisavos

Los 8 partidos de dieciseisavos que reciben un tercero no tienen un grupo fijo: dependen de **qué 8 grupos aportaron terceros clasificados**.

FIFA publica **495 combinaciones posibles** (Anexo C). ProdeBEB las tiene precargadas en `data/annex_c_third_place.json`.

### Slots con tercero (siempre 1.º de un grupo vs 3.º)

| Slot | Partido | Local |
|------|---------|-------|
| 1E | **M74** | 1.º Grupo E |
| 1I | **M77** | 1.º Grupo I |
| 1A | **M79** | 1.º Grupo A |
| 1L | **M80** | 1.º Grupo L |
| 1G | **M82** | 1.º Grupo G |
| 1D | **M81** | 1.º Grupo D |
| 1B | **M85** | 1.º Grupo B |
| 1K | **M87** | 1.º Grupo K |

El visitante en cada uno es el **3.º del grupo** que indica el Anexo C para esa combinación.

**Ejemplo:** si clasifican terceros de los grupos C, D, E, F, G, I, K, L → clave `CDEFGIKL` → M74 recibe al 3.º del Grupo F.

Implementación: `src/lib/bracket/annex-c.ts`.

---

## Cuadro de dieciseisavos de final (M73–M88)

Partidos definidos en `data/fixture.json`:

| Partido | Local | Visitante |
|---------|-------|-----------|
| **M73** | 2.º Grupo A | 2.º Grupo B |
| **M74** | 1.º Grupo E | 3.º (Anexo C)* |
| **M75** | 1.º Grupo F | 2.º Grupo C |
| **M76** | 1.º Grupo C | 2.º Grupo F |
| **M77** | 1.º Grupo I | 3.º (Anexo C)* |
| **M78** | 2.º Grupo E | 2.º Grupo I |
| **M79** | 1.º Grupo A | 3.º (Anexo C)* |
| **M80** | 1.º Grupo L | 3.º (Anexo C)* |
| **M81** | 1.º Grupo D | 3.º (Anexo C)* |
| **M82** | 1.º Grupo G | 3.º (Anexo C)* |
| **M83** | 2.º Grupo K | 2.º Grupo L |
| **M84** | 1.º Grupo H | 2.º Grupo J |
| **M85** | 1.º Grupo B | 3.º (Anexo C)* |
| **M86** | 1.º Grupo J | 2.º Grupo H |
| **M87** | 1.º Grupo K | 3.º (Anexo C)* |
| **M88** | 2.º Grupo D | 2.º Grupo G |

\* El grupo del tercero lo resuelve el Anexo C según los 8 grupos cuyos terceros clasificaron.

### Pools de candidatos por partido (referencia FIFA)

| Partido | Terceros posibles |
|---------|-------------------|
| M74 | A, B, C, D o F |
| M77 | C, D, F, G o H |
| M79 | C, E, F, H o I |
| M80 | E, H, I, J o K |
| M81 | B, E, F, I o J |
| M82 | A, E, H, I o J |
| M85 | E, F, G, I o J |
| M87 | D, E, I, J o L |

---

## Octavos de final (M89–M96)

| Partido | Local | Visitante |
|---------|-------|-----------|
| **M89** | Ganador M74 | Ganador M77 |
| **M90** | Ganador M73 | Ganador M75 |
| **M91** | Ganador M76 | Ganador M78 |
| **M92** | Ganador M79 | Ganador M80 |
| **M93** | Ganador M83 | Ganador M84 |
| **M94** | Ganador M81 | Ganador M82 |
| **M95** | Ganador M86 | Ganador M88 |
| **M96** | Ganador M85 | Ganador M87 |

---

## Cuartos de final (M97–M100)

| Partido | Local | Visitante |
|---------|-------|-----------|
| **M97** | Ganador M89 | Ganador M90 |
| **M98** | Ganador M93 | Ganador M94 |
| **M99** | Ganador M91 | Ganador M92 |
| **M100** | Ganador M95 | Ganador M96 |

---

## Semifinales, tercer puesto y final

| Partido | Local | Visitante |
|---------|-------|-----------|
| **M101** | Ganador M97 | Ganador M98 |
| **M102** | Ganador M99 | Ganador M100 |
| **M103** | Perdedor M101 | Perdedor M102 |
| **M104** | Ganador M101 | Ganador M102 |

---

## Pasajes en el Prode Completo (predicciones del usuario)

En `/prode/completo`, el bracket **no se elige a mano**: se **deriva** de tus resultados predichos.

### Paso 1 — Grupos

1. Ingresás el marcador de los **72 partidos** de grupos.
2. La app calcula la tabla de cada grupo en tiempo real (`resolveGroupStandingsFromPredictions`).
3. De ahí salen: 1.º, 2.º, terceros y los **8 mejores terceros** predichos.

### Paso 2 — Eliminatorias

1. Los dieciseisavos se arman automáticamente con las reglas de arriba + Anexo C predicho.
2. Cada ronda siguiente se desbloquea al completar la anterior.
3. Ingresás el marcador de **90 minutos**.
4. **Empate en 90'** — indicás quién avanza y si define en **prórroga** o **penales**.
5. Al guardar, se fijan los equipos del cruce (`predHomeTeamId`, `predAwayTeamId`, `predAdvancesTeamId`).

### Paso 3 — Campeón

Elegís al campeón entre los dos finalistas de **tu** bracket predicho.

### Reset al cambiar grupos

Si modificás un resultado de fase de grupos:

- Se **borran** todas las predicciones de eliminatorias (M73–M104).
- Se **anula** la elección de campeón.

Lo mismo ocurre si importás grupos desde Fecha a Fecha.

---

## Pasajes en Fecha a Fecha (torneo real)

En `/prode/fecha`, los partidos de eliminatorias **no están disponibles** hasta que la app conoce ambos equipos del cruce:

```
homeTeamId ≠ null  AND  awayTeamId ≠ null  AND  status = scheduled
```

Cuando el admin carga un resultado real:

1. Se determina ganador y perdedor.
2. El ganador/perdedor avanza al partido siguiente según `homeFromMatchId`, `awayFromMatchId` y `homeFromPosition` / `awayFromPosition` en la base de datos.
3. Se actualizan `Match.homeTeamId` / `Match.awayTeamId` del partido dependiente.

Implementación: `src/lib/tournament/points.ts` → `advanceKnockoutTeams`.

### Empates en eliminatorias (torneo real)

El fixture no modela penales. Si un partido de eliminatorias termina empatado en tiempo reglamentario, **no hay ganador** y no se avanza ningún equipo hasta definir el resultado (criterio pendiente de regla explícita en admin).

En el **Prode Completo**, podés predecir empate en 90' y elegir quién avanza (prórroga o penales).

---

## Labels del fixture (referencia técnica)

Los partidos de eliminatorias usan placeholders en `data/fixture.json`:

| Label | Significado |
|-------|-------------|
| `1st Group X` | Campeón del Grupo X |
| `2nd Group X` | Subcampeón del Grupo X |
| `3rd best (…)` | Tercero asignado por Anexo C |
| `Winner Mnn` | Ganador del partido Mnn |
| `Loser Mnn` | Perdedor del partido Mnn |

Resolución del bracket predicho: `src/lib/bracket/predicted-bracket.ts` → `resolvePredictedBracket`.

---

## Desbloqueo de rondas en el wizard

| Ronda | Partidos | Requisito para desbloquear |
|-------|----------|----------------------------|
| Dieciseisavos | M73–M88 | 72 grupos completos |
| Octavos | M89–M96 | Dieciseisavos completos (sin empate) |
| Cuartos | M97–M100 | Octavos completos |
| Semifinales | M101–M102 | Cuartos completos |
| Tercer puesto | M103 | Semifinales completas |
| Final | M104 | Semifinales completas |

Implementación: `isKnockoutRoundUnlocked` en `src/lib/bracket/predicted-bracket.ts`.

---

## Cierres y locks

| Modo | Cierre |
|------|--------|
| Prode Completo (global) | Fin de fecha 1 — **17 jun 2026, ~23:00 ARG** |
| Prode Completo (confirmación) | El usuario puede bloquear su bracket antes (`BracketEntry.locked`) |
| Fecha a Fecha | 5 min antes de cada kick-off |

---

## Diagrama simplificado del bracket

```
GRUPOS (72 partidos)
    │
    ▼
R32 (M73–M88) ──► R16 (M89–M96)
                        │
                        ▼
                 QF (M97–M100)
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
      SF (M101)               SF (M102)
            │                       │
            └───────────┬───────────┘
                        ▼
                   FINAL (M104)
                        │
            Tercer puesto (M103) ← perdedores M101, M102
```

---

## Implementación en código

| Concepto | Archivo |
|----------|---------|
| Tablas de grupo + mejores terceros | `src/lib/bracket.ts` |
| Desempates FIFA | `src/lib/bracket/tiebreakers.ts` |
| Anexo C | `src/lib/bracket/annex-c.ts`, `data/annex_c_third_place.json` |
| Bracket predicho | `src/lib/bracket/predicted-bracket.ts` |
| Avance real post-resultado | `src/lib/tournament/points.ts` |
| Fixture completo | `data/fixture.json` |
| Sync grupos entre modos | `src/app/actions/sync-predictions.ts` |

Verificaciones:

```bash
npx tsx scripts/verify-tiebreakers.ts
npx tsx scripts/verify-annex-c.ts
npx tsx scripts/verify-r32-labels.ts
npx tsx scripts/verify-third-place.ts
```

---

*Última actualización: junio 2026 — ProdeBEB*
