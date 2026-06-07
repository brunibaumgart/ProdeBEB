# Reglas de puntajes — ProdeBEB

Documento oficial de puntuación para **ProdeBEB** (Mundial FIFA 2026).

Los dos modos son **independientes**: distinta filosofía, distintas predicciones, distintos puntos.

| | Fecha a Fecha | Prode Completo |
|---|---------------|----------------|
| **Cuándo predecís** | Partido a partido, antes de cada kick-off | Todo el torneo de una vez (grupos + bracket + campeón) |
| **Qué premia** | Resultados concretos | Posiciones, cruces, camino del bracket, campeón |
| **Riesgo** | Bajo (reactivo) | Alto (anticipación) |
| **Recompensa** | Hasta 3 pts/partido | Hasta ~500+ pts totales con multiplicadores |

Ver pasajes del bracket en [REGLAS-PASAJES.md](./REGLAS-PASAJES.md).

---

## Torneos y totales

```
pointsTotal = (modeMatchday ? pointsMatchday : 0)
            + (modeScorers ? pointsScorers : 0)
            + (modeComplete ? pointsComplete : 0)
```

El torneo global suma los tres modos. Los torneos privados pueden activar solo algunos (`modeMatchday`, `modeScorers`, `modeComplete`).

---

## Prode Fecha a Fecha

Predicción **reactiva**, partido por partido. Cierre **5 minutos antes del kick-off** (hora ARG).

**Misma regla en los 104 partidos** — fase de grupos y eliminatorias. No hay multiplicadores ni bonos por ronda.

### Puntos por partido (máximo 3, siempre igual)

| Condición | Puntos |
|-----------|--------|
| Resultado exacto | **3** |
| Ganador o empate correcto (sin exacto) | **1** |
| Diferencia de goles correcta (si ya acertaste ganador/empate) | **+1** |

### Ejemplos

| Predicción | Resultado | Puntos |
|------------|-----------|--------|
| 2–1 | 2–1 | 3 |
| 2–0 | 1–0 | 2 |
| 2–1 | 1–0 | 1 |
| 2–1 | 1–2 | 0 |

```
pointsMatchday = SUM(Prediction.points)
```

### Goleadores (sistema aparte)

Al predecir un resultado con goles, podés elegir **goleadores opcionales** por equipo. Los puntos se guardan en `Prediction.pointsScorers` y se suman por separado en el torneo (`TournamentMember.pointsScorers`).

| Posición | Puntos por goleador acertado |
|----------|------------------------------|
| Portero | **+10** |
| Defensa | **+5** |
| Mediocampista | **+2** |
| Delantero | **+1** |

- Solo suma si el jugador **marcó en el partido real**.
- **Sin orden:** no importa si lo pusiste como “Gol 1” o “Gol 2”; si ese jugador marcó en el partido, sumás.
- **Independiente del resultado:** aunque errés el marcador (`Prediction.points`), si acertás un goleador igual sumás en `pointsScorers`.
- En predicciones: goleadores **opcionales** (podés omitirlos y sumar 0).
- En admin (resultado real): goleadores **obligatorios** si hay goles.
- Torneos con `modeScorers: false` no suman estos puntos al total.

```
pointsScorers = SUM(Prediction.pointsScorers)
```

**Ejemplo:** predicción 2–1, resultado real 1–0. Marcador: 1 pt (ganador local). Si elegiste al único goleador real entre tus predichos: +1 a +10 según posición, aunque el total de goles no coincida.

**Ejemplo sin orden:** en un 2–0 elegís “Gol 1 → Messi, Gol 2 → Álvarez”, pero Messi marca el segundo. Igual sumás por Messi.

---

## Prode Completo

Predicción **anticipada** de todo el mundial.

**Plazo para completar/editar:** hasta el **final de la fecha 1** de grupos (**17 jun 2026, ~23:00 ARG**, cuando termina el último partido de la jornada 1).

La fase de grupos en el Completo **no puntúa resultados partido a partido** (eso es Fecha a Fecha). Acá importa **dónde termina cada equipo**, **qué cruces armaste** y **quién avanza en cada ronda** — con más peso cuanto más avanzada la instancia.

### Fórmula total

```
subtotal = SUM(BracketSlot.points)      ← eliminatorias (cruces + ganadores)
         + BracketEntry.pointsPositions ← posiciones en grupos
         + BracketEntry.pointsChampion  ← campeón

pointsEarlyBonus = subtotal × 15%       ← solo si confirmaste antes del cierre

pointsComplete = subtotal + pointsEarlyBonus
```

---

### 1. Posiciones en grupos

**Cuándo:** al terminar los 72 partidos de fase de grupos.

| Condición | Puntos |
|-----------|--------|
| Acertar la posición exacta de un equipo (1.º, 2.º, 3.º o 4.º en su grupo) | **4** por equipo |

- Se comparan las tablas predichas (tus 72 resultados de grupos) vs las tablas reales.
- Máximo teórico: **48 equipos × 4 = 192 pts**.

> Acertar que un equipo clasifica sin acertar su puesto exacto **no suma** en esta categoría. La apuesta fuerte es el puesto final.

---

### 2. Cruces correctos (eliminatorias)

**Cuándo:** al cargarse el resultado de cada partido M73–M104.

| Condición | Puntos |
|-----------|--------|
| Los **dos equipos** del partido son exactamente los que predijiste en tu bracket | **6** |

- Si el cruce es incorrecto (equipo imposible o rama mal predicha): **0** en ese partido (sin cruce ni ganador).
- Aplica a los 32 partidos de eliminatorias, incluido el 3er puesto.

---

### 3. Ganador en eliminatorias (con multiplicador)

Solo se evalúa **si ya acertaste el cruce** (+6 pts arriba).

Marcador en 90 minutos; si empatás, indicás **quién avanza** y si define en **prórroga** o **penales** (solo afecta tu predicción, no el puntaje extra por ahora).

| Base | × Multiplicador de ronda |
|------|--------------------------|
| **4 pts** | según instancia |

#### Multiplicadores por ronda

| Ronda | Partidos | Multiplicador | Pts ganador (6 + base×mult.) |
|-------|----------|-------------|------------------------------|
| Dieciseisavos | M73–M88 | **×1.0** | 6 + 4 = **10** |
| Octavos | M89–M96 | **×1.5** | 6 + 6 = **12** |
| Cuartos | M97–M100 | **×2.0** | 6 + 8 = **14** |
| Semifinales | M101–M102 | **×2.5** | 6 + 10 = **16** |
| Tercer puesto | M103 | **×1.5** | 6 + 6 = **12** |
| Final | M104 | **×4.0** | 6 + 16 = **22** |

> A más avanzada la etapa, más vale acertar. Fallar un octavo no es lo mismo que fallar la final.

**Ejemplo solo cruce (ganador mal):** 6 pts.  
**Ejemplo cruce + ganador en semifinal:** 6 + 10 = 16 pts.

---

### 4. Campeón

| Condición | Puntos |
|-----------|--------|
| Campeón predicho = campeón real | **25** |

Se otorga al definirse la Final (M104). Es independiente del puntaje del partido final en eliminatorias.

---

### 5. Bonus por predicción temprana

| Condición | Bonus |
|-----------|-------|
| Confirmaste el bracket completo **antes** del cierre (fin de fecha 1) | **+15 %** sobre el subtotal |

```
pointsEarlyBonus = floor(subtotal × 0.15)
```

Premia comprometerte con tu bracket entero antes de que empiece el mundial, cuando más incertidumbre hay.

---

## Comparación de filosofías

| Situación | Fecha a Fecha | Prode Completo |
|-----------|---------------|----------------|
| Acertás 2–1 en un partido de grupos | Hasta **3 pts** (igual en todos los partidos) | **0** (el Completo no puntúa marcadores) |
| Acertás que México queda 1.º del A | 0 | 4 pts (al cerrar grupos) |
| Acertás que Argentina vs Francia juegan cuartos | 0 | 6 pts (+ ganador con mult.) |
| Acertás campeón antes del torneo | 0 | 25 pts |
| Confirmás todo el bracket el 10 de junio | — | +15 % sobre subtotal |

---

## Máximos teóricos (referencia)

| Componente | Máximo aprox. |
|------------|---------------|
| Fecha a Fecha (104 × 3) | 312 |
| Posiciones (48 × 4) | 192 |
| Cruces (32 × 6) | 192 |
| Ganadores eliminatorias | ~280 |
| Campeón | 25 |
| Bonus temprano (15 %) | ~100 |
| **Completo total** | **~790** |

En la práctica nadie llega al máximo.

---

## Cuándo se recalculan

| Evento | Fecha a Fecha | Prode Completo |
|--------|---------------|----------------|
| Resultado partido de grupos | `Prediction.points` + `Prediction.pointsScorers` | Posiciones (si cerraron los 72) |
| Resultado eliminatoria | `Prediction.points` + `Prediction.pointsScorers` | `BracketSlot.points` (cruce + ganador) |
| Final | Idem | `BracketSlot` + `pointsChampion` |
| Usuario confirma bracket | — | `pointsEarlyBonus` |
| Sync torneo | `TournamentMember` | Idem |

---

## Importar grupos entre modos

Podés copiar predicciones de fase de grupos (M1–M72) entre modos. **No mezcla puntajes**: Fecha a Fecha sigue con su sistema, Completo con el suyo.

---

## Implementación

| Regla | Archivo |
|-------|---------|
| Fecha a Fecha | `src/lib/points.ts` → `calculateMatchdayPoints` |
| Goleadores | `src/lib/scoring/scorers.ts`, `scorers-engine.ts` |
| Constantes Completo | `src/lib/points.ts` |
| Posiciones | `src/lib/scoring/complete/positions.ts` |
| Cruces + ganadores | `src/lib/scoring/complete/match.ts` |
| Campeón | `src/lib/scoring/complete/champion.ts` |
| Bonus temprano | `src/lib/scoring/complete/early-bonus.ts` |
| Orquestación | `src/lib/scoring/complete/engine.ts` |

```bash
npx tsx scripts/verify-complete-scoring.ts
npx tsx scripts/verify-scorers.ts
```

---

*ProdeBEB — Sistema Completo v2 — junio 2026*
