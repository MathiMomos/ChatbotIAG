import json
import matplotlib.pyplot as plt
import matplotlib
import numpy as np
import io
import base64
from langchain_core.prompts import PromptTemplate
from src.util.util_llm import obtenerModelo

# Configurar matplotlib para no mostrar GUI
matplotlib.use('Agg')
plt.style.use('default')

def generar_chart_estadistico(descripcion_chart: str):
    """
    Toma una descripción de texto y le pide a un LLM que genere
    los datos y configuración para un gráfico estadístico con matplotlib.
    """

    plantilla = """
        Analiza el mensaje y responde con un JSON que contenga los datos y configuración para generar un gráfico estadístico:

        {mensaje}

        Ejemplos según el tipo de gráfico:

        PARA GRÁFICO DE BARRAS:
        {{
            "tipo": "bar",
            "titulo": "Ventas por Trimestre",
            "xlabel": "Trimestres",
            "ylabel": "Ventas (en miles)",
            "datos": {{
                "categorias": ["Q1", "Q2", "Q3", "Q4"],
                "valores": [150, 200, 180, 250]
            }},
            "colores": ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"]
        }}

        PARA GRÁFICO DE LÍNEAS:
        {{
            "tipo": "line",
            "titulo": "Evolución de Usuarios",
            "xlabel": "Meses",
            "ylabel": "Número de Usuarios",
            "datos": {{
                "categorias": ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
                "valores": [1000, 1200, 1500, 1800, 2100, 2400]
            }},
            "color": "#4ECDC4"
        }}

        PARA GRÁFICO CIRCULAR (PIE):
        {{
            "tipo": "pie",
            "titulo": "Distribución de Edades",
            "datos": {{
                "categorias": ["18-25", "26-35", "36-45", "46+"],
                "valores": [25, 35, 20, 20]
            }},
            "colores": ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"]
        }}

        PARA HISTOGRAMA:
        {{
            "tipo": "histogram",
            "titulo": "Distribución de Calificaciones",
            "xlabel": "Calificaciones",
            "ylabel": "Frecuencia",
            "datos": {{
                "valores": [85, 92, 78, 85, 90, 88, 92, 85, 90, 95, 88, 85, 92, 90, 88]
            }},
            "bins": 10,
            "color": "#96CEB4"
        }}

        PARA GRÁFICO DE DISPERSIÓN:
        {{
            "tipo": "scatter",
            "titulo": "Relación Altura vs Peso",
            "xlabel": "Altura (cm)",
            "ylabel": "Peso (kg)",
            "datos": {{
                "x": [160, 165, 170, 175, 180, 185],
                "y": [55, 60, 65, 70, 75, 80]
            }},
            "colores": ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57", "#FF9FF3"]
        }}

        REGLAS IMPORTANTES:
        - Siempre incluye "tipo", "titulo" y "datos"
        - Para bar y line: usa "categorias" y "valores"
        - Para pie: usa "categorias", "valores" y SIEMPRE "colores"
        - Para histogram: usa solo "valores" y opcionalmente "bins"
        - Para scatter: usa "x" e "y" y SIEMPRE "colores"
        - SIEMPRE usa colores vibrantes y modernos: #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FECA57, #FF9FF3, #54A0FF, #5F27CD
        - Para gráficos de barras usa "colores" (array) en lugar de "color" (string)
        - Los valores deben ser números realistas según el contexto
        - Si no hay datos específicos, genera datos de ejemplo coherentes
        - Los títulos deben ser descriptivos y profesionales

        Sólo debes devolver el JSON, no agregues texto adicional.
    """

    prompt_template = PromptTemplate.from_template(plantilla)
    llm = obtenerModelo()
    consulta = prompt_template.format(mensaje=descripcion_chart)
    respuesta_modelo = llm.invoke(consulta).content.replace("```json", "").replace("```", "").strip()

    try:
        respuesta_json = json.loads(respuesta_modelo)
        return crear_grafico_matplotlib(respuesta_json)
    except Exception as e:
        print(f"Error al parsear JSON de chart: {e}")
        return {"error": "No se pudo generar el gráfico estadístico."}


def crear_grafico_matplotlib(config):
    """
    Crea un gráfico usando matplotlib basado en la configuración proporcionada.
    Retorna la imagen como base64.
    """
    try:
        plt.figure(figsize=(16, 8))  # Más ancho para acomodar leyendas con texto largo
        plt.clf()  # Limpiar figura anterior
        
        # Configurar estilo y colores
        plt.rcParams['font.size'] = 12
        plt.rcParams['axes.titlesize'] = 16
        plt.rcParams['axes.labelsize'] = 14
        
        tipo = config.get("tipo", "bar")
        titulo = config.get("titulo", "Gráfico")
        datos = config.get("datos", {})
        
        # Función para generar etiquetas abreviadas cuando el texto es muy largo
        def generar_etiquetas_abreviadas(categorias, max_length=15):
            """
            Genera etiquetas abreviadas (A, B, C...) para textos largos
            y retorna tanto las etiquetas cortas como el mapeo para la leyenda
            """
            etiquetas_cortas = []
            mapeo_leyenda = []
            alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
            
            for i, categoria in enumerate(categorias):
                if len(str(categoria)) > max_length:
                    # Usar letras para textos largos
                    if i < len(alfabeto):
                        etiqueta_corta = alfabeto[i]
                    else:
                        # Si hay más de 26 categorías, usar A1, A2, etc.
                        letra_base = alfabeto[i // 26 - 1] if i >= 26 else 'A'
                        numero = (i % 26) + 1 if i >= 26 else i + 1
                        etiqueta_corta = f"{letra_base}{numero}"
                    
                    etiquetas_cortas.append(etiqueta_corta)
                    mapeo_leyenda.append(f"{etiqueta_corta}: {categoria}")
                else:
                    # Mantener texto original si no es muy largo
                    etiquetas_cortas.append(categoria)
                    mapeo_leyenda.append(categoria)
            
            return etiquetas_cortas, mapeo_leyenda
        
        # Paleta de colores moderna y atractiva
        colores_modernos = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
            '#2ED573', '#FFA502', '#3742FA', '#2F3542', '#57606F'
        ]
        
        if tipo == "bar":
            categorias = datos.get("categorias", [])
            valores = datos.get("valores", [])
            colores = config.get("colores", colores_modernos[:len(valores)])
            
            # Generar etiquetas abreviadas si es necesario
            etiquetas_cortas, mapeo_leyenda = generar_etiquetas_abreviadas(categorias)
            
            bars = plt.bar(etiquetas_cortas, valores, color=colores, alpha=0.8, edgecolor='white', linewidth=1.5)
            plt.xlabel(config.get("xlabel", "Categorías"), fontweight='bold')
            plt.ylabel(config.get("ylabel", "Valores"), fontweight='bold')
            
            # Crear leyenda para gráfico de barras fuera del área del gráfico
            legend_elements = [plt.Rectangle((0,0),1,1, facecolor=color, alpha=0.8, edgecolor='white') 
                             for color in colores]
            plt.legend(legend_elements, mapeo_leyenda, bbox_to_anchor=(1.05, 1), loc='upper left', 
                      frameon=True, fancybox=True, shadow=True, fontsize=10)
            
            # Añadir valores en las barras
            for bar, valor in zip(bars, valores):
                height = bar.get_height()
                plt.text(bar.get_x() + bar.get_width()/2., height + max(valores)*0.01,
                        f'{valor:,.0f}', ha='center', va='bottom', fontweight='bold')
            
        elif tipo == "line":
            categorias = datos.get("categorias", [])
            valores = datos.get("valores", [])
            color = config.get("color", '#4ECDC4')
            
            # Generar etiquetas abreviadas si es necesario
            etiquetas_cortas, mapeo_leyenda = generar_etiquetas_abreviadas(categorias)
            
            line = plt.plot(etiquetas_cortas, valores, marker='o', color=color, linewidth=3, 
                    markersize=8, markerfacecolor='white', markeredgewidth=2, markeredgecolor=color, 
                    label=config.get("ylabel", "Serie de datos"))
            plt.xlabel(config.get("xlabel", "X"), fontweight='bold')
            plt.ylabel(config.get("ylabel", "Y"), fontweight='bold')
            plt.grid(True, alpha=0.3, linestyle='--')
            
            # Si hay etiquetas abreviadas, mostrar leyenda con mapeo completo
            if any(len(str(cat)) > 15 for cat in categorias):
                # Crear elementos de leyenda personalizados para las categorías
                legend_elements = [plt.Line2D([0], [0], marker='o', color=color, linewidth=3,
                                            markersize=8, markerfacecolor='white', 
                                            markeredgewidth=2, markeredgecolor=color)]
                legend_labels = [config.get("ylabel", "Serie de datos")]
                
                # Añadir mapeo de categorías a la leyenda
                for mapeo in mapeo_leyenda:
                    if ":" in mapeo:  # Solo mostrar las que fueron abreviadas
                        legend_elements.append(plt.Line2D([0], [0], color='gray', alpha=0.7))
                        legend_labels.append(mapeo)
                
                plt.legend(legend_elements, legend_labels, bbox_to_anchor=(1.05, 1), loc='upper left', 
                          frameon=True, fancybox=True, shadow=True, fontsize=10)
            else:
                # Añadir leyenda para gráfico de líneas fuera del área del gráfico
                plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', frameon=True, 
                          fancybox=True, shadow=True, fontsize=10)
            
            # Añadir valores en los puntos
            for i, (cat, val) in enumerate(zip(etiquetas_cortas, valores)):
                plt.annotate(f'{val:,.0f}', (i, val), textcoords="offset points", 
                           xytext=(0,10), ha='center', fontweight='bold')
            
        elif tipo == "pie":
            categorias = datos.get("categorias", [])
            valores = datos.get("valores", [])
            colores = config.get("colores", colores_modernos[:len(valores)])
            
            # Generar etiquetas abreviadas si es necesario
            etiquetas_cortas, mapeo_leyenda = generar_etiquetas_abreviadas(categorias)
            
            # Para gráficos de pastel, usar etiquetas abreviadas solo en las secciones
            wedges, texts, autotexts = plt.pie(valores, labels=etiquetas_cortas, colors=colores, 
                                             autopct='%1.1f%%', startangle=90, 
                                             explode=[0.05]*len(valores), shadow=True)
            
            # Mejorar el texto
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_fontweight('bold')
                autotext.set_fontsize(11)
            
            for text in texts:
                text.set_fontweight('bold')
            
            # Si hay etiquetas abreviadas, mostrar leyenda con mapeo completo
            if any(len(str(cat)) > 15 for cat in categorias):
                # Crear leyenda con colores y mapeo completo
                legend_elements = [plt.Rectangle((0,0),1,1, facecolor=color, alpha=0.8, edgecolor='white') 
                                 for color in colores]
                plt.legend(legend_elements, mapeo_leyenda, bbox_to_anchor=(1.05, 1), loc='upper left', 
                          frameon=True, fancybox=True, shadow=True, fontsize=10)
            
            plt.axis('equal')
            
        elif tipo == "histogram":
            valores = datos.get("valores", [])
            bins = config.get("bins", 10)
            color = config.get("color", '#96CEB4')
            
            n, bins_edges, patches = plt.hist(valores, bins=bins, color=color, alpha=0.8, 
                                             edgecolor='white', linewidth=1.5, label='Distribución de datos')
            
            # Colorear barras con gradiente
            for i, patch in enumerate(patches):
                patch.set_facecolor(colores_modernos[i % len(colores_modernos)])
            
            plt.xlabel(config.get("xlabel", "Valores"), fontweight='bold')
            plt.ylabel(config.get("ylabel", "Frecuencia"), fontweight='bold')
            plt.grid(True, alpha=0.3, axis='y', linestyle='--')
            
            # Añadir leyenda para histograma fuera del área del gráfico
            plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', frameon=True, 
                      fancybox=True, shadow=True, fontsize=10)
            
        elif tipo == "scatter":
            x = datos.get("x", [])
            y = datos.get("y", [])
            colores = config.get("colores", colores_modernos[:len(x)])
            
            scatter = plt.scatter(x, y, c=colores, alpha=0.7, s=100, edgecolors='white', linewidth=2, 
                                 label='Datos de dispersión')
            plt.xlabel(config.get("xlabel", "X"), fontweight='bold')
            plt.ylabel(config.get("ylabel", "Y"), fontweight='bold')
            plt.grid(True, alpha=0.3, linestyle='--')
            
            # Añadir leyenda para gráfico de dispersión fuera del área del gráfico
            plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', frameon=True, 
                      fancybox=True, shadow=True, fontsize=10)
        
        else:
            return {"error": f"Tipo de gráfico no soportado: {tipo}"}
        
        plt.title(titulo, fontsize=18, fontweight='bold', pad=25, color='#2F3542')
        plt.tight_layout(pad=2.0, rect=[0, 0, 0.75, 1])  # Más espacio para leyendas con texto largo
        
        # Mejorar el fondo
        plt.gca().set_facecolor('#FAFAFA')
        plt.gcf().patch.set_facecolor('white')
        
        # Convertir a base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=200, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        image_png = buffer.getvalue()
        buffer.close()
        plt.close()  # Cerrar la figura para liberar memoria
        
        graphic_base64 = base64.b64encode(image_png).decode('utf-8')
        
        # Contar elementos de datos para el tooltip
        datos_count = 0
        if tipo in ["bar", "line"]:
            datos_count = len(datos.get("valores", []))
        elif tipo == "pie":
            datos_count = len(datos.get("valores", []))
        elif tipo == "histogram":
            datos_count = len(datos.get("valores", []))
        elif tipo == "scatter":
            datos_count = len(datos.get("x", []))
        
        return {
            "tipo": tipo,
            "titulo": titulo,
            "imagen": f"data:image/png;base64,{graphic_base64}",
            "datos_count": datos_count,
            "tipo_descriptivo": {
                "bar": "Gráfico de Barras",
                "line": "Gráfico de Líneas", 
                "pie": "Gráfico Circular",
                "histogram": "Histograma",
                "scatter": "Gráfico de Dispersión"
            }.get(tipo, tipo.title())
        }
        
    except Exception as e:
        print(f"Error al crear gráfico matplotlib: {e}")
        return {"error": f"Error al generar el gráfico: {str(e)}"}
