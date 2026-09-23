# CineConIA H3 Optimizer v1

> Documento histórico del primer prototipo. Para el estado actual de esta rama, ver [H3 modular v2](H3_MODULAR_V2_ES.md).

Esta es la primera implementación funcional de los módulos H3 de la rama
`feature/cineconia-h3-nodes`. No cambia la versión `1.5.2`, no modifica las
clases de los nodos H3 existentes y no contiene acciones de publicación en
ComfyUI Registry.

## Arquitectura

```text
Proporción/Tamaño ─┐
Duración ──────────┼─> H3 Optimizer ───────> H3 Optimized Sampler
                   │       ├─ troceo ──────> Cargar modelo
                   │       └─ refinado ────> Escalar y Refinar
Scene / Prompt ─> Camera Director ─> Escena ─> Sampler ─> Refinar ─> Salida
```

El código está separado en detección de hardware, perfiles, Memory Planner,
construcción de configuración, Scene/Prompt, Camera Director y nodos ComfyUI.
La configuración usa el tipo `CINECONIA_H3_CONFIG`; la escena modular usa
`CINECONIA_H3_SCENE`.

## Funcional en v1

- Detección tolerante de VRAM total y libre mediante `torch.cuda`.
- Perfiles `AUTO`, `8 GB`, `12 GB`, `16 GB`, `24 GB` y `32 GB`.
- Modos `Auto`, `Manual` y `Advanced`.
- Controles de calidad, detalle, movimiento, resolución, refinado y ahorro de VRAM.
- Memory Planner con estados `SAFE`, `TIGHT` y `RISKY`.
- Aplicación real del troceo de atención/FFN al nodo de carga existente.
- Aplicación real de pasos, sampler, scheduler y denoise al primer pase.
- Control real de activar, escala y pasos del nodo de refinado existente.
- Scene/Prompt y Camera Director separados, con prompt H3 final de seis secciones.
- Compatibilidad intacta con `CineCargarH3`, `CineEscenaH3`,
  `CineEscalarRefinar` y `CineSalida`.
- Workflow de ejemplo `039.REALminimax-H3-CineconIA-Optimizer-v1.json`.

El sampler nuevo utiliza las interfaces reales del core:
`BasicScheduler`, `KSamplerSelect`, `BasicGuider`, `RandomNoise` y
`SamplerCustomAdvanced`. Si faltan, muestra un error explícito.

## Experimental o pendiente de render real

- Los valores concretos de los perfiles son conservadores, pero no son todavía
  benchmarks. Deben medirse en GPU de 8/12/16/24/32 GB.
- El Memory Planner es una heurística relativa a `416x736x192`; no afirma una
  cifra exacta de GB ni reduce silenciosamente la resolución final solicitada.
- Falta validar tiempos, picos de VRAM, calidad y estabilidad con renders H3.
- SelfLift, Sigma Refiner y `highres_tiling` no están conectados en v1. El
  workflow 038 no incluía interfaces reales para ellos y no se inventaron
  sockets ni dependencias.
- La vista dinámica que oculta controles Advanced todavía no está implementada;
  los tres modos funcionan, pero todos los controles permanecen visibles.

## Workflow 039

El 039 se generó como copia del 038. Conserva modelo, referencia de personaje,
resolución, duración, `CineEscenaH3`, vista previa, segundo pase, salida y VHS.
El prompt producido para la toma de pantalla dividida es exactamente equivalente
al del 038; la diferencia es que ahora Scene/Prompt define qué ocurre y Camera
Director define cómo se filma.

El 038 original no se modifica.
