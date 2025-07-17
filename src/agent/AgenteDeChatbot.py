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

# Utilitarios de chat
from src.util.util_chat import *

## #######################################################################################################
## @section Clase
## #######################################################################################################


# Definición de clase
class AgenteDeChatbot:

    def __init__(self, llm=None, contexto=None, basesDeConocimiento=None):
        # Guardamos los atributos
        self.llm = llm
        self.contexto = contexto
        self.basesDeConocimiento = basesDeConocimiento

        # Abrimos la sesión de chat
        # Verificamos si hay bases de conocimiento
        if self.basesDeConocimiento == None:

            self.chat = abrirSesionDeChat(llm=self.llm, contexto=self.contexto)
        else:

            self.chat = abrirSesionDeChatConBaseDeConocimiento(
                llm=self.llm,
                contexto=self.contexto,
                basesDeConocimiento=self.basesDeConocimiento,
            )

    def enviarAudio(
        self, audio_base64, mime_type="audio/wav", mensaje_texto="¿Qué dice este audio?"
    ):
        # Cuerpo del mensaje combinado
        mensaje = [
            {"type": "text", "text": mensaje_texto},
            {"type": "audio", "audio": {"data": audio_base64, "mime_type": mime_type}},
        ]

        # Enviar usando la misma sesión
        respuesta = enviarMensaje(chat=self.chat, mensaje=mensaje)

        return respuesta

    # Envía un mensaje
    def enviarMensaje(self, prompt=None):
        respuesta = ""

        # Verificamos si hay bases de conocimiento
        if self.basesDeConocimiento == None:

            respuesta = enviarMensaje(chat=self.chat, mensaje=prompt)
        else:

            respuesta = enviarMensajeEnChatConBaseDeConocimiento(
                chat=self.chat, mensaje=prompt
            )

        return respuesta
