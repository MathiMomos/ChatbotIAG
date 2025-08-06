## #######################################################################################################
##
## @copyright Big Data Academy [info@bigdataacademy.org]
## @professor Alonso Melgarejo [alonsoraulmgs@gmail.com]
##
## #######################################################################################################

## ################q######################################################################################
## @section Configuración
## #######################################################################################################

#Importamos la configuración

## ################q######################################################################################
## @section Librerías
## #######################################################################################################

#Utilitario para definir un grafo de LangGraph

from src.agent.AgenteDeContexto import AgenteDeContexto
from flask.globals import session
from langgraph.graph import StateGraph

from src.util.util_bases_de_conocimiento import obtenerBaseDeConocimiento
from src.util.util_images import responderImagen
#Utilitarios para llm
from src.util.util_llm import *

#Agente de Contexto
from src.agent.AgenteDeContexto import *

#Agente de Memoria a largo plazo
from src.agent.AgenteDeMemoriaLargoPlazo import *

#Agente de Chatbot
from src.agent.AgenteDeChatbot import *

#Agente de Análisis
from src.agent.AgenteDeAnalisis import *

from src.agent.AgenteDeDiagramas import *

from src.agent.AgenteDeResumen import *

from src.agent.AgenteDeSupervision import *
## #######################################################################################################
## @section Clase
## #######################################################################################################

#Definición de clase
class FlowChatbot:

  #Instaciamos los objetos necesarios
  def __init__(
    self, 
    archivoDeUsuario = None,
    basesDeConocimiento = None
  ):
    #Creamos los objetos del flujo
    self.creacionDeObjetos(
      archivoDeUsuario = archivoDeUsuario,
      basesDeConocimiento = basesDeConocimiento
    )

    #Implementamos los nodos
    self.implementacionDeNodos()

    #Dibujamos el grafo
    self.dibujadoDeGrafo()
  #Crea los objetos para el flujo
  def creacionDeObjetos(
    self, 
    archivoDeUsuario = None,
    basesDeConocimiento = None
  ):
     #Guardamos los atributos
    self.archivoDeUsuario = archivoDeUsuario
    self.basesDeConocimiento = basesDeConocimiento

    #Creamos un agente de contexto
    self.agenteDeContexto = AgenteDeContexto(
      llm = obtenerModelo(temperature=0.2),
      condiciones="""
        Como mínimo debe cumplirse TODAS estas condiciones a la vez:

        - Es un mensaje relacionado a lo que se esperaría en una conversación normal
        - Es un mensaje que no contiene palabras groseras o que se consideren faltas de respeto
        - Es un mensaje que tiene sentido y no es texto aleatorio sin significado (como: "asdasdasdhjlkasjdlkasjdlkajsdsadd", "qwerty123", "ajshdjahsdjas", etc.)
        - Es un mensaje escrito en un idioma reconocible (español, inglés, portugués.)
        - Es un mensaje que contiene palabras reales y no solo caracteres aleatorios o gibberish

      """
    )

    #Creamos un agente de memoria a largo plazo
    self.agenteDeMemoriaLargoPlazo = AgenteDeMemoriaLargoPlazo(
      llm = obtenerModelo(temperature=0.2),
      condiciones = """
        - El nombre del usuario
        - La edad del usuario
        - El sexo del usuario
      """
    )

    #Leemos la base de conocimiento del usuario
    informacionDelUsuario = self.leerArchivo()

    #Creamos un agente de chatbot
    self.agenteDeChatbot = AgenteDeChatbot(
      llm = obtenerModelo(),
      basesDeConocimiento = basesDeConocimiento,
      
      contexto=f"""
Eres un asistente que responde preguntas sobre la conferencia en una universidad de Brasil,
la conferencia se llama "IAG para la equidad social: Potencial y Barreras". Al contestar debes
seguir las siguientes reglas ESTRICTAMENTE:

1. SOLO puedes responder preguntas usando la información de tu base de conocimiento
2. Si el usuario pregunta algo que NO está en tu base de conocimiento, debes responder EXACTAMENTE: "Lo siento, no puedo responder esto 😔"
3. NO inventes información, NO uses conocimiento general, SOLO usa lo que está almacenado en tu base de conocimiento
4. Debes contestar en un lenguaje formal pero amigable
5. Debes contestar en el lenguaje del usuario, por ejemplo, si el usuario escribe en español, debes responder en español
6. Si la pregunta está relacionada con la conferencia pero no tienes información específica, responde: "Lo siento, no puedo responder esto 😔"
7. Debes entender que el usuario puede pedirte información sobre la conferencia, pero NO debes responder preguntas que no estén relacionadas con la conferencia
8. Debes entender información con fallas ortográficas o errores gramaticales, pero siempre debes responder de manera clara y concisa
9. Debes saber interpretar la pregunta del usuario y responder de manera precisa, sin divagar o dar información innecesaria

IMPORTANTE PARA INTERPRETACIÓN:
- "IAG" se refiere a "Inteligencia Artificial Generativa"
- "IA" puede referirse a "Inteligencia Artificial" 
- Preguntas como "¿qué es la IAG?" buscan definición de Inteligencia Artificial Generativa
- Debes buscar en tu base de conocimiento información relacionada con estos términos
- Si encuentras información sobre Inteligencia Artificial Generativa en tu base de conocimiento, úsala para responder sobre "IAG"

EJEMPLOS DE INTERPRETACIÓN CORRECTA:
- Usuario: "¿qué es la IAG?" → Buscar: información sobre Inteligencia Artificial Generativa
- Usuario: "¿cuál es el tema de la conferencia?" → Buscar: información sobre el tema principal
- Usuario: "¿quiénes son los ponentes?" → Buscar: información sobre speakers o conferencistas

Tu función es ser un asistente especializado ÚNICAMENTE en esta conferencia. Si alguien pregunta sobre otros temas,
siempre responde: "Lo siento, no puedo responder esto 😔"

También considera esta información del usuario:
{informacionDelUsuario}
"""
    )

    #Creamos el agente de analisis
    self.agenteDeAnalisis = AgenteDeAnalisis(
      llm = obtenerModelo(temperature=0.2),
      descripcion = """
        Para un texto, si hay informacion que se contradicen entre sí
        trata de darle coherencia, quedandote con la información más reciente,
        dentro del texto. Sólo dame las lineas de este texto
        según las indicaciones que te di en la variable json "textoCoherente"
        Esta variable "textoCoherente" es del tipo "str", si ha varias líneas,
        sepáralas con un enter
      """
    )

    self.agenteDeDiagramas = AgenteDeDiagramas(
      llm = obtenerModelo()
    )

    self.agenteDeResumen = AgenteDeResumen(
      llm = obtenerModelo()
    )
    
    self.agenteSupervisor = AgenteSupervisor(
      llm = obtenerModelo(temperature=0)
    )
  #Implementamos los nodos
  def implementacionDeNodos(self):


      
    #Nodo de Agente de Contexto
    def node_a1_agenteDeContexto(state: dict) -> dict:
      #Definimos la salida
      output = state
      output["node_a1_agenteDeContexto"] = {}

      #Imprimimos un mensaje para saber en qué nodo estamos
      print("Ejecutando node_a1_agenteDeContexto...")

      #Obtenemos los parámetros
      prompt = state["prompt"]

      #Ejecutamos el agente
      respuesta = self.agenteDeContexto.enviarMensaje(prompt)

      #Construimos la salida
      output["node_a1_agenteDeContexto"] = respuesta

      #Devolvemos la salida
      print(state)
      return output
    
    #Nodo de prompt no valido
    def node_a2_promptNoValido(state: dict) -> dict:
      #Definimos la salida
      output = state
      output["output"] = {}

      #Imprimimos un mensaje para saber en qué nodo estamos
      print("Ejecutando node_a2_promptNoValido...")

      #Ejecutamos el agente
      respuesta = state["node_a1_agenteDeContexto"]["message"]

      #Construimos la salida
      output["output"]["respuesta"] = respuesta

      #Devolvemos la salida
      print(state)
      return output
    
    #Nodo de Agente de Memoria a Largo Plazo
    def node_a3_agenteDeMemoriaLargoPlazo(state: dict) -> dict:
      #Definimos la salida
      output = state
      output["node_a3_agenteDeMemoriaLargoPlazo"] = {}

      #Imprimimos un mensaje para saber en qué nodo estamos
      print("Ejecutando node_a3_agenteDeMemoriaLargoPlazo...")

      #Obtenemos los parámetros
      prompt = state["prompt"]

      #Ejecutamos el agente
      respuesta = self.agenteDeMemoriaLargoPlazo.ejecutar(prompt)

      #Construimos la salida
      output["node_a3_agenteDeMemoriaLargoPlazo"] = respuesta

      #Devolvemos la salida
      print(state)
      return output
    
    #Nodo de información por recordar
    def node_a4_informacionPorRecordar(state: dict) -> dict:
      #Definimos la salida
      output = state
      output["node_a4_informacionPorRecordar"] = {}

      #Imprimimos un mensaje para saber en qué nodo estamos
      print("Ejecutando node_a4_informacionPorRecordar...")

      #Obtenemos los parámetros
      informacionDelUsuario = self.leerArchivo()
      informacionPorRecordar = state["node_a3_agenteDeMemoriaLargoPlazo"]["informacion"]

      #Combinamos la información
      informacionCombinada = informacionDelUsuario + "\n" + informacionPorRecordar

      #Damos coherencia a la información
      informacionCoherente = self.agenteDeAnalisis.ejecutar(informacionCombinada)

      #Escribimos la nueva información del usuario en su base de conocimiento
      self.escribirArchivo(informacionCoherente["textoCoherente"])

      #Devolvemos la salida
      print(state)
      return output

    def node_router(state: dict) -> dict:
      mensaje = state["prompt"]["contenido"]
      print   ("Ejecutando node_router...")
      accion = self.agenteSupervisor.clasificar(mensaje)
      salida = dict(state)
      salida["accion"] = accion
      return salida
    
    #Nodo de Agente de Chatbot
    def node_a5_agenteDeChatbot(state: dict) -> dict:
    # Definimos la salida
      output = state
      output["output"] = {}

      # Imprimimos un mensaje para saber en qué nodo estamos
      print("Ejecutando node_a5_agenteDeChatbot...")

      # Obtenemos los parámetros
      contenido = state["prompt"]["contenido"]
      base = state["base"]

      # Ejecutamos el agente
      respuesta = self.agenteDeChatbot.enviarMensaje(contenido, base)

      # Construimos la salida
      output["output"]["respuesta"] = respuesta

      # Devolvemos la salida
      print(state)
      return output

    def node_a6_agenteDeResumen(state: dict) -> dict:
      output = state
      output["output"] = {}
      
      print ("Ejecutando node_a6_agenteDeResumen...")
      historial = self.agenteDeChatbot.chat_sin_kb.memory.chat_memory.messages
      resumen = self.agenteDeResumen.resumir(historial)
      output["output"]["respuesta"] = resumen
      
      print (state)
      return output
    
        
    #Construimos un grafo que recibe JSONs
    self.constructor = StateGraph(dict)

    #Agregamos los nodos dentro del grafo
    self.constructor.add_node("node_router", node_router)
    self.constructor.add_node("node_a1_agenteDeContexto", node_a1_agenteDeContexto)
    self.constructor.add_node("node_a2_promptNoValido", node_a2_promptNoValido)
    self.constructor.add_node("node_a3_agenteDeMemoriaLargoPlazo", node_a3_agenteDeMemoriaLargoPlazo)
    self.constructor.add_node("node_a4_informacionPorRecordar", node_a4_informacionPorRecordar)
    self.constructor.add_node("node_a5_agenteDeChatbot", node_a5_agenteDeChatbot)
    self.constructor.add_node("node_a6_agenteDeResumen", node_a6_agenteDeResumen)
    #self.constructor.add_node("node_a6_agenteDeImagenes", node_a6_agenteDeImagenes)
    #self.constructor.add_node("node_a7_agenteDeDiagramas", node_a7_agentedeDiagramas)

  #Dibujamos el grafo
  def dibujadoDeGrafo(self):
    #Indicamos desde que nodo se inicia la ejecución del grafo
    self.constructor.set_entry_point("node_a1_agenteDeContexto")

    #Agregamos un flujo condicional
    self.constructor.add_conditional_edges("node_a1_agenteDeContexto", lambda state: state["node_a1_agenteDeContexto"]["status"], {
        "PROMPT_VALIDO": "node_a3_agenteDeMemoriaLargoPlazo",
        "PROMPT_NO_VALIDO": "node_a2_promptNoValido"
    })

    #Agregamos un flujo condicional
    self.constructor.add_conditional_edges("node_a3_agenteDeMemoriaLargoPlazo", lambda state: state["node_a3_agenteDeMemoriaLargoPlazo"]["status"], {
        "INFORMACION_POR_RECORDAR": "node_a4_informacionPorRecordar",
        "NO_INFORMACION_POR_RECORDAR": "node_router"
    })

    #Conectamos un flujo secuencial
    self.constructor.add_edge("node_a4_informacionPorRecordar", "node_router")
    #self.constructor.add_edge("node_a5_agenteDeChatbot", "node_a7_agenteDeDiagramas")
    self.constructor.add_conditional_edges("node_router", lambda state: state["accion"], {
        "RESUMEN": "node_a6_agenteDeResumen",
        "CHAT": "node_a5_agenteDeChatbot"
    })
    #Indicamos los nodos en donde finaliza el grafo
    self.constructor.set_finish_point("node_a2_promptNoValido")
    self.constructor.set_finish_point("node_a5_agenteDeChatbot")
    self.constructor.set_finish_point("node_a6_agenteDeResumen")
    #Construimos el grafo
    self.grafo = self.constructor.compile()

  def preparar_prompt(promptUsuario):
    if isinstance(promptUsuario, dict) and "tipo" in promptUsuario:
        # Ya viene en formato correcto
        return promptUsuario
    
    # Si el usuario envía simplemente un string, lo formateamos como texto
    return {
        "tipo": "texto",
        "contenido": promptUsuario
    }
  
  #Ejecución
  def ejecutar(self, prompt, base, config = None):
  
    #Ejecutamos el grafo
    respuesta = self.grafo.invoke(
      {"prompt": prompt, "base": base},
      config = config
    )

    #Devolvemos la respuesta
    return respuesta["output"]["respuesta"]

  #Lee el archivo de información del usuario
  def leerArchivo(self):
    contenido = ""

    try:
      with open(self.archivoDeUsuario, 'r', encoding='utf-8') as archivo:
        contenido = archivo.read()
    except FileNotFoundError:
      contenido = "SIN INFORMACION ADICIONAL"

    return contenido
  
  #Escribe información sobre el usuario en su archivo
  def escribirArchivo(self, texto):
      with open(self.archivoDeUsuario, 'w', encoding='utf-8') as archivo:
          archivo.write(texto + '\n')
  
  def reiniciar_memoria_del_chatbot(self):
        """Pasa la orden de reinicio al agente de chatbot."""
        print("Reiniciando la memoria del chatbot...")
        if hasattr(self, 'agenteDeChatbot'):
            self.agenteDeChatbot.reiniciar_memoria()