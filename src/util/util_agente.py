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

#Utilitario para convertir la estructura string a json
import json

#Utilitario para definir el tipo de agente
from langchain.agents.agent_types import AgentType

#Utilitario para crear agentes
from langchain.agents import initialize_agent

#Utilitario para crear la memoria a corto plazo del modelo
from langchain.memory import ConversationBufferMemory

## #######################################################################################################
## @section Funciones
## #######################################################################################################

#Función utilitaria para parsear
def parsearParametrosDeConsulta(
    input = None,
    parametrosNecesarios = None
):
  #Convertimos el input a un json navegable
  parametros = json.loads(input.replace("```json", "").replace("```", ""))

  #Retornamos los parámetros
  return parametros

#Función utilitaria para crear un agente
def crearAgenteSinMemoria(
    llm = None,
    tools = None
):

  #Creamos el agente
  agente = initialize_agent(
    llm = llm,
    tools = tools,
    agent = AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    handle_parsing_errors = True,
    verbose = True
  )

  #Lo devolvemos
  return agente

#Función utilitaria para crear un agente
def crearAgenteConMemoria(
    llm = None,
    tools = None
):

  #Creamos una memoria a corto plazo
  memoria = ConversationBufferMemory(
    memory_key = "chat_history", #En el JSON, se creará siempre un parámetro con este nombre para guardar el historial del chat
    return_messages = True
  )

  #Creamos el agente
  agente = initialize_agent(
    llm = llm,
    memory = memoria, #Colocamos la memoria a corto plazo
    tools = tools,
    agent = AgentType.CONVERSATIONAL_REACT_DESCRIPTION, #Tipo de agente que soporta memoria a corto plazo
    handle_parsing_errors = True,
    verbose = True
  )

  #Lo devolvemos
  return agente

#Utilitario para ejecutar un agente
def ejecutarAgente(
    prompt = None,
    agente = None
):
  #Ejecutamos el agente
  respuesta = agente.run(prompt)

  #Lo devolvemos
  return respuesta