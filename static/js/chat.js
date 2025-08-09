document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('user-input');
    const globalMessages = document.getElementById('global-messages');
    const focoButton = document.getElementById('foco-button');
    const micButton = document.getElementById('mic-button');
    const enviarButton = document.getElementById('enviar-button');
    const pausarButton = document.getElementById('pausar-button');
    const closeImagePanelButton = document.getElementById('close-image-panel');
    const imageDisplayArea = document.querySelector('.image-display-area');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');

    const carouselNav = document.getElementById('carousel-nav');
    const carouselCounter = document.getElementById('carousel-counter');
    const inputContainer = document.querySelector('.input-container');

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let audioStream;
    let currentAudio = null;
    let audioPlayerId = 0;
    let usarBaseConocimiento = true;
    let isGeneratingContent = false;
    let recordingInterval;
    let recordingSeconds = 0;
    // --- LÓGICA DEL CARRUSEL ---
    let carouselItems = [];
    let currentIndex = 0;

    function lockUserInput() {
        userInput.disabled = true;
        enviarButton.disabled = true;
        micButton.disabled = true;
        inputContainer.classList.add('input-locked');
        userInput.placeholder = "Esperando respuesta...";
    }

    function unlockUserInput() {
        userInput.disabled = false;
        enviarButton.disabled = false;
        micButton.disabled = false;
        inputContainer.classList.remove('input-locked');
        userInput.placeholder = "Ask anythink...";
        userInput.focus();
    }


    function renderCarousel() {
        imageDisplayArea.innerHTML = '';
        carouselNav.classList.toggle('hidden', carouselItems.length === 0);

        if (carouselItems.length > 0) {
            carouselCounter.textContent = `${currentIndex + 1} / ${carouselItems.length}`;
            const currentItem = document.createElement('div');
            currentItem.className = 'carousel-item active';
            currentItem.innerHTML = carouselItems[currentIndex];
            imageDisplayArea.appendChild(currentItem);

            const diagramDiv = currentItem.querySelector('[id^="diagram-"]');
            if (diagramDiv && diagramDiv.dataset.diagramData) {
                const diagramData = JSON.parse(diagramDiv.dataset.diagramData);
                initializeGoJSDiagram(diagramDiv.id, diagramData);
            }
        }

        prevButton.classList.toggle('hidden', currentIndex === 0);
        nextButton.classList.toggle('hidden', currentIndex >= carouselItems.length - 1);
    }

    prevButton.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderCarousel();
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentIndex < carouselItems.length - 1) {
            currentIndex++;
            renderCarousel();
        }
    });

    // --- LOGICA DEL PANEL DE IMAGEN ---
    async function generateImage(messageElement) {
        if (isGeneratingContent) {
            throw new Error("Ya se está generando una imagen.");
        }
        isGeneratingContent = true;
        document.body.classList.add('image-view-active');
        const messageText = messageElement.querySelector('.main-content').innerText || messageElement.textContent; // <<<<<<
        const loadingIndicator = document.createElement('div');
        loadingIndicator.innerHTML = `<div class="typing-indicator" style="padding: 20px; margin: auto;"><span></span><span></span><span></span></div>`;
        imageDisplayArea.innerHTML = '';
        imageDisplayArea.appendChild(loadingIndicator);
        try {
            const response = await fetch('/imagen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: messageText })
            });
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const imageContainer = document.createElement('div');
            imageContainer.className = 'generated-image-container';
            const img = document.createElement('img');
            img.src = data.url;
            img.alt = `Imagen generada`;
            img.classList.add('expandable-image');
            img.dataset.title = 'Imagen generada';
            imageContainer.appendChild(img);
            carouselItems.push(imageContainer.outerHTML);
            currentIndex = carouselItems.length - 1;
            renderCarousel();
        } catch (error) {
            console.error("Error al generar la imagen:", error);
            addMessage("Lo siento, no se pudo generar la imagen.", "bot");
        } finally {
            isGeneratingContent = false;
        }
    }

    // --- LOGICA DEL GRÁFICO ESTADÍSTICO ---
    async function generateChart(messageElement) {
        if (isGeneratingContent) {
            throw new Error("Ya se está generando un gráfico.");
        }
        isGeneratingContent = true;
        document.body.classList.add('image-view-active');
        let messageText = messageElement.querySelector('.main-content').innerText || messageElement.textContent; // <<<<<<
        const loadingIndicator = document.createElement('div');
        loadingIndicator.innerHTML = `<div class="typing-indicator" style="padding: 20px; margin: auto;"><span></span><span></span><span></span></div>`;
        imageDisplayArea.innerHTML = '';
        imageDisplayArea.appendChild(loadingIndicator);
        try {
            const response = await fetch('/chart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: messageText })
            });
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            const data = await response.json();
            if (data.error || (data.valor && data.valor.error) || !data.valor || !data.valor.imagen) {
                throw new Error(data.error || (data.valor && data.valor.error) || "Los datos del gráfico no son válidos");
            }
            const chartContainer = document.createElement('div');
            chartContainer.className = 'generated-chart-container';

            const img = document.createElement('img');
            img.src = data.valor.imagen;
            const title = data.valor.titulo || 'Estadístico';
            img.alt = `Gráfico: ${title}`;
            img.classList.add('expandable-image');
            img.dataset.title = title;
            
            // Agregar información para tooltip
            img.dataset.chartType = data.valor.tipo_descriptivo || 'Gráfico';
            img.dataset.dataCount = data.valor.datos_count || 0;
            img.dataset.chartTitle = title;

            chartContainer.appendChild(img);
            carouselItems.push(chartContainer.outerHTML);
            currentIndex = carouselItems.length - 1;
            renderCarousel();
        } catch (error) {
            console.error("Error al generar el gráfico:", error);
            addMessage("Lo siento, no se pudo generar el gráfico estadístico.", "bot");
        } finally {
            isGeneratingContent = false;
        }
    }

    // --- LOGICA DEL DIAGRAMA ---
    async function generateDiagram(messageElement) {
        if (isGeneratingContent) {
            throw new Error("Ya se está generando un diagrama.");
        }
        if (typeof go === 'undefined') {
            console.error("GoJS no está cargado");
            addMessage("Error: GoJS no está disponible. Verifica la conexión a internet.", "bot");
            return;
        }
        isGeneratingContent = true;
        document.body.classList.add('image-view-active');
        let messageText = messageElement.querySelector('.main-content').innerText || messageElement.textContent; // <<<<<<
        const loadingIndicator = document.createElement('div');
        loadingIndicator.innerHTML = `<div class="typing-indicator" style="padding: 20px; margin: auto;"><span></span><span></span><span></span></div>`;
        imageDisplayArea.innerHTML = '';
        imageDisplayArea.appendChild(loadingIndicator);
        try {
            const response = await fetch('/diagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: messageText })
            });
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            const data = await response.json();
            if (data.error || (data.valor && data.valor.error) || !data.valor || !data.valor.nodes) {
                throw new Error(data.error || (data.valor && data.valor.error) || "Los datos del diagrama no son válidos");
            }

            const diagramId = 'diagram-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
            const diagramContainer = document.createElement('div');
            diagramContainer.className = 'generated-diagram-container';
            diagramContainer.innerHTML = `<div id="${diagramId}" style="width:100%; height:400px; border: 1px solid #ccc; background-color: white; border-radius: 10px; cursor: pointer;"></div>`;

            const diagramDiv = diagramContainer.querySelector(`#${diagramId}`);
            diagramDiv.dataset.diagramData = JSON.stringify(data.valor);
            diagramDiv.classList.add('expandable-diagram');
            diagramDiv.dataset.title = 'Diagrama Generado';

            carouselItems.push(diagramContainer.outerHTML);
            currentIndex = carouselItems.length - 1;
            renderCarousel();
        } catch (error) {
            console.error("Error al generar el diagrama:", error);
            addMessage("Lo siento, no se pudo generar el diagrama.", "bot");
        } finally {
            isGeneratingContent = false;
        }
    }


    // --- LÓGICA DE MODALES (VISTA EXPANDIDA) ---
    function showImageModal(title, imageUrl) {
        const modal = document.createElement("div");
        modal.className = "chart-modal";
        modal.innerHTML = `
        <div class="modal-content" >
            <span class="modal-close">&times;</span>
            <h3>${title}</h3>
            <img src="${imageUrl}" alt="${title}" style="max-width: 100%; max-height: 80vh; border-radius: 10px;">
        </div>`;
        document.body.appendChild(modal);
        addModalCloseLogic(modal);
    }

    function showDiagramModal(title, diagramData) {
        const modal = document.createElement("div");
        modal.className = "chart-modal";
        const modalDiagramId = 'modal-diagram-' + Date.now();

        modal.innerHTML = `
        <div class="modal-content" style="width: 90%; height: 90%; max-width: 1200px;">
            <span class="modal-close">&times;</span>
            <h3>${title}</h3>
            <div id="${modalDiagramId}" style="width: 100%; height: calc(100% - 50px); border-radius: 10px; background-color: white;"></div>
        </div>`;

        document.body.appendChild(modal);
        initializeGoJSDiagram(modalDiagramId, diagramData);
        addModalCloseLogic(modal);
    }

    let modalAbierto = false;

    document.addEventListener("click", function (e) {
        if (window.innerWidth <= 768) return;

        const image = e.target.closest(".expandable-image");
        if (image && !modalAbierto) {
            modalAbierto = true;
            const title = image.dataset.title;
            const src = image.src;
            showImageModal(title, src);
            return;
        }

        const diagram = e.target.closest(".expandable-diagram");
        if (diagram && !modalAbierto) {
            modalAbierto = true;
            const title = diagram.dataset.title;
            const diagramData = JSON.parse(diagram.dataset.diagramData);
            showDiagramModal(title, diagramData);
            return;
        }
    });


    function addModalCloseLogic(modal) {
        modal.querySelector(".modal-close").onclick = () => {
            modal.remove();
            modalAbierto = false;
        };
        modal.onclick = (e) => {
            if (e.target.classList.contains('chart-modal')) {
                modal.remove();
                modalAbierto = false;
            }
        };
    }

    function initializeGoJSDiagram(diagramId, diagramData) {
        const targetDiv = document.getElementById(diagramId);
        if (!targetDiv || typeof go === 'undefined') return;
        if (targetDiv.diagram) {
            targetDiv.diagram.div = null;
        }
        const $ = go.GraphObject.make;
        const myDiagram = new go.Diagram(diagramId);
        myDiagram.initialContentAlignment = go.Spot.Center;
        myDiagram.undoManager.isEnabled = true;
        let hasParentProperty = diagramData.nodes && diagramData.nodes.some(node => node.parent);
        if (hasParentProperty) {
            myDiagram.layout = $(go.TreeLayout, { angle: 90, layerSpacing: 80 });
        } else {
            myDiagram.layout = $(go.LayeredDigraphLayout, { direction: 90, layerSpacing: 60 });
        }
        myDiagram.nodeTemplate =
            $(go.Node, "Auto",
                $(go.Shape, "RoundedRectangle", { strokeWidth: 2, stroke: "#333", fill: "white" },
                    new go.Binding("fill", "color")),
                $(go.TextBlock, { margin: 12, font: "bold 13px sans-serif", stroke: "#000" },
                    new go.Binding("text", "text"))
            );
        myDiagram.linkTemplate =
            $(go.Link, { routing: go.Link.Orthogonal, corner: 8 },
                $(go.Shape, { strokeWidth: 2, stroke: "#666" }),
                $(go.Shape, { toArrow: "Standard", fill: "#666", stroke: "#666" })
            );
        if (hasParentProperty) {
            myDiagram.model = new go.TreeModel(diagramData.nodes || []);
        } else {
            myDiagram.model = new go.GraphLinksModel(diagramData.nodes || [], diagramData.links || []);
        }
    }

    globalMessages.addEventListener('click', function (event) {
        // BRIEF (VER MÁS / VER MENOS)
        const briefButton = event.target.closest('.brief-button');
        if (briefButton) {
            const messageElement = briefButton.closest('.bot-message');
            const mainContent = messageElement.querySelector('.main-content');
            const briefContent = messageElement.querySelector('.brief-content');

            if (!briefContent) return;

            briefButton.classList.toggle('is-expanded');

            if (briefButton.classList.contains('is-expanded')) {
                // <<<<<< CAMBIO 1: LÓGICA INVERTIDA
                // Estado EXPANDIDO: Muestra la respuesta completa, oculta el brief.
                mainContent.style.display = 'block';
                briefContent.style.display = 'none';
                briefButton.title = 'Ver menos';
                briefButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 11v2h14v-2z"/></svg>`;
            } else {
                // <<<<<< CAMBIO 1: LÓGICA INVERTIDA
                // Estado CONTRAÍDO: Muestra el brief, oculta la respuesta completa.
                mainContent.style.display = 'none';
                briefContent.style.display = 'block';
                briefButton.title = 'Ver más';
                briefButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11 19v-6H5v-2h6V5h2v6h6v2h-6v6z"/></svg>`;
            }
        }

        // IMAGEN
        const imageButton = event.target.closest('.generate-image-button');
        if (imageButton) {
            const messageElement = event.target.closest('.bot-message');
            if (messageElement) {
                generateImage(messageElement);
            }
        }
        // DIAGRAMA
        const diagramButton = event.target.closest('.generate-diagram-button');
        if (diagramButton) {
            const messageElement = event.target.closest('.bot-message');
            if (messageElement) {
                generateDiagram(messageElement);
            }
        }
        // ESTADISTICA
        const chartButton = event.target.closest('.generate-chart-button');
        if (chartButton) {
            const messageElement = event.target.closest('.bot-message');
            if (messageElement) {
                generateChart(messageElement);
            }
        }

        // AUDIO
        const audioButton = event.target.closest('.generate-audio-button');
        if (audioButton) {
            let messageElement;
            const botMessage = event.target.closest('.bot-message');
            const mainContent = botMessage.querySelector('.main-content');
            const briefContent = botMessage.querySelector('.brief-content');

            if (mainContent && mainContent.style.display !== 'none') {
                messageElement = mainContent;
            } else if (briefContent && briefContent.style.display !== 'none') {
                messageElement = briefContent;
            } else {
                messageElement = botMessage; // fallback
            }
            currentState = audioButton.dataset.state;
            if (currentState === "playing" && currentAudio) {
                currentAudio.pause();
                audioButton.dataset.state = "paused";
                restorePlayIcon(audioButton);
            } else if (currentState === "paused" && currentAudio) {
                currentAudio.play();
                audioButton.dataset.state = "playing";
                audioButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>`;
            } else if (currentState === "idle") {
                generateAudio(messageElement, audioButton);
            }
        }
    });

    enviarButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    focoButton.addEventListener('click', function () {
        this.classList.toggle('active');
        usarBaseConocimiento = !usarBaseConocimiento;
    });

    closeImagePanelButton.addEventListener('click', () => {
        document.body.classList.remove('image-view-active');
    });

    enviarButton.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

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

        // --- LÓGICA DEL CONTADOR (AÑADIDA) ---
        const timerElement = document.createElement('span');
        timerElement.id = 'recording-timer';
        timerElement.className = 'recording-timer';
        timerElement.textContent = '0:00';

        inputContainer.insertBefore(timerElement, micButton);

        recordingSeconds = 0;
        recordingInterval = setInterval(() => {
            recordingSeconds++;
            timerElement.textContent = formatTime(recordingSeconds);
        }, 1000);
        // --- FIN DE LÓGICA DEL CONTADOR ---
    }

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
        audioPlayerId++;
        const currentId = audioPlayerId;
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

        audio.addEventListener('ended', () => {
            playBtn.innerHTML = playIcon;
            handle.style.left = '0%';
            progressBar.style.width = '0%';
            audio.currentTime = 0;
            timeDisplay.textContent = formatTime(audio.duration);
        });

        let isDragging = false;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const rect = progressContainer.getBoundingClientRect();
            let offsetX = e.clientX - rect.left;
            const width = rect.width;
            if (offsetX < 0) offsetX = 0;
            if (offsetX > width) offsetX = width;
            const newTime = (offsetX / width) * audio.duration;
            const progress = (newTime / audio.duration) * 100;
            progressBar.style.width = `${progress}%`;
            handle.style.left = `${progress}%`;
            timeDisplay.textContent = formatTime(newTime);
        };

        const onMouseUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            const rect = progressContainer.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const width = rect.width;
            audio.currentTime = (offsetX / width) * audio.duration;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        progressContainer.addEventListener('mousedown', (e) => {
            if (!isFinite(audio.duration)) return;
            isDragging = true;
            onMouseMove(e);
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        showThinkingIndicator();
        lockUserInput();

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
                renderBotResponse(data);
            })
            .catch(err => {
                console.error(err);
                hideThinkingIndicator();
                renderBotResponse({ respuesta: 'Lo siento, algo salió mal al procesar tu audio.' });
            });
    }

    async function generateAudio(messageElement, audioButton) {
        if (!messageElement) {
            console.error("No se encontró el contenido del mensaje para generar audio.");
            return;
        }
        const text = messageElement.innerText;

        try {
            const response = await fetch("/audio", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prompt: text })
            });

            const data = await response.json();

            if (response.ok && data.valor) {
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                }

                const audio = new Audio("data:audio/wav;base64," + data.valor);
                currentAudio = audio;
                audioButton.dataset.state = "playing";
                audioButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>`;

                audio.play();

                audio.onended = () => {
                    currentAudio = null;
                    audioButton.dataset.state = "idle";
                    restorePlayIcon(audioButton);
                };
            } else {
                console.error("Error en síntesis de audio:", data.error);
            }
        } catch (error) {
            console.error("Error en fetch de audio:", error);
        }
    }

    function restorePlayIcon(button) {
        button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16" fill="currentColor"> 
            <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
            <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
            <path d="M10.025 8a4.5 4.5 0 0 1-1.318 3.182L8 10.475A3.5 3.5 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.5 4.5 0 0 1 10.025 8M7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11"/>
        </svg>`;
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            micButton.classList.remove('recording');
            audioStream.getTracks().forEach(track => track.stop());

            // --- LÓGICA DEL CONTADOR (AÑADIDA) ---
            clearInterval(recordingInterval);
            const timerElement = document.getElementById('recording-timer');
            if (timerElement) {
                timerElement.remove();
            }
            // --- FIN DE LÓGICA DEL CONTADOR ---
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
        globalMessages.appendChild(indicatorDiv);
        scrollToBottom();
    }

    function hideThinkingIndicator() {
        const indicator = document.getElementById('thinking-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function renderBotResponse(data) { // <<<<<< Recibe el objeto {respuesta, brief}
        stopTypingRequested = false;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot-message');

        const contentDiv = document.createElement('div');

        // El contenedor del brief
        const briefDiv = document.createElement('div');
        briefDiv.className = 'brief-content';

        // El contenedor de la respuesta completa
        const mainResponseDiv = document.createElement('div');
        mainResponseDiv.className = 'main-content';

        // Lógica para decidir qué mostrar por defecto
        if (data.brief) {
            briefDiv.innerHTML = marked.parse(data.brief);
            mainResponseDiv.innerHTML = marked.parse(data.respuesta || "");
            mainResponseDiv.style.display = 'none'; // La respuesta completa empieza oculta
        } else {
            // Si no hay brief, solo mostramos la respuesta principal
            briefDiv.innerHTML = marked.parse(data.respuesta || "No se recibió respuesta.");
        }

        contentDiv.appendChild(briefDiv);
        contentDiv.appendChild(mainResponseDiv);
        messageDiv.appendChild(contentDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'bot-actions';

        // Solo se muestra el botón si hay un brief
        const briefButtonHTML = data.brief ? `
            <button class="bot-action-button brief-button" title="Ver más">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11 19v-6H5v-2h6V5h2v6h6v2h-6v6z"/></svg>
            </button>
        ` : '';

        actionsDiv.innerHTML = `
            ${briefButtonHTML}
            <button class="bot-action-button generate-image-button" title="Generar Imagen">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zm1-2h12l-3.75-5l-3 4L9 13zm-1 2V5z"/></svg>
            </button>
            <button class="bot-action-button generate-diagram-button" title="Generar Diagrama">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1H14a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 2 7h5.5V6A1.5 1.5 0 0 1 6 4.5zM8.5 5a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5zM0 11.5A1.5 1.5 0 0 1 1.5 10h1A1.5 1.5 0 0 1 4 11.5v1A1.5 1.5 0 0 1 2.5 14h-1A1.5 1.5 0 0 1 0 12.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm4.5.5A1.5 1.5 0 0 1 7.5 10h1a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 8.5 14h-1A1.5 1.5 0 0 1 6 12.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm4.5.5a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/></svg>
            </button>
            <button class="bot-action-button generate-chart-button" title="Generar Estadistica">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M22 21H2V3h2v16h2v-9h4v9h2V6h4v13h2v-5h4z"/></svg>
            </button>
            <button class="bot-action-button generate-audio-button" title="Generar Audio" data-state="idle">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16" fill="currentColor"> <path  d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
                <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
                <path d="M10.025 8a4.5 4.5 0 0 1-1.318 3.182L8 10.475A3.5 3.5 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.5 4.5 0 0 1 10.025 8M7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11"/>
                </svg>
            </button>
        `;
        messageDiv.appendChild(actionsDiv);

        globalMessages.appendChild(messageDiv);
        scrollToBottom();
        unlockUserInput();
    }

    function sendMessage() {
        const text = userInput.value.trim();
        if (text) {
            addMessage(text, 'user');
            userInput.value = '';
            adjustTextareaHeight();
            showThinkingIndicator();

            lockUserInput();

            fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usar_base: usarBaseConocimiento,
                    prompt: {
                        tipo: 'texto',
                        contenido: text
                    }
                })
            })
                .then(response => response.json())
                .then(data => {
                    hideThinkingIndicator();
                    renderBotResponse(data); // <<<<<<
                })
                .catch(error => {
                    console.error('Error:', error);
                    hideThinkingIndicator();
                    renderBotResponse({ respuesta: 'Lo siento, algo salió mal.' }); // <<<<<<
                });
        }
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;

        globalMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    userInput.addEventListener('input', adjustTextareaHeight);
    adjustTextareaHeight();

    // --- FUNCIONALIDAD DE TOOLTIPS PARA GRÁFICOS ---
    function createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    function showTooltip(e, content) {
        let tooltip = document.querySelector('.chart-tooltip');
        if (!tooltip) {
            tooltip = createTooltip();
        }
        
        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        
        const rect = tooltip.getBoundingClientRect();
        const x = e.clientX + 15;
        const y = e.clientY - rect.height / 2;
        
        // Ajustar posición si se sale de la pantalla
        const maxX = window.innerWidth - rect.width - 10;
        const maxY = window.innerHeight - rect.height - 10;
        
        tooltip.style.left = Math.min(x, maxX) + 'px';
        tooltip.style.top = Math.max(10, Math.min(y, maxY)) + 'px';
    }

    function hideTooltip() {
        const tooltip = document.querySelector('.chart-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Event listeners para tooltips
    document.addEventListener('mouseover', function(e) {
        const chartImage = e.target.closest('.generated-chart-container img');
        if (chartImage) {
            const chartType = chartImage.dataset.chartType || 'Gráfico';
            const dataCount = chartImage.dataset.dataCount || '0';
            const chartTitle = chartImage.dataset.chartTitle || 'Sin título';
            
            const tooltipContent = `
                <div class="tooltip-header">${chartTitle}</div>
                <div class="tooltip-info">
                    <div><strong>Tipo:</strong> ${chartType}</div>
                    <div><strong>Elementos:</strong> ${dataCount} datos</div>
                    <div>Haz clic para ampliar</div>
                </div>
            `;
            
            showTooltip(e, tooltipContent);
        }
    });

    document.addEventListener('mousemove', function(e) {
        const chartImage = e.target.closest('.generated-chart-container img');
        if (chartImage) {
            const chartType = chartImage.dataset.chartType || 'Gráfico';
            const dataCount = chartImage.dataset.dataCount || '0';
            const chartTitle = chartImage.dataset.chartTitle || 'Sin título';
            
            const tooltipContent = `
                <div class="tooltip-header">${chartTitle}</div>
                <div class="tooltip-info">
                    <div><strong>Tipo:</strong> ${chartType}</div>
                    <div><strong>Elementos:</strong> ${dataCount} datos</div>
                    <div>Haz clic para ampliar</div>
                </div>
            `;
            
            showTooltip(e, tooltipContent);
        }
    });

    document.addEventListener('mouseout', function(e) {
        const chartImage = e.target.closest('.generated-chart-container img');
        if (chartImage && !e.relatedTarget?.closest('.generated-chart-container')) {
            hideTooltip();
        }
    });
});