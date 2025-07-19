from flask import Flask, render_template, request, jsonify

from src.flow.FlowChatbot import *
from src.util import util_env as key
from src.util import util_bases_de_conocimiento as ubc
from src.util import util_audio as ua
app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    # 1. Recibe los datos como JSON
    datos = request.get_json()
    
    promptUsuario = datos.get('prompt')
    tipo = promptUsuario.get('tipo')
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
    usar_base = datos.get('usar_base', False) # Recibe el estado del foco

    chatbot = None

    # 2. Decide cómo instanciar el chatbot
    if usar_base:
        print("INFO: Creando chatbot CON base de conocimiento.")
        chatbot = FlowChatbot(
            archivoDeUsuario = key.require("ARCHIVO_USUARIO_DIR"),
            basesDeConocimiento=ubc.obtenerBaseDeConocimiento(),
        )
    else:
        print("INFO: Creando chatbot SIN base de conocimiento.")
        chatbot = FlowChatbot(
            archivoDeUsuario = key.require("ARCHIVO_USUARIO_DIR")
        )

    # 3. Ejecuta el flujo y devuelve la respuesta
    respuestaModelo = chatbot.ejecutar(prompt=promptUsuario)
    return jsonify({"respuesta": respuestaModelo})



if __name__ == '__main__':
    app.run(debug=True)