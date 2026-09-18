# Revisión del workflow y los nodos — 18 septiembre 2026

[English](REVIEW.md)

## Estado comprobado

La revisión parte del commit `19ea9b3`. El código instalado y el del repositorio coincidían. Había seis commits locales pendientes de enviar: pestañas de prompt y estadísticas, perfiles de carga, ajustes por familia, nodo Modelos y dos correcciones de cámara. La corrección de serialización de los controles decorativos y los valores `ninguno / 0` de LoRA siguen presentes.

El workflow Cine con IA revisado conecta Prompt → Escena → Render → Escalar y Refinar → Salida. También conecta una imagen guía al fotograma 0. El JSON guardado tiene vacíos los campos del prompt: no contiene el texto de la última generación. ComfyUI no estaba escuchando en el puerto 8188; no se pudo contrastar el historial ni generar un video.

## Cámara

Se corrigieron los controles que faltaban al usar una caja manual sin vocabulario reconocible, el ángulo de LTX y el reemplazo de encuadre que también cambiaba el destino del movimiento. El reemplazo de movimiento ahora requiere un sujeto explícito `The camera`, conserva acciones separadas por punto y coma y respeta la intensidad seleccionada. No intenta interpretar cualquier frase libre: hay que revisar las contradicciones restantes en el prompt.

Las reglas de continuidad ya no obligan a conservar las manos dentro de un primer plano ni a detener el acercamiento. El botón **Ver prompt final** usa el mismo constructor Python que la ejecución, sin cargar modelos. Si hay entradas conectadas, muestra que la vista es parcial. **Cambiar la toma en el texto** usa ese mismo constructor y conserva la toma elegida al repetir el clic.

La imagen guía ancla una composición en un fotograma concreto. Para empezar directamente en tres cuartos, esa guía debe mostrar la vista deseada. Otra alternativa es conservar la vista inicial y describir una transición posterior. Una referencia de identidad y una imagen guía no tienen el mismo papel. El texto controla la intención, pero no garantiza el resultado de un modelo generativo.

## Lo que falta para un workflow universal

El selector de carga existe; no adapta todavía toda la cadena. Escena usa `MiniMaxH3ReferenceToVideo`, el refinado espera latentes H3 y Salida separa video/audio. Faltan adaptadores de condicionamiento, muestreo, escalado y salida por familia, además de la sincronización entre nodos.

El cargador actual tiene un único codificador y un único modelo. La plantilla Hunyuan 1.5 usa dos codificadores y CLIP Vision; Wan 2.2 14B requiere modelos de ruido alto y bajo. Elegir sus archivos en el cargador no completa esas rutas. Tampoco existe aún un guardado explícito de perfiles personales con sus LoRA.

## Referencia AcademiaSD y modelos propuestos

El JSON AcademiaSD v18 selecciona Singularity ref2va v1.3 int8 mediante un conmutador. Contiene `MiniMaxH3TurboLoRA` v4 step600, fuerza 0.8, scheduler simple de 6 pasos, sampler heunpp2 y shifts 12/6. Su refinado emplea un escalador 3D y cuatro pasos con sigmas manuales. Estos son valores guardados del ejemplo, no una recomendación validada aquí: los modos de bypass y conmutadores determinan qué ramas se ejecutan.

La [ficha de Singularity](https://huggingface.co/WarmBloodAban/Minimax-h3_Singularity) recomienda otro acelerador, `minimax_h3_ref2v_turbo_4step_v0.1`. Deben identificarse y probarse por separado; no son automáticamente intercambiables con el v4 del ejemplo. Las mejoras visuales de esa ficha son afirmaciones del autor, pendientes de comparación local.

El [escalador de LBH](https://huggingface.co/LBH-123-AI/Minimax_h3_latent_Upscaler) está diseñado para latentes H3 de 24 canales y usa `models/latent_upscale_models/`. No es un escalador universal. La revisión no descargó pesos ni activó nuevas dependencias. El video de YouTube no pudo recuperarse; el análisis se apoya en el JSON y las fichas de los autores.

## Validación

45 pruebas Python aprobadas y sintaxis JavaScript comprobada. Queda pendiente la prueba visual al abrir ComfyUI y una comparación A/B con la misma semilla, modelo, imágenes y ajustes, cambiando solamente la cámara.
