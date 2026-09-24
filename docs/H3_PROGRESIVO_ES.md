# H3: render progresivo con SelfLift

Rama `feature/h3-modular-vram-ui`, 24 de septiembre de 2026. Es la fase 4 del
plan maestro: el Optimizador decide la política y *Render optimizado* la ejecuta.

## Qué hace

El Optimizador tiene un grupo de chips nuevo, **Muestreo: Normal · Progresivo**.

En **Progresivo**, *Render optimizado* hace los primeros pasos a menor resolución,
sube el resultado con el escalador latente de H3 y termina los pasos que quedan a
la resolución del latente. No añade pasos: 20 pasos siguen siendo 20 evaluaciones
del modelo, solo que las primeras cuestan menos.

**Ahorra tiempo, no VRAM.** El pico de memoria lo marca el tramo final, que va a la
resolución que pediste. Por eso el semáforo es el mismo en Normal y en Progresivo.
Lo que cambia es para qué sirve: con el mismo tiempo puedes pedir un video más grande.

## Quién hace qué

- **CineConIA decide** cuántos pasos van a baja resolución y a qué escala, y lo
  muestra antes de ejecutar. Fija lo que SelfLift exige o recomienda para H3:
  sampler euler, cfg 1 (igual que BasicGuider), negativo en cero, `rho = 0` con el
  escalador latente de H3, sin troceo espacial del tramo final.
- **SelfLift ejecuta** el muestreo en dos resoluciones y la transición entre ellas
  ([facok/comfyui-SelfLift](https://github.com/facok/comfyui-SelfLift), paper
  [arXiv:2609.02036](https://arxiv.org/abs/2609.02036)). Se instala aparte y
  *Render optimizado* lo llama como nodo. Su repositorio no declara licencia, así
  que CineConIA no copia nada de su código.

## La política (experimental)

| | Auto y Manual | Advanced |
|---|---|---|
| Pasos a baja resolución | la mitad con calidad 70; más calidad deja más pasos a la resolución final (entre 30 % y 75 %) | `transicion_advanced` |
| Escala del tramo inicial | la menor que deja el lado corto en 384 px o más, nunca menos de 0.5 | `escala_inicial_advanced` (0 = la automática) |
| Si no compensa | con escala 0.9 o más se renderiza normal y el nodo lo dice | solo con escala automática |

384 px es el tramo inicial que el propio SelfLift usa de referencia para H3 (768 → 384
con escala 0.5). Su README advierte que por debajo H3 puede salirse de lo que conoce.

Qué sale en 9:16, con 20 pasos y calidad 70:

| Tamaño | Video final | Tramo inicial | Semáforo en 16 GB (5 s, sin segundo pase) |
|---|---|---|---|
| 0.30 MP | 416×736 | no aplica: se renderiza normal | verde |
| 0.40 MP | 480×832 | 384×672 (x0.80) | verde |
| 0.50 MP | 544×928 | 416×704 (x0.75) | verde |
| 0.70 MP | 640×1120 | 384×672 (x0.60) | verde |
| 1.00 MP | 736×1344 | 416×736 (x0.55) | amarillo |

## Lo que se ve en los nodos

Junto a *Muestreo*, en el Optimizador:

- `• 10 de 20 pasos a 384×672`: listo.
- `• no aplica a este tamaño · se renderiza normal`: el tramo inicial saldría casi del
  mismo tamaño.
- `• falta SelfLift · instálalo y reinicia` o `• falta el escalador latente H3`: el
  render se detiene con un error que dice qué instalar. No cae en silencio al modo
  normal, porque una comparación A/B que no compara nada engaña.
- `bajo 384 px`: solo en Advanced, cuando eliges una escala por debajo de lo probado.

En *Render optimizado*, una línea con lo que va a hacer según el Optimizador
conectado y, al terminar, cuánto tardó: `último: 3 min 32 s · progresivo · 10/20 a 384×672 → 640×1120`.

## Instalar SelfLift

```
cd ComfyUI/custom_nodes
git clone https://github.com/facok/comfyui-SelfLift
cd comfyui-SelfLift
git checkout 835c3cf
```

Reinicia ComfyUI. El escalador latente de H3 va en `models/latent_upscale_models`
(se usa el primer archivo con `h3` en el nombre). CineConIA está probado con el commit
`835c3cf`; si una versión nueva cambia sus entradas, *Render optimizado* lo dice en vez
de fallar a medias.

## Workflow 041

`examples/041.REALminimax-H3-CineconIA-Progresivo-AB-v1.json`: misma escena, misma
semilla y dos ramas idénticas salvo el muestreo, las dos con euler. A renderiza los 20
pasos a 640×1120; B hace 10 a 384×672 y 10 a 640×1120.

## Lo que falta medir

- El ahorro real de tiempo en la RTX 4060 Ti.
- La calidad frente al render normal con la misma semilla.
- Si la mitad de los pasos es el mejor punto de transición para H3.
- Si 384 px es el suelo correcto.
- TST (deriva de identidad) y el troceo espacial del tramo final de SelfLift: no están
  conectados.

## Pruebas

- `tests/test_h3_progresivo.py`: la política, la vista previa y la llamada a SelfLift
  con dobles (argumentos, errores accionables, interfaz cambiada, transición ajustada).
- `tests/test_h3_progresivo.cjs`: chips, controles solo-progresivo, avisos y el resumen
  de *Render optimizado*.
- `tests/test_workflow_041.py`: el grafo del 041 y que la nota diga lo que muestran los nodos.
