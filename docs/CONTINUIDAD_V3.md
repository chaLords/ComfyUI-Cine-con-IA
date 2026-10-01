# Continuidad de la actualización V3

Fecha de preparación: 2026-10-01

Rama de prueba: `feature/h3-ejecucion-7mas1`

Base: `0610ff48` (`Release 1.6.0`)

Este documento conserva las decisiones del plan V3 y separa lo comprobado en código de lo que todavía necesita renders reales.

## Estado actual

### Probado sin GPU

- La actualización vive en una rama separada; `main` no se ha modificado.
- H3 Prompt 6 conserva exactamente sus 4.704 combinaciones históricas de cámara.
- LTX Prompt 6 conserva exactamente sus 1.176 combinaciones ofrecidas por la interfaz.
- Camera Director conserva exactamente sus 241.920 combinaciones históricas de H3.
- El registro `cineconia_h3/camera_recipes.json` es la fuente única para esas traducciones y se sirve en `GET /cineconia/camera_recipes`.
- El Director mantiene los mismos botones para MiniMax H3, LTX-2.5, Wan 2.2 y Hunyuan 1.5. El perfil es opcional y no carga pesos.
- El cargador existente permite elegir, de forma excluyente, `Sin acelerador`, `Acc/PDD` o `VDN/DMD`; no se añadió un nodo visible.
- Acc/PDD llama a `DenoMiniMaxH3AccLoader`; no se simula con un LoRA genérico.
- VDN/DMD usa `LoraLoaderModelOnly` a fuerza 1.0.
- Se rechazan antes del render: aceleradores apilados, shift distinto de 12/3, Ref2VA con FL2VA, pruned con completo, perfil que no sea MiniMax H3 y dependencias ausentes.
- El Cronómetro conserva dentro de cada detalle y del campo `nodos` del CSV la tarea, cantidad de referencias/guía, acelerador y archivo, shift y perfil de cámara. Los parámetros ya existentes —modelo, pasos, sampler, scheduler, resolución, semilla, refinado y tiempos— se mantienen.
- Los workflows de referencia 039–049 no se modificaron.
- Verificación local: 260 pruebas Python y 93 pruebas JavaScript aprobadas; `git diff --check` sin errores.

### Sin probar en GPU

- No hay todavía mediciones nuevas de segundos por iteración, tiempo total, VRAM pico ni calidad para VDN o Acc/PDD.
- No se ha determinado un ganador. VDN y Acc/PDD pueden ordenar distinto a resolución fija y en progresivo.
- No está demostrado que el progresivo SelfLift actual sea visualmente equivalente al flujo Deno 7+1.
- Wan 2.2 usa provisionalmente la receta genérica H3 y aparece como `experimental/SUPUESTO`.
- LTX-2.5 y Hunyuan 1.5 tienen vocabulario apoyado en documentación, pero las nuevas rutas del Director figuran como `sin probar` hasta renderizarlas.

## Orden de validación en GPU

### Fase 1 — aceleradores a resolución fija

Crear tres corridas con una sola variable diferente:

| Corrida | Acelerador | Pasos | Scheduler / sampler | Shift |
| --- | --- | ---: | --- | --- |
| A | ninguno, control | 8 | Simple / Euler | receta compatible documentada |
| B | VDN/DMD | 8 | Simple / Euler | 12/3 |
| C | Acc/PDD | 8 | Simple / Euler | 12/3 |

Mantener idénticos: modelo y variante, pruned/completo, tarea, prompt, referencias y su orden, semilla, resolución, fotogramas, CFG/denoise, LoRA estéticos y refinado. Para la comparación inicial, conviene desactivar LoRA estéticos y el refinado.

Registrar por corrida:

- tiempo total y segundos por iteración;
- VRAM pico y RAM, si están disponibles;
- identidad, pelo, anatomía, movimiento de cámara, parpadeo y detalle;
- archivo exacto del acelerador;
- resultado `válido`, `degradado` o `falló`, sin convertir el síntoma en una causa.

Si cambia la identidad o el pelo, anotar hipótesis separadas —ruido, tamaño de referencia, variante, prompt, guía— y repetir cambiando una sola.

### Fase 2 — progresivo compatible

Con cada acelerador que haya producido una corrida válida:

- Optimizer en `Advanced`;
- 8 pasos;
- `Simple / Euler`;
- muestreo `Progresivo`;
- transición 7;
- escala inicial 0.5;
- misma semilla, prompt, referencias y resolución de la fase 1.

SelfLift hace los primeros pasos a resolución reducida y luego continúa a resolución final. La lectura del código no prueba por sí sola equivalencia con Deno.

### Fase 3 — referencia Deno 7+1, solo si hace falta

Implementar una ruta propia únicamente si la fase 2 muestra una diferencia importante que justifique aislarla. La referencia correcta no exige una trayectoria latente continua: al terminar el tramo de baja resolución, toma la predicción limpia, la amplía y vuelve a añadir ruido para el paso final. Ambos samplers reciben `RandomNoise`.

La aceptación debe decidirse por comparación A/B con la misma entrada, no por semejanza arquitectónica.

## Cámara adaptable

- MiniMax H3: `probada`; conserva palabra por palabra el comportamiento previo.
- LTX-2.5: `sin probar`; conserva Prompt 6 y usa vocabulario del Director adaptado a LTX.
- Hunyuan 1.5: `sin probar`; sus movimientos principales siguen el manual oficial.
- Wan 2.2: `experimental/SUPUESTO`; no se encontró una tabla oficial equivalente y por eso el fallback queda visible.
- Las instrucciones manuales de cámara nunca se traducen ni se reescriben. Solo cambian los controles estructurados.
- Los nombres de botones permanecen iguales; un posible cambio de nombres queda para una fase posterior.

## Escalado

El segundo pase no se elimina: sigue siendo una elección explícita. El nodo de tamaño anticipa resoluciones x1.5 y x2, el Cronómetro registra la resolución efectiva y el refinador informa su multiplicador/coste. Antes de encadenar otro escalado, comprobar la resolución final registrada para evitar una ampliación accidental.

## Fuentes técnicas primarias

- Deno Acc/PDD y cargador oficial: <https://github.com/Deno2026/comfyui-deno-custom-nodes>
- VDN/DMD para MiniMax H3 y variantes: <https://huggingface.co/drbaph/MiniMax-H3-Turbo-Lora-ComfyUI>
- Guía oficial de HunyuanVideo 1.5: <https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5/blob/main/assets/HunyuanVideo_1_5_Prompt_Handbook_EN.md>
- Guía oficial de prompting LTX: <https://docs.ltx.io/open-source-model/usage-guides/prompting-guide>
- Repositorio oficial Wan 2.2: <https://github.com/Wan-Video/Wan2.2>

## Próximo punto de control

1. Instalar o confirmar los archivos VDN y Acc/PDD compatibles con el mismo modelo H3.
2. Ejecutar las corridas A/B/C de resolución fija.
3. Adjuntar al registro del Cronómetro capturas o notas de defectos.
4. Recién entonces ejecutar la fase progresiva y decidir si hace falta desarrollar la ruta Deno 7+1 explícita.
