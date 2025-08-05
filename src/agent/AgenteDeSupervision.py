import json
from langchain_core.prompts.prompt import PromptTemplate

class AgenteSupervisor:
    """
    Clasifica la intención del usuario.
    Devuelve un JSON con una clave "accion" cuyo valor puede ser "RESUMEN" o "CHAT".
    """
    def __init__(self, llm):
        self.llm = llm
        self.prompt = PromptTemplate.from_template("""
        Eres un asistente que clasifica la intención de la solicitud del usuario.

        Si el usuario pide un resumen de la conversación (por ejemplo: "resumen", "resume la conversación",
        "de qué hemos hablado", "qué dije antes"), responde sólo con:
        {{ "accion": "RESUMEN" }}

        En cualquier otro caso, responde sólo con:
        {{ "accion": "CHAT" }}

        Solicitud del usuario:
        {mensaje}
        """)
    
    def clasificar(self, mensaje: str) -> str:
        consulta = self.prompt.format(mensaje=mensaje)
        respuesta = self.llm.invoke(consulta).content
        # limpiamos comillas o posibles formato triple backtick
        respuesta = respuesta.replace("```json", "").replace("```", "").strip()
        return json.loads(respuesta)["accion"]