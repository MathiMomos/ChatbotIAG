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

#Utilitario para chatear conectarse a una base de conocimientos
from langchain.retrievers import AzureCognitiveSearchRetriever

## #######################################################################################################
## @section Funciones
## #######################################################################################################

#Obtiene una base de conocimiento
def obtenerBaseDeConocimiento(
    identificador = "test"
):
  #Conexión a una base de conocimientos
  baseDeConocimiento = AzureCognitiveSearchRetriever(
    service_name = key.require("CONF_AZURE_SEARCH_SERVICE_NAME"),
    api_key = key.require("CONF_AZURE_SEARCH_KEY"),
    index_name = identificador
  )

  return baseDeConocimiento