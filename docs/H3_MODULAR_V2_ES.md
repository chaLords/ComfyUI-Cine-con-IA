# H3 modular: revisión y cambios del 23 de septiembre de 2026

Rama: `feature/h3-modular-vram-ui`, basada en `feature/cineconia-h3-nodes`.
Los cambios locales anteriores de Claudia se conservaron en un commit independiente antes de continuar.
No se modifica la versión publicada ni se crea un release de Registry.

## Lo que encontré

- El frontend duplicaba los perfiles y la fórmula de memoria. AUTO se dibujaba como una GPU de 16 GB, aunque el servidor decidiera otra cosa. Tampoco leía siempre las dimensiones conectadas.
- El modo Auto ignoraba un perfil manual; Manual + AUTO caía a 16 GB.
- La selección de GPU no toleraba 11,99/23,99 GB y cambiaba cuando ComfyUI conservaba un modelo en memoria.
- Los widgets decorativos podían desplazar los valores guardados. En el 039 abierto se veía AUTO en el sampler y números fuera de rango en otros campos.
- El refinado del perfil de 8 GB podía volver a activarse por el booleano general.
- Los pasos de refinado salían como STRING, pero su consumidor exige un COMBO. Se comprobó con el validador real de la instalación.
- El segundo pase del 039 original estaba en bypass: mover el interruptor del optimizador no podía activarlo.
- El director modular había perdido la instrucción que evita que una órbita gire al personaje y cuatro movimientos del Prompt completo.

## Revisión por módulo

| Módulo | Resultado |
|---|---|
| Proporción y tamaño | Se conserva. La vista previa ejecuta su cálculo real para leer los cables de ancho/alto. |
| Duración | Se conserva. La vista previa respeta segundos, fps y rejilla del nodo conectado. |
| Prompt completo (CinePrompt6) | Conserva las herramientas, modelos y recetas. Exporta las mismas recetas para el director. |
| Scene / Prompt por apartados | Se mantiene para workflows existentes. |
| Prompt simple H3 | Nuevo: una caja multilinea. Acepta texto libre o las seis secciones completas; salida scene al director y STRING para uso directo. No traduce automáticamente. |
| Director de cámara H3 | Tarjetas de encuadre y ángulo (Frontal, Tres cuartos 3/4, Perfil), accesos de movimiento, lista completa, focal, profundidad y 14 recetas compartidas con el Prompt completo. |
| Optimizador H3 | Fuente única de configuración y semáforo, detección estable, modo guiado y avanzado, guardado por nombre. |
| Render optimizado | Conserva la cadena de sampler del core y consume la configuración. |
| Cargar modelo | Se conserva. Atención del optimizador limitada a 56, máximo que admite este cargador; FFN a 64. |
| Escena / referencias | Se conserva el condicionamiento y la cadena de imagen de referencia. |
| Escalar y refinar | Se conserva el motor. La salida del optimizador coincide con sus opciones reales. El 039 v2 permite controlarlo desde el optimizador. |
| Salida, Modelos y nodos auxiliares | Sin reescrituras. Las pruebas existentes siguen pasando; catálogo/descargas no son parte de esta modificación. |

## Uso

1. Actualizar la copia de estos nodos en `custom_nodes` a esta rama y reiniciar ComfyUI.
2. Abrir `examples/039.REALminimax-H3-Modular-v2.json` como un workflow nuevo.
3. Elegir AUTO para la GPU detectada, o 8/12/16/24/32 GB para una política explícita.
4. Escribir la escena en Prompt simple; elegir cámara en el Director. El Prompt completo sigue disponible desde el menú.
5. El ejemplo comienza con un solo pase. Activar **Solicitar segundo pase** en el optimizador cuando se quiera refinar. En modo guiado, 8 GB mantiene el segundo pase apagado; avanzado permite forzarlo.

Guiado y el antiguo Manual conservan las mismas perillas; Manual sigue siendo aceptado al abrir archivos anteriores. Avanzado muestra los parámetros efectivos y no eleva silenciosamente el troceo elegido. El perfil explícito manda en cualquier modo; AUTO detecta en cualquier modo. Calidad 70 equivale a 20 pasos en todos los perfiles. Calidad y pasos de refinado afectan tiempo/cómputo, no el semáforo. El antiguo control movimiento sigue siendo compatible con archivos anteriores, pero se oculta porque no controla la cámara ni el sampler.

Las recetas se aplican mediante un botón y quedan guardadas como texto en la cámara. Revisar los `{CAMPOS}` y los requisitos de la escena; el selector no cambia la duración ni inventa personajes. Un prompt simple completo conserva las seis secciones; la cámara se inserta en el primer plano de `detailed_description`, sin alterar las referencias a `[Shot 1]` que haya en `retention_analysis`.

## Qué significa el semáforo

**MARGEN / verde**, **JUSTO / amarillo**, **RIESGO / rojo**. **SIN DATOS / gris** cuando no se puede resolver la GPU AUTO, una conexión o la comunicación con el servidor. Una selección manual sin CUDA se etiqueta como simulación. Seleccionar 32 GB en una GPU detectada de 8 GB no inventa capacidad: el riesgo queda limitado por la GPU real.

La fórmula sigue siendo experimental y relativa a 416×736×192. Considera dimensiones, fotogramas, el mayor de los dos pases secuenciales y el troceo efectivo. La VRAM libre se informa pero no cambia el perfil: puede incluir cachés recuperables del propio ComfyUI. No mide porcentajes de ocupación, no estima GB absolutos y no garantiza evitar OOM. Pesos/cuantización, backend, referencias y otros procesos todavía requieren calibración con renders. No se reduce resolución o duración a escondidas.

La vista previa y la ejecución llaman al mismo constructor de configuración. La integración sigue la [documentación de rutas de ComfyUI](https://docs.comfy.org/development/comfyui-server/comms_routes). Se conservan las recetas y atribuciones de LoopForge ya incluidas en el proyecto.

## Validación

- 85 pruebas Python, 11 pruebas de la interfaz existente y 7 de la interfaz H3.
- Verificados guardado/restauración, controles avanzados, perfiles, respuestas atrasadas, dimensiones conectadas y equivalencia literal del prompt entre 039 v1 y v2.
- El workflow nuevo mantiene 14 nodos y 33 enlaces con extremos, tipos y slots coherentes.
- La instalación local detectó NVIDIA RTX 4060 Ti, 16 GB. AUTO eligió 16 GB y 20 pasos.
- El validador instalado de ComfyUI acepta el nuevo tipo de pasos de refinado y rechaza el STRING anterior.
- Los nombres de modelos, escalador e imagen del ejemplo existen en la instalación local al momento de comprobarlo.
- Revisión visual en navegador con los widgets reales y el planificador real, en un entorno de prueba aislado.

No se ejecutó un render completo ni se sustituyó la instalación abierta. Faltan benchmarks de GPU de 8/12/24/32 GB y la prueba final dentro del canvas de ComfyUI tras instalar la rama. SelfLift, Sigma Refiner y tiling adicional siguen pendientes; no se presentan como capacidades implementadas.

## Vista de prueba

`python tools/preview_h3.py` abre un servidor local en `http://127.0.0.1:8199/docs/h3-interface-preview.html`. Dibuja los widgets de la extensión y consulta el mismo backend; el contenedor simula un nodo, no el canvas completo de ComfyUI. Solo escucha en 127.0.0.1 y no inicia generación.
