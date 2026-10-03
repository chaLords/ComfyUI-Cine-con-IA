# Skills de Cine con IA

Escriben el **prompt de escena** para MiniMax H3 a partir de la lámina del personaje y, si quieres, imágenes de objetos y del lugar. Siguen la ley del workflow 051:

> El prompt de escena dice **qué pasa**. El Director de cámara decide **cómo se ve**.

El prompt que entregan no lleva cámara. En ComfyUI, enciende «Texto de cámara automático» en el Director y elige los botones; cada botón escribe su parte de la cámara.

| Archivo | Para qué |
| --- | --- |
| `cineconia-escena-h3/SKILL.md` | Skill para Claude |
| `cineconia-escena-h3/references/formato-h3.md` | Formato H3 completo, sin cámara |
| `cineconia-escena-h3/references/ejemplos.md` | Tres ejemplos que cumplen la ley |
| `chatgpt/INSTRUCCIONES_GPT.md` | Instrucciones para un GPT personalizado de ChatGPT |

## Claude

- **claude.ai:** Configuración → Capacidades → Skills → «Subir skill», y elige `cineconia-escena-h3.zip`. Es la carpeta `cineconia-escena-h3` comprimida, con `SKILL.md` en su raíz.
- **Claude Code:** copia la carpeta `cineconia-escena-h3` en `~/.claude/skills/`.

Luego adjunta tu lámina y escribe, por ejemplo: «prompt de escena: está de pie en un estudio y sonríe».

## ChatGPT

1. ChatGPT → Explorar GPTs → Crear → Configurar.
2. En **Instrucciones**, pega el contenido de `chatgpt/INSTRUCCIONES_GPT.md`. Tiene menos de 8.000 caracteres.
3. En **Conocimiento**, sube `formato-h3.md` y `ejemplos.md`.
4. Iniciadores de conversación sugeridos:
   - «Te adjunto mi personaje: quiero que sonría en un estudio.»
   - «Personaje y objeto: que abra este cuaderno y lea.»
   - «Revisa mi prompt: ¿cumple la ley de la cámara?»

En un Proyecto de ChatGPT sirve lo mismo: las instrucciones van como instrucciones del proyecto y los dos archivos como archivos del proyecto.

## Estado

Las reglas salen de renders reales del 2–3 de octubre de 2026 (personaje duplicado, frontal girado) y de la guía H3 que trae el pack. El prompt universal y los textos automáticos del Director están **sin probar** como matriz completa en GPU. El plan de pruebas está en `docs/CONTINUIDAD_V3.md`.
