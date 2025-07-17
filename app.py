from flask import Flask, render_template, request

from src.flow.FlowChatbot import *
from src.util import util_env as key

GLOBAL_FLOW_CHATBOT = FlowChatbot(archivoDeUsuario = key.require("ARCHIVO_USUARIO_DIR"))

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    promptUsuario = request.get_data(as_text=True)
    respuestaModelo = GLOBAL_FLOW_CHATBOT.ejecutar(prompt=promptUsuario)
    return respuestaModelo


if __name__ == '__main__':
    app.run(debug=True)
