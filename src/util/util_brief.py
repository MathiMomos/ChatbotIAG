import json
from langchain_core.prompts import PromptTemplate
from src.util.util_llm import obtenerModelo


def generar_brief(descripcion_brief: str):
    """
    Toma una descripción de texto y le pide a un LLM que lo resuma.
    """

    plantilla = f"""
        Tu tarea es actuar como un experto en comunicación concisa, resume brevemente el siguiente texto en un brief claro y directo, no debe exceder las 200 palabras
        No añadas introducciones como 'aquí tienes un resumen' y ve directo al grano
    
        Texto a resumir:
        
        {descripcion_brief}
    """

    prompt_template = PromptTemplate.from_template(plantilla)

    llm = obtenerModelo()

    consulta = prompt_template.format(mensaje=descripcion_brief)

    respuesta_modelo = llm.invoke(consulta).content.strip()

    return respuesta_modelo