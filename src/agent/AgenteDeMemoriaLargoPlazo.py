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
class AgenteDeMemoriaLargoPlazo:

  def __init__(
    self,
    llm = None,
    condiciones = None
  ):
    #Guardamos los atributos
    self.llm = llm
    self.condiciones = condiciones

    #Plantilla de prompt
    self.promptTemplate = PromptTemplate.from_template("""
      Si el mensaje incluye como mínimo 1 de estos puntos:

      {condiciones}

      Para cada información detectada en ese mensaje, devolverás un JSON con estas 2 variables

      - "estado": INFORMACION_POR_RECORDAR
      - "informacion": Un párrafo de texto, en donde cada oración del párrafo diga exactamente lo siguiente "El usuario afirma que INFORMACION_DETECTADA",
      donde "INFORMACION_DETECTADA" es la información que se detectó respecto a alguno de esos puntos. Habrán tantas oraciones en
      el párrafo como informaciones detectadas

      Si no detectas nada, devolverás un JSON con 1 variable

      - "estado": NO_SE_DETECTO_INFORMACION_POR_RECORDAR

      Este es el mensaje:

      {mensaje}
    """)

  #Envía un mensaje
  def ejecutar(
      self,
      prompt = None
  ):
    respuesta = None

    #Creamos la consulta
    consulta = self.promptTemplate.format(
      condiciones = self.condiciones,
      mensaje = prompt
    )

    #Invocamos el modelo y reemplazamos la marca "json"
    respuestaDelModelo = self.llm.invoke(consulta).content.replace("```json", "").replace("```", "")

    #La convertimos a JSON
    try:
        respuesta = json.loads(respuestaDelModelo)
    except Exception as e:
        respuesta = {
            "estado": "ERROR",
            "message": f"Ocurrió un error al parsear la respuesta del modelo: {respuestaDelModelo}"
        }

    #Devolvemos el contenido de la respuesta
    return respuesta