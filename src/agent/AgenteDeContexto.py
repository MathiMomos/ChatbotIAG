## #######################################################################################################
##
## @copyright Big Data Academy [info@bigdataacademy.org]
## @professor Alonso Melgarejo [alonsoraulmgs@gmail.com]
##
## #######################################################################################################

## ################q######################################################################################
## @section Configuración
## #######################################################################################################

# Importamos la configuración
import src.util.util_env as key

## ################q######################################################################################
## @section Librerías
## #######################################################################################################

# Utilitario para crear una plantilla de prompt
from langchain_core.prompts import PromptTemplate

# Utilitario para convertir la estructura string a json
import json

## #######################################################################################################
## @section Clase
## #######################################################################################################


# Definición de clase
class AgenteDeContexto:

    def __init__(self, llm=None, condiciones=None):
        # Guardamos los atributos
        self.llm = llm
        self.condiciones = condiciones

        # Plantilla de prompt
        self.promptTemplate = PromptTemplate.from_template(
            """
      Vas a revisar que los mensajes que recibas cumplan estas condiciones

      {condiciones}

      Si sí cumplen responderás con un JSON con esta única variable:

      - "status": "PROMPT_VALIDO"
      - "message": Una explicación breve del por qué sí se cumplen las condiciones

      Sino, responderás con un JSON con estas 2 variables:

      - "status": "PROMPT_NO_VALIDO"
      - "message": Una explicación breve del por qué no se cumplen las condiciones

      Sólo debes devolver el JSON, no debes agregar texto, comentarios adicionales o variables que no te haya pedido

      El mensaje es el siguiente:

      {mensaje}
    """
        )

    # Envía un mensaje
    def enviarMensaje(self, prompt=None):
        if not prompt:
            return {
                "status": "ERROR",
                "message": "No se proporcionó un mensaje para validar.",
            }
            
        # Convertimos el mensaje a string
        mensaje: str = ""
        if isinstance(prompt, dict) and "contenido" in prompt:
            mensaje = prompt["contenido"]
        elif isinstance(prompt, str):
            mensaje: str = prompt
        else:
            return {
                "status": "ERROR",
                "message": f"Formato de prompt no soportado: {type(prompt)}",
            }

        mensaje_limpio: str = mensaje.strip()

        if mensaje_limpio == "No se pudo transcribir el audio con Azure.":
            return {
                "status": "PROMPT_NO_VALIDO",
                "message": "No se pudo transcribir el audio con Azure.",
            }

        # Creamos la consulta
        consulta = self.promptTemplate.format(
            condiciones=self.condiciones, mensaje=prompt
        )

        # Invocamos el modelo y reemplazamos la marca "json"
        respuestaDelModelo = (
            self.llm.invoke(consulta).content.replace("```json", "").replace("```", "")
        )

        # La convertimos a JSON
        try:
            respuesta = json.loads(respuestaDelModelo)
        except Exception as e:
            respuesta = {
                "status": "ERROR",
                "message": f"Ocurrió un error al parsear la respuesta del modelo: {respuestaDelModelo}",
            }

        # Devolvemos el contenido de la respuesta
        return respuesta
