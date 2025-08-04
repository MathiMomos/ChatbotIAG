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

        Ejemplos según el tipo de diagrama:

        PARA ORGANIGRAMAS Y JERARQUÍAS:
        {{
            "nodes": [
              {{ "key": "1", "text": "CEO", "color": "lightblue" }},
              {{ "key": "2", "text": "Director de Tecnología", "color": "lightgreen", "parent": "1" }},
              {{ "key": "3", "text": "Director de Marketing", "color": "lightcoral", "parent": "1" }},
              {{ "key": "4", "text": "Líder de Desarrollo", "color": "lightyellow", "parent": "2" }},
              {{ "key": "5", "text": "Líder de QA", "color": "lightpink", "parent": "2" }}
            ]
        }}

        PARA ÁRBOLES FAMILIARES (estructura especial):
        {{
            "nodes": [
              {{ "key": "1", "text": "Abuelo Paterno", "color": "lightblue" }},
              {{ "key": "2", "text": "Abuela Paterna", "color": "lightgreen" }},
              {{ "key": "3", "text": "Abuelo Materno", "color": "lightcoral" }},
              {{ "key": "4", "text": "Abuela Materna", "color": "lightyellow" }},
              {{ "key": "5", "text": "Padre", "color": "lightpink", "parent": "1" }},
              {{ "key": "6", "text": "Madre", "color": "lightgray", "parent": "3" }},
              {{ "key": "7", "text": "Hijo 1", "color": "wheat", "parent": "5" }},
              {{ "key": "8", "text": "Hijo 2", "color": "lavender", "parent": "5" }}
            ],
            "links": [
              {{ "from": "1", "to": "2" }},
              {{ "from": "3", "to": "4" }},
              {{ "from": "1", "to": "5" }},
              {{ "from": "3", "to": "6" }},
              {{ "from": "5", "to": "6" }},
              {{ "from": "6", "to": "7" }},
              {{ "from": "6", "to": "8" }}
            ]
        }}

        PARA PROCESOS Y FLUJOS:
        {{
            "nodes": [
              {{ "key": "1", "text": "Inicio", "color": "lightblue" }},
              {{ "key": "2", "text": "Proceso 1", "color": "lightgreen" }},
              {{ "key": "3", "text": "Decisión", "color": "lightyellow" }},
              {{ "key": "4", "text": "Fin", "color": "lightcoral" }}
            ],
            "links": [
              {{ "from": "1", "to": "2" }},
              {{ "from": "2", "to": "3" }},
              {{ "from": "3", "to": "4" }}
            ]
        }}

        REGLAS IMPORTANTES PARA LA ESTRUCTURA:
        - Usa colores claros y visibles como: lightblue, lightgreen, lightcoral, lightyellow, lightpink, lightgray, wheat, lavender, lightsteelblue, palegreen
        - Para organigramas: usa SOLO "parent" properties, NO agregues "links"
        - Para árboles familiares: usa "parent" para linaje + "links" para todas las conexiones (matrimonios Y relaciones padre-hijo)
        - Para procesos: usa SOLO "links", NO agregues "parent"
        - En árboles familiares: SIEMPRE incluir links de abuelos a padres, padres entre sí, y madre a hijos
        - EJEMPLO DE CONEXIONES FAMILIARES: matrimonios (1→2, 3→4, 5→6), linaje (1→5, 3→6), descendencia (6→7, 6→8)
        - Los enlaces "from" y "to" deben corresponder exactamente con las "key" de los nodos
        - Evita colores oscuros o muy intensos

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