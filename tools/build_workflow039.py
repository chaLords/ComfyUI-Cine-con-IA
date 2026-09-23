"""Build the modular 039 example without changing its final camera prompt."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from cineconia_h3.scene_prompt import build_scene
from cineconia_h3.camera_director import build_prompt

source=ROOT/'examples/039.REALminimax-H3-CineconIA-Optimizer-v1.json'
w=json.loads(source.read_text(encoding='utf-8'))
ns={n['type']:n for n in w['nodes']}
scene_node=ns['CineScenePromptH3'];scene=build_scene(*scene_node['widgets_values'])
args=ns['CineCameraDirectorH3']['widgets_values']
expected,_=build_prompt(scene,*args)
text,_=build_prompt(scene,'sin especificar','sin especificar','sin especificar','normal','sin especificar','sin especificar','',False)
actual,_=build_prompt({'schema':'cineconia.h3.scene/v1','raw_prompt':text},*args)
assert actual==expected, 'Prompt must remain identical'
scene_node.update(type='CineSimplePromptH3',title='01 · Prompt simple',widgets_values=[text],widgets_values_named={'texto':text})
scene_node['properties']['Node name for S&R']='CineSimplePromptH3'
scene_node['outputs'][1]['name']='prompt'
w['id']='cineconia-039-h3-modular-v2-20260923';w['revision']=0
# An active consumer makes the Optimizer switch effective; baseline remains one pass.
ns['CineEscalarRefinar']['mode']=0
ns['CineH3Optimizer']['widgets_values_named']['refinar']=False
ns['CineH3Optimizer']['widgets_values'][9]=False
note=ns['MarkdownNote']
text='# 039 · H3 modular\n\n1. Escribe o pega tu escena en **Prompt simple**.\n2. Elige encuadre y movimiento en **Director de cámara**. La receta original de pantalla dividida se conserva.\n3. Elige **AUTO** o tu capacidad de VRAM. El semáforo es una estimación experimental.\n4. **Solicitar segundo pase** controla el refinado conectado. El perfil de 8 GB lo desactiva en modo guiado.\n\nEl Prompt completo sigue disponible en el menú de nodos. Comprueba los nombres de modelos y la imagen de referencia de tu instalación antes de generar.'
note['widgets_values']=[text];note['widgets_values_named']={'text':text}
positions={
'MarkdownNote':([-20,-440],[1550,340]),
'CineRatioSize':([0,0],[420,460]),'CineDuracion':([0,540],[420,310]),'LoadImage':([0,940],[420,360]),
'CineSimplePromptH3':([500,0],[500,540]),'CineH3Optimizer':([500,670],[500,680]),
'CineCameraDirectorH3':([1080,0],[500,1180]),'CineCargarH3':([1080,1320],[790,740]),
'CineEscenaH3':([1660,0],[460,460]),'ModelPreviewOverrideKJ':([1660,560],[460,570]),
'CineH3OptimizedSampler':([2200,0],[460,330]),'CineEscalarRefinar':([2200,440],[460,500]),
'CineSalida':([2740,0],[460,340]),'VHS_VideoCombine':([2740,450],[460,1060])}
for n in w['nodes']:
 n['pos'],n['size']=positions[n['type']]
 if n['type'].startswith('Cine'): n.update(color='#283436',bgcolor='#172123')
 if n['type']=='CineCameraDirectorH3':n['title']='02 · Director de cámara'
 if n['type']=='CineH3Optimizer':n['title']='03 · Memoria y calidad'
 if n['type']=='VHS_VideoCombine':
  if isinstance(n.get('widgets_values'),dict):n['widgets_values'].pop('videopreview',None)
  n.get('widgets_values_named',{}).pop('videopreview',None)
w['groups']=[{'id':i+1,'title':title,'bounding':box,'color':color,'font_size':24,'flags':{}} for i,(title,box,color) in enumerate([
('ENTRADAS · formato, duración y referencia',[-30,-65,480,1410],'#42666d'),
('ESCENA · texto',[470,-65,560,655],'#966c45'),
('CÁMARA · encuadre y movimiento',[1050,-65,560,1330],'#966c45'),
('PROCESO · memoria',[470,605,560,810],'#42666d'),
('MODELO · carga y troceo',[1050,1260,850,860],'#42666d'),
('GENERACIÓN · escena, render y refinado',[1630,-65,1060,1240],'#42666d'),
('SALIDA · imagen, audio y video',[2710,-65,520,1650],'#42666d')])]
w.setdefault('extra',{})['ds']={'scale':0.6,'offset':[80,150]}
output=ROOT/'examples/039.REALminimax-H3-Modular-v2.json'
output.write_text(json.dumps(w,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('039 v2: prompt identico,',len(w['nodes']),'nodos,',len(w['links']),'enlaces')
