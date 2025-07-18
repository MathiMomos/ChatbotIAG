document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('user-input');
    const globalMessages = document.getElementById('global-messages');

    const focoButton = document.getElementById('foco-button');

    focoButton.addEventListener('click', function() {
        // Click para cambiar color por ahora
        this.classList.toggle('active');
    });


    // --- FUNCIONES SROLL TEXTAREA Y AJUSTE ---

    // Función para hacer scroll hacia abajo
    function scrollToBottom() {
        globalMessages.scrollTop = globalMessages.scrollHeight;
    }

    // Función para ajustar la altura del textarea
    function adjustTextareaHeight() {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    }


    // --- FUNCIONES PARA LA ANIMACIÓN ---

    // Función para mostrar la animación de "pensando"
    function showThinkingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.classList.add('message', 'bot-message', 'typing-indicator');
        indicatorDiv.id = 'thinking-indicator';
        indicatorDiv.innerHTML = `<span></span><span></span><span></span>`;
        globalMessages.appendChild(indicatorDiv);
        scrollToBottom();
    }

    // Función para quitar la animación
    function hideThinkingIndicator() {
        const indicator = document.getElementById('thinking-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Función para escribir la respuesta del bot linea por linea
    function typeResponseLineByLine(text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot-message');
        globalMessages.appendChild(messageDiv);

        const lines = text.split('\n');
        let lineIndex = 0;

        function typeLine() {
            if (lineIndex < lines.length) {
                messageDiv.innerHTML += lines[lineIndex] + '<br>';
                lineIndex++;
                scrollToBottom();
                setTimeout(typeLine, 400); // Pausa de 400ms entre líneas
            }
        }
        typeLine();
    }
    
    // --- LÓGICA PRINCIPAL ---

    // Función para añadir un mensaje al chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        globalMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // Función para enviar el mensaje (ahora solo llamada por enter)
    function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText) {
            addMessage(messageText, 'user');
            userInput.value = '';

            // --- Inicio de la sección modificada ---
            // 1. Muestra la animación de "pensando"
            showThinkingIndicator();

            // 2. Espera 2 segundos para simular que piensa
            setTimeout(() => {
                // 3. Llama a la API para obtener la respuesta
                fetch('/chat', {
                    method: 'POST',
                    body: messageText // Se envía el texto directamente
                })
                .then(response => response.text()) // Se espera una respuesta de texto
                .then(text => {
                    hideThinkingIndicator(); // 4. Oculta la animación
                    typeResponse(text); // 5. Muestra la respuesta letra por letra
                })
                .catch(error => {
                    console.error('Error al enviar mensaje:', error);
                    hideThinkingIndicator();
                    typeResponse('Lo siento, algo salió mal. Inténtalo de nuevo.');
                });
            }, 2000); // 2000ms = 2 segundos de espera
        }
    }

    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
});