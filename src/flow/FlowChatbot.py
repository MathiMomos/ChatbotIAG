## #######################################################################################################
##
## @copyright Big Data Academy [info@bigdataacademy.org]
## @professor Alonso Melgarejo [alonsoraulmgs@gmail.com]
##
## #######################################################################################################

## ################q######################################################################################
## @section Configuración
## #######################################################################################################

# Importamos la configuración

## ################q######################################################################################
## @section Librerías
## #######################################################################################################

# Utilitario para definir un grafo de LangGraph
from src.util.util_llm import obtenerModeloModerno
from langgraph.graph import StateGraph

from src.util.util_bases_de_conocimiento import obtenerBaseDeConocimiento
from src.util.util_images import responderImagen, ajustarRespuestaImagen

# Utilitarios para llm
from src.util.util_llm import *

# Agente de Contexto
from src.agent.AgenteDeContexto import *

# Agente de Memoria a largo plazo
from src.agent.AgenteDeMemoriaLargoPlazo import *

# Agente de Chatbot
from src.agent.AgenteDeChatbot import *

# Agente de Análisis
from src.agent.AgenteDeAnalisis import *

## #######################################################################################################
## @section Clase
## #######################################################################################################


# Definición de clase
class FlowChatbot:

    # Instaciamos los objetos necesarios
    def __init__(self, archivoDeUsuario=None, basesDeConocimiento=None):
        # Creamos los objetos del flujo
        self.creacionDeObjetos(
            archivoDeUsuario=archivoDeUsuario, basesDeConocimiento=basesDeConocimiento
        )

        # Implementamos los nodos
        self.implementacionDeNodos()

        # Dibujamos el grafo
        self.dibujadoDeGrafo()

    # Crea los objetos para el flujo
    def creacionDeObjetos(self, archivoDeUsuario=None, basesDeConocimiento=None):
        # Guardamos los atributos
        self.archivoDeUsuario = archivoDeUsuario
        self.basesDeConocimiento = basesDeConocimiento

        # Creamos un agente de contexto
        self.agenteDeContexto = AgenteDeContexto(
            llm=obtenerModelo(),
            condiciones="""
        Como mínimo debe cumplirse TODAS estas condiciones a la vez:

        - Es un mensaje relacionado a lo que se esperaría en una conversación normal
        - Es un mensaje que no contiene palabras groseras o que se consideren faltas de respeto
        - Es un mensaje que tiene sentido y no es texto aleatorio sin significado (como: "asdasdasdhjlkasjdlkasjdlkajsdsadd", "qwerty123", "ajshdjahsdjas", etc.)
        - Es un mensaje escrito en un idioma reconocible (español, inglés, portugués.)
        - Es un mensaje que contiene palabras reales y no solo caracteres aleatorios o gibberish

      """,
        )

        # Creamos un agente de memoria a largo plazo
        self.agenteDeMemoriaLargoPlazo = AgenteDeMemoriaLargoPlazo(
            llm=obtenerModelo(),
            condiciones="""
        - El nombre del usuario
        - La edad del usuario
        - El sexo del usuario
      """,
        )

        # Leemos la base de conocimiento del usuario
        informacionDelUsuario = self.leerArchivo()

        # Creamos un agente de chatbot
        self.agenteDeChatbot = AgenteDeChatbot(
            llm=obtenerModelo(),
            basesDeConocimiento=basesDeConocimiento,
            contexto=f"""
        Eres un asistente que responde preguntas ÚNICAMENTE sobre la conferencia en una universidad de Brasil, 
        la conferencia se llama "IAG para la equidad social: Potencial y Barreras". Al contestar debes
        seguir las siguientes reglas ESTRICTAMENTE:

        1. SOLO puedes responder preguntas usando EXCLUSIVAMENTE la información de tu base de conocimiento
        2. Si el usuario pregunta algo que NO está en tu base de conocimiento, debes responder EXACTAMENTE: "Lo siento, no puedo responder esto 😔"
        3. NO inventes información, NO uses conocimiento general, SOLO usa lo que está almacenado en tu base de conocimiento
        4. Debes contestar en un lenguaje formal pero amigable
        5. Debes contestar en el lenguaje del usuario, por ejemplo, si el usuario escribe en español, debes responder en español
        6. Si la pregunta está relacionada con la conferencia pero no tienes información específica, responde: "Lo siento, no puedo responder esto 😔"
        7. Debes generar una imagen si un usuario dice explicitamente "Quiero una imagen" o "Quiero una imagen de algo"
        8. Debes entender que el usuario puede pedirte información sobre la conferencia, pero NO debes responder preguntas que no estén relacionadas con la conferencia
        9. Debes entender información con fallas ortográficas o errores gramaticales, pero siempre debes responder de manera clara y concisa
        IMPORTANTE: Tu función es ser un asistente especializado ÚNICAMENTE en esta conferencia. Si alguien pregunta sobre otros temas, 
        siempre responde: "Lo siento, no puedo responder esto 😔"

        También considera esta información del usuario:

        {informacionDelUsuario}
      """,
        )

        # Creamos el agente de analisis
        self.agenteDeAnalisis = AgenteDeAnalisis(
            llm=obtenerModelo(),
            descripcion="""
        Para un texto, si hay informacion que se contradicen entre sí
        trata de darle coherencia, quedandote con la información más reciente,
        dentro del texto. Sólo dame las lineas de este texto
        según las indicaciones que te di en la variable json "textoCoherente"
        Esta variable "textoCoherente" es del tipo "str", si ha varias líneas,
        sepáralas con un enter
      """,
        )

    # Implementamos los nodos
    def implementacionDeNodos(self):

        # Nodo de Agente de Contexto
        def node_a1_agenteDeContexto(state: dict) -> dict:
            # Definimos la salida
            output = state
            output["node_a1_agenteDeContexto"] = {}

            # Imprimimos un mensaje para saber en qué nodo estamos
            print("Ejecutando node_a1_agenteDeContexto...")

            # Obtenemos los parámetros
            prompt = state["prompt"]

            # Ejecutamos el agente
            respuesta = self.agenteDeContexto.enviarMensaje(prompt)

            # Construimos la salida
            output["node_a1_agenteDeContexto"] = respuesta

            # Devolvemos la salida
            return output

        # Nodo de prompt no valido
        def node_a2_promptNoValido(state: dict) -> dict:
            # Definimos la salida
            output = state
            output["output"] = {}

            # Imprimimos un mensaje para saber en qué nodo estamos
            print("Ejecutando node_a2_promptNoValido...")

            # Ejecutamos el agente
            respuesta = state["node_a1_agenteDeContexto"]["message"]

            # Construimos la salida
            output["output"]["respuesta"] = respuesta

            # Devolvemos la salida
            return output

        # Nodo de Agente de Memoria a Largo Plazo
        def node_a3_agenteDeMemoriaLargoPlazo(state: dict) -> dict:
            # Definimos la salida
            output = state
            output["node_a3_agenteDeMemoriaLargoPlazo"] = {}

            # Imprimimos un mensaje para saber en qué nodo estamos
            print("Ejecutando node_a3_agenteDeMemoriaLargoPlazo...")

            # Obtenemos los parámetros
            prompt = state["prompt"]

            # Ejecutamos el agente
            respuesta = self.agenteDeMemoriaLargoPlazo.ejecutar(prompt)

            # Construimos la salida
            output["node_a3_agenteDeMemoriaLargoPlazo"] = respuesta

            # Devolvemos la salida
            return output

        # Nodo de información por recordar
        def node_a4_informacionPorRecordar(state: dict) -> dict:
            # Definimos la salida
            output = state
            output["node_a4_informacionPorRecordar"] = {}

            # Imprimimos un mensaje para saber en qué nodo estamos
            print("Ejecutando node_a4_informacionPorRecordar...")

            # Obtenemos los parámetros
            informacionDelUsuario = self.leerArchivo()
            informacionPorRecordar = state["node_a3_agenteDeMemoriaLargoPlazo"][
                "informacion"
            ]

            # Combinamos la información
            informacionCombinada = informacionDelUsuario + "\n" + informacionPorRecordar

            # Damos coherencia a la información
            informacionCoherente = self.agenteDeAnalisis.ejecutar(informacionCombinada)

            # Escribimos la nueva información del usuario en su base de conocimiento
            self.escribirArchivo(informacionCoherente["textoCoherente"])

            # Devolvemos la salida
            return output

        # Nodo de Agente de Chatbot
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
            return output

        def node_a6_agenteDeImagenes(state: dict) -> dict:
            # Definimos la salida
            output = state

            # Imprimimos un mensaje para saber en qué nodo estamos
            print("Ejecutando node_a6_agenteDeImagenes...")

            # Obtenemos los parámetros
            contenido = state["output"]["respuesta"]
            contenido = ajustarRespuestaImagen(obtenerModeloModerno(),contenido)
            # Ejecutamos el agente de imágenes
            print("Respuesta del agente de imágenes:", contenido)
            respuesta = responderImagen(obtenerModeloImagen(), contenido)

            print(respuesta)

            # Construimos la salida
            output["output"]["imagen_url"] = respuesta
            print("Respuesta del agente de imágenes:", respuesta)
            # Devolvemos la salida
            return output

        # Construimos un grafo que recibe JSONs
        self.constructor = StateGraph(dict)

        # Agregamos los nodos dentro del grafo
        self.constructor.add_node("node_a1_agenteDeContexto", node_a1_agenteDeContexto)
        self.constructor.add_node("node_a2_promptNoValido", node_a2_promptNoValido)
        self.constructor.add_node(
            "node_a3_agenteDeMemoriaLargoPlazo", node_a3_agenteDeMemoriaLargoPlazo
        )
        self.constructor.add_node(
            "node_a4_informacionPorRecordar", node_a4_informacionPorRecordar
        )
        self.constructor.add_node("node_a5_agenteDeChatbot", node_a5_agenteDeChatbot)
        self.constructor.add_node("node_a6_agenteDeImagenes", node_a6_agenteDeImagenes)

    # Dibujamos el grafo
    def dibujadoDeGrafo(self):
        # Indicamos desde que nodo se inicia la ejecución del grafo
        self.constructor.set_entry_point("node_a1_agenteDeContexto")

        # Agregamos un flujo condicional
        self.constructor.add_conditional_edges(
            "node_a1_agenteDeContexto",
            lambda state: state["node_a1_agenteDeContexto"]["status"],
            {
                "PROMPT_VALIDO": "node_a3_agenteDeMemoriaLargoPlazo",
                "PROMPT_NO_VALIDO": "node_a2_promptNoValido",
            },
        )

        # Agregamos un flujo condicional
        self.constructor.add_conditional_edges(
            "node_a3_agenteDeMemoriaLargoPlazo",
            lambda state: state["node_a3_agenteDeMemoriaLargoPlazo"]["status"],
            {
                "INFORMACION_POR_RECORDAR": "node_a4_informacionPorRecordar",
                "NO_INFORMACION_POR_RECORDAR": "node_a5_agenteDeChatbot",
            },
        )

        # Conectamos un flujo secuencial
        self.constructor.add_edge(
            "node_a4_informacionPorRecordar", "node_a5_agenteDeChatbot"
        )
        self.constructor.add_conditional_edges(
            "node_a5_agenteDeChatbot",
            lambda state: state.get("imagen", False),
            {
                True: "node_a6_agenteDeImagenes",
                False: "__end__",  # Termina sin generar imagen
            },
        )
        # Indicamos los nodos en donde finaliza el grafo
        self.constructor.set_finish_point("node_a2_promptNoValido")
        self.constructor.set_finish_point("node_a5_agenteDeChatbot")
        self.constructor.set_finish_point("node_a6_agenteDeImagenes")

        # Construimos el grafo
        self.grafo = self.constructor.compile()

    def preparar_prompt(promptUsuario):
        if isinstance(promptUsuario, dict) and "tipo" in promptUsuario:
            # Ya viene en formato correcto
            return promptUsuario

        # Si el usuario envía simplemente un string, lo formateamos como texto
        return {"tipo": "texto", "contenido": promptUsuario}

    # Ejecución
    def ejecutar(self, prompt, base, imagen):

        # Ejecutamos el grafo
        respuesta = self.grafo.invoke(
            {"prompt": prompt, "base": base, "imagen": imagen}
        )

        # Devolvemos la respuesta
        return {
            "respuesta": respuesta["output"]["respuesta"],
            "imagen_url": respuesta["output"].get("imagen_url"),
        }

    # Lee el archivo de información del usuario
    def leerArchivo(self):
        contenido = ""

        try:
            with open(self.archivoDeUsuario, "r", encoding="utf-8") as archivo:
                contenido = archivo.read()
        except FileNotFoundError:
            contenido = "SIN INFORMACION ADICIONAL"

        return contenido

    # Escribe información sobre el usuario en su archivo
    def escribirArchivo(self, texto):
        with open(self.archivoDeUsuario, "w", encoding="utf-8") as archivo:
            archivo.write(texto + "\n")
