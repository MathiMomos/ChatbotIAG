import json
from langchain_core.prompts import PromptTemplate
from src.util.util_llm import obtenerModelo


def generar_brief(descripcion_brief: str):
    """
    Toma una descripción de texto y le pide a un LLM que lo resuma.
    """

    plantilla = f"""
        Tu tarea es actuar como un experto en comunicación concisa,
        Resume brevemente el siguiente texto en un brief claro y directo, no debe exceder las 250 palabras
        Debes respetar el idioma del texto original, si el texto es en español, el brief debe ser en español, etc.
        No añadas introducciones como 'aquí tienes un resumen' y ve directo al grano
    
        Texto a resumir:
        
        {descripcion_brief}
    """

    prompt_template = PromptTemplate.from_template(plantilla)

    llm = obtenerModelo(temperature=0.2)

    consulta = prompt_template.format(mensaje=descripcion_brief)

    respuesta_modelo = llm.invoke(consulta).content.strip()

    return respuesta_modelo