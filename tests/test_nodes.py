import importlib.util
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "nodes.py"
SPEC = importlib.util.spec_from_file_location("cineconia_nodes", MODULE_PATH)
NODES = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(NODES)


class RatioSizeTests(unittest.TestCase):
    def test_vertical_base_size_is_aligned(self):
        width, height, info = NODES.CineRatioSize().calcular(
            "9:16  vertical (reels, tiktok)",
            "0.30 MP  ·  base medida",
            0.30,
            32,
        )

        self.assertEqual((width, height), (416, 736))
        self.assertEqual(width % 32, 0)
        self.assertEqual(height % 32, 0)
        self.assertIn("416x736", info)

    def test_fixed_long_side_respects_ratio(self):
        width, height, _ = NODES.CineRatioSize().calcular(
            "16:9  horizontal (cine, youtube)",
            "tamano 1024",
            0.30,
            32,
        )

        self.assertEqual(width, 1024)
        self.assertEqual(height, 576)


class DurationTests(unittest.TestCase):
    def test_h3_duration_uses_valid_grid(self):
        frames, seconds, _ = NODES.CineDuracion().calcular(
            segundos=8.0,
            fps="24  ·  nativo H3",
            rejilla=17,
            desfase=5,
            minimo_fotogramas=5,
        )

        self.assertEqual(frames, 192)
        self.assertEqual(frames % 17, 5)
        self.assertEqual(seconds, 8.0)


class ModelLoaderTests(unittest.TestCase):
    def test_empty_lora_slots_start_with_zero_strength(self):
        inputs = NODES.CineCargarH3.INPUT_TYPES()

        self.assertEqual(inputs["required"]["lora"][1]["default"], "ninguno")
        self.assertEqual(inputs["required"]["lora_fuerza"][1]["default"], 0.0)
        for slot in (2, 3, 4):
            self.assertEqual(inputs["optional"][f"lora_{slot}"][1]["default"], "ninguno")
            self.assertEqual(inputs["optional"][f"lora_fuerza_{slot}"][1]["default"], 0.0)

    def test_invalid_lora_strengths_do_not_block_prompt_validation(self):
        self.assertTrue(NODES.CineCargarH3.VALIDATE_INPUTS(
            lora_fuerza="ninguno",
            lora_fuerza_2="ninguno",
            lora_fuerza_3=None,
            lora_fuerza_4=float("nan"),
        ))


class PromptTests(unittest.TestCase):
    def test_free_mode_keeps_user_text(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="Libre",
            libre_prompt="Plano principal",
            libre_extra="Sonido ambiente",
            libre_separador="\\n---\\n",
        )

        self.assertEqual(prompt, "Plano principal\n---\nSonido ambiente")
        self.assertEqual(negative, "")

    def test_h3_mode_builds_sections_and_camera(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="MiniMax H3",
            reglas_de_oficio=False,
            subject_definitions="<Subject 1> is the actor.",
            detailed_description="[Shot 1] The actor enters the room.",
            plano="plano medio",
            angulo="altura de los ojos",
            movimiento="acercarse",
            intensidad="suave",
        )

        self.assertIn("subject_definitions:", prompt)
        self.assertIn("detailed_description:", prompt)
        self.assertIn("a medium shot", prompt)
        self.assertIn("pushes in", prompt)
        self.assertEqual(negative, "")

    def test_wan_mode_joins_editable_sections_and_keeps_negative_separate(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="Wan 2.2",
            wan_sujeto="A woman in a red coat.",
            wan_movimiento="She turns and starts running.",
            wan_camara="The camera tracks her from the side.",
            wan_negativo="warped hands, flicker",
        )

        self.assertIn("A woman in a red coat", prompt)
        self.assertIn("tracks her from the side", prompt)
        self.assertEqual(negative, "warped hands, flicker")

    def test_hunyuan_mode_uses_official_component_order(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="Hunyuan 1.5",
            hunyuan_sujeto="A black cat.",
            hunyuan_movimiento="It jumps onto a table.",
            hunyuan_escena="A sunlit kitchen.",
            hunyuan_plano="Medium shot.",
            hunyuan_camara="The camera pushes in slowly.",
            hunyuan_luz="Soft window light.",
            hunyuan_estilo="Cinematic photorealism.",
            hunyuan_atmosfera="Warm and quiet.",
            hunyuan_negativo="text, watermark",
        )

        self.assertLess(prompt.index("A black cat"), prompt.index("Medium shot"))
        self.assertLess(prompt.index("Medium shot"), prompt.index("Soft window light"))
        self.assertEqual(negative, "text, watermark")

    def test_cogvideox_mode_builds_one_caption_with_its_token_profile(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="CogVideoX 1.5",
            cog_sujeto_escena="A cyclist waits beneath a neon sign.",
            cog_accion_temporal="She looks left, then pedals into the rain.",
            cog_camara_composicion="A low tracking shot follows beside her.",
            cog_luz_color="Blue and magenta reflections shimmer on the road.",
            cog_estilo_atmosfera="Cinematic photorealism, tense nighttime mood.",
            cog_negativo="cuts, perspective jumps, watermark",
        )

        self.assertLess(prompt.index("waits beneath"), prompt.index("looks left"))
        self.assertLess(prompt.index("looks left"), prompt.index("low tracking"))
        self.assertEqual(negative, "cuts, perspective jumps, watermark")

    def test_mochi_mode_removes_na_and_keeps_negative_separate(self):
        prompt, negative = NODES.CinePrompt6().armar(
            modelo="Mochi 1",
            mochi_sujeto="A fox with wet orange fur.",
            mochi_accion="It walks carefully through shallow water.",
            mochi_entorno="A quiet photorealistic forest at dawn.",
            mochi_camara="N/A",
            mochi_luz_estilo="Soft natural backlight.",
            mochi_negativo="animation, extreme motion",
        )

        self.assertNotIn("N/A", prompt)
        self.assertIn("Soft natural backlight", prompt)
        self.assertEqual(negative, "animation, extreme motion")

    def test_every_declared_model_returns_positive_and_negative_outputs(self):
        node = NODES.CinePrompt6()
        for model in NODES.MODELOS:
            result = node.armar(modelo=model, reglas_de_oficio=False)
            self.assertEqual(len(result), 2, model)


if __name__ == "__main__":
    unittest.main()


class ModelProfileTests(unittest.TestCase):
    """El selector de perfil del nodo Cargar modelo."""

    def test_every_profile_is_complete(self):
        for name, profile in NODES.PERFILES_CARGA.items():
            for key in ("clip", "audio", "shift", "parches", "previa", "valores", "pistas"):
                self.assertIn(key, profile, f"{name} no declara {key}")
            self.assertTrue(profile["shift"], f"{name} no declara ningun nodo de shift")
            for field in ("modelo", "codificador_texto", "vae_video", "vae_audio"):
                self.assertTrue(profile["pistas"].get(field), f"{name} no da pistas para {field}")

    def test_default_profile_is_minimax_and_is_listed(self):
        self.assertEqual(NODES.PERFIL_POR_DEFECTO, "MiniMax H3")
        self.assertIn(NODES.PERFIL_POR_DEFECTO, NODES.PERFILES)
        self.assertEqual(NODES.PERFILES[-1], "Personalizado")

    def test_only_minimax_uses_the_vram_patches(self):
        # MiniMaxChunkFeedForward y MiniMaxLowVRAMAttention son de MiniMax:
        # aplicarlos a otra familia no haria nada o romperia el modelo.
        for name, profile in NODES.PERFILES_CARGA.items():
            self.assertEqual(profile["parches"], name == "MiniMax H3",
                             f"{name}: parches de MiniMax")

    def test_the_audio_vae_is_loaded_only_by_the_families_with_audio(self):
        # H3 y LTX-2.5 generan audio y tienen su propio VAE. Wan y Hunyuan no,
        # y cargarles un segundo VAE seria gastar RAM para nada.
        con_audio = {"MiniMax H3", "LTX-2.5"}
        for name, profile in NODES.PERFILES_CARGA.items():
            self.assertEqual(profile["audio"], name in con_audio, f"{name}: VAE de audio")

    def test_hunyuan_15_uses_its_own_encoder_mode(self):
        # La 1.5 no es la 1.0: cambio de llava+llama a Qwen2.5-VL y tiene su
        # propio CLIPType. Con el modo de la 1.0 el condicionamiento sale mal.
        hunyuan = NODES.PERFILES_CARGA["Hunyuan 1.5"]
        self.assertEqual(hunyuan["clip"], "HUNYUAN_VIDEO_15")
        self.assertIn("qwen_2.5_vl", hunyuan["pistas"]["codificador_texto"])

    def test_ltx_25_looks_for_gemma_not_t5(self):
        # LTX-2.5 dejo T5 y usa Gemma.
        pistas = NODES.PERFILES_CARGA["LTX-2.5"]["pistas"]["codificador_texto"]
        self.assertEqual(pistas[0], "gemma4")

    def test_custom_profile_guesses_the_family_from_the_file_names(self):
        cases = {
            "MiniMax H3": ("minimax_h3_ref2va.safetensors", "qwen3vl_32b_minimax_h3.safetensors",
                           "minimax_h3_video_vae.safetensors", "minimax_h3_audio_vae.safetensors"),
            "LTX-2.5": ("ltx-2.5-dev.safetensors", "t5xxl_fp8.safetensors",
                        "ltx-2.5-vae.safetensors", "ltx-2.5-vae.safetensors"),
            "Wan 2.2": ("wan2.2_t2v_14B.safetensors", "umt5_xxl_fp8.safetensors",
                        "wan_2.1_vae.safetensors", "wan_2.1_vae.safetensors"),
            "Hunyuan 1.5": ("hunyuan_video_1.5.safetensors", "llava_llama3_fp8.safetensors",
                            "hunyuan_video_vae.safetensors", "hunyuan_video_vae.safetensors"),
        }
        for expected, files in cases.items():
            resolved, profile = NODES._perfil_carga("Personalizado", *files)
            self.assertEqual(resolved, expected, f"{files[0]} deberia ser {expected}")
            self.assertIs(profile, NODES.PERFILES_CARGA[expected])

    def test_unknown_files_fall_back_to_minimax(self):
        resolved, _ = NODES._perfil_carga("Personalizado", "x.safetensors", "y.safetensors",
                                          "z.safetensors", "w.safetensors")
        self.assertEqual(resolved, NODES.PERFIL_POR_DEFECTO)

    def test_an_explicit_profile_beats_the_file_names(self):
        resolved, _ = NODES._perfil_carga("LTX-2.5", "minimax_h3.safetensors",
                                          "qwen3vl.safetensors", "a", "b")
        self.assertEqual(resolved, "LTX-2.5")

    def test_the_profile_widget_is_the_last_one_saved(self):
        # Los valores se guardan por posicion: si 'perfil' deja de ser el
        # ultimo, cualquier workflow guardado antes se lee descolocado.
        spec = NODES.CineCargarH3.INPUT_TYPES()
        self.assertEqual(list(spec["optional"])[-1], "perfil")
        self.assertNotIn("perfil", spec["required"])

    def test_the_shift_falls_back_when_the_node_is_missing(self):
        # Sin ningun nodo de shift instalado, el modelo sale igual que entro:
        # el shift es un ajuste, no una razon para parar un render.
        model = object()
        salida, nota = NODES._aplicar_shift(model, [("NoExisteEsteNodo", "uno")], 6.0, 3.0)
        self.assertIs(salida, model)
        self.assertIn("sin shift", nota)


class CatalogTests(unittest.TestCase):
    """El catalogo de descargas del nodo Modelos."""

    CARPETAS_VALIDAS = {
        "diffusion_models", "text_encoders", "vae", "vae_approx", "loras",
        "model_patches", "embeddings", "latent_upscale_models", "upscale_models",
    }

    def _todas(self):
        for familia, datos in NODES.CATALOGO.items():
            for entrada in list(datos["archivos"]) + list(datos["extras"]):
                yield familia, entrada

    def test_every_entry_is_well_formed(self):
        for familia, (carpeta, ruta, size, esencial, texto) in self._todas():
            self.assertIn(carpeta, self.CARPETAS_VALIDAS, f"{familia}: carpeta {carpeta}")
            self.assertTrue(ruta.endswith((".safetensors", ".pth", ".sft", ".bin", ".gguf")),
                            f"{familia}: {ruta}")
            self.assertGreater(size, 0, f"{familia}: {ruta} sin tamano")
            self.assertIsInstance(esencial, bool)
            self.assertTrue(texto.strip(), f"{familia}: {ruta} sin explicacion")

    def test_every_family_has_something_essential(self):
        for familia, datos in NODES.CATALOGO.items():
            self.assertTrue(any(a[3] for a in datos["archivos"]),
                            f"{familia} no declara ningun archivo esencial")

    def test_filenames_are_unique_within_a_family(self):
        import os
        for familia, datos in NODES.CATALOGO.items():
            nombres = [os.path.basename(a[1]) for a in datos["archivos"]]
            self.assertEqual(len(nombres), len(set(nombres)), f"{familia} repite un nombre")

    def test_the_url_is_built_from_the_catalog_repo(self):
        for familia, (_, ruta, _, _, _) in self._todas():
            url = NODES._url_de(familia, ruta)
            self.assertTrue(url.startswith("https://huggingface.co/"), url)
            self.assertIn(NODES.CATALOGO[familia]["repo"], url)

    def test_an_entry_outside_the_catalog_is_refused(self):
        # El navegador solo manda (familia, indice). Nada mas debe pasar.
        for familia, indice in (("MiniMax H3", 9999), ("MiniMax H3", -1),
                                ("Inventada", 0), ("MiniMax H3", "0")):
            with self.assertRaises(Exception, msg=f"acepto {familia!r}/{indice!r}"):
                NODES._entrada(familia, indice)

    def test_ltx_declares_that_it_needs_the_license_accepted(self):
        # Es el unico repositorio con condiciones: sin esto el usuario recibe
        # un 401 sin saber por que.
        self.assertTrue(NODES.CATALOGO["LTX-2.5"]["licencia"])
        for otra in ("MiniMax H3", "Wan 2.2", "Hunyuan 1.5"):
            self.assertIsNone(NODES.CATALOGO[otra]["licencia"], otra)
