# Skills de Cine con IA

Escriben el **prompt de escena** para MiniMax H3. Tú adjuntas las imágenes que necesites y escribes **solo la acción**:

- la lámina del personaje, con toda su ropa, gorro o sombrero incluido;
- los objetos que va a usar;
- el lugar.

La skill describe cada imagen, rellena la plantilla canónica del workflow 051 y te dice en qué entrada del nodo Escena va cada imagen. Sigue la ley del workflow 051:

> El prompt de escena dice **qué pasa**. El Director de cámara decide **cómo se ve**.

El prompt que entregan no lleva cámara. En ComfyUI, enciende «Texto de cámara automático» en el Director y elige los botones; cada botón escribe su parte de la cámara.

## Qué entregan

1. **El prompt**, en inglés y en un bloque. Es la plantilla canónica del 051 con los huecos llenos: personaje, ropa, objetos, lugar, luz, postura, acción y sonido. Las frases fijas no cambian, como «is the only person in the scene» o «His head and gaze stay aligned with his body, looking straight ahead».
2. **La conexión en el nodo Escena**, en español. Por ejemplo:

   ```text
   referencia_1 · lámina del personaje
   referencia_2 · foto de la taza
   cafetería · solo texto, no la conectes
   ```

El nodo tiene tres entradas y numera solo las conectadas. Conéctalas en orden y sin huecos. El lugar va solo como texto por defecto, porque en las pruebas de LoopForge una imagen del escenario redujo a la mitad el movimiento de cámara. Si quieres el lugar exacto, pídelo: irá conectado y la skill te avisará. Lo que no cabe en tres entradas se describe con texto.

| Archivo | Para qué |
| --- | --- |
| `cineconia-escena-h3/SKILL.md` | Skill para Claude, con la plantilla canónica |
| `cineconia-escena-h3/references/formato-h3.md` | Formato H3 completo, sin cámara |
| `cineconia-escena-h3/references/ejemplos.md` | Cuatro ejemplos llenos, con su conexión |
| `chatgpt/INSTRUCCIONES_GPT.md` | Instrucciones para un GPT personalizado de ChatGPT |

## Claude

- **claude.ai:** Configuración → Capacidades → Skills → «Subir skill», y elige `cineconia-escena-h3.zip`. Es la carpeta `cineconia-escena-h3` comprimida, con `SKILL.md` en su raíz. Si ya tenías la versión anterior, bórrala antes de subir esta.
- **Claude Code:** copia la carpeta `cineconia-escena-h3` en `~/.claude/skills/`.

Luego adjunta tus imágenes y escribe la acción, por ejemplo: «está sentado en la cafetería, toma un sorbo de café y sonríe».

## ChatGPT

1. ChatGPT → Explorar GPTs → Crear → Configurar.
2. En **Instrucciones**, pega el contenido de `chatgpt/INSTRUCCIONES_GPT.md`. Tiene menos de 8.000 caracteres.
3. En **Conocimiento**, sube `formato-h3.md` y `ejemplos.md`.
4. Iniciadores de conversación sugeridos:
   - «Te adjunto mi personaje: que sonría en un estudio.»
   - «Personaje, taza y cafetería: que tome un sorbo y salude.»
   - «Revisa mi prompt: ¿cumple la ley de la cámara?»

En un Proyecto de ChatGPT sirve lo mismo: las instrucciones van como instrucciones del proyecto y los dos archivos como archivos del proyecto.

## Estado

- **Probada en los renders del usuario (3 de octubre de 2026):** la plantilla canónica, que es el prompt del workflow 051, con los botones del Director.
- **Sin probar en GPU:** la matriz completa de ángulos de la plantilla, los ejemplos 2 a 4 y la ropa de cintura para abajo en subject_definitions. Si un primer plano duplica la figura, prueba primero a quitar el pantalón y el calzado, con la misma semilla.
- El plan de pruebas está en `docs/CONTINUIDAD_V3.md`.
