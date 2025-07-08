import os
from model import require
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential

# Función para obtener los archivos de una ruta
def obtenerArchivos(ruta=None):
    # Listamos el contenido de la carpeta
    os.listdir(ruta)

    # Acumulamos los archivos encontrados
    listaDeArchivos = []

    # Bucle para verificar si el elemento es un archivo
    for elemento in os.listdir("/content"):

        # Verificamos si el elemento es un archivo y no un directorio
        if os.path.isfile(elemento) == True:

            # Definimos la ruta completa
            rutaCompleta = os.path.join("/content", elemento)

            # Agregamos el archivo
            listaDeArchivos.append(rutaCompleta)

    return listaDeArchivos


# Extrae el contenido de un archivo
def leerContenidoDeDocumento(rutaArchivo):

    # Nos conectamos al servicio
    servicio = DocumentAnalysisClient(
        require("CONF_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"),
        AzureKeyCredential(require("CONF_AZURE_DOCUMENT_INTELLIGENCE_KEY")),
    )

    # Abrimos el documento que queremos analizar
    with open(rutaArchivo, "rb") as archivo:

        # Damos la instruccion de lectura
        instruccion = servicio.begin_analyze_document("prebuilt-read", archivo)

        # Ejecutamos la instruccion para leer
        resultado = instruccion.result()

    # Acumulador del contenido del archivo
    contenido = ""

    # Iteramos cada página leida
    for pagina in resultado.pages:

        # Iteramos cada linea para cada página
        for linea in pagina.lines:

            # Acumulamos el contenido
            contenido = contenido + linea.content + "\n"

    return contenido