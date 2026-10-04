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

## Revisión 2026-10-03: renders del 050 y personaje duplicado

Fuentes: los MP4 de `output/CineConIA` y de Descargas (llevan el prompt de ComfyUI incrustado), `user/comfyui_8188.log` y `user/default/cineconia/registro_cronometro.csv`. RTX 4060 Ti 16 GB, 928×544, 124 fotogramas, Ref2VA pruned INT8 salvo donde se indica.

### Qué se vio

Referencia: lámina de 3 paneles (cabeza flotante a la izquierda, maniquí sin cabeza al centro, espalda a la derecha; ambos con gorra).

| Video (hora de inicio en el nombre) | Acelerador · pasos | Encuadre del Director | Semilla | Resultado |
| --- | --- | --- | --- | --- |
| 10-02 15:13 | Acc/PDD · 8 | plano medio corto / frontal / fijo · prompt distinto | 833 | una persona |
| 10-02 20:29 | Acc/PDD · 8 | PPP / perfil / acercarse | 834 | una persona; ignora el PPP: empieza en plano general |
| 10-02 20:51 | Acc/PDD · 8 | PPP / perfil / fijo | 832 | **duplicado** |
| 10-02 21:03 | Acc/PDD · 8 | PPP / frontal / acercarse | 834 | una persona; ignora el PPP: cuerpo entero |
| 10-02 21:11 | Acc/PDD · 8 (8 s) | PPP / tres cuartos / acercarse | 834 | **duplicado**; el del fondo lleva la gorra de la lámina |
| 10-03 11:40 | TaoMate 3p · normal | PPP / perfil / acercarse | 834 | **duplicado** |
| 10-03 11:43 | TaoMate 3p · progresivo 2/3 | PPP / perfil / acercarse | 834 | **duplicado** |
| 10-03 11:46 | TaoMate 3p · progresivo 2/3 | PPP / frontal / acercarse | 834 | **duplicado** |
| 10-03 11:51 | TaoMate 3p · progresivo 2/3 · Singularity v1.3 | PPP / frontal / acercarse | 834 | **duplicado** |

PPP = primerísimo primer plano, lente 85 mm, profundidad «profunda», continuidad activa.

### Diagnóstico

- **Probada (lectura del prompt final):** el Director genera exactamente lo pedido: «extreme close-up… side profile… pushes in… 85 mm… deep depth of field». El mismo `[Shot 1]` pide también «stands with his arms resting at his sides… His feet remain in place» y una silla «several metres behind». Un PPP no puede mostrar pies, brazos a los lados ni el suelo. El prompt se contradice.
- **Observado en 9 renders, sin prueba controlada:** cada vez que H3 respetó el PPP, añadió una segunda figura de cuerpo entero para cumplir el resto del texto. Las dos veces que no duplicó, ignoró el PPP. La cara grande queda siempre a la izquierda y el cuerpo entero al centro/derecha, como en la lámina; en 21:11 el doble lleva la gorra, que solo existe en la lámina.
- **Hipótesis principal (sin probar):** contradicción de encuadre (cámara frente a acción) + lámina multipanel descrita por paneles en el prompt («left panel… center and right panels»). La cámara no tiene un fallo de código; el defecto aparece al combinarla con ese texto y esa referencia.
- **Secundario:** profundidad «profunda» con 85 mm en PPP mantiene nítido al doble; no lo causa.
- **No es exclusivo de un acelerador ni de un modelo:** aparece con Acc/PDD, TaoMate, normal, progresivo y Singularity. Con Acc/PDD duplicó 2 de 4 y con TaoMate 4 de 4; con estos datos no se puede atribuir a la destilación.

### Prueba controlada pendiente (una variable por corrida)

Base: la corrida 11:40 (TaoMate 3 pasos, normal, semilla 834), que reproduce el defecto en ~1:30–2:40.

| Corrida | Único cambio | Si la hipótesis es cierta |
| --- | --- | --- |
| D1 | plano → «plano general» | una persona |
| D2 | quitar del `[Shot 1]` «with his arms resting at his sides» y «His feet remain in place» | una persona en PPP |
| D3 | referencia: solo el recorte de la cara en lugar de la lámina | sin doble o con un doble distinto de la lámina |
| D4 | `subject_definitions` sin mencionar paneles ni posiciones | menos dobles |
| D5 | profundidad «profunda» → «reducida» | el doble sigue, pero desenfocado |

Una semilla basta para descartar; repetir con 833 lo que funcione antes de darlo por bueno.

### Tiempos medidos (log de ComfyUI)

- **Medido:** TaoMate 3 pasos, normal: muestreo 95 s (~32 s/it), nodo Render 105 s, total 160 s con codificación de texto (~36 s) y decodificación (~13 s).
- **Medido:** TaoMate 3 pasos, progresivo 2/3 (448×256 → 928×544): 35 s + 31 s de muestreo; nodo Render 72–80 s; total 88 s con conditioning en caché y 130–135 s sin caché.
- **Sin medición:** Acc/PDD 8 pasos. Las corridas del 2 de octubre no quedaron en el registro del Cronómetro ni en el log actual.
- **SUPUESTO:** los 2 pasos a baja resolución cuestan ~17,5 s/it con un cuarto de los tokens. El modelo (~20 GB «Staged») no cabe en 16 GB, así que el paso estaría dominado por el traslado de pesos y no por el cálculo.
- Observación previa a esta rama: 448×256 → 928×544 no es ×2 exacto (×2,07 / ×2,125) por el redondeo a múltiplos; efecto visual sin probar.

### Errores del Cronómetro 11:50 y 11:51

Ambos son «El acelerador está activo pero no se eligió su archivo»: Acc/PDD activo con `acc_lora = ninguno`. Aunque se hubiera elegido, esas dos corridas también habrían fallado: pedían progresivo 7/8, que Acc/PDD rechaza, y la de 11:51 usaba FL2VA con la LoRA Ref2VA. El contrato funcionó, pero el mensaje no decía qué campo rellenar.

### Cambios de esta revisión

- `nodes.py`: TaoMate y otras LoRA destiladas de pocos pasos (`taomate`, `lightx2v`, `lightning`, `distill`, `Nstep`) cuentan como aceleradores; ya no se pueden apilar con Acc/PDD o VDN. El error por archivo ausente nombra el campo: «Archivo Acc/PDD» o «Archivo VDN/DMD».
- `web/cineconia.js`: la línea de estado decía «cargador Deno»; ahora dice «cargador interno CineConIA» y avisa «⚠ falta elegir el archivo…» antes de encolar.
- `camera_director.py` y `cineconia_faders.js`: aviso de encuadre. Si el plano deja fuera pies o piernas y la acción los menciona (en `summary` y `detailed_description`; la descripción del personaje no cuenta), o si se pide «acercarse/zoom in» desde un PPP, el Director lo dice en `info`, en el log y con un aviso emergente al ejecutarse, antes del render. **El prompt no cambia:** las 241.920 combinaciones siguen idénticas.
- `cineconia_cronometro.js`: la columna `nodos` del CSV guarda también el encuadre pedido y una huella del prompt (`prompt #xxxxxxxx`). Así se sabe, sin abrir el video, si cambió la cámara o el texto.
- Pruebas: 290 Python y 94 JavaScript aprobadas; `git diff --check` limpio; `examples/` sin cambios.

### Observaciones sin cambio de código

- La instalación de ComfyUI (`custom_nodes/ComfyUI-Cine-con-IA`) es otra copia git en `0610ff4` (1.6.0) con 97 archivos sobrescritos o sin seguimiento. Hoy coincide con esta rama, pero puede desfasarse sin aviso. Conviene un enlace (junction) a este repositorio o un checkout de la rama.
- Los títulos del 050 («Acc/PDD · 8 pasos…», «+ Acc/PDD propio») se quedan aunque se cambie a TaoMate o Singularity, y el Cronómetro los registra en los tramos. Inducen a error al leer el registro.
- `acc_pdd.py`: el clon recibe una copia superficial del `transformer_options` original. Hoy no pierde los wrappers, porque ComfyUI los guarda en `ModelPatcher.wrappers`, pero comparte diccionarios anidados con el modelo original.

## 2026-10-03 (tarde): combinaciones bloqueadas y botones personalizables

Pedido de Gonzalo: que un usuario novato no pueda combinar lo que no funciona junto (opciones opacas y sin clic) y poder crear botones propios con nombre y color.

### Bloqueo de combinaciones incompatibles

- **Fuente única:** `nodes.contrato_aceleradores()` se sirve en `GET /cineconia/aceleradores`. Reúne el patrón de LoRA aceleradora, el perfil y el shift exigidos y `acc_pdd.OPTIMIZER_CONTRACT`: lo que la trayectoria destilada admite en el Optimizador. La interfaz solo evalúa esas reglas, en `web/cineconia_aceleradores.js`.
- **Cargar modelo:** «Acelerador H3» pasa de lista a botones (sin acelerador · Acc/PDD · VDN/DMD); la lista real sigue en su posición, escondida. Un botón se ve opaco y el clic solo explica el motivo si hay TaoMate u otra LoRA destilada en las ranuras, si el perfil no es MiniMax H3 (Personalizado se deja, porque Python lo deduce), o, para Acc/PDD, si el modelo es GGUF o su nombre no dice Ref2VA/FL2VA. Lo que el servidor rechazaría sin apagar el botón queda en la línea de estado: archivo sin elegir, Ref2VA/FL2VA cruzados, pruned/completo distintos en VDN o shift distinto de 12/3.
- **Optimizador:** con Acc/PDD en el Cargar modelo que alimenta su Render (se sigue el cable config → Render → model; sin cable, el único Cargar activo), los chips «Auto» y «Progresivo» se apagan. Los controles fijados (8 pasos, euler, simple, denoise 1, sin segundo pase) se ven opacos con su valor a la vista, y cambiarlos se deshace con un aviso. Si el workflow ya traía valores incompatibles, se marcan en rojo y el botón «Ajustar a Acc/PDD» los corrige con un clic del usuario. **Nada se cambia solo.** VDN solo muestra su receta recomendada: el servidor no la exige.
- Sin contrato (Python anterior) no se apaga nada, como antes.

### Botones personalizables

- **Interruptor:** además de los grupos «RAMA…», «+ botón» crea un botón con los nodos seleccionados en el lienzo; la selección se recuerda aunque al pulsar quede seleccionado el propio Interruptor. Con clic derecho: renombrar, color (ámbar, verde, turquesa, amarillo, rojo, gris; sin violeta, que es el del bypass), subir/bajar, ocultar (sus nodos no se tocan) o borrar. Modos «una siempre» (el de siempre), «una o ninguna» y «varias»; apagado con bypass (el de siempre) o silenciando. Todo vive en `properties`; un workflow que solo trae `prefijo` (el 046) se ve y funciona igual. El nodo crece 16 px por el pie nuevo.
- **Selector:** «+» al final de cada fila guarda lo que está puesto ahora en sus controles como botón nuevo. Con clic derecho: «nueva fila», añadir o quitar controles de los nodos seleccionados (campos o encendido/apagado), renombrar fila y botón (la clave del video no cambia), actualizar un botón con lo puesto, colorear, mover y borrar. Si coinciden varios botones gana el que fija más valores, así se enciende el recién guardado; en el 048 sus botones son excluyentes y nada cambia.

### Comprobado

- 292 pruebas Python y 114 JavaScript aprobadas; `git diff --check` limpio; `examples/` sin cambios. Pruebas nuevas en `tests/test_aceleradores.cjs`, `tests/test_interruptor.cjs` y `tests/test_selector.cjs`.
- Arranque real de la instalación en el puerto 8199, sin cargar modelos: 14 nodos cargados, sin errores, `/cineconia/aceleradores` responde y se sirven los cinco JS. Instancia cerrada después.
- **Sin probar en el navegador:** el dibujo opaco de los controles nativos usa `w.draw` → `drawWidget` del frontend 1.53.6; los menús de clic derecho usan `getExtraMenuOptions` con submenús, y el nombre se pide con `extensionManager.dialog.prompt`. Las tres rutas existen en el código del frontend instalado, pero no se vieron en pantalla.

### Pendiente

- Revisión visual (sección 10 del plan) del 046, 048 y 050 en ComfyUI: abrir sin tocar nada, probar Acc/PDD con TaoMate cargado, «Ajustar a Acc/PDD», «+ botón» y «+» del Selector, guardar y reabrir.
- La prueba controlada D1–D5 del personaje duplicado.

## 2026-10-03 (noche): cámara automática y la ley del prompt de escena

Rama `feature/director-camara-automatica`, creada desde `d461f84`. La versión que daba buenos resultados quedó guardada en `feature/h3-ejecucion-7mas1` (`ecf57ed`, `d461f84`) y en la instalación `E:\ComfyUI`, que **no** se tocó en esta rama.

### Qué se vio en los renders de las 13:19–13:34

- El prompt nuevo (sin pies ni paneles) eliminó el personaje duplicado.
- El frontal salía parecido a un tres cuartos porque la escena decía «looks toward a fixed point off-screen». El frontal de ayer (15:13, fondo gris) decía «looks into the camera». **Observado, sin prueba controlada.**
- Con la misma semilla y los mismos ajustes, las corridas de las 13:21 y las 13:32 salieron idénticas fotograma a fotograma (PSNR infinito). Las comparaciones A/B con semilla fija son limpias.
- Con «fijo» e intensidad «suave», el texto de siempre dice «holds a static shot … with small amplitude at slow speed». Se corrigió solo en el modo automático, para no alterar el texto histórico.

### Qué cambió

- **La ley** ([LEY_PROMPT_ESCENA_ES.md](LEY_PROMPT_ESCENA_ES.md)) y su regla en `AGENTS.md`.
- **Director:** campo opcional nuevo `camara_automatica`, al final y apagado por defecto.
  - Encendido, cada botón pide `/cineconia/camera_auto` y escribe en la caja el texto de siempre más los `refuerzos` de `camera_recipes.json` (experimentales).
  - La caja se usa tal cual, sin sumarle el texto de siempre. Una edición manual no se pisa; «Rehacer texto automático» la regenera.
  - Al apagarlo se retira el texto que escribió el modo automático.
  - Avisa si la escena trae palabras de cámara.
- **Cronómetro:** el encuadre registra «texto automático».
- **Workflow 051:** el 050 con el prompt universal y el modo automático; solo cambia la cámara. Lo genera `tools/build_workflow051.py`.
- **Skills:** `skills/cineconia-escena-h3` (Claude) y `skills/chatgpt` (GPT personalizado). Los paquetes están en Descargas.

### Comprobado

- Regresión: las 241.920 combinaciones H3 y las del Prompt 6 siguen idénticas.
- Pruebas nuevas:
  - `AutoCameraTests` en `test_camera_recipes.py`: refuerzos completos y sin negaciones, la caja usada tal cual, la ley solo en modo automático, campo opcional al final.
  - `test_director_auto.cjs`: la interfaz.
  - `test_workflow_051.py`: el 051 es el 050 salvo la cámara y su escena cumple la ley.
  - `test_skills.py`: los ejemplos cumplen la ley con los 8 planos y el ejemplo 1 es el prompt del 051.
- `test_workflow_050` acepta ahora campos opcionales nuevos al final, que es la regla de compatibilidad del proyecto.

### Sin probar

Los refuerzos y el prompt universal en GPU. Matriz pendiente en [LEY_PROMPT_ESCENA_ES.md](LEY_PROMPT_ESCENA_ES.md#pendiente-para-declararla-probada).

### Corrección: el acelerador vuelve a ser una lista

Decisión de Gonzalo: los botones limitan cuando se sumen aceleradores nuevos. «Acelerador H3» vuelve a ser la lista de siempre, que se alimenta de `ACELERADORES_H3` en Python.

- Lo incompatible no se apaga en la lista: elegirlo vuelve a la opción anterior con un aviso del motivo.
- La línea de estado dice qué aceleradores no están disponibles ahora y por qué (`noDisponibles` en `cineconia_aceleradores.js`).
- El bloqueo del Optimizador con Acc/PDD no cambia.

Esto reemplaza lo dicho más arriba sobre «botones (sin acelerador · Acc/PDD · VDN/DMD)» en Cargar modelo.

## 2026-10-03 (noche): skills con imágenes y acción

Decisión de Gonzalo: el usuario adjunta las imágenes que necesite (personaje con toda su ropa, objetos, lugar) y escribe solo la acción. El prompt del 051, que funciona en sus renders con los botones del Director, es la plantilla canónica: la skill rellena sus huecos y no la reescribe.

### Qué cambió

- `SKILL.md` y `INSTRUCCIONES_GPT.md`:
  - La plantilla canónica con huecos y la lista de frases fijas.
  - La ropa completa de la cabeza a los pies; el gorro o sombrero también va en retention_analysis.
  - El reparto de imágenes en referencia_1 a referencia_3, con la línea «Conexión en el nodo Escena» que entrega la skill.
  - El lugar y lo que no cabe en tres entradas van solo como texto.
  - La acción del usuario va dentro de la plantilla.
  - Solo se pregunta lo imprescindible: sin palabras exactas, nadie habla, y sin lugar se usa el estudio de la plantilla.
- `ejemplos.md`: cuatro ejemplos que rellenan la plantilla, con boina, gorra, objetos conectados, un lugar solo como texto, un lugar conectado, más imágenes que entradas y diálogo.
- `formato-h3.md`: un sujeto sin imagen no lleva `from <Picture N>` ni línea de retention; el nodo se salta las entradas vacías.

### Comprobado

- `test_skills.py`, que ahora también comprueba:
  - Los cuatro ejemplos y el prompt del 051 conservan las anclas de la plantilla.
  - Las `<Picture N>` de cada ejemplo van seguidas, sin huecos y como mucho tres.
- Revisión manual: en los ejemplos no hay background, behind, panel ni negaciones; el calzado aparece solo en subject_definitions.
- El nodo Escena (`nodes.py`) numera solo las referencias conectadas; leído en el código, no en GPU.

### Sin probar

- Los ejemplos 2 a 4 en GPU.
- La ropa de cintura para abajo en subject_definitions. Los avisos del Director no la leen, pero con un primer plano podría empujar a una figura de cuerpo entero. Si pasa, la primera variable es quitar pantalón y calzado, con la misma semilla.
- El efecto del gorro en retention_analysis sobre su conservación.

## 2026-10-03 (noche): el usuario recibe solo el nodo y descarga las skills

Decisión de Gonzalo: al instalar desde GitHub, el usuario recibe solo lo que el nodo necesita para funcionar. Para Git eligió una rama limpia, `comfyui`. Pidió además botones en el README para bajar las skills.

### Qué se vio

- `git clone` y el «Install via Git URL» del Manager bajan siempre todo lo que hay en la rama; no se puede filtrar. Pixaroma, en el ComfyUI de Documentos, también trae sus `docs/`, `workflows/` y `scripts/`. Lo que hace es no guardar en Git lo de desarrollo (`tests/`, `CLAUDE.md`).
- El `node.zip` 1.6.0 del Comfy Registry respeta `.comfyignore` (no trae docs, tests ni .github), pero traía `examples/`, `tools/` y los CHANGELOG. Sus versiones figuran como `NodeVersionStatusFlagged` en la API del registro. **Probado** con la descarga del zip.

### Qué cambió

- `tools/paquete.py`:
  - `NODO` es la única lista de lo que recibe el usuario: `__init__.py`, `nodes.py`, `cineconia_h3/`, `web/`, `pyproject.toml`, `LICENSE`, `THIRD_PARTY_NOTICES.md` y los dos README.
  - `skills dist` arma los dos zips de skills con fecha fija, así que el mismo contenido da el mismo zip.
- `.gitattributes` (`export-ignore`): el «Source code» y el «Download ZIP» de GitHub traen solo el nodo. `.comfyignore` excluye lo mismo para el registro.
- `.github/workflows/rama_comfyui.yml`: en cada push a `main`, arma con `git ls-tree` y `git mktree` un árbol con `NODO` y lo sube como commit nuevo encima de `comfyui`. Si el árbol no cambia, no hace nada.
- `release.yml`: adjunta los dos zips de skills a cada Release.
- README (ES y EN): la instalación con Git pasa a `git clone -b comfyui`, hay una sección de skills con dos botones a `releases/latest/download/…` y la sección de desarrollo explica que se trabaja sobre `main`.

### Comprobado

- `git archive --worktree-attributes HEAD` da exactamente las 9 entradas de `NODO` (33 archivos), lo mismo que el árbol de la rama.
- Simulación local del workflow contra un remoto bare:
  - La primera corrida crea `comfyui`.
  - La segunda no hace nada.
  - Después de un commit añade otro encima, con su padre.
  - Un clon `-b comfyui` trae solo el nodo y `git pull --ff-only` lo actualiza.
- `tests/test_paquete.py`:
  - `NODO`, `.gitattributes` y `.comfyignore` coinciden, y el ZIP de GitHub es solo el nodo.
  - Los zips de skills llevan los archivos de `skills/` byte a byte y todos los archivos de `skills/` están empaquetados.
  - Los botones del README apuntan a los zips.

### Pendiente

- Los botones de skills funcionan desde la primera Release que adjunte los zips; la 1.6.0 no los trae.
- La rama `comfyui` se crea con el primer push a `main` que pase por el workflow nuevo.
- `[Sin publicar]` del CHANGELOG solo recoge este cambio y las skills. Faltan la cámara automática, los workflows 050 y 051, los avisos de encuadre y el cargador Acc/PDD antes de publicar.
- `web/logo_placa.png` no lo usa ningún archivo; sigue en `web/`.
