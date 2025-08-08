import base64
import tempfile
import src.util.util_env as key
from azure.cognitiveservices.speech import (
    SpeechConfig,
    SpeechRecognizer,
    AudioConfig,
    AutoDetectSourceLanguageConfig,
    SpeechSynthesizer,
    ResultReason,
)
from azure.cognitiveservices.speech.audio import (
    AudioOutputConfig,
    PullAudioOutputStream,
)
import os
import subprocess


def obtenerModeloVoz() -> SpeechConfig:
    speechConfig: SpeechConfig = SpeechConfig(
        subscription=key.require("CONF_AZURE_SPEECH_KEY"),
        region=key.require("CONF_AZURE_SPEECH_REGION"),
    )
    return speechConfig


def detectar_formato_audio(audio_bytes):
    if audio_bytes.startswith(b"OggS"):
        return "ogg"
    elif audio_bytes[0:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        return "wav"
    elif audio_bytes[0:4] == b"\x1a\x45\xdf\xa3":
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

    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path, output_path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

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
        audio_file_path: str = temp_audio.name

    speech_config: SpeechConfig = obtenerModeloVoz()
    language_config: AutoDetectSourceLanguageConfig = AutoDetectSourceLanguageConfig(
        languages=["es-ES", "en-US", "pt-BR"]
    )
    audio_config: AudioConfig = AudioConfig(filename=audio_file_path)
    speech_recognizer: SpeechRecognizer = SpeechRecognizer(
        speech_config=speech_config,
        audio_config=audio_config,
        auto_detect_source_language_config=language_config,
    )

    resultado = speech_recognizer.recognize_once()

    if resultado.reason.name == "RecognizedSpeech":
        return resultado.text
    else:
        return "No se pudo transcribir el audio con Azure."


def detectar_lenguaje(prompt, llm) -> str:
    """
    Detecta el lenguaje del texto usando un modelo LLM.
    """
    system_msg = """
            Detecta el lenguaje del siguiente texto y devuelve solo el nombre del lenguaje (ejemplo: "es-ES", "en-US", "pt-BR"). No incluyas ningún otro texto o explicación.
            """
    try:
        response = llm.chat.completions.create(
            model=key.require("CONF_AZURE_DEPLOYMENT"),
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            max_tokens=10,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error al detectar el lenguaje: {e}")
        return "Error al detectar el lenguaje"


def texto_a_voz(prompt: str = "", voice: str = "es-ES") -> str | None:
    """
    Convierte texto a voz.

    Args:
        prompt (str): El texto a sintetizar.
        voice (str): Código de idioma y voz (por ejemplo, "es-ES", "en-US", "pt-BR").

    Returns:
        str | None: El audio codificado en base64, o None si falla.
    """
    speech_config: SpeechConfig = obtenerModeloVoz()
    voces_disponibles: dict[str, str] = {
        "es-ES": "es-ES-AlvaroNeural",
        "en-US": "en-US-JennyNeural",
        "pt-BR": "pt-BR-AntonioNeural",
    }
    if voice not in voces_disponibles:
        raise ValueError(f"Voz no soportada: {voice}")

    speech_config.speech_synthesis_language = voice
    speech_config.speech_synthesis_voice_name = voces_disponibles[voice]

    audio_output_stream: PullAudioOutputStream = PullAudioOutputStream()
    audio_config: AudioOutputConfig = AudioOutputConfig(stream=audio_output_stream)
    speech_sintetizer: SpeechSynthesizer = SpeechSynthesizer(
        speech_config=speech_config, audio_config=audio_config
    )
    resultado = speech_sintetizer.speak_text_async(prompt).get()

    if not resultado or resultado.reason != ResultReason.SynthesizingAudioCompleted:
        print(
            f"Error al sintetizar: {resultado.reason if resultado else 'Sin resultado'}"
        )
        return None

    audioEncode: str = base64.b64encode(resultado.audio_data).decode("utf-8")
    return audioEncode
