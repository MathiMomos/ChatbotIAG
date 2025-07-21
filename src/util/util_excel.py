import pandas as pd
import os
import uuid
from langchain.text_splitter import CharacterTextSplitter
from langchain.schema import Document
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from io import StringIO
import src.util.util_env as key  

def esArchivoExcel(rutaArchivo):
    extension = os.path.splitext(rutaArchivo)[1].lower()
    return extension in ['.xlsx', '.xls']

def cargarArchivoExcel(rutaDeArchivo, nombreDeBaseDeConocimiento):
    chunks = obtenerChunksDeExcelPorHoja(rutaDeArchivo)

    # Conectarse a la base de conocimiento
    baseDeConocimiento = SearchClient(
        f"https://{key.require('CONF_AZURE_SEARCH_SERVICE_NAME')}.search.windows.net",
        nombreDeBaseDeConocimiento,
        AzureKeyCredential(key.require("CONF_AZURE_SEARCH_KEY"))
    )

    # Asegura que los campos estén bien formateados
    chunks_limpios = [
        {
            "id": chunk["id"],
            "content": chunk["content"]
        }
        for chunk in chunks
    ]

    print(f"Cantidad de chunks a enviar: {len(chunks_limpios)}")

    # Subir los chunks
    resultados = baseDeConocimiento.upload_documents(chunks_limpios)
    return resultados

def obtenerHojasExcel(rutaArchivo):
    try:
        archivo_excel = pd.ExcelFile(rutaArchivo)
        return archivo_excel.sheet_names
    except Exception as e:
        raise Exception(f"No se pudo leer el archivo Excel: {str(e)}")

def detectar_fila_encabezado(rutaArchivo, hoja, max_filas=10):
    df_raw = pd.read_excel(rutaArchivo, sheet_name=hoja, header=None, nrows=max_filas)
    for idx, row in df_raw.iterrows():
        if row.notna().sum() >= 2:
            return idx
    return 0

def obtenerChunksDeHojaExcel(rutaArchivo, hojaSeleccionada):
    try:
        fila_encabezado = detectar_fila_encabezado(rutaArchivo, hojaSeleccionada)
        df = pd.read_excel(rutaArchivo, sheet_name=hojaSeleccionada, header=fila_encabezado)

        if df.empty:
            raise Exception(f"La hoja '{hojaSeleccionada}' está vacía o mal estructurada.")

        df = df.fillna("NULL")
        df.columns = [col.strip().replace("*", "").replace(" ", "_").lower() for col in df.columns]

        # Guardar encabezado como string separado
        encabezado = "|".join(df.columns)

        # Convertir el contenido a texto separado por línea (sin encabezado)
        buffer = StringIO()
        df.to_csv(buffer, index=False, sep="|", header=False)
        lineas = buffer.getvalue().splitlines()

        # Dividir las líneas en chunks de texto con límite de caracteres
        texto_completo = "\n".join(lineas)
        documento = [Document(page_content=texto_completo)]

        cortador = CharacterTextSplitter(
            separator="\n",
            chunk_size=1500,
            chunk_overlap=200
        )
        chunks = cortador.split_documents(documento)

        nombre_archivo = os.path.basename(rutaArchivo)
        info_origen = (
            f"INFORMACIÓN DE ORIGEN: Archivo: {nombre_archivo} | Hoja: {hojaSeleccionada}\n"
            f"Las columnas han sido separadas por '|'. Asegúrate de identificar correctamente los nombres de columnas.\n"
        )

        chunksConMetadatos = []
        for idx, chunk in enumerate(chunks):
            contenido_final = f"{info_origen}{encabezado}\n{chunk.page_content}"
            chunksConMetadatos.append({
                "id": str(uuid.uuid4()),
                "content": f"[CHUNK {idx + 1}]\n{contenido_final}"
            })

        return chunksConMetadatos

    except Exception as e:
        raise Exception(f"Error al procesar la hoja '{hojaSeleccionada}': {str(e)}")

def obtenerChunksDeExcelPorHoja(rutaArchivo):
    try:
        hojas = obtenerHojasExcel(rutaArchivo)
        todos_los_chunks = []

        for hoja in hojas:
            chunks_hoja = obtenerChunksDeHojaExcel(rutaArchivo, hoja)
            todos_los_chunks.extend(chunks_hoja)

        return todos_los_chunks

    except Exception as e:
        raise Exception(f"Error al procesar el archivo Excel completo: {str(e)}")
