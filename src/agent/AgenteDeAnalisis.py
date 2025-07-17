## #######################################################################################################
##
## @copyright Big Data Academy [info@bigdataacademy.org]
## @professor Alonso Melgarejo [alonsoraulmgs@gmail.com]
##
## #######################################################################################################

## ################q######################################################################################
## @section Configuración
## #######################################################################################################

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
class AgenteDeAnalisis:

  def __init__(
    self,
    llm = None,
    descripcion = None
  ):
    #Guardamos los atributos
    self.llm = llm
    self.descripcion = descripcion

    #Plantilla de prompt
    self.promptTemplate = PromptTemplate.from_template("""
      Harás lo siguiente:

      {descripcion}

      Sólo debes devolver el JSON, no debes agregar texto, comentarios adicionales o variables que no te haya pedido

      Este es el mensaje en donde harás lo que te pedí:

      {prompt}
    """)

  #Envía un mensaje
  def ejecutar(
      self,
      prompt = None
  ):
    respuesta = None

    #Creamos la consulta
    consulta = self.promptTemplate.format(
      descripcion = self.descripcion,
      prompt = prompt
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