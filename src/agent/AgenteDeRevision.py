import json
from langchain_core.prompts.prompt import PromptTemplate

class AgenteDeRevision:
    """
    Clasifica la intención del usuario.
    Devuelve un JSON con una clave "accion" cuyo valor puede ser "RESUMEN" o "CHAT".
    """
    def __init__(self, llm):
        self.llm = llm
        self.prompt = PromptTemplate.from_template("""
        Eres un agente de IA experto en comunicación que actúa como un primer filtro. Tu única tarea es analizar la solicitud del usuario y clasificar si es un texto válido y con suficiente sustancia para generar un brief (un resumen conciso).
        
        Reglas de clasificación:
        
        1.  Si la solicitud del usuario es un texto sustancial que contiene ideas, descripciones, instrucciones, un plan o cualquier cuerpo de información que pueda ser resumido, responde únicamente con:
            {{ "validacion": "BRIEF" }}
        
        2.  Si la solicitud es muy corta (menos de 50 caracteres), un saludo (ej: "hola", "buenos días"), una despedida (ej: "adiós"), una pregunta simple (ej: "¿cómo estás?", "¿puedes ayudarme?"), un agradecimiento (ej: "gracias"), una frase sin sentido, o cualquier interacción conversacional que no contenga material para resumir, responde únicamente con:
            {{ "validacion": "NO_BRIEF" }}
        
        Importante: No debes añadir ninguna explicación ni texto adicional. Tu respuesta debe ser exclusivamente el objeto JSON indicado.
        
        Solicitud del usuario:
        {mensaje}
        """)
    
    def decidir(self, mensaje: str) -> str:
        consulta = self.prompt.format(mensaje=mensaje)
        respuesta = self.llm.invoke(consulta).content
        # limpiamos comillas o posibles formato triple backtick
        respuesta = respuesta.replace("```json", "").replace("```", "").strip()
        return json.loads(respuesta)["validacion"]