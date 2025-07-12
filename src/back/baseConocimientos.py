import os
from model import require
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
import uuid
from langchain.text_splitter import CharacterTextSplitter
from langchain.schema import Document
from azure.search.documents import SearchClient
import time
import shutil

# Función para obtener los archivos de una ruta
def obtenerArchivos(ruta=None):
    # Listamos el contenido de la carpeta
    os.listdir(ruta)

    # Acumulamos los archivos encontrados
    listaDeArchivos = []
    for elemento in os.listdir(ruta):
        rutaCompleta = os.path.join(ruta, elemento) # type: ignore

        # Solo añadimos si es archivo (no directorio)
        if os.path.isfile(rutaCompleta):
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

#Obtiene los chunks desde un texto leído
def obtenerChunks(
  contenido: str = ""
):
  #Creamos el documento con el texto que hemos extraido
  documento = [
    Document(page_content = contenido)
  ]

  #Definimos cómo se crearán los chunks del texto
  cortadorDeTexto = CharacterTextSplitter(
    separator = "\n", #Enter
    chunk_size = 1000,  #Tamaño de cada fragmento
    chunk_overlap = 100  #Superposición entre fragmentos
  )

  #Creamos los chunks
  chunks = cortadorDeTexto.split_documents(documento)

  #Información del documento que se almacena
  chunksConIdentificadores = []

  #Iteramos los chunks para darle la estructura
  for chunk in chunks:

    #Definimos la estructura del chunk que insertaremos con su identificador
    estructuraDeChunk = {
      "id": str(uuid.uuid4()),
      "content": chunk.page_content
    }

    #Lo agregamos al array
    chunksConIdentificadores.append(estructuraDeChunk)

  return chunksConIdentificadores

#Carga un archivo en una base de conocimiento
def cargarArchivo(
  rutaDeArchivo = None,
  nombreDeBaseDeConocimiento: str = "" 
):
  #Leemos el contenido del archivo
  contenido = leerContenidoDeDocumento(rutaDeArchivo)

  #Creamos los chunks
  chunks = obtenerChunks(contenido)

  #Nos conectamos a la base de conocimiento
  baseDeConocimiento = SearchClient(
    f"https://{require("CONF_AZURE_SEARCH_SERVICE_NAME")}.search.windows.net",
    nombreDeBaseDeConocimiento,
    AzureKeyCredential(require("CONF_AZURE_SEARCH_KEY"))
  )

  #Insertamos los chunks en la base de conocimiento
  resultadosDeInserciones = baseDeConocimiento.upload_documents(chunks)

  return resultadosDeInserciones

#Sincroniza los documentos de una ruta a una base de conocimiento
def sincronizarBaseDeConocimiento(
    carpeta: str = "",
    nombreDeBaseDeConocimiento: str = "",
    tiempoDeEspera: float = 0,
):
  #Bucle infinito
  while True:
    print("Ejecutando sincronizacion...")

    #Obtenemos los archivos de la ruta
    listaDeArchivos = obtenerArchivos(
      ruta = carpeta
    )
    print(f"Archivos encontrados: {listaDeArchivos}")
    #Verificamos si hay al menos 1 archivo
    if len(listaDeArchivos) >= 1:
      print(f"Se encontraron {len(listaDeArchivos)} archivos para sincronizar.")
      #Iteramos la lista de archivos
      for archivo in listaDeArchivos:
        print(f"Cargando archivo: {archivo}")

        try:
          #Cargamos el archivo
          resultadosDeInserciones = cargarArchivo(
            rutaDeArchivo = archivo,
            nombreDeBaseDeConocimiento = nombreDeBaseDeConocimiento
          )
          print(f"Resultados de inserción: {resultadosDeInserciones}")

          #Eliminamos el archivo
          os.remove(archivo)

        except Exception as e:
          print(f"Ocurrió un error al sincronizar: {e}")

          #Definimos la carpeta de "_errores"
          carpetaDeErrores = os.path.join(carpeta, "_errores/", str(uuid.uuid4())+"/")
          print(f"Moviendo archivo a carpeta de errores: {carpetaDeErrores}")

          #Creamos la carpeta de "_errores"
          os.makedirs(carpetaDeErrores)

          #Movemos el archivo a la carpeta errores
          shutil.move(archivo, carpetaDeErrores)

    #Esperamos antes de repetir el bucle
    time.sleep(tiempoDeEspera)