import base64
import tempfile
import src.util.util_env as key
from azure.cognitiveservices.speech import SpeechConfig, SpeechRecognizer, AudioConfig, AutoDetectSourceLanguageConfig
import os
import subprocess

def detectar_formato_audio(audio_bytes):
    if audio_bytes.startswith(b'OggS'):
        return "ogg"
    elif audio_bytes[0:4] == b'RIFF' and audio_bytes[8:12] == b'WAVE':
        return "wav"
    elif audio_bytes[0:4] == b'\x1A\x45\xDF\xA3':
        return "webm"  # Matroska/WebM
    else:
        return "ogg"  # Por defecto si no sabes, asume ogg
    
    

def convertir_audio_base64_a_wav_bytes(audio_base64, formato="ogg"):
    audio_bytes = base64.b64decode(audio_base64)

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{formato}") as temp_input:
        temp_input.write(audio_bytes)
        temp_input.flush()
        input_path = temp_input.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_output:
        output_path = temp_output.name

    subprocess.run([
        "ffmpeg", "-y", "-i", input_path, output_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with open(output_path, "rb") as f:
        wav_bytes = f.read()

    os.remove(input_path)
    os.remove(output_path)

    return wav_bytes

def transcribir_audio_base64_a_texto(audio_base64):
    audio_bytes = base64.b64decode(audio_base64)
    formato = detectar_formato_audio(audio_bytes)
    if formato != "wav":
        audio_bytes = convertir_audio_base64_a_wav_bytes(audio_base64, formato=formato)

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