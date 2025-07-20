document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('user-input');
    const globalMessages = document.getElementById('global-messages');
    const focoButton = document.getElementById('foco-button');
    const micButton = document.getElementById('mic-button');
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

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

    async function handleAudioStop() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'user-message');
        messageDiv.innerHTML = `<audio controls src="${audioUrl}"></audio>`;
        globalMessages.appendChild(messageDiv);
        scrollToBottom();

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
                typeResponseLineByLine(data.respuesta);
            })
            .catch(err => {
                console.error(err);
                hideThinkingIndicator();
                typeResponseLineByLine('Lo siento, algo salió mal al procesar tu audio.');
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
    function typeResponseLineByLine(text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot-message');
        globalMessages.appendChild(messageDiv);
        const lines = text.split('\n');
        let lineIndex = 0;
        function typeLine() {
            if (lineIndex < lines.length) {
                messageDiv.innerHTML += lines[lineIndex] + '<br>'; lineIndex++;
                scrollToBottom();
                setTimeout(typeLine, 400);
            }
        } typeLine();
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
                        typeResponseLineByLine(data.respuesta);
                    })
                    .catch(error => {
                        console.error('Error al enviar mensaje:', error);
                        hideThinkingIndicator();
                        typeResponseLineByLine('Lo siento, algo salió mal. Inténtalo de nuevo.');
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