document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('user-input');
    const globalMessages = document.getElementById('global-messages');
    const focoButton = document.getElementById('foco-button');
    const micButton = document.getElementById('mic-button');
    const imageButton = document.getElementById('image-button');
    const enviarButton = document.getElementById('enviar-button');
    const pausarButton = document.getElementById('pausar-button');
    const closeImagePanelButton = document.getElementById('close-image-panel');
    const imageDisplayArea = document.querySelector('.image-display-area');

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let audioStream;
    let typeWriterTimeout;
    let stopTypingRequested = false;

    let audioPlayerId = 0;
    let usarBaseConocimiento = true;
    let isGeneratingImage = false;

    // --- LOGICA DEL PANEL DE IMAGEN ---
    imageButton.addEventListener('click', async () => {
        if (isGeneratingImage) {
            console.log("Ya se está generando una imagen.");
            return;
        }

        isGeneratingImage = true;
        document.body.classList.add('image-view-active');
        
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'generated-image-container';
        loadingIndicator.innerHTML = `<div class="typing-indicator" style="padding: 20px; margin: auto;"><span></span><span></span><span></span></div>`;
        
        const placeholderText = imageDisplayArea.querySelector('p');
        if (placeholderText) {
            placeholderText.remove();
        }
        
        imageDisplayArea.appendChild(loadingIndicator);
        imageDisplayArea.scrollTop = imageDisplayArea.scrollHeight;

        try {
            const response = await fetch('/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            
            const imageContainer = document.createElement('div');
            imageContainer.className = 'generated-image-container';
            const img = document.createElement('img');
            img.src = data.image_url;
            img.alt = `Imagen generada`;
            imageContainer.appendChild(img);
            
            loadingIndicator.replaceWith(imageContainer);
            imageDisplayArea.scrollTop = imageDisplayArea.scrollHeight;

        } catch (error) {
            console.error("Error al generar la imagen:", error);
            loadingIndicator.remove();
            addMessage("Lo siento, no se pudo generar la imagen.", "bot");
        } finally {
            isGeneratingImage = false;
        }
    });

    closeImagePanelButton.addEventListener('click', () => {
        document.body.classList.remove('image-view-active');
    });

    focoButton.addEventListener('click', function () {
        this.classList.toggle('active');
        // 2. Actualiza el estado cada vez que se hace clic
        usarBaseConocimiento = !usarBaseConocimiento;
        console.log("Usar base de conocimiento:", usarBaseConocimiento);
    });
    
    // --- LÓGICA PARA EL PANEL DE IMAGEN ---
    imageButton.addEventListener('click', () => {
        console.log('Abriendo panel de imagen...');
        document.body.classList.add('image-view-active');
        // Aquí iría la lógica para generar la imagen y mostrarla
    });

    closeImagePanelButton.addEventListener('click', () => {
        console.log('Cerrando panel de imagen...');
        document.body.classList.remove('image-view-active');
    });

    
    // ------------------------------------

    // Click y envia mensaje
    enviarButton.addEventListener('click', sendMessage);

    // Evento enviar
    userInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // Evento pausar animacion
    pausarButton.addEventListener('click', () => {
        stopTypingRequested = true;
    });

    async function startRecording() {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(audioStream);
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
            audioStream.getTracks().forEach(track => track.stop());
        }
    }
    micButton.addEventListener('click', () => {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });
    
    function scrollToBottom() {
        globalMessages.scrollTop = globalMessages.scrollHeight;
    }

    function adjustTextareaHeight() {
        userInput.style.height = 'auto'; 
        userInput.style.height = (userInput.scrollHeight) + 'px';
        userInput.scrollTop = userInput.scrollHeight;
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
    //Reinicia el contenerdor y crea el
    stopTypingRequested = false; 
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot-message');
    globalMessages.appendChild(messageDiv);
    
    //Intercambia botones
    enviarButton.style.display = 'none';
    pausarButton.style.display = 'flex';

    let i = 0;
    const speed = 2;

    function typeWriter() {
        // Se detiene al click
        if (i >= markdownText.length || stopTypingRequested) {
            clearTimeout(typeWriterTimeout);
            messageDiv.innerHTML = marked.parse(markdownText);
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            pausarButton.style.display = 'none';
            enviarButton.style.display = 'flex';
        
            scrollToBottom();
            return;
        }

        // Si no se detiene, continúa la animación
        messageDiv.innerHTML = marked.parse(markdownText.substring(0, i + 1) + '▌');
        i++;
        scrollToBottom();
        
        // Continúa el bucle de la animación
        typeWriterTimeout = setTimeout(typeWriter, speed);
    }

    // Inicia la animación
    typeWriter();
}

    function addMessage(text, sender) { 
        const messageDiv = document.createElement('div'); 
        messageDiv.classList.add('message', `${sender}-message`); 
        messageDiv.textContent = text; 
        globalMessages.appendChild(messageDiv); 
        scrollToBottom(); 
    }

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
            }, 0); // Reduje el tiempo de espera a 0.5s
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

