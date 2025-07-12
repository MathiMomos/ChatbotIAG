from baseConocimientos import sincronizarBaseDeConocimiento
from model import require
# sincronizarBaseDeConocimiento(
#    carpeta = require(r"ARCHIVOS_DIR"),
#    nombreDeBaseDeConocimiento = "dat",
#    tiempoDeEspera = 5
#)

from model import obtenerModelo, obtenerBaseDeConocimiento, crearChatbot, ejecutarChatbot

# Obtenemos el modelo
modelo = obtenerModelo()
# Obtenemos la base de conocimiento
baseDeConocimiento = obtenerBaseDeConocimiento("dat")
# Creamos el chatbot
chatbot = crearChatbot(
    llm=modelo,  # type: ignore
    contexto="Eres un asistente que responde preguntas sobre datos.",
    baseDeConocimiento=baseDeConocimiento
)

# Ejemplo de uso del chatbot
respuesta = ejecutarChatbot(prompt="¿Qué es un DataFrame?", agente=chatbot)
print(respuesta)