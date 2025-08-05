from langchain.memory.buffer import ConversationBufferMemory
from openai.types.beta.realtime.conversation_created_event import Conversation
from src.util.util_chat import *


class AgenteDeChatbot:

    def __init__(self, llm=None, contexto: str="", basesDeConocimiento=None):
        self.llm = llm
        self.contexto = contexto
        self.basesDeConocimiento = basesDeConocimiento

        self.memoria = ConversationBufferMemory(
            memory_key="history",
            return_messages=True,
        )
        # Creamos la sesión de chat que potencialmente puede usar la base de conocimientos
        if self.basesDeConocimiento:
            self.chat_con_kb = abrirSesionDeChatConBaseDeConocimiento(
                llm=self.llm,
                contexto=self.contexto,
                basesDeConocimiento=self.basesDeConocimiento,
                memoria = self.memoria
            )

        # Siempre creamos una sesión de chat simple como respaldo
        self.chat_sin_kb = abrirSesionDeChat(llm=self.llm, contexto=self.contexto, memoria = self.memoria)

    def reiniciar_memoria(self):
        """
        Limpia explícitamente la memoria de ambos historiales de chat.
        """
        if hasattr(self, 'chat_con_kb') and self.chat_con_kb.memory:
            self.chat_con_kb.memory.clear()  
        
        if hasattr(self, 'chat_sin_kb') and self.chat_sin_kb.memory:
            self.chat_sin_kb.memory.clear()
            
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