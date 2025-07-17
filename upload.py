import src.util.util_sincronizacion as sinc
import src.util.util_env as key
sinc.sincronizarBaseDeConocimiento(
    carpeta = key.require("ARCHIVOS_DIR"), # Cambiar la ruta en el archivo .env para que apunte a la carpeta correcta
    nombreDeBaseDeConocimiento = "test", #
    tiempoDeEspera = 5
)