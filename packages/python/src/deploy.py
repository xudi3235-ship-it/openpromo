import modal
from tts import app as tts_app
from echomimic import app as echomimic_app
from src.infra.audio.fn import app as audio_infra_app
from src.infra.video.fn import app as video_infra_app
from comfyapp import app as comfy_app
from dotenv import load_dotenv
from replicate_api import app as replicate_api_app
from whisper_api import app as whisper_api_app

load_dotenv()

app = modal.App(name="promobase-infra")
app.include(tts_app)
app.include(echomimic_app)
app.include(comfy_app)
app.include(video_infra_app)
app.include(replicate_api_app)
app.include(whisper_api_app)
app.include(audio_infra_app)
