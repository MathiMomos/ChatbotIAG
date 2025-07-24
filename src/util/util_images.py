import src.util.util_env as key
from openai import AzureOpenAI

def responderImagen(client: AzureOpenAI, prompt: str):
    """
    Genera una imagen de 1024x1024 píxeles usando Azure OpenAI (DALL·E 3).
    """
    respuesta = client.images.generate(
        model=key.require("CONF_AZURE_DEPLOYMENT_IMAGE"),
        prompt=prompt,
        size="1024x1024",
        quality="standard",
        n=1
    )

    if not respuesta or not respuesta.data or not respuesta.data[0].url:
        raise ValueError("No se pudo generar la imagen. Verifica el prompt o la configuración.")

    return respuesta.data[0].url