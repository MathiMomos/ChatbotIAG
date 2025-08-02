from flask import Flask, render_template, request, jsonify

from src.flow.FlowChatbot import *
from src.util import util_env as key
from src.util import util_bases_de_conocimiento as ubc
from src.util import util_audio as ua
from src.util import util_llm
from src.util import util_images
from src.util import util_diagrams
app = Flask(__name__)

chatbot = FlowChatbot(
    archivoDeUsuario=key.require("ARCHIVO_USUARIO_DIR"),
    basesDeConocimiento=ubc.obtenerBaseDeConocimiento(),
)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    # 1. Recibe los datos como JSON
    datos = request.get_json()
    
    promptUsuario = datos.get('prompt')
    usarBase = datos.get('usar_base')
    tipo = promptUsuario.get('tipo')
    imagen  = datos.get("imagen", False)
    if tipo == 'audio':
        promptUsuario = {
            "tipo": "texto",
            "contenido": ua.transcribir_audio_base64_a_texto(promptUsuario["contenido"])
            }
    else:
        promptUsuario = {
            "tipo": "texto",
            "contenido": promptUsuario["contenido"]
            }
    print("FLASK ENVIA AL FLUJO:", promptUsuario)



    # 3. Ejecuta el flujo y devuelve la respuesta
    respuestaModelo = chatbot.ejecutar(prompt=promptUsuario, base=usarBase)
    print("DEBUG ▶︎ Salida del grafo:", respuestaModelo)          
    print("DEBUG ▶︎ Tipo:", type(respuestaModelo))
    return jsonify({"respuesta": respuestaModelo})

@app.route('/image', methods=['POST'])
def image():
    datos = request.get_json()
    prompt = datos.get('prompt')
    llm = util_llm.obtenerModeloImagen()
    url_imagen = util_images.responderImagen(llm, prompt)

    return jsonify({"contenido": "imagen", "valor": url_imagen})

@app.route('/diagram', methods=['POST'])
def diagram():
    datos = request.get_json()
    prompt = datos.get('prompt')
    json_diagrama = util_diagrams.generar_json_diagrama(prompt)

    return jsonify({"contenido": "diagrama", "valor": json_diagrama})


if __name__ == '__main__':
    app.run(debug=True)