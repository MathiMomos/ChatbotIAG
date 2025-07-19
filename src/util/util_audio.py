import base64
import tempfile
import src.util.util_env as key
from azure.cognitiveservices.speech import SpeechConfig, SpeechRecognizer, AudioConfig, AutoDetectSourceLanguageConfig

import io
from pydub import AudioSegment

def convertir_webm_base64_a_wav_bytes(audio_base64):
    # Paso 1: Decodificar base64
    audio_bytes = base64.b64decode(audio_base64)
    # Paso 2: Cargar el audio webm en pydub
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format="ogg")

    # Paso 3: Exportarlo a WAV en bytes
    wav_io = io.BytesIO()
    audio.export(wav_io, format="wav")
    wav_io.seek(0)
    return wav_io.read()

def transcribir_audio_base64_a_texto(audio_base64):
    audio_bytes = convertir_webm_base64_a_wav_bytes(audio_base64)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
        temp_audio.write(audio_bytes)
        temp_audio.flush()
        audio_file_path = temp_audio.name

    AZURE_SPEECH_KEY = key.require("CONF_AZURE_SPEECH_KEY")
    AZURE_SPEECH_REGION = key.require("CONF_AZURE_SPEECH_REGION")

    speech_config = SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    auto_detect_source_language_config = AutoDetectSourceLanguageConfig(languages=["es-ES", "en-US", "pt-BR"])
    audio_config = AudioConfig(filename=audio_file_path)
    speech_recognizer = SpeechRecognizer(speech_config=speech_config, audio_config=audio_config, auto_detect_source_language_config=auto_detect_source_language_config)

    resultado = speech_recognizer.recognize_once()

    if resultado.reason.name == "RecognizedSpeech":
        return resultado.text
    else:
        return "No se pudo transcribir el audio con Azure."