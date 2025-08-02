## #######################################################################################################
##
## @copyright Big Data Academy [info@bigdataacademy.org]
## @professor Alonso Melgarejo [alonsoraulmgs@gmail.com]
##
## #######################################################################################################

## ################q######################################################################################
## @section Configuración
## #######################################################################################################

#Importamos la configuración
import src.util.util_env as key

## ################q######################################################################################
## @section Librerías
## #######################################################################################################

#Utilitario para crear una plantilla de prompt
from langchain_core.prompts import PromptTemplate

#Utilitario para convertir la estructura string a json
import json

## #######################################################################################################
## @section Clase
## #######################################################################################################

#Definición de clase
class AgenteDeDiagramas:

  def __init__(
    self,
    llm = None,
  ):
    #Guardamos los atributos
    self.llm = llm

    #Plantilla de prompt
    self.promptTemplate = PromptTemplate.from_template("""
        
        
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
    """)

  #Envía un mensaje
  def enviarMensaje(
      self,
      prompt = None
  ):
    respuesta = None

    #Creamos la consulta
    consulta = self.promptTemplate.format(
      mensaje = prompt
    )

    #Invocamos el modelo y reemplazamos la marca "json"
    respuestaDelModelo = self.llm.invoke(consulta).content.replace("```json", "").replace("```", "")

    #La convertimos a JSON
    try:
        respuesta = json.loads(respuestaDelModelo)
    except Exception as e:
        respuesta = {
            "status": "ERROR",
            "message": f"Ocurrió un error al parsear la respuesta del modelo: {respuestaDelModelo}"
        }

    #Devolvemos el contenido de la respuesta
    return respuesta