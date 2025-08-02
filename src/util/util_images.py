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
        "Convierte textos técnicos en prompts visuales SIMPLES y CLAROS.\n\n"
        
        "PRINCIPIO CLAVE: MENOS ES MÁS\n"
        "• Identifica solo el concepto MÁS IMPORTANTE del texto\n"
        "• Agregar máximo 1-2 elementos de apoyo\n"
        "• Evita saturar la imagen con muchos elementos\n"
        "• INCLUYE elementos específicos mencionados (herramientas, sectores, etc.)\n"
        "• Prioriza CLARIDAD sobre completitud\n\n"
        
        "ESTRATEGIA:\n"
        "1. Concepto principal: ¿Cuál es la idea central?\n"
        "2. Elemento visual: ¿Cómo representarlo simplemente?\n"
        "3. Contexto mínimo: ¿Qué ambiente lo apoya?\n\n"
        
        "EJEMPLOS DE SIMPLICIDAD EFECTIVA:\n"
        "• IAG creando contenido → 'IA central emanando texto, imagen y música hacia pantallas'\n"
        "• Educación con IA → 'Estudiantes interactuando con pantalla IA en aula moderna'\n"
        "• Análisis de datos → 'gráficos flotantes coloridos y visualizaciones'\n"
        "• Evolución temporal → línea de tiempo visual\n\n"
        
        
        "REGLAS ESTRICTAS:\n"
        "• Máximo 40 palabras descriptivas\n"
        "• 1 concepto principal + máximo 2 elementos de apoyo\n"
        "• Evita listas largas de elementos\n"
        "Identifica EL concepto más importante y represéntalo de forma simple y clara."
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