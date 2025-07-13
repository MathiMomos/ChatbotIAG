document.addEventListener('DOMContentLoaded', function() {
        const userInput = document.getElementById('user-input');
        const globalMessages = document.getElementById('global-messages');

        // Función para añadir un mensaje al chat
        function addMessage(text, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            if (sender === 'bot') {
                messageDiv.classList.add('bot-message');
            } else if (sender === 'user') {
                messageDiv.classList.add('user-message');
            }
            messageDiv.textContent = text;
            globalMessages.appendChild(messageDiv);
            globalMessages.scrollTop = globalMessages.scrollHeight;
        }

        // Función para enviar el mensaje (ahora solo llamada por Enter)
        function sendMessage() {
            const messageText = userInput.value.trim();
            if (messageText) {
                addMessage(messageText, 'user');
                userInput.value = '';

                // --- Inicio de la sección modificada ---
                fetch('/chat', { // 1. URL corregida
                    method: 'POST',
                    // No necesitamos cabeceras JSON
                    body: messageText // 2. Enviamos el texto directamente
                })
                    .then(response => response.text()) // 3. Esperamos recibir texto
                    .then(text => {
                        // Usamos la variable 'text' directamente
                        addMessage(text, 'bot');
                    })
                    .catch(error => {
                        console.error('Error al enviar mensaje:', error);
                        addMessage('Lo siento, algo salió mal. Inténtalo de nuevo.', 'bot');
                    });
            }
        }

        userInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });
    });