from flask import Flask, render_template, request, jsonify

from src.flow.FlowChatbot import *
from src.util import util_env as key
from src.util import util_bases_de_conocimiento as ubc
from src.util import util_audio as ua
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
    return jsonify({"respuesta": respuestaModelo})



if __name__ == '__main__':
    app.run(debug=True)