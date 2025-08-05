# Usa Python 3.12 estable como base
FROM python:3.12-slim

# Establece el directorio de trabajo
WORKDIR /app

# ---- LÍNEA NUEVA A AGREGAR ----
# Actualiza los paquetes del sistema e instala ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copia los archivos del proyecto
COPY . .

# Instala dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Expone el puerto para Railway
EXPOSE 8000

# Comando de inicio
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000", "--workers", "4"]