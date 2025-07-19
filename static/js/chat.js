document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('user-input');
    const globalMessages = document.getElementById('global-messages');
    const focoButton = document.getElementById('foco-button');

    // 1. Variable para guardar el estado del foco
    let usarBaseConocimiento = true;

    focoButton.addEventListener('click', function() {
        this.classList.toggle('active');
        // 2. Actualiza el estado cada vez que se hace clic
        usarBaseConocimiento = !usarBaseConocimiento;
        console.log("Usar base de conocimiento:", usarBaseConocimiento);
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
        if (indicator) { indicator.remove();
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
                setTimeout(typeLine, 20); } } typeLine();
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
                    headers: {
                        'Content-Type': 'application/json' // Especifica que envías JSON
                    },
                    body: JSON.stringify({
                        prompt: messageText,
                        usar_base: usarBaseConocimiento // Envía el estado actual del foco
                    })
                })
                .then(response => response.text())
                .then(text => {
                    hideThinkingIndicator();
                    // Aquí deberías usar tu función para escribir linea por linea si la tienes
                    typeResponseLineByLine(text);
                })
                .catch(error => {
                    console.error('Error al enviar mensaje:', error);
                    hideThinkingIndicator();
                    typeResponseLineByLine('Lo siento, algo salió mal. Inténtalo de nuevo.');
                });
            }, 500); // Reduje el tiempo de espera a 0.5s, ajústalo a tu gusto
        }
    }

    userInput.addEventListener('keypress', function(event) {
        // Permite enviar con Enter y crear nueva linea con Shift + Enter
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Evita que se cree una nueva línea en el textarea
            sendMessage();
        }
    });

    userInput.addEventListener('input', adjustTextareaHeight);
});