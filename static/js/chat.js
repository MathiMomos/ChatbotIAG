document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('user-input');
    const globalMessages = document.getElementById('global-messages');
    const focoButton = document.getElementById('foco-button');
    const micButton = document.getElementById('mic-button');
    const enviarButton = document.getElementById('enviar-button');
    const pausarButton = document.getElementById('pausar-button');
    const closeImagePanelButton = document.getElementById('close-image-panel');
    const imageDisplayArea = document.querySelector('.image-display-area');

    const imageNavControls = document.getElementById('image-nav-controls');
    const prevItemBtn = document.getElementById('prev-item-btn');
    const nextItemBtn = document.getElementById('next-item-btn');
    const itemCounter = document.getElementById('item-counter');
    let currentItemIndex = 0;
    let totalItems = 0;

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let audioStream;
    let typeWriterTimeout;
    let stopTypingRequested = false;

    let audioPlayerId = 0;
    let usarBaseConocimiento = true;
    let isGeneratingContent = false;

    function updateCarousel() {
        const items = imageDisplayArea.querySelectorAll('.generated-image-container, .generated-diagram-container, .generated-chart-container');
        totalItems = items.length;

        if (totalItems > 0) {
            imageNavControls.style.display = 'flex';
            imageDisplayArea.style.transform = `translateX(-${currentItemIndex * 100}%)`;
            itemCounter.textContent = `${currentItemIndex + 1} / ${totalItems}`;
            prevItemBtn.disabled = currentItemIndex === 0;
            nextItemBtn.disabled = currentItemIndex === totalItems - 1;
        } else {
            imageNavControls.style.display = 'none';
        }
    }

    prevItemBtn.addEventListener('click', () => {
        if (currentItemIndex > 0) {
            currentItemIndex--;
            updateCarousel();
        }
    });

    nextItemBtn.addEventListener('click', () => {
        if (currentItemIndex < totalItems - 1) {
            currentItemIndex++;
            updateCarousel();
        }
    });


    // --- LOGICA DEL PANEL DE IMAGEN ---
    async function generateImage(messageElement) {
        if (isGeneratingContent) {
            throw new Error("Ya se está generando una imagen.");
        }

        isGeneratingContent = true;
        document.body.classList.add('image-view-active');

        const messageText = messageElement.querySelector('div').innerText || messageElement.textContent;
        console.log("Generando imagen para el mensaje:", messageText);

        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'generated-image-container';
        loadingIndicator.innerHTML = `<div class="typing-indicator" style="padding: 20px; margin: auto;"><span></span><span></span><span></span></div>`;

        // Limpiar imágenes anteriores
        const existingImages = imageDisplayArea.querySelectorAll('.generated-image-container');
        existingImages.forEach(image => image.remove());

        const placeholderText = imageDisplayArea.querySelector('p');
        if (placeholderText) {
            placeholderText.remove();
        }

        imageDisplayArea.appendChild(loadingIndicator);
        imageDisplayArea.scrollTop = imageDisplayArea.scrollHeight;
        try {
            const response = await fetch('/imagen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: messageText
                })
            });
            if (!response.ok) {
                throw new t(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            const imageContainer = document.createElement('div');
            imageContainer.className = 'generated-image-container';
            const img = document.createElement('img');
            img.src = data.url;
            img.alt = `Imagen generada`;
            imageContainer.appendChild(img);

            loadingIndicator.replaceWith(imageContainer);
            imageDisplayArea.scrollTop = imageDisplayArea.scrollHeight;
        } catch (error) {
            console.error("Error al generar la imagen:", error);
            loadingIndicator.remove();
            addMessage("Lo siento, no se pudo generar la imagen.", "bot");
        } finally {
            isGeneratingContent = false;
            currentItemIndex = 0;
            updateCarousel();
        }
    }

    // --- LOGICA DEL GRÁFICO ESTADÍSTICO ---

    async function generateChart(messageElement) {
        if (isGeneratingContent) {
            throw new Error("Ya se está generando un gráfico.");
        }

        isGeneratingContent = true;
        document.body.classList.add('image-view-active');

        let messageText;
        if (messageElement.classList.contains('bot-message')) {
            messageText = messageElement.querySelector('div').innerText || messageElement.textContent;
        } else if (messageElement.classList.contains('user-message')) {
            messageText = messageElement.textContent || messageElement.innerText;
        } else {
            messageText = messageElement.querySelector('div')?.innerText || messageElement.textContent || messageElement.innerText;
        }
        
        console.log("Generando gráfico estadístico para el mensaje:", messageText);
        
        const loadingContainer = document.createElement('div');
        loadingContainer.style.cssText = 'width:100%; height:100%; display:flex; justify-content:center; align-items:center; flex-shrink:0;';
        loadingContainer.innerHTML = `<div class="typing-indicator" style="padding: 20px; margin: auto;"><span></span><span></span><span></span></div>`;
        imageDisplayArea.appendChild(loadingContainer);

        try {
            const response = await fetch('/chart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: messageText
                })
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error || (data.valor && data.valor.error) || !data.valor || !data.valor.imagen) {
                throw new Error(data.error || data.valor?.error || "Los datos del gráfico no son válidos");
            }

            const chartContainer = document.createElement('div');
            chartContainer.className = 'generated-chart-container';
            
            const tooltip = document.createElement('div');
            tooltip.className = 'chart-tooltip';
            tooltip.innerHTML = `
                <div class="tooltip-header">📊 ${data.valor.titulo || 'Gráfico Estadístico'}</div>
                <div class="tooltip-info">
                    <div><strong>Tipo:</strong> ${data.valor.tipo_descriptivo || data.valor.tipo || 'Desconocido'}</div>
                    <div><strong>Elementos:</strong> ${data.valor.datos_count || 'N/A'} datos</div>
                    <div><strong>Creado:</strong> ${new Date().toLocaleTimeString()}</div>
                    <div>🔍 Haz clic para ampliar</div>
                </div>
            `;
            
            const img = document.createElement('img');
            img.src = data.valor.imagen;
            img.alt = `Gráfico: ${data.valor.titulo || 'Estadístico'}`;
            img.style.cursor = 'pointer';
            
            img.addEventListener('mouseenter', (e) => {
                tooltip.style.display = 'block';
                document.body.appendChild(tooltip);
            });
            img.addEventListener('mousemove', (e) => {
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY - 10) + 'px';
            });
            img.addEventListener('mouseleave', () => {
                if (document.body.contains(tooltip)) {
                    document.body.removeChild(tooltip);
                }
            });
            img.addEventListener('click', () => {
                const modal = document.createElement('div');
                modal.className = 'chart-modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <span class="modal-close">&times;</span>
                        <h3>${data.valor.titulo || 'Gráfico Estadístico'}</h3>
                        <img src="${data.valor.imagen}" alt="Gráfico ampliado" style="max-width: 90%; max-height: 80vh;">
                    </div>
                `;
                document.body.appendChild(modal);
                
                modal.addEventListener('click', (e) => {
                    if (e.target === modal || e.target.className === 'modal-close') {
                        document.body.removeChild(modal);
                    }
                });
            });

            chartContainer.appendChild(img);
            loadingContainer.remove();
            imageDisplayArea.appendChild(chartContainer);

            // ===== MODIFICACIÓN FINAL: ACTUALIZAR CARRUSEL =====
            currentItemIndex = imageDisplayArea.children.length - 1;
            updateCarousel();

        } catch (error) {
            console.error("Error al generar el gráfico:", error);
            loadingContainer.remove();
            addMessage("Lo siento, no se pudo generar el gráfico estadístico.", "bot");
        } finally {
            isGeneratingContent = false;
            currentItemIndex = 0;
            updateCarousel();
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

        let messageText;
        if (messageElement.classList.contains('bot-message')) {
            messageText = messageElement.querySelector('div').innerText || messageElement.textContent;
        } else if (messageElement.classList.contains('user-message')) {
            messageText = messageElement.textContent || messageElement.innerText; 
        } else {
            messageText = messageElement.querySelector('div')?.innerText || messageElement.textContent || messageElement.innerText; 
        }
        
        console.log("Generando diagrama para el mensaje:", messageText); 

        const loadingContainer = document.createElement('div');
        loadingContainer.style.cssText = 'width:100%; height:100%; display:flex; justify-content:center; align-items:center; flex-shrink:0;';
        loadingContainer.innerHTML = `<div class="typing-indicator" style="padding: 20px; margin: auto;"><span></span><span></span><span></span></div>`;
        imageDisplayArea.appendChild(loadingContainer);

        // --- MODIFICACIÓN CLAVE: NO LIMPIAR DIAGRAMAS ANTERIORES ---
        // const existingDiagrams = imageDisplayArea.querySelectorAll('.generated-diagram-container');
        // existingDiagrams.forEach(diagram => diagram.remove()); // <-- LÍNEA COMENTADA/ELIMINADA
        
        try {
            const response = await fetch('/diagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: messageText
                })
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`); 
            }

            const data = await response.json(); 
            if (data.error || (data.valor && data.valor.error) || !data.valor || !data.valor.nodes) {
                throw new Error(data.error || data.valor?.error || "Los datos del diagrama no son válidos");
            }
            
            const diagramContainer = document.createElement('div'); 
            diagramContainer.className = 'generated-diagram-container'; 
            
            const diagramId = 'diagram-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
            diagramContainer.innerHTML = `<div id="${diagramId}" style="width:100%; height:100%; background-color: white; border-radius: 10px;"></div>`;
            
            loadingContainer.remove();
            imageDisplayArea.appendChild(diagramContainer);

            // ===== MODIFICACIÓN FINAL: ACTUALIZAR CARRUSEL ANTES DE RENDERIZAR EL DIAGRAMA =====
            currentItemIndex = imageDisplayArea.children.length - 1;
            updateCarousel();
            
            setTimeout(() => {
                try {
                    let diagramData = data.valor; 
                    const hasParentProperty = diagramData.nodes && diagramData.nodes.some(node => node.parent); 
                    const targetDiv = document.getElementById(diagramId); 

                    if (!targetDiv) {
                        throw new Error(`No se pudo encontrar el div con ID: ${diagramId}`); 
                    }

                    const $ = go.GraphObject.make; 
                    const myDiagram = new go.Diagram(diagramId); 

                    myDiagram.initialContentAlignment = go.Spot.Center; 
                    myDiagram.undoManager.isEnabled = true; 

                    if (hasParentProperty) {
                        myDiagram.layout = $(go.TreeLayout, {
                            angle: 90,
                            layerSpacing: 80,
                            nodeSpacing: 40,
                        });
                    } else {
                        myDiagram.layout = $(go.LayeredDigraphLayout, {
                            direction: 90,
                            layerSpacing: 60,
                            columnSpacing: 40,
                        });
                    }

                    myDiagram.nodeTemplate =
                        $(go.Node, "Auto",
                            $(go.Shape, "RoundedRectangle", { 
                                strokeWidth: 2, 
                                stroke: "#333",
                                fill: "white",
                            }, new go.Binding("fill", "color")),
                            $(go.TextBlock, { 
                                margin: 12, 
                                font: "bold 13px sans-serif", 
                                stroke: "#000",
                                textAlign: "center",
                            }, new go.Binding("text", "text"))
                        );

                    myDiagram.linkTemplate =
                        $(go.Link,
                            { routing: go.Link.Orthogonal, corner: 8 },
                            $(go.Shape, { strokeWidth: 2, stroke: "#666" }),
                            $(go.Shape, { toArrow: "Standard", fill: "#666", stroke: "#666" })
                        );

                    if (diagramData.nodes) {
                        diagramData.nodes = diagramData.nodes.map(node => {
                            if (!node.color || node.color === 'white') {
                                node.color = 'lightblue';
                            }
                            return node;
                        });
                    }
                    
                    if (hasParentProperty) {
                        myDiagram.model = new go.TreeModel(diagramData.nodes || []);
                    } else {
                        myDiagram.model = new go.GraphLinksModel(diagramData.nodes || [], diagramData.links || []);
                    }

                } catch (diagramError) {
                    console.error("Error al crear el diagrama GoJS:", diagramError);
                    const targetDiv = document.getElementById(diagramId);
                    if (targetDiv) {
                        targetDiv.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">Error al generar el diagrama: ${diagramError.message}</div>`;
                    }
                }
            }, 100);

        } catch (error) {
            console.error("Error al generar el diagrama:", error);
            loadingContainer.remove();
            addMessage("Lo siento, no se pudo generar el diagrama.", "bot");
        } finally {
            isGeneratingContent = false;
            currentItemIndex = 0;
            updateCarousel();
        }
    }

    globalMessages.addEventListener('click', function (event) {
        // IMAGEN
        const imageButton = event.target.closest('.generate-image-button');
        if (imageButton) {
            const messageElement = event.target.closest('.bot-message')
            // Busca el mensaje del bot más cercano
            if (messageElement) {
                generateImage(messageElement);
            }
        }
        // DIAGRAMA
        const diagramButton = event.target.closest('.generate-diagram-button');
        if (diagramButton) {
            const messageElement = event.target.closest('.bot-message, .user-message');
            if (messageElement) {
                generateDiagram(messageElement);
            }
        }
        // ESTADISTICA
        const chartButton = event.target.closest('.generate-chart-button');
        if (chartButton) {
            const messageElement = event.target.closest('.bot-message, .user-message');
            if (messageElement) {
                generateChart(messageElement);
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
        console.log("Usar base de conocimiento:", usarBaseConocimiento);
    });

    closeImagePanelButton.addEventListener('click', () => {
        console.log('Cerrando panel de imagen...');
        document.body.classList.remove('image-view-active');
        
        imageDisplayArea.innerHTML = '';
        
        currentItemIndex = 0;
        totalItems = 0;
        updateCarousel();
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
        globalMessages.appendChild(indicatorDiv);
        scrollToBottom();
    }

    function hideThinkingIndicator() {
        const indicator = document.getElementById('thinking-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function renderBotResponse(markdownText) {
        stopTypingRequested = false;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot-message');

        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = marked.parse(markdownText);
        messageDiv.appendChild(contentDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'bot-actions';
        actionsDiv.innerHTML = `
            <button class="bot-action-button generate-image-button" title="Generar Imagen">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zm1-2h12l-3.75-5l-3 4L9 13zm-1 2V5z"/></svg>
            </button>
            <button class="bot-action-button generate-diagram-button" title="Generar Diagrama">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1H14a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 2 7h5.5V6A1.5 1.5 0 0 1 6 4.5zM8.5 5a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5zM0 11.5A1.5 1.5 0 0 1 1.5 10h1A1.5 1.5 0 0 1 4 11.5v1A1.5 1.5 0 0 1 2.5 14h-1A1.5 1.5 0 0 1 0 12.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm4.5.5A1.5 1.5 0 0 1 7.5 10h1a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 8.5 14h-1A1.5 1.5 0 0 1 6 12.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm4.5.5a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/></svg>
            </button>
            <button class="bot-action-button generate-chart-button" title="Generar Estadistica">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M22 21H2V3h2v16h2v-9h4v9h2V6h4v13h2v-5h4z"/></svg>
            </button>
        `;
        messageDiv.appendChild(actionsDiv);

        globalMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function sendMessage() {
        const text = userInput.value.trim();
        if (text) {
            addMessage(text, 'user');
            userInput.value = '';
            adjustTextareaHeight();
            showThinkingIndicator();

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
                    renderBotResponse(data.respuesta);
                })
                .catch(error => {
                    console.error('Error:', error);
                    hideThinkingIndicator();
                    renderBotResponse('Lo siento, algo salió mal.');
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
});