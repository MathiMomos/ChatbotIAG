from src.util.util_chat import *


class AgenteDeChatbot:

    def __init__(self, llm=None, contexto=None, basesDeConocimiento=None):
        self.llm = llm
        self.contexto = contexto
        self.basesDeConocimiento = basesDeConocimiento

        # Creamos la sesión de chat que potencialmente puede usar la base de conocimientos
        if self.basesDeConocimiento:
            self.chat_con_kb = abrirSesionDeChatConBaseDeConocimiento(
                llm=self.llm,
                contexto=self.contexto,
                basesDeConocimiento=self.basesDeConocimiento,
            )

        # Siempre creamos una sesión de chat simple como respaldo
        self.chat_sin_kb = abrirSesionDeChat(llm=self.llm, contexto=self.contexto)

    # El metodo ahora acepta el booleano para tomar la decisión
    def enviarMensaje(self, prompt=None, base=False):
        respuesta = ""

        # Lógica dinámica: decide qué metodo de envío usar
        if base and self.basesDeConocimiento is not None:
            print("--- AgenteDeChatbot: Usando la Base de Conocimientos ---")
            respuesta = enviarMensajeEnChatConBaseDeConocimiento(
                chat=self.chat_con_kb, mensaje=prompt
            )
        else:
            print("--- AgenteDeChatbot: Omitiendo la Base de Conocimientos ---")
            respuesta = enviarMensaje(chat=self.chat_sin_kb, mensaje=prompt)

        return respuesta