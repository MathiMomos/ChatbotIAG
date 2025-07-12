# Utilitario de conexión a Azure OpenAI
from langchain_openai import AzureChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.agents import initialize_agent
from langchain.agents import AgentType
from langchain_community.retrievers import AzureAISearchRetriever
from langchain.schema import SystemMessage
from langchain.chains import RetrievalQA
import os
from dotenv import load_dotenv

load_dotenv()

def require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise EnvironmentError(f"Falta la variable {name}")
    return value

# Obtiene el modelo con el que trabajamos
def obtenerModelo() -> AzureChatOpenAI:
    # Conexión a un modelo
    return AzureChatOpenAI(
        api_version=require("CONF_API_VERSION"),
        azure_endpoint=require("CONF_AZURE_ENDPOINT"),
        openai_api_key =require("CONF_OPENAI_API_KEY"),
        azure_deployment=require("CONF_AZURE_DEPLOYMENT"),
    )


def obtenerBaseDeConocimiento(index_name: str) -> AzureAISearchRetriever:
    # Conexión a una base de conocimientos
    return AzureAISearchRetriever(
        service_name=require("CONF_AZURE_SEARCH_SERVICE_NAME"),
        api_key=require("CONF_AZURE_SEARCH_KEY"),
        index_name=index_name,
    )


# Función utilitaria para crear un agente
def crearChatbot(llm=None, contexto: str = "", baseDeConocimiento=None):

    memoria = ConversationBufferMemory(
        memory_key="chat_history",  # En el JSON, se creará siempre un parémtro con este nombre para guardar el historial del chat
        return_messages=True,
    )

    if contexto:
        memoria.chat_memory.add_message(SystemMessage(content=contexto)) # añadimos el contexto inicial al historial del chat

    # Creamos el agente
    chat = RetrievalQA.from_chain_type(
        llm=llm ,  # Modelo con el que trabajamos
        memory=memoria,  # Colocamos la memoria a corto plazo
        chain_type="stuff",  # Tipo de cadena que se usa para procesar los mensajes
        verbose=True,
        retriever = baseDeConocimiento
    )
    return chat

def ejecutarChatbot(prompt=None, agente=None) -> str :
    # Ejecutamos el agente
    respuesta = agente.invoke(prompt) # type: ignore

    # Lo devolvemos
    return respuesta["result"]