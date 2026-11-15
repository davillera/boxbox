# Design Doc: Modo Caos / Simulador "What-If" para BoxBox

## 1. Intent & Context
BoxBox es un predictor de resultados de F1 de extremo a extremo que calcula la probabilidad de victoria y podio para cada uno de los 22 pilotos a partir del circuito, la parrilla de salida y el pronóstico del tiempo.
Los aficionados a la F1 quieren experimentar rápidamente con escenarios dramáticos e hipotéticos de carrera sin tener que arrastrar manualmente a los pilotos ni ajustar variables meteorológicas una a una.
El "Modo Caos" añade una barra de herramientas con presets interactivos que transforman las condiciones y la parrilla al instante, calculan nuevas predicciones y muestran los deltas comparativos resaltando a los mayores ganadores y perdedores del escenario.

## 2. Goals, Non-Goals & Anti-Goals
### Goals
- Proveer 4 presets dramáticos con un botón de restablecimiento:
  1. `rain` (Lluvia torrencial): `rainfall = true`, `air_temp_c = 16`, `humidity_pct = 90`, `wind_speed_ms = 8.5`.
  2. `polePenalty` (Penalización al poleman): Mueve al piloto de P1 a P11 (penalización de 10 puestos) desplazando al resto.
  3. `reverseTop10` (Parrilla invertida Top 10): Invierte los primeros 10 lugares de la parrilla (P1 pasa a P10, P2 a P9, etc.).
  4. `heatwave` (Ola de calor extremo): `rainfall = false`, `air_temp_c = 40`, `humidity_pct = 25`, `wind_speed_ms = 2.0`.
  5. `reset` (Restablecer): Regresa a la parrilla y pronóstico meteorológico oficial de la carrera seleccionada.
- Calcular y renderizar en la tabla de resultados y en el pit board:
  - Deltas de probabilidad: `deltaWin` y `deltaPodium` (ej. `+12%`, `-8%`).
  - Etiquetas destacadas para el **Mayor Beneficiado (Top Riser)** y el **Mayor Perjudicado (Top Faller)**.
- Soporte multilingüe completo (español en `es.json` e inglés en `en.json`).
- Diseño neo-brutalista consistente con los tokens de BoxBox.

### Non-Goals
- No requiere backend nuevo ni cambios al modelo de ML: el endpoint `POST /predict` de FastAPI ya recibe cualquier combinación de parrilla y clima.
- No almacena sesiones ni autenticación de usuarios.

### Anti-Goals
- No sobrecargar la vista ni entorpecer la interacción manual de arrastrar pilotos.
- No generar animaciones lentas o bloqueantes que retrasen el cálculo.

## 3. Approaches Considered & Tradeoffs
1. **Desafío Fan vs IA (Liga comunitaria):** Muy atractiva para retención, pero requería modelos de base de datos de usuarios, autenticación y esperar a que terminen las carreras reales para el cálculo de puntos.
2. **Modo Caos / Simulador "What-If" (Elegido):** Recompensa inmediata, interactividad directa, utiliza los servicios actuales desplegados en Cloud Run.
3. **Arena de Duelos Directos:** Herramienta enfocada en comparativas 1v1, pero menos lúdica para explorar carreras completas.

## 4. Technical Specifications
- **Helpers de transformación (`frontend/src/lib/scenarios.ts`):**
  - Funciones puras para mutar la parrilla y el clima según el escenario activo.
  - Cálculo de deltas entre la predicción base y la predicción caótica actual.
- **Componente UI (`frontend/src/components/molecules/ChaosToolbar.tsx`):**
  - Botones de acción rápida con iconos de `lucide-react`.
  - Indicador visual del preset activo.
- **Integración (`frontend/src/components/organisms/PredictionWorkbench.tsx`):**
  - Mantiene la referencia de la predicción base para computar deltas cuando se aplica un preset.
- **Diccionarios:**
  - Claves para `chaos`: título, nombres de presets, descripciones y badges (`riser`, `faller`).
