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

#Utilitario de conexión a Azure OpenAI
from langchain_openai import AzureChatOpenAI

## #######################################################################################################
## @section Funciones
## #######################################################################################################

#Obtiene el modelo con el que trabajamos
def obtenerModelo():
  #Conexión a un modelo
  llm = AzureChatOpenAI(
      api_version = key.require("CONF_API_VERSION"),
      azure_endpoint = key.require("CONF_AZURE_ENDPOINT"),
      openai_api_key = key.require("CONF_OPENAI_API_KEY"),
      azure_deployment = key.require("CONF_AZURE_DEPLOYMENT")
  )

  return llm