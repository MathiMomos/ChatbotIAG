import json
from langchain_core.prompts import PromptTemplate
from src.util.util_llm import obtenerModelo


def generar_json_diagrama(descripcion_diagrama: str):
    """
    Toma una descripción de texto y le pide a un LLM que genere
    el código JSON para un diagrama GoJS.
    """

    plantilla = """
        Analiza el mensaje, responderás con un JSON con la estructura de un diagrama de nodos y enlaces para GoJS:

        {mensaje}

        Tienes este ejemplo:
            "nodes": [
              {{ "key": "1", "text": "CEO", "color": "skyblue" }},
              {{ "key": "2", "text": "Director de Tecnología", "parent": "1" }},
              {{ "key": "3", "text": "Director de Marketing", "parent": "1" }},
              {{ "key": "4", "text": "Líder de Desarrollo", "parent": "2" }},
              {{ "key": "5", "text": "Líder de QA", "parent": "2" }},
              {{ "key": "6", "text": "Especialista en SEO", "parent": "3" }}
            ],
            "links": [
              {{ "from": "1", "to": "2" }},
              {{ "from": "1", "to": "3" }},
              {{ "from": "2", "to": "4" }},
              {{ "from": "2", "to": "5" }},
              {{ "from": "3", "to": "6" }}
            ]
          }};

        Sólo debes devolver el JSON, no debes agregar texto, comentarios adicionales o variables que no te haya pedido
    """

    prompt_template = PromptTemplate.from_template(plantilla)

    llm = obtenerModelo()

    consulta = prompt_template.format(mensaje=descripcion_diagrama)

    respuesta_modelo = llm.invoke(consulta).content.replace("```json", "").replace("```", "").strip()

    try:
        respuesta_json = json.loads(respuesta_modelo)
        return respuesta_json
    except Exception as e:
        print(f"Error al parsear JSON de diagrama: {e}")
        return {"error": "No se pudo generar el diagrama."}