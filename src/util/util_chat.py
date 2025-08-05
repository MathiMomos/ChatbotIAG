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

# Utilitario para crear una conversación de chat con el modelo
from langchain.chains import ConversationChain

# Utilitario para crear la memoria a corto plazo del modelo
from langchain.memory import ConversationBufferMemory

# Utilitario para crear un chat que incluya bases de conocimientos
from langchain.chains import RetrievalQA

## #######################################################################################################
## @section Funciones
## #######################################################################################################


# Abre la sesión de chat con el modelo
def abrirSesionDeChat(llm=None, contexto: str = "", memoria = None):
    # Creamos la memoria a corto plazo
    # Agregamos la "personalidad" a nuestra IA
    if memoria is None:
        memoria = ConversationBufferMemory()
    memoria.chat_memory.add_ai_message(contexto)

    # Creamos la conversación de chat
    chat = ConversationChain(
        llm=llm,
        memory=memoria,
        verbose=False,  # Desactivamos el log para ver sólo las respuestas del modelo
    )

    return chat


# Abre una sesión de chat y adjunta una base de conocimiento
def abrirSesionDeChatConBaseDeConocimiento(
    llm=None, basesDeConocimiento=None, contexto: str = "", memoria = None
):
    if memoria is None:
        memoria = ConversationBufferMemory()
    # Agregamos la "personalidad" a nuestra IA
    memoria.chat_memory.add_ai_message(contexto)

    # Creación del chat avanzado
    chat = RetrievalQA.from_chain_type(
        llm=llm, chain_type="stuff", retriever=basesDeConocimiento, memory=memoria
    )

    return chat


# Envía un mensaje a un chat
def enviarMensaje(chat: RetrievalQA.from_chain_type = None, mensaje=None):
    # Enviamos el mensaje
    respuesta = chat.predict(input=mensaje)

    return respuesta


# Envía un mensaje a un chat que tiene una base de conocimiento asociada
def enviarMensajeEnChatConBaseDeConocimiento(
    chat: RetrievalQA.from_chain_type = None, mensaje=None
):
    # Enviamos el mensaje
    respuesta = chat.invoke(mensaje)

    # Extraemos el mensaje
    return respuesta["result"]
