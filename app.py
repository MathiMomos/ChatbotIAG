import os

from flask import Flask, render_template, request, jsonify

from src.flow.FlowChatbot import *
from src.util import util_env as key
from src.util import util_bases_de_conocimiento as ubc
from src.util import util_audio as ua
from src.util import util_llm
from src.util import util_images
from src.util import util_diagrams
from src.util import util_charts
from src.util import util_images as ui

app = Flask(__name__)

chatbot = FlowChatbot(
    archivoDeUsuario=key.require("ARCHIVO_USUARIO_DIR"),
    basesDeConocimiento=ubc.obtenerBaseDeConocimiento(),
)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    # 1. Recibe los datos como JSON
    datos = request.get_json()

    promptUsuario = datos.get("prompt")
    usarBase = datos.get("usar_base")
    tipo = promptUsuario.get("tipo")
    imagen = datos.get("imagen", False)
    if tipo == "audio":
        promptUsuario = {
            "tipo": "texto",
            "contenido": ua.transcribir_audio_base64_a_texto(
                promptUsuario["contenido"]
            ),
        }
    else:
        promptUsuario = {"tipo": "texto", "contenido": promptUsuario["contenido"]}
    print("FLASK ENVIA AL FLUJO:", promptUsuario)

    # 3. Ejecuta el flujo y devuelve la respuesta
    respuestaModelo = chatbot.ejecutar(prompt=promptUsuario, base=usarBase)
    print("DEBUG ▶︎ Salida del grafo:", respuestaModelo)
    print("DEBUG ▶︎ Tipo:", type(respuestaModelo))
    return jsonify({"respuesta": respuestaModelo})


@app.route("/imagen", methods=["POST"])
def image():
    """Genera una imagen a partir del output del prompt.

    Returns:
        _type_: JSON con la URL de la imagen generada.
    """
    try:
        datos = request.get_json()
        prompt = datos.get("prompt")
        if not prompt:
            return (
                jsonify({"error": "No se proporcionó texto para generar la imagen"}),
                400,
            )
        promptImagen = ui.ajustarRespuestaImagen(obtenerModeloModerno(), prompt)
        print("DEBUG ▶︎ Prompt ajustado para imagen:", promptImagen)
        
        urlImagen = ui.responderImagen(obtenerModeloImagen(), promptImagen)
        return jsonify({"url": urlImagen})
    except Exception as e:
        return jsonify({"error": "Error al procesar la solicitud de imagen."}), 400


@app.route("/diagram", methods=["POST"])
def diagram():
    try:
        datos = request.get_json()
        prompt = datos.get("prompt")
        
        if not prompt:
            return jsonify({"error": "No se proporcionó un prompt"}), 400
            
        json_diagrama = util_diagrams.generar_json_diagrama(prompt)
        
        return jsonify({"contenido": "diagrama", "valor": json_diagrama})
    except Exception as e:
        print(f"Error en endpoint diagram: {e}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500


@app.route("/chart", methods=["POST"])
def chart():
    try:
        datos = request.get_json()
        prompt = datos.get("prompt")
        
        if not prompt:
            return jsonify({"error": "No se proporcionó un prompt"}), 400
            
        chart_resultado = util_charts.generar_chart_estadistico(prompt)
        
        return jsonify({"contenido": "chart", "valor": chart_resultado})
    except Exception as e:
        print(f"Error en endpoint chart: {e}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host="0.0.0.0", port=port)
