document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('user-input');
    const globalMessages = document.getElementById('global-messages');
    const focoButton = document.getElementById('foco-button');
    const micButton = document.getElementById('mic-button');
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    let audioPlayerId = 0; //id unico para cada audio

    // 1. Variable para guardar el estado del foco
    let usarBaseConocimiento = true;

    focoButton.addEventListener('click', function () {
        this.classList.toggle('active');
        // 2. Actualiza el estado cada vez que se hace clic
        usarBaseConocimiento = !usarBaseConocimiento;
        console.log("Usar base de conocimiento:", usarBaseConocimiento);
    });

    async function startRecording() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', handleAudioStop);

        mediaRecorder.start();
        console.log('🎙️ Grabando...');
        isRecording = true;
        micButton.classList.add('recording');
    }

    // Formatear el tiempo de segundos a MM:SS
        function formatTime(seconds) {
            if (!isFinite(seconds) || seconds < 0) {
                return "0:00";
            }

            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }

    async function handleAudioStop() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Incrementamos el ID para cada nuevo audio
        audioPlayerId++;
        const currentId = audioPlayerId;
        
        //Estructura del reproductor
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'user-message');
        messageDiv.innerHTML = `
        <div class="custom-audio-player">
            <audio id="audio-${currentId}" src="${audioUrl}" preload="metadata"></audio>
            <button id="play-btn-${currentId}" class="audio-play-button">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
            </button>
            <div id="progress-container-${currentId}" class="progress-container">
                <div class="progress-background"></div>
                <div id="progress-bar-${currentId}" class="progress-bar"></div>
                <div id="progress-handle-${currentId}" class="progress-handle"></div>
            </div>
            <span id="time-display-${currentId}" class="audio-time-display">0:00</span>
        </div>
    `;
        globalMessages.appendChild(messageDiv);

        //Lógica para controlar reproductor
        const audio = document.getElementById(`audio-${currentId}`);
        const playBtn = document.getElementById(`play-btn-${currentId}`);
        const progressContainer = document.getElementById(`progress-container-${currentId}`);
        const progressBar = document.getElementById(`progress-bar-${currentId}`);
        const handle = document.getElementById(`progress-handle-${currentId}`);
        const timeDisplay = document.getElementById(`time-display-${currentId}`);

        audio.load();
        scrollToBottom();

        const playIcon = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>`;
        const pauseIcon = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>`;

        // Evento para el botón de play/pausa
        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play().then(() => {
                    playBtn.innerHTML = pauseIcon;
                }).catch(e => console.error("Error al reproducir:", e));
            } else {
                audio.pause();
                playBtn.innerHTML = playIcon;
            }
        });

        // Evento para actualizar la barra de progreso y el tiempo
        audio.addEventListener('timeupdate', () => {
        if (isFinite(audio.duration)) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${progress}%`;
            handle.style.left = `${progress}%`;
            timeDisplay.textContent = formatTime(audio.currentTime);
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        if (isFinite(audio.duration)) {
            timeDisplay.textContent = formatTime(audio.duration);
        }
    });

        // Cuando el audio termina, resetea el icono de tiempo
        audio.addEventListener('ended', () => {
        playBtn.innerHTML = playIcon;
        handle.style.left = '0%';
        progressBar.style.width = '0%';
        audio.currentTime = 0;
        timeDisplay.textContent = formatTime(audio.duration);
    });




    //FUNCIONALIDAD DE ARRASTRE DE MOUSE POR LA BARRA DEL AUDIO
    
    let isDragging = false;

    const onMouseMove = (e) => {
        if (!isDragging) return;

        const rect = progressContainer.getBoundingClientRect();
        let offsetX = e.clientX - rect.left;
        const width = rect.width;

        // Limitar el valor para que no se salga de la barra
        if (offsetX < 0) offsetX = 0;
        if (offsetX > width) offsetX = width;

        const newTime = (offsetX / width) * audio.duration;
        
        // Actualizacion de UI en tiempo real
        const progress = (newTime / audio.duration) * 100;
        progressBar.style.width = `${progress}%`;
        handle.style.left = `${progress}%`;
        timeDisplay.textContent = formatTime(newTime);
    };

    // Función al soltar el clic
    const onMouseUp = (e) => {
        if (!isDragging) return;

        isDragging = false;
        
        const rect = progressContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const width = rect.width;
        
        // Actualizar el tiempo del audio a la posición final
        audio.currentTime = (offsetX / width) * audio.duration;

        // Limpiar los listeners del documento 
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    // Iniciar el proceso al presionar el clic en la barra
    progressContainer.addEventListener('mousedown', (e) => {
        if (!isFinite(audio.duration)) return;

        isDragging = true;
        
        // Actualizar la posición inmediatamente al hacer clic
        onMouseMove(e);
        
        // Captura movimiento fuera de la barra
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });



        //Enviar al backend
        showThinkingIndicator();

        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usar_base: usarBaseConocimiento,
                prompt: {
                    tipo: 'audio',
                    contenido: base64Audio,
                    mime_type: 'audio/webm'
                }
            })
        })
            .then(resp => resp.json())
            .then(data => {
                hideThinkingIndicator();
                renderBotResponse(data.respuesta);
            })
            .catch(err => {
                console.error(err);
                hideThinkingIndicator();
                renderBotResponse('Lo siento, algo salió mal al procesar tu audio.');
            });
    }

    // Función para detener la grabación
    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            micButton.classList.remove('recording');
        }
    }
    micButton.addEventListener('click', () => {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });
    // --- El resto de tus funciones (scrollToBottom, adjustTextareaHeight, etc.) va aquí ---
    // --- No necesitan cambios ---
    function scrollToBottom() {
        globalMessages.scrollTop = globalMessages.scrollHeight;
    }

    function adjustTextareaHeight() {
        userInput.style.height = 'auto'; userInput.style.height = (userInput.scrollHeight) + 'px';
    }

    function showThinkingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.classList.add('message', 'bot-message', 'typing-indicator');
        indicatorDiv.id = 'thinking-indicator';
        indicatorDiv.innerHTML = `<span></span><span></span><span></span>`;
        globalMessages.appendChild(indicatorDiv); scrollToBottom();
    }

    function hideThinkingIndicator() {
        const indicator = document.getElementById('thinking-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    // ESTILO MARKDOWN
    function renderBotResponse(markdownText) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');

    // convierte Markdown a HTML
    messageDiv.innerHTML = marked.parse(markdownText);

    messageDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });

    globalMessages.appendChild(messageDiv);
    scrollToBottom();
}

    function addMessage(text, sender) { const messageDiv = document.createElement('div'); messageDiv.classList.add('message', `${sender}-message`); messageDiv.textContent = text; globalMessages.appendChild(messageDiv); scrollToBottom(); }


    // --- LÓGICA PRINCIPAL (MODIFICADA) ---

    function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText) {
            addMessage(messageText, 'user');
            userInput.value = '';
            adjustTextareaHeight();

            showThinkingIndicator();

            setTimeout(() => {
                // 3. Modifica la llamada fetch para enviar un JSON
                fetch('/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usar_base: usarBaseConocimiento,
                        prompt: {
                            tipo: 'texto',
                            contenido: messageText
                        }
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        hideThinkingIndicator();
                        renderBotResponse(data.respuesta);
                    })
                    .catch(error => {
                        console.error('Error al enviar mensaje:', error);
                        hideThinkingIndicator();
                        renderBotResponse('Lo siento, algo salió mal. Inténtalo de nuevo.');
                    });
            }, 500); // Reduje el tiempo de espera a 0.5s, ajústalo a tu gusto
        }
    }

    userInput.addEventListener('keypress', function (event) {
        // Permite enviar con Enter y crear nueva linea con Shift + Enter
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Evita que se cree una nueva línea en el textarea
            sendMessage();
        }
    });

    userInput.addEventListener('input', adjustTextareaHeight);


});

