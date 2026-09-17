<p align="center">
  <img src="docs/assets/cineconia-banner.png" alt="Cine con IA" width="100%">
</p>

# ComfyUI Cine con IA

Nodos personalizados para simplificar la creación de video con IA en ComfyUI. El paquete concentra en ocho nodos un flujo completo orientado a MiniMax H3 —preparación, prompt, carga, generación, refinado y salida— e incluye modos de prompt para LTX-2.5 y otros modelos.

La interfaz está en español y añade controles visuales, avisos de memoria, progreso de render, ayudas contextuales y herramientas para planificar la cámara sin convertir el workflow en una maraña de nodos técnicos.

> [!IMPORTANT]
> Este repositorio contiene los nodos y su interfaz. No incluye ComfyUI, modelos, LoRAs, VAEs ni pesos de interpolación o escalado.

## Qué incluye

| Nodo | Función |
| --- | --- |
| **Cine con IA · Proporción y Tamaño** | Calcula ancho y alto desde proporciones de cine, redes sociales o fotografía. Permite trabajar por megapíxeles o lado principal y ajusta el resultado al múltiplo requerido por el modelo. |
| **Cine con IA · Duración** | Convierte segundos y FPS en una cantidad válida de fotogramas. Incluye la rejilla de MiniMax H3 y ajustes avanzados para otros modelos. |
| **Cine con IA · Prompt** | Construye prompts para MiniMax H3, LTX-2.5 o cualquier modelo mediante el modo Libre. Gestiona secciones, cámara, instrucciones para otra IA y pegado automático del resultado. |
| **Cine con IA · Cargar modelo** | Carga el modelo, codificador de texto y VAEs de video/audio. Encadena hasta cuatro LoRAs y aplica optimizaciones de VRAM, sigma shift y vista previa cuando están disponibles. |
| **Cine con IA · Escena** | Crea el condicionamiento y el latente audiovisual de H3. Acepta hasta tres imágenes de referencia y una imagen guía anclada a un fotograma. |
| **Cine con IA · Render** | Ejecuta el primer pase de muestreo con controles directos de pasos, sampler, scheduler, semilla y denoise. |
| **Cine con IA · Escalar y Refinar** | Escala el latente de video con un upscaler 3D y realiza un segundo pase de refinado. Incluye perfiles de 3, 4 y 5 pasos y mensajes claros ante falta de VRAM. |
| **Cine con IA · Salida** | Decodifica video y audio, interpola fotogramas opcionalmente y entrega un objeto `VIDEO`, fotogramas, audio, FPS e información del resultado. |

## Funciones destacadas de la interfaz

- Controles rápidos para relación de aspecto, resolución, duración, FPS, escala y parámetros de muestreo.
- Información en vivo sobre resolución final, megapíxeles, coste relativo, duración real y rango recomendado de H3.
- Barra de progreso integrada para el primer pase y el refinado.
- Hasta cuatro LoRAs encadenados, aplicados en orden.
- Pestañas de prompt para **MiniMax H3**, **LTX-2.5** y **Libre**.
- Selector de plano, ángulo y movimiento con redacción automática en inglés.
- Historial de tomas guardado dentro del workflow para ayudar a variar la cobertura de cámara.
- Botones para copiar instrucciones destinadas a una IA, pegar su respuesta y repartir automáticamente las seis secciones de H3.
- Compatibilidad con workflows guardados con nombres anteriores de los nodos.

## Requisitos

- Una instalación reciente de [ComfyUI](https://github.com/Comfy-Org/ComfyUI) con los nodos nativos de MiniMax H3.
- Los modelos y VAEs correspondientes al workflow de MiniMax H3.
- [ComfyUI-KJNodes](https://github.com/kijai/ComfyUI-KJNodes), recomendado para el troceado de atención/FFN y la vista previa en vivo. Si no está instalado, el nodo continúa sin esas optimizaciones.
- [Comfyui Minimax H3 Latent Upscaler](https://github.com/LBH-123-AI/Comfyui_Minimax_h3_latent_Upscaler), necesario únicamente para **Escalar y Refinar**.
- Un modelo compatible de interpolación de fotogramas si se activa la interpolación en **Salida**.

Las dependencias Python de los nodos son las que ya proporciona ComfyUI; este paquete no instala bibliotecas adicionales.

## Instalación

### ComfyUI-Manager

Una vez publicada la primera versión en Comfy Registry:

1. Abre **Manager** en ComfyUI.
2. Entra en **Custom Nodes Manager**.
3. Busca **Cine con IA**.
4. Pulsa **Install** y reinicia ComfyUI.

También se podrá instalar con Comfy CLI:

```bash
comfy node install cine-con-ia
```

### Con Git

Abre una terminal en `ComfyUI/custom_nodes` y ejecuta:

```bash
git clone https://github.com/chaLords/ComfyUI-Cine-con-IA.git
```

### Instalación manual

1. Descarga el repositorio como archivo ZIP.
2. Descomprime la carpeta dentro de `ComfyUI/custom_nodes`.
3. Comprueba que la ruta final sea `ComfyUI/custom_nodes/ComfyUI-Cine-con-IA/__init__.py`.
4. Reinicia ComfyUI y busca la categoría **Cine con IA**.

## Flujo recomendado

```text
Proporción y Tamaño ─┐
Duración ────────────┼─> Escena ─> Render ─> Escalar y Refinar ─> Salida ─> Guardar Video
Prompt ──────────────┤      ▲          ▲              ▲
Cargar modelo ───────┘      └──────────┴──────────────┘
```

Conexiones importantes:

1. Conecta `positive` de **Escena** a **Render**.
2. Conecta `positive_escalar` de **Escena** a **Escalar y Refinar**. Esta salida no conserva el anclaje de la imagen guía del primer tamaño y evita incompatibilidades durante el segundo pase.
3. Conecta el `latent` del primer pase a **Escalar y Refinar**, o desactiva ese nodo para hacer pruebas rápidas.
4. Conecta `video` de **Salida** a un nodo **Guardar Video**.

## Uso del nodo Prompt

### MiniMax H3

Organiza el prompt en seis apartados:

1. `subject_definitions`
2. `summary`
3. `retention_analysis`
4. `detailed_description`
5. `overall_soundscape`
6. `non_diegetic_music`

El selector de cámara puede sustituir una toma ya escrita o insertar una nueva instrucción dentro de `detailed_description`. Las reglas de oficio opcionales ayudan a conservar manos, objetos, encuadre e identidad durante el plano.

### LTX-2.5

Produce un único párrafo continuo y adapta la terminología de cámara al vocabulario de LTX. El campo de audio se añade al final del mismo prompt.

### Libre

Une dos campos con un separador configurable sin reescribir el contenido. Sirve para modelos actuales o futuros que utilicen otro formato.

## Modelos y archivos

Los desplegables leen directamente las carpetas configuradas por ComfyUI:

- `models/diffusion_models`: modelo de difusión.
- `models/text_encoders`: codificador de texto.
- `models/vae`: VAE de video y VAE de audio.
- `models/loras`: LoRAs opcionales.
- `models/vae_approx`: VAE pequeño para vista previa.
- `models/latent_upscale_models`: escalador latente 3D.
- `models/frame_interpolation`: modelo de interpolación.

Los nombres concretos dependen de los modelos instalados en tu equipo y aparecerán automáticamente en cada selector.

## Memoria y rendimiento

La generación de video consume mucha VRAM. El nodo de carga puede dividir atención y FFN en grupos para reducir el pico de memoria a cambio de velocidad. El refinado aumenta el coste aproximadamente con el cuadrado de la escala: por ejemplo, `x2` procesa cerca de cuatro veces el área del primer pase.

Si el refinado no cabe en memoria, prueba en este orden:

1. Reducir la escala, por ejemplo de `1.7` a `1.5`.
2. Reducir los megapíxeles del primer pase.
3. Aumentar el troceado de atención o FFN.
4. Desactivar temporalmente el escalado para conservar el primer pase.

## Privacidad

Los nodos no incluyen telemetría, seguimiento ni llamadas de red. Todo el procesamiento del paquete se realiza dentro de la instalación local de ComfyUI.

## Desarrollo

Para comprobar la sintaxis y las funciones independientes de ComfyUI:

```bash
python -m compileall -q .
python -m unittest discover -s tests -v
```

Los identificadores internos de los nodos (`CineCargarH3`, `CineEscenaH3`, etc.) deben mantenerse estables para no romper workflows guardados.

## Estado del proyecto

Proyecto en desarrollo activo. Se recomienda conservar una copia de los workflows importantes antes de actualizar.

## Licencia

Publicado bajo la [licencia MIT](LICENSE). Puedes usar, modificar y redistribuir el código conservando el aviso de copyright y la licencia.
