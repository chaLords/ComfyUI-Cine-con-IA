<p align="center">
  <a href="CAMERA_TESTS.md">English</a> · <strong>Español</strong>
</p>

# Las 14 recetas, probadas en este equipo

LoopForge verificó sus catorce tomas en una RTX 5090 a 1344x768, con sus propios personajes y
escenarios. Aquí están las mismas recetas, tal como las escriben los botones del nodo Prompt,
sobre un personaje distinto y otros escenarios, en una RTX 4060 Ti de 16 GB.

**Ajustes comunes:** MiniMax H3 Singularity ref2va int8, una sola lámina de personaje sin imagen
del escenario, `ref_image_size: max`, 124 fotogramas (192 donde se indica), 20 pasos,
`res_multistep` / `simple`, semilla 552013742, sin LoRA turbo, sin escalado ni refinado.
Las pruebas de cámara se rindieron a 288x512 (9:16, 0.15 MP) y la órbita se comprobó además a
480x832: **la resolución no cambió el comportamiento de la cámara**, solo el detalle de la imagen.

## Resultados

| Toma | Resultado | Lo que se ve |
| --- | --- | --- |
| Crash zoom | ✅ | Plano general inmóvil unos dos segundos, un golpe de zoom hasta el primer plano y la reacción **después** de aterrizar. |
| Yo-yo zoom | ✅ con reservas | Las tres fases caben en 192 fotogramas, pero la parte abierta dura más de la cuenta. LoopForge también la da por imperfecta. |
| Dolly zoom | ✅ | El sujeto conserva tamaño y posición mientras el fondo se aleja y se abre. |
| Snorricam | ✅ parcial | El rostro queda clavado en el centro y al mismo tamaño, que es la toma; el fondo se mueve poco en un prado vacío. Conviene un entorno con más referencias cerca. |
| Rack focus | ✅ | Cámara quieta, foco del personaje cercano a las dos figuras del fondo. Necesita `<Picture 2>` y `<Picture 3>`. |
| Pantalla dividida | ✅ | Tres paneles que entran uno tras otro y luego van sincronizados. En 9:16 quedan muy estrechos: mejor en 16:9. |
| Whip pan | ✅ | Barrido con desenfoque real y final sostenido en el segundo personaje. Necesita `<Picture 2>`. |
| Ángulo holandés | ✅ según la semilla | Con otra semilla el encuadre se va inclinando y termina canteado. Con la semilla de LoopForge en 9:16 salió al revés (empezó inclinado y se enderezó), y en 16:9 salió inclinado desde el primer fotograma. Mira el primer render y, si va al revés, cambia la semilla. |
| Super dolly in | ✅ | Plano muy general, los troncos cercanos salen de cuadro y termina en primer plano cerrado. |
| Eyes in | ✅ | Entra sin parar hasta que el ojo llena el cuadro de borde a borde. |
| Aerial pullback | ✅ | Sube y retrocede hasta dejarlo como una figura diminuta. |
| Cámara en mano | ✅ | Sigue al sujeto corriendo con sacudidas y correcciones en cada zancada. |
| Órbita 360° | ✅ | Frente → un perfil → espalda → el perfil **opuesto** → frente, en un solo sentido. |
| Grúa ascendente | ✅ | Arranca a la altura de los pies, sube e inclina hacia abajo. No llega a cenital puro. |

## Cinco cosas que aprendimos aquí

**La duración manda en la órbita.** A 124 fotogramas (5,17 s) el giro sale completo. La misma
receta a 192 fotogramas (8 s) no cierra el círculo: llega a la espalda y regresa por el mismo lado.
El modelo comprime el movimiento en su propia ventana y rellena el resto.

**Una frase que fija el comienzo mata el movimiento.** Añadir *"The frame opens level, the horizon
and every vertical perfectly straight"* al ángulo holandés dejó el plano recto de principio a fin.
Es el mismo efecto que LoopForge midió con la lámina de escenario y con las poses imposibles.

**El ángulo holandés depende de la semilla.** Tres renders con la misma receta dieron tres cosas
distintas: al revés, inclinado desde el principio, y correcto. Es la única de las catorce que exigió
mirar el primer resultado y repetir. Cambiar la semilla basta; no hace falta tocar el texto.

**Una escena escrita para otra toma no sirve, y se nota tarde.** La pantalla dividida salió
correcta con su propia escena, y salió rota al lanzarla sobre la escena de la órbita: el texto de
cámara acabó describiendo el sillón en vez de la acción. La receta pone la cámara; la escena tiene
que ser la de esa toma.

⚠️ **Sin confirmar:** en ese render fallido el modelo pintó los paneles de la lámina de personaje
(cara, frente, espalda) en vez de los tres ángulos, y parecía que la culpa era de nombrar esos
paneles en `subject_definitions`. Pero el render que sí funcionó lleva esa misma frase. Quedan
demasiadas variables entre los dos para culpar a ninguna: mira el primer render antes de reescribir
nada.

**La receta funciona con el personaje sentado.** La órbita da la vuelta completa alrededor de alguien
sentado en un sillón, siempre que ya esté sentado al empezar. Si el plano incluye la acción de
sentarse, esa acción se come el movimiento de cámara.
