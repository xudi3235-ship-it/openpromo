import asyncio
from typing import Any, Literal, Optional
from replicate.version import Version


class ReplicateInfra:
    def __init__(self):
        import logging
        import os
        import replicate

        if not os.environ["REPLICATE_API_TOKEN"]:
            raise ValueError("REPLICATE_API_TOKEN not set")
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__class__.__name__)
        self.replicate = replicate

    def infer_kling_v16_pro(
        self,
        prompt: str,
        start_image_url: str,
        duration: int = 5,
        cfg_scale: float = 0.5,
        negative_prompt: str = "",
        aspect_ratio: Literal["16:9", "4:3", "1:1"] = "16:9",
        end_image_url: Optional[str] = None,
    ):
        """
        ref https://replicate.com/kwaivgi/kling-v1.6-pro
        text to video generation model
        """

        assert 0 <= cfg_scale <= 1, "cfg_scale must be between 0 and 1"
        assert duration in [5, 10], "duration must be 5 or 10"

        input = {
            "prompt": prompt,
            "duration": duration,
            "cfg_scale": cfg_scale,
            "start_image": start_image_url,
            "aspect_ratio": aspect_ratio,
            "negative_prompt": negative_prompt,
        }
        # add in params if not none
        if end_image_url:
            input["end_image"] = end_image_url

        output = self.replicate.run(
            "kwaivgi/kling-v1.6-pro",
            input=input,
        )

        return output

    def infer_flux_dev_realism(
        self,
        prompt: str,
        aspect_ratio: Literal[
            "16:9",
            "4:3",
            "1:1",
            "9:16",
            "3:4",
            "1:1",
            "4:5",
            "5:4",
            "21:9",
            "9:21",
        ] = "4:5",
        num_outputs: int = 1,
        num_inference_steps: int = 30,
        guidance: float = 3.5,
        lora_strength: float = 0.8,
        output_format: Literal["webp", "png", "jpeg"] = "webp",
        output_quality: int = 100,
        seed: Optional[int] = None,
    ):
        """
        flux dev lora checkpt, featuring realism
        ref https://replicate.com/xlabs-ai/flux-dev-realism
        """
        valid_num_outputs = range(1, 4)
        valid_num_inference_steps = range(1, 50)
        valid_guidance = range(0, 10)
        valid_lora_strength = range(0, 2)
        valid_output_quality = range(0, 100)

        assert num_outputs in valid_num_outputs, (
            f"num_outputs must be {valid_num_outputs[0] - valid_num_outputs[-1]}"
        )
        assert num_inference_steps in valid_num_inference_steps, (
            f"num_inference_steps must be {valid_num_inference_steps[0] - valid_num_inference_steps[-1]}"
        )
        assert guidance in valid_guidance, (
            f"guidance must be {valid_guidance[0] - valid_guidance[-1]}"
        )
        assert lora_strength in valid_lora_strength, (
            f"lora_strength must be {valid_lora_strength[0] - valid_lora_strength[-1]}"
        )
        assert output_quality in valid_output_quality, (
            f"output_quality must be {valid_output_quality[0] - valid_output_quality[-1]}"
        )

        output = self.replicate.run(
            "xlabs-ai/flux-dev-realism:39b3434f194f87a900d1bc2b6d4b983e90f0dde1d5022c27b52c143d670758fa",
            input={
                "prompt": prompt,
                "guidance": guidance,
                "num_outputs": num_outputs,
                "aspect_ratio": aspect_ratio,
                "lora_strength": lora_strength,
                "output_format": output_format,
                "output_quality": output_quality,
                "num_inference_steps": num_inference_steps,
            },
        )
        return output

    def infer_tortoise_tts(
        self,
        text: str,
        voice_a: str,
        seed: int = 0,
        voice_b: str = "disabled",
        voice_c: str = "disabled",
        preset: Literal["fast", "ultra_fast", "standard", "high_quality"] = "fast",
        custom_voice_url: Optional[str] = None,
        cvvp_amount: int = 0,
    ):
        # REF https://replicate.com/afiaka87/tortoise-tts

        output = self.replicate.run(
            "afiaka87/tortoise-tts:e9658de4b325863c4fcdc12d94bb7c9b54cbfe351b7ca1b36860008172b91c71",
            input={
                "seed": seed,
                "text": text,
                "preset": preset,
                "voice_a": "custom_voice",
                "voice_b": voice_b,
                "voice_c": voice_c,
                "cvvp_amount": cvvp_amount,
                "custom_voice": "https://replicate.delivery/mgxm/671f3086-382f-4850-be82-db853e5f05a8/nixon.mp3",
            },
        )
        print(output)
        return output

    def infer_latent_sync(
        self, audio_url: str, video_url: str, guidance_scale: int = 1, seed: int = 0
    ):
        """
        ref https://replicate.com/bytedance/latentsync
        latent sync is a video to video synthesis model. kinda cool.
        """
        output = self.replicate.run(
            "bytedance/latentsync:9d95ee5d66c993bbd3e0779dacd2dd6af6f542de93403aae36c6343455e0ca04",
            input={
                "seed": seed,
                "audio": audio_url,
                "video": video_url,
                "guidance_scale": guidance_scale,
            },
        )
        print(output)
        return output

    def infer_orpheus_3b_tts(
        self,
        text: str,
        top_p: float = 0.95,
        voice: Literal["tara", "dan", "josh", "emma"] = "tara",
        temperature: float = 0.6,
        max_new_tokens: int = 1200,
        repetition_penalty: float = 1.1,
    ):
        """
        ref https://replicate.com/lucataco/orpheus-3b-0.1-ft
        TTS model with emotion control
        Note: supports <laugh>, <chuckle>, <sigh>, <cough> <sniffle>, <groan>, <yawn>, <gasp> or uhm
        """
        output = self.replicate.run(
            "lucataco/orpheus-3b-0.1-ft:79f2a473e6a9720716a473d9b2f2951437dbf91dc02ccb7079fb3d89b881207f",
            input={
                "text": text,
                "top_p": top_p,
                "voice": voice,
                "temperature": temperature,
                "max_new_tokens": max_new_tokens,
                "repetition_penalty": repetition_penalty,
            },
        )
        self.logger.info(output)
        return output
        pass

    def infer_chat_tts(
        self,
        text: str,
        top_k: int = 20,
        top_p: float = 0.7,
        voice: int = 2222,
        prompt: str = "",
        skip_refine: int = 0,
        temperature: float = 0.3,
        custom_voice: int = 0,
    ):
        """
        text: "chat T T S 是一款强大的对话式文本转语音模型。它有中英混读和多说话人的能力。\nchat T T S 不仅能够生成自然流畅的语音，还能控制[laugh]笑声啊[laugh]，\n停顿啊[uv_break]语气词啊等副语言现象[uv_break]。这个韵律超越了许多开源模型[uv_break]。\n请注意，chat T T S 的使用应遵守法律和伦理准则，避免滥用的安全风险。[uv_break]"
        """
        import time

        r = self.replicate
        version = r.models.get("thlz998/chat-tts").versions.get(
            "fdb4f547d19c9591d7e0223c88b14886c110129c0e206ddbb97fe7a344162868"
        )

        self.logger.info("running chat tts")
        p = self.replicate.predictions.create(
            version=version,
            input={
                "text": text,
                "top_k": top_k,
                "top_p": top_p,
                "voice": voice,
                "prompt": prompt,
                "skip_refine": skip_refine,
                "temperature": temperature,
                "custom_voice": custom_voice,
            },
        )
        self.logger.info(f"prediction created, id: {p.id}")
        while p.status not in ["succeeded", "failed"]:
            time.sleep(15)
            self.logger.info(f"waiting for completion: {p.status}")
            p.reload()
        if p.status == "failed":
            raise ValueError(f"prediction failed: {p.error}")

        return p.output

    def infer_xtts_v2(
        self,
        text: str,
        speaker_audio_url: Optional[str] = None,
        language: str = "en",
        cleanup_voice: bool = False,
    ):
        """
        ref https://replicate.com/lucataco/xtts-v2
        this is the best TTS model for general multi-lingual use cases.
        """
        self.logger.info("Running Xtts v2 inference")
        output = self.replicate.run(
            "lucataco/xtts-v2:684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e",
            input={
                "text": text,
                "speaker": speaker_audio_url,
                "language": language,
                "cleanup_voice": cleanup_voice,
            },
        )
        return output

    def infer_f5_tts(self, text: str, ref_audio_url: str):
        """
        ref https://replicate.com/x-lance/f5-tts
        source code: https://github.com/SWivid/F5-TTS
        OSS voice clone. quality tbd
        """
        self.logger.info("Running F5 TTS inference")
        output = self.replicate.run(
            "x-lance/f5-tts:87faf6dd7a692dd82043f662e76369cab126a2cf1937e25a9d41e0b834fd230e",
            input={
                "speed": 1,
                "gen_text": "captain teemo, on duty!",
                "ref_text": "never underestimate the power of the scout's code",
                "remove_silence": True,
                "custom_split_words": "",
            },
        )
        print(output)
        return output

    def infer_musetalk(self):
        """
        https://replicate.com/douwantech/musetalk
        """

        output = self.replicate.run(
            "douwantech/musetalk:5501004e78525e4bbd9fa20d1e75ad51fddce5a274bec07b9b16d685e34eeaf8",
            input={
                "fps": 25,
                "bbox_shift": 0,
                "audio_input": "https://replicate.delivery/pbxt/L2hFThsgfNCT3ZaqOoez3T2foFrCiQTw3ihjDoOHikWVdYGK/sun.wav",
                "video_input": "https://replicate.delivery/pbxt/L2hFUyTjQUalIvUBRskwEaJLCi1dwbWNMjL1NI9cQNgvMfaX/sun.mp4",
            },
        )

        print(output)
        return output

    async def run_prediction_async(self, version: Version, input: dict) -> Any:
        pred = self.replicate.predictions.create(version=version, input=input)
        while pred.status not in ["succeeded", "failed"]:
            self.logger.info(f"Prediction status: {pred.status}")
            pred.reload()
            await asyncio.sleep(5)
        if pred.status != "succeeded":
            raise ValueError(f"Prediction failed: {pred.error}")
        return pred.output
