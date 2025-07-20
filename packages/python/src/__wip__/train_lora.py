from pprint import pprint
from time import sleep
import replicate
from dotenv import load_dotenv


# TODO: this example is not ready yet.
def train():
    """
    ref: https://replicate.com/ostris/flux-dev-lora-trainer/train
    """
    version = "ostris/flux-dev-lora-trainer:b6af14222e6bd9be257cbc1ea4afda3cd0503e1133083b9d1de0364d8568e6ef"
    input = {
        "steps": 1000,
        "lora_rank": 16,
        "optimizer": "adamw8bit",
        "batch_size": 1,
        "resolution": "512,768,1024",
        "autocaption": True,
        "input_images": "https://",  # TODO: update the images
        "trigger_word": "TOK",
        "learning_rate": 0.0004,
        "wandb_project": "flux_train_replicate",
        "wandb_save_interval": 100,
        "caption_dropout_rate": 0.05,
        "cache_latents_to_disk": False,
        "wandb_sample_interval": 100,
        "gradient_checkpointing": False,
    }
    training = replicate.trainings.create(
        destination="rayli09/model-name",
        version=version,
        input=input,
    )
    # sleep for 5 seconds and poll the stauts
    while training.status not in ["succeeded", "failed"]:
        training = replicate.trainings.get(training.id)
        pprint(training.status)
        sleep(5)
    return


if __name__ == "__main__":
    load_dotenv()
    train()
