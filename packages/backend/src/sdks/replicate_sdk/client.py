import os
from typing import cast

import replicate
from replicate.helpers import FileOutput

from .imagen_4_fast import Imagen4FastInput
from .kling_v2_5_turbo_pro import KlingV25TurboProInput
from .nano_banana import NanoBananaProInput
from .seedream import Seedream4Input
from .topaz import TopazVideoUpscaleInput
from .wan_2_5_t2v import Wan25T2VInput
from .wan_2_5_t2v_fast import Wan25T2VFastInput


class ReplicateApi:
    api_token: str | None
    client: replicate.Client

    def __init__(self, api_token: str | None = None):
        self.api_token = api_token or os.environ.get("REPLICATE_API_TOKEN")
        self.client = replicate.Client(api_token=self.api_token)

    def run_video_upscale(self, input_data: TopazVideoUpscaleInput) -> FileOutput:
        """
        Run the Topaz Video Upscale model. single video.
        https://replicate.com/topazlabs/video-upscale
        """
        out = self.client.run(
            TopazVideoUpscaleInput.MODEL_ID,
            input=input_data.model_dump(exclude_none=True),
        )
        return cast(FileOutput, out)

    def run_nano_banana_pro(self, input_data: NanoBananaProInput) -> FileOutput:
        """
        Run the Nano Banana Pro image generation model.
        https://replicate.com/google/nano-banana-pro
        """
        out = self.client.run(
            NanoBananaProInput.MODEL_ID,
            input=input_data.model_dump(exclude_none=True),
        )
        return cast(FileOutput, out)

    def run_seedream_4(self, input_data: Seedream4Input) -> FileOutput:
        """
        Run the Seedream 4 model (bytedance/seedream-4) for text->image and image editing.
        https://replicate.com/bytedance/seedream-4
        """
        out = self.client.run(
            Seedream4Input.MODEL_ID,
            input=input_data.model_dump(exclude_none=True),
        )
        return cast(FileOutput, out)

    def run_imagen_4_fast(self, input_data: Imagen4FastInput) -> FileOutput:
        """
        Run the Imagen 4 Fast model (google/imagen-4-fast) for text->image generation.
        https://replicate.com/google/imagen-4-fast
        """
        out = self.client.run(
            Imagen4FastInput.MODEL_ID,
            input=input_data.model_dump(exclude_none=True),
        )
        return cast(FileOutput, out)

    def run_wan_2_5_t2v_fast(self, input_data: Wan25T2VFastInput) -> FileOutput:
        """
        Run the WAN 2.5 text-to-video (fast) model.
        https://replicate.com/wan-video/wan-2.5-t2v-fast
        """
        out = self.client.run(
            Wan25T2VFastInput.MODEL_ID,
            input=input_data.model_dump(exclude_none=True),
        )
        return cast(FileOutput, out)

    def run_wan_2_5_t2v(self, input_data: Wan25T2VInput) -> FileOutput:
        """
        Run the WAN 2.5 text-to-video (standard / higher-quality) model.
        https://replicate.com/wan-video/wan-2.5-t2v
        """
        out = self.client.run(
            Wan25T2VInput.MODEL_ID,
            input=input_data.model_dump(exclude_none=True),
        )
        return cast(FileOutput, out)

    def run_kling_v2_5_turbo_pro(self, input_data: KlingV25TurboProInput) -> FileOutput:
        """
        Run Kling v2.5 turbo pro (image-to-video / text-to-video) model.
        https://replicate.com/kwaivgi/kling-v2.5-turbo-pro
        """
        out = self.client.run(
            KlingV25TurboProInput.MODEL_ID,
            input=input_data.model_dump(exclude_none=True),
        )
        return cast(FileOutput, out)
