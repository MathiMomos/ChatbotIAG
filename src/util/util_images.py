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
        n=1,
    )

    if not respuesta or not respuesta.data or not respuesta.data[0].url:
        raise ValueError(
            "No se pudo generar la imagen. Verifica el prompt o la configuración."
        )

    return respuesta.data[0].url


def ajustarRespuestaImagen(cliente: AzureOpenAI, prompt):
    model = key.require("CONF_AZURE_DEPLOYMENT")
    system_msg = (
        "Eres un asistente que convierte respuestas largas en prompts seguros "
        "para motores de generación de imágenes.\n"
        "Reglas:\n"
        "• Máximo 40 palabras.\n"
        "• Prohibido lenguaje violento, sexual, político o datos personales.\n"
        "• Añade al final: '— ilustración digital, colores suaves'.\n"
        "• Debes devolver un prompt para generar una imagen ilustrativa del texto."
        "Devuélveme SOLO el prompt final, sin comillas ni texto extra."
    )
    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": prompt},
    ]
    respuesta = cliente.chat.completions.create(
        model=model, messages=messages, temperature=0.7, max_tokens=120
    )
    prompt_img = respuesta.choices[0].message.content.strip()
    return prompt_img