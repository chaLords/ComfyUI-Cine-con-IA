# H3: la escalera de colores por GPU

Rama `feature/h3-modular-vram-ui`, 23 de septiembre de 2026. Continúa el trabajo
de `H3_MODULAR_V2_ES.md` sin reescribirlo.

## Qué cambia para el usuario

**El color de cada preset te dice cuál te sirve, antes de pulsarlo.** Cada chip de
perfil lleva un punto:

| Tu GPU | AUTO | 8 GB | 12 GB | 16 GB | 24 GB | 32 GB |
|---|---|---|---|---|---|---|
| 8 GB  | verde | verde | amarillo | rojo | rojo | rojo |
| 12 GB | verde | verde | verde | amarillo | rojo | rojo |
| 16 GB | verde | verde | verde | verde | amarillo | rojo |
| 24 GB | verde | verde | verde | verde | verde | amarillo |
| 32 GB | verde | verde | verde | verde | verde | verde |

(A la carga de referencia 416×736×192. Con más resolución o más fotogramas los puntos
se van al amarillo y al rojo, que es lo que tienen que hacer.)

**Pulsar un preset mueve los faders.** Escala y Ahorro muestran ahora el valor efectivo
—x1.00 a x2.00, troceo 1 a 56— y cada perfil marca en el riel su franja clara. Al
cambiar de perfil la franja se desplaza y el pomo se desliza. Calidad y Refinado no
se mueven: son tiempo, no memoria, y los decides tú.

**CUSTOM.** Si mueves Escala o Ahorro a mano, la cabecera muestra
`• CUSTOM · pulsa el perfil para volver`. Pulsar el perfil devuelve el preset exacto.

**Director de cámara.** Cada sección se lee de arriba abajo: cabecera, tarjetas y
luego la lista completa (`Ángulo · lista completa`, `Movimiento · lista completa`).

## Qué cambió por dentro

1. **La capacidad es la de tu tarjeta, no la del preset.** Antes, elegir 8 GB en una
   GPU de 16 GB simulaba una tarjeta de 8 GB y salía rojo. Ahora el preset decide la
   carga y la GPU detectada decide la capacidad. Sin GPU detectada se sigue simulando
   la tarjeta del preset.
2. **Escala del segundo pase escalonada** (`profiles.py`): 12 GB x1.13, 16 GB x1.27,
   24 GB x1.44, 32 GB x1.60. La carga de referencia sube ~1.3× por escalón.
3. **Capacidades recalculadas** (`memory_planner.py`): 1.28 / 1.67 / 2.14 / 2.82 / 3.66.
   Son una definición de política —el preset de cada tarjeta usa ~70 % de su
   capacidad a la carga de referencia—, no una medición. Hasta el 24-09-2026 era
   ~63 % (1.42 / 1.86 / 2.38 / 3.13 / 4.06); se ajustó con el render del 043 B, abajo.
4. **Un preset por encima de tu GPU** añade como primer consejo
   `elige el preset de tu GPU (16 GB) o AUTO`.
5. **La vista previa** (`/cineconia/h3/preview`) devuelve además `ladder` (el color de
   cada preset) y `base` (los valores del perfil) para dibujar puntos y franjas.

## Lo medido, y lo que sigue sin medir

> **Corrección (24-09-2026).** La primera versión de este documento decía que el ancla era
> un render en 16 GB *con segundo pase x1.25*. No era cierto: desde el 035 el segundo pase
> estaba en bypass en todos los workflows, así que ningún render medido lo tiene activo.

Los datos medidos en la RTX 4060 Ti de 16 GB, y lo que dice de ellos la tabla:

| Render | Configuración | Resultado real | Tabla nueva |
|---|---|---|---|
| 033 v2 | 416×736×192, segundo pase x2.0, **sin troceo** | OOM, pico 20.9 GB | RIESGO (1.87) |
| 038 | 480×832×192, sin segundo pase, troceo 16/16 | renderiza | MARGEN (0.61) |
| 043 A | 416×736×124, segundo pase x1.27, troceo 32/32 | renderiza, ~115 s por paso de refinado | MARGEN (0.44) |
| 043 B | 416×736×124, segundo pase x2.0, troceo 32/32 | sin OOM, pero el refinado queda casi detenido (más de 15 min sin terminar el primer paso, dos veces) | RIESGO (1.10) |

Con la política anterior (63 %) el 043 B salía JUSTO (0.99): el semáforo prometía algo que
la tarjeta no cumplió, y por eso se subió al 70 %. Con este ajuste la escalera de colores
se mantiene igual en las cinco tarjetas.

La tabla no contradice ninguno de los dos, pero son solo dos puntos. **El segundo pase con
troceo, que es lo que activa el 040, nunca se ha medido**: el primer render del 040 es la
primera prueba real de esa combinación. 8, 12, 24 y 32 GB siguen sin benchmark. El semáforo
no mide VRAM ni garantiza que un render quepa.

## Pruebas

- `tests/test_h3_ladder.py`: la matriz completa de la tabla de arriba, el render
  verificado en MARGEN, el consejo del preset por encima y la simulación sin GPU.
- `tests/test_h3_faders_abs.cjs`: preset que vuelve al neutro, CUSTOM, inverso exacto
  de la escala, franja del ahorro por perfil y dibujo de los puntos.
- Suites anteriores sin cambios: 89 Python, 11 + 7 + 6 de interfaz.
