from flask import Flask, render_template, request

from src.back.model import obtenerModelo, obtenerBaseDeConocimiento, crearChatbot, ejecutarChatbot

app = Flask(__name__)

# 2. Inicialización del chatbot (esto está bien)
modelo = obtenerModelo()
baseDeConocimiento = obtenerBaseDeConocimiento("dat")
chatbot = crearChatbot(
    llm=modelo,
    contexto="Eres un asistente que responde preguntas sobre datos.",
    baseDeConocimiento=baseDeConocimiento
)
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    promptUsuario = request.get_data(as_text=True)
    respuestaModelo = ejecutarChatbot(prompt=promptUsuario, agente=chatbot)
    return respuestaModelo


if __name__ == '__main__':
    app.run(debug=True)
