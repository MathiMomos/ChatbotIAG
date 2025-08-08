import os

from flask import Flask, render_template, request, jsonify

from src.flow.FlowChatbot import *
from src.util import util_env as key
from src.util import util_bases_de_conocimiento as ubc
from src.util import util_audio as ua
from src.util import util_llm
from src.util import util_diagrams
from src.util import util_charts
from src.util import util_brief
from src.util import util_images as ui
from src.util import util_app
from flask import session
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.runnables.config import RunnableConfig
import uuid

app = Flask(__name__)
app.secret_key = os.urandom(24)

chatbot: FlowChatbot = FlowChatbot(
    archivoDeUsuario=key.require("ARCHIVO_USUARIO_DIR"),
    basesDeConocimiento=ubc.obtenerBaseDeConocimiento(),
)

chatbot.grafo = chatbot.constructor.compile(checkpointer=InMemorySaver())


@app.before_request
def ensureThread():
    if "thread_id" not in session:
        session["thread_id"] = str(uuid.uuid4())


@app.route("/")
def home():
    chatbot.reiniciar_memoria_del_chatbot()
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    # 1. Recibe los datos como JSON
    datos = request.get_json()
    promptUsuario = util_app.obtener_prompt(datos)
    usarBase = datos.get("usar_base")
    tipo = promptUsuario.get("tipo")
    contenido = datos.get("prompt", {}).get("contenido", "")
    if tipo == "audio":
        contenido = ua.transcribir_audio_base64_a_texto(contenido)
    promptUsuario = {"tipo": "texto", "contenido": contenido}
    print("FLASK ENVIA AL FLUJO:", promptUsuario)

    # 3. Ejecuta el flujo y devuelve la respuesta
    config: RunnableConfig = {"configurable": {"thread_id": session["thread_id"]}}
    try:
        respuestaModelo = chatbot.ejecutar(
            prompt=promptUsuario, base=usarBase, config=config
        )
        state = chatbot.grafo.get_state(config)
    except Exception as e:
        return jsonify({"error": f"Error al procesar la solicitud. {str(e)}"}), 500
    print("DEBUG ▶︎ Salida del grafo:", respuestaModelo)
    return jsonify(respuestaModelo)


@app.route("/imagen", methods=["POST"])
def image():
    """Genera una imagen a partir del output del prompt.

    Returns:
        _type_: JSON con la URL de la imagen generada.
    """
    try:
        datos = request.get_json()
        prompt = util_app.obtener_prompt(datos)
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
        prompt = util_app.obtener_prompt(datos)
        json_diagrama = util_diagrams.generar_json_diagrama(prompt)

        return jsonify({"contenido": "diagrama", "valor": json_diagrama})
    except Exception as e:
        print(f"Error en endpoint diagram: {e}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500


@app.route("/chart", methods=["POST"])
def chart():
    try:
        datos = request.get_json()
        prompt = util_app.obtener_prompt(datos)
        chart_resultado = util_charts.generar_chart_estadistico(prompt)

        return jsonify({"contenido": "chart", "valor": chart_resultado})
    except Exception as e:
        print(f"Error en endpoint chart: {e}")
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500


@app.route("/audio", methods=["POST"])
def audio():
    try:
        datos = request.get_json()
        prompt = util_app.obtener_prompt(datos)
        lan: str = ua.detectar_lenguaje(prompt, util_llm.obtenerModeloModerno())
        audio_base64: str | None = ua.texto_a_voz(prompt, voice=lan)

        if audio_base64 is None:
            return jsonify({"error": "No se pudo sintetizar el texto a voz"}), 500

        return jsonify({"contenido": "audio", "valor": audio_base64})
    except Exception as e:
        return jsonify({"error": f"Error interno del servidor: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True)
