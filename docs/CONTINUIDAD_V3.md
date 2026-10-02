# Continuidad de la actualización V3

Fecha de preparación: 2026-10-01

Última entrega de código: 2026-10-02 (Acc/PDD propio experimental).

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
- Acc/PDD usa ahora `cineconia_h3/acc_pdd.py`, sin nodos externos Deno ni sustitución por una LoRA genérica. Aplica 362 adaptadores y las cabezas oficiales de video/audio. La implementación anterior delegada en Deno se retiró en esta rama experimental.
- Se descargó y verificó la LoRA oficial Ref2VA en `E:\models\loras`. La prueba CPU usa el checkpoint real y las clases nativas de ComfyUI; valida formas INT8, registro de parches y proyecciones finales, no un render completo. Detalles y reproducción en [ANALISIS_ACC_PDD.md](ANALISIS_ACC_PDD.md).
- Pruned/INT8 tiene soporte inicial mediante rebase de los 50 adaptadores AdaLN, incluidos sus bias: 412 parches. La base se incluye con procedencia MIT y SHA256; el residuo local es ~0,001375 %. La equivalencia visual sigue siendo experimental.
- VDN/DMD usa `LoraLoaderModelOnly` a fuerza 1.0.
- Se rechazan aceleradores apilados, shift distinto de 12/3, Ref2VA con FL2VA, perfil que no sea MiniMax H3 y dependencias ausentes. VDN exige pruned/completo coincidentes; Acc oficial se adapta internamente a ambos layouts. Acc rechaza GGUF, bases inválidas y trayectorias distintas de 8 pasos completos Euler/Simple, CFG 1.
- El Cronómetro conserva dentro de cada detalle y del campo `nodos` del CSV la tarea, cantidad de referencias/guía, acelerador y archivo, shift y perfil de cámara. Los parámetros ya existentes —modelo, pasos, sampler, scheduler, resolución, semilla, refinado y tiempos— se mantienen.
- Los workflows de referencia 039–049 no se modificaron.
- El nuevo workflow 050 prepara una prueba Ref2VA pruned INT8 con una referencia, 960×544, 124 fotogramas, semilla 833, 8 pasos Euler/Simple y sin refinado/interpolación. Hay que elegir la imagen de referencia antes de ejecutar.
- Verificación V3 anterior: 260 pruebas Python y 93 JavaScript. Verificación de esta entrega: 285 pruebas Python y 93 JavaScript aprobadas; `git diff --check` sin errores.

### Sin probar en GPU

- No hay todavía mediciones nuevas de segundos por iteración, tiempo total, VRAM pico ni calidad para VDN o Acc/PDD.
- No se ejecutó el tronco cuantizado completo en GPU. El archivo Acc FL2VA y el render full siguen sin probar; no confundir validación estructural o del FinalLayer con una corrida de video.
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

Pendiente de una entrega posterior para Acc/PDD: el cargador propio actual exige resolución fija y schedule completo; rechaza refinado y tramos parciales. No usar el workflow 050 para declarar equivalencia 7+1. Primero validar la fase 1 y ampliar el contrato con pruebas.

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

- Acc/PDD oficial Alibaba PAI: <https://huggingface.co/alibaba-pai/MiniMax-H3-Acc-LoRAs>
- Referencia de integración MIT y bases AdaLN: <https://github.com/lukas-9936/ComfyUI-MiniMax-H3-PDD>
- Deno, referencia externa para comparación 7+1 (no dependencia): <https://github.com/Deno2026/comfyui-deno-custom-nodes>
- VDN/DMD para MiniMax H3 y variantes: <https://huggingface.co/drbaph/MiniMax-H3-Turbo-Lora-ComfyUI>
- Guía oficial de HunyuanVideo 1.5: <https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5/blob/main/assets/HunyuanVideo_1_5_Prompt_Handbook_EN.md>
- Guía oficial de prompting LTX: <https://docs.ltx.io/open-source-model/usage-guides/prompting-guide>
- Repositorio oficial Wan 2.2: <https://github.com/Wan-Video/Wan2.2>

## Próximo punto de control

1. Reiniciar ComfyUI y abrir el workflow 050. La LoRA Acc Ref2VA ya está instalada; elegir una referencia. Confirmar por separado el VDN compatible para su comparación.
2. Ejecutar el render Acc del 050 y las corridas A/B/C de resolución fija, sin apilar aceleradores.
3. Adjuntar al registro del Cronómetro capturas o notas de defectos.
4. Recién entonces ejecutar la fase progresiva y decidir si hace falta desarrollar la ruta Deno 7+1 explícita.
