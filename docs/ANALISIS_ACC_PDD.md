# Acc/PDD propio de CineConIA

Entrega experimental: 2026-10-02. Rama: `feature/h3-ejecucion-7mas1`.
Implementación y comprobaciones CPU terminadas; render y comparación GPU **sin probar**.

## Uso

1. Reinicia ComfyUI después de actualizar esta rama.
2. Abre [050 · Acc/PDD propio, 8 pasos](../examples/050.REALminimax-H3-CineconIA-Acc-PDD-propio-8pasos.json).
3. Selecciona tu imagen de referencia y comprueba los archivos del cargador.
4. Conserva los ajustes iniciales: 8 pasos, `euler`, `simple`, denoise 1, BasicGuider/CFG 1, shift 12/3; sin otras LoRAs, progresivo, refinado ni interpolación.

No hace falta instalar Deno. El mismo nodo **Cargar modelo** usa ahora el cargador interno al elegir `Alibaba MiniMax-H3 Acc/PDD 8 pasos`. La fuerza del acelerador es 1.0; no lo pongas en una ranura de LoRA estética.

Archivo instalado: `E:\models\loras\MiniMax-H3-Ref2VA-Acc-8Step.safetensors`.
Fuente: [Alibaba PAI · MiniMax-H3-Acc-LoRAs](https://huggingface.co/alibaba-pai/MiniMax-H3-Acc-LoRAs).
Tamaño: 1.372.450.680 bytes. SHA256 contrastado con el publicado:
`111c82e669f6e20e628228172edf39395f1a9fc3ad049793895e542c0f55b18c`.

Receta 050: H3 Ref2VA pruned INT8, una referencia, 960×544, 124 fotogramas (~5,17 s a 24 fps), semilla 833. Qwen3VL 32B NVFP4/AWQ, VAE video INT8 convrot y VAE audio FP32. Salida `CineConIA/050_ref2va_acc_pdd_8p_…`; VideoHelperSuite guarda el video. KJNodes aporta troceado cuando está instalado. El Cronómetro registra la corrida; **no hay tiempos ni VRAM medidos para esta receta**.

## Implementación y decisiones

- **Probada — contrato:** el archivo oficial tiene 728 tensores: 362 pares LoRA y cuatro bancos de cabezas completas de video/audio. Se revisan todas las claves, formas, tipos y metadatos; no se permite una aplicación parcial.
- **Probada — traducción:** Q/K/V se asignan a segmentos distintos del QKV nativo. Las mitades SwiGLU se intercambian: Diffusers usa [valor, puerta], ComfyUI [puerta, valor].
- **Probada — cabezas:** se fusionan las 32 cabezas en ocho grupos de cuatro, ponderando por los intervalos de tiempo de video (shift 12) y audio (shift 3) por separado, en FP32.
- **Probada — ejecución:** los wrappers de ModelPatcher seleccionan la cabeza por la sigma real, sin contador de llamadas. ContextVar restaura el estado tras llamadas anidadas o excepciones. Solo la cabeza fusionada actual se transfiere al dispositivo de cálculo.
- **Experimental/SUPUESTO — pruned:** el modelo local no contiene el time-embedder denso. Se incluyen dos grillas pequeñas de referencia (~11 MB por tarea) del proyecto MIT citado abajo. Se ajusta `grid(t) ≈ c + table(t) @ V.T` y se transforman los 50 adaptadores AdaLN, incluyendo el término constante como delta del bias. El archivo completo no requiere este ajuste.
- **Probada — protección:** errores explícitos para GGUF, formatos convertidos/incompletos, bases ausentes o corruptas, residuo excesivo, variantes nominales incompatibles, carga duplicada, pasos/sigmas distintos, CFG distinto de 1, sampler distinto de Euler o churn. Sin sustitución por una LoRA genérica.
- **Probada — aislamiento:** se devuelve un clon. El modelo original, sus proyecciones y su sampling se restauran al retirar los parches. Los controles visibles y el orden de los widgets existentes no cambiaron.

La base incluida se comprueba por SHA256 y el ajuste en FP64 se mide después de redondearlo a FP32. Umbral relativo máximo: 0,0005. El ajuste Ref2VA local dio **0,0000137526 (~0,001375 %)**. Este residuo mide la reconstrucción de la grilla, **no** el error del video ni la calidad del modelo.

## Evidencia reproducible

`scripts/validate_acc_pdd_local.py` usa el ComfyUI real en CPU, arquitectura full/pruned en dispositivo meta y el FinalLayer real del checkpoint pruned. No carga los 20,9 GB del tronco ni ejecuta un render.

Comprobado en la instalación actual `E:\ComfyUI\ComfyUI`, core
`6b747c0428c343e1417219641db93a4fb7cb69ae`, Torch `2.14.0+cu130`:

| Comprobación | Resultado |
| --- | --- |
| Arquitectura full nativa en meta | 362 parches registrados |
| Formas del checkpoint Ref2VA pruned INT8 y FinalLayer nativo | 412 parches registrados; 50 AdaLN con peso y bias |
| Ocho salidas video/audio contra integración independiente de las 32 cabezas oficiales | Error absoluto máximo 0,000082493; pasa tolerancia absoluta/relativa 0,00005 |
| Schedule Simple de ComfyUI, 8 pasos, shift 12/3 | Coincide con los ocho intervalos destilados |
| Restauración de proyecciones y sampling | Correcta |

La misma prueba pasó previamente en core `73c9bad4d21e7addbe1d13bc92eee0f1431b017d`, Torch `2.13.0+cu130`.

Comando desde la raíz de este repositorio (el `-s` evita mezclar paquetes de Python del usuario):

```powershell
& 'E:\ComfyUI\python_embeded\python.exe' -s scripts\validate_acc_pdd_local.py --comfy-root 'E:\ComfyUI\ComfyUI' --acc 'E:\models\loras\MiniMax-H3-Ref2VA-Acc-8Step.safetensors' --model 'E:\models\diffusion_models\minimax\minimax_h3_ref2va_pruned_int8_convrot.safetensors'
```

Las pruebas unitarias cubren contrato, tensores ausentes, QKV, SwiGLU, rebase y bias, fusión, secuencias repetidas/fuera de orden, restauración, errores y el workflow 050. La suite general mantiene las regresiones de cámara H3/LTX. Ver el resultado final en [CONTINUIDAD_V3.md](CONTINUIDAD_V3.md).

## Límites y pendientes

- **Sin probar:** render completo en GPU, aplicación numérica sobre el tronco INT8 cuantizado cargado, identidad, audio, calidad, tiempo y VRAM. La aceptación de los parches y la equivalencia del FinalLayer no certifican todo el render.
- **Sin probar:** checkpoint Acc FL2VA real y render full. Su ruta y su grilla están implementadas; la prueba con archivo oficial real fue Ref2VA.
- **Experimental/SUPUESTO:** la tarea se identifica por los nombres Ref2VA/FL2VA. Los metadatos oficiales no identifican de forma independiente la tarea. Un residuo bajo no prueba identidad: la grilla FL2VA también aproxima bien esta tabla. No renombrar archivos para eludir esa comprobación.
- **Sin probar:** modelos híbridos/Singularity, compilación y caches externos. Esta entrega no certifica combinaciones con otros parches.
- **Fuera del contrato de esta entrega:** refinado con sigmas parciales, 7+1 y progresivo. La ruta actual exige ocho pasos completos a resolución fija. Primero medir esta ruta; después ampliar y validar el contrato progresivo.
- **Sin probar:** superioridad frente a Deno, VDN/DMD o el modelo sin acelerar. “Propio” describe la integración y sus validaciones, no un resultado visual mejor.

Para la aceptación GPU, ejecutar el 050 con una referencia elegida por el usuario y guardar el video, el registro del Cronómetro, VRAM pico y observaciones. Comparar luego VDN y Acc por separado, manteniendo modelo, prompt, referencias, semilla y resolución. No inferir causas a partir de síntomas.

## Razonamientos conservados y propuestas descartadas

El análisis inicial decía que faltaba la LoRA y que la ruta dependía de Deno. Ese bloqueo quedó resuelto al descargar/verificar el archivo y completar la prueba CPU; la llamada a Deno se retiró **solo en esta rama experimental**, sin publicar una versión estable.

Se descartó copiar directamente los bancos oficiales a los pesos nativos: son cabezas completas, mientras la ruta PDD nativa usa base + offsets. Se optó por fusión previa y wrappers de proyección, comprobados numéricamente.

También se descartó omitir AdaLN en pruned o derivar una base exacta únicamente de su tabla 1025×8: falta el time-embedder original. Se eligieron grillas de referencia con licencia y procedencia, ajuste medido y fallo explícito si no coincide. El residual bajo no elimina la necesidad del render.

## Fuentes y licencia

- [Referencia oficial Alibaba PAI · minimax_h3_pdd.py](https://huggingface.co/alibaba-pai/MiniMax-H3-Acc-LoRAs/blob/main/minimax_h3_pdd.py): semántica de los bancos y pasos.
- [ComfyUI-MiniMax-H3-PDD, MIT](https://github.com/lukas-9936/ComfyUI-MiniMax-H3-PDD/tree/c5f103aeafca90551f833b3a8a941776455d79e7): mapeo, formulación AdaLN y grillas. [Aviso completo incluido](../cineconia_h3/assets/NOTICE.md).
- [ComfyUI nativo](https://github.com/Comfy-Org/ComfyUI/tree/6b747c0428c343e1417219641db93a4fb7cb69ae): MiniMax, ModelPatcher, sampling AV y orden SwiGLU.

No se incorporó código GPL de Deno. La licencia del software no sustituye los términos de uso de MiniMax H3 o de sus pesos.
