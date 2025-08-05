# Usa Python 3.13 como base
FROM python:3.13.0a5-slim

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos del proyecto
COPY . .

# Instala dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Expone el puerto para Railway
EXPOSE 8000

# Comando de inicio: gunicorn con 4 workers
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000", "--workers", "4"]
