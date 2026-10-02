# AdaLN H3: procedencia

Las grillas `h3_silu_temb_grid_{ref2va,fl2va}.safetensors` proceden de
https://github.com/lukas-9936/ComfyUI-MiniMax-H3-PDD,
commit `c5f103aeafca90551f833b3a8a941776455d79e7`.
El proyecto las distribuye bajo MIT. Son muestras del time-embedder H3;
no contienen el modelo completo ni la LoRA Acc/PDD. La licencia MIT del
software no sustituye la licencia del modelo MiniMax H3 o de sus LoRAs.

El mapeo de adaptadores y la formulación del rebase AdaLN en `../acc_pdd.py`
se desarrollaron consultando `pdd.py` y `adaln.py` de ese proyecto.
CineConIA añade validación completa, conversión SwiGLU, control por sigma
aislado por llamada y comprobaciones de sampler y base pruned.

## MIT License

Copyright (c) 2026 lukas-9936 and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
