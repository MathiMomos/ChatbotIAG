from typing import List
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain.schema import StrOutputParser


class AgenteDeResumen:
    def __init__(self, llm=None):
        plantilla_prompt = """
Eres un asistente conversacional que ayuda a los usuarios a entender de qué trataron sus conversaciones previas con una IA.

A partir del siguiente historial de conversación entre un Humano y una IA:

1. Menciona cuál fue la primera pregunta del usuario.
2. Resume brevemente la respuesta que dio la IA.
3. Resume de manera clara y directa el resto de los temas tratados.
4. Usa un tono conversacional y empático. Comienza el resumen con: "Tu primera pregunta fue sobre..."

HISTORIAL DE LA CONVERSACIÓN:
{historial}

RESUMEN:
"""

        prompt: PromptTemplate = PromptTemplate(
            template=plantilla_prompt,
            input_variables=["historial"],
        )
        # Encadenamos el prompt → LLM → parser para obtener sólo el texto
        self.cadena = prompt | llm | StrOutputParser()

    def resumir(self, historial_chat: List[BaseMessage]) -> str:
        if not historial_chat or len(historial_chat) < 2:
            return "No hay suficiente conversación para realizar un resumen."

        # Convertimos la lista de mensajes en texto plano
        lineas: list[str] = []
        for mensaje in historial_chat:
            if isinstance(mensaje, HumanMessage):
                lineas.append(f"Humano: {mensaje.content}")
            elif isinstance(mensaje, AIMessage):
                lineas.append(f"IA: {mensaje.content}")
        historial_formateado = "\n".join(lineas)

        # Ejecutamos la cadena pasándole el historial
        resumen = self.cadena.invoke({"historial": historial_formateado})
        return resumen
