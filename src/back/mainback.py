from baseConocimientos import sincronizarBaseDeConocimiento
from model import require
sincronizarBaseDeConocimiento(
    carpeta = require("ARCHIVOS_DIR"),
    nombreDeBaseDeConocimiento = "bc_enterprise",
    tiempoDeEspera = 5
)