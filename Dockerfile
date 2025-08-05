# Usa una imagen base con Python 3.13
FROM python:3.13.0a5-slim

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos del proyecto
COPY . .

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Expone el puerto (modifícalo si usas otro en app.py)
EXPOSE 8000

# Comando de inicio (usa gunicorn para producción)
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
