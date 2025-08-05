document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('user-input');
    const globalMessages = document.getElementById('global-messages');
    const focoButton = document.getElementById('foco-button');
    const micButton = document.getElementById('mic-button');
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
    let isGeneratingContent = false;

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
        }
    }

    // --- LOGICA DEL GRÁFICO ESTADÍSTICO ---

    async function generateChart(messageElement) {
        if (isGeneratingContent) {
            throw new Error("Ya se está generando un gráfico.");
        }

        isGeneratingContent = true;
        document.body.classList.add('image-view-active');

        // Obtener texto del mensaje, funcionando tanto para mensajes del bot como del usuario
        let messageText;
        if (messageElement.classList.contains('bot-message')) {
            // Para mensajes del bot, buscar en el div del contenido
            messageText = messageElement.querySelector('div').innerText || messageElement.textContent;
        } else if (messageElement.classList.contains('user-message')) {
            // Para mensajes del usuario, obtener directamente el texto
            messageText = messageElement.textContent || messageElement.innerText;
        } else {
            // Fallback para cualquier otro tipo de mensaje
            messageText = messageElement.querySelector('div')?.innerText || messageElement.textContent || messageElement.innerText;
        }
        
        console.log("Generando gráfico estadístico para el mensaje:", messageText);

        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'generated-chart-container';
        loadingIndicator.innerHTML = `<div class="typing-indicator" style="padding: 20px; margin: auto;"><span></span><span></span><span></span></div>`;

        const imageDisplayArea = document.getElementById('image-panel').querySelector('.image-display-area');
        
        // Limpiar gráficos anteriores
        const existingCharts = imageDisplayArea.querySelectorAll('.generated-chart-container');
        existingCharts.forEach(chart => chart.remove());
        
        const placeholderText = imageDisplayArea.querySelector('p');
        if (placeholderText) {
            placeholderText.remove();
        }

        imageDisplayArea.appendChild(loadingIndicator);
        imageDisplayArea.scrollTop = imageDisplayArea.scrollHeight;

        try {
            const response = await fetch('/chart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: messageText
                })
            });

            console.log("Respuesta del servidor:", response.status);

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log("Datos del gráfico recibidos:", data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.valor && data.valor.error) {
                throw new Error(data.valor.error);
            }
            
            if (!data.valor || !data.valor.imagen) {
                throw new Error("Los datos del gráfico no son válidos");
            }

            // Crear el contenedor del gráfico
            const chartContainer = document.createElement('div');
            chartContainer.className = 'generated-chart-container';
            
            // Crear tooltip con información del gráfico
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
            img.style.cssText = 'max-width: 100%; height: auto; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.3s ease;';
            
            // Eventos para mostrar/ocultar tooltip
            img.addEventListener('mouseenter', (e) => {
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY - 10) + 'px';
                document.body.appendChild(tooltip);
                img.style.transform = 'scale(1.02)';
            });
            
            img.addEventListener('mousemove', (e) => {
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY - 10) + 'px';
            });
            
            img.addEventListener('mouseleave', () => {
                if (document.body.contains(tooltip)) {
                    document.body.removeChild(tooltip);
                }
                img.style.transform = 'scale(1)';
            });
            
            // Evento para ampliar el gráfico al hacer clic
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
                
                // Cerrar modal
                modal.addEventListener('click', (e) => {
                    if (e.target === modal || e.target.className === 'modal-close') {
                        document.body.removeChild(modal);
                    }
                });
            });
            
            chartContainer.appendChild(img);
            loadingIndicator.replaceWith(chartContainer);

            imageDisplayArea.scrollTop = imageDisplayArea.scrollHeight;

        } catch (error) {
            console.error("Error al generar el gráfico:", error);
            loadingIndicator.remove();
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

        // Verificar que GoJS esté disponible
        if (typeof go === 'undefined') {
            console.error("GoJS no está cargado");
            addMessage("Error: GoJS no está disponible. Verifica la conexión a internet.", "bot");
            return;
        }

        isGeneratingContent = true;
        document.body.classList.add('image-view-active');

        // Obtener texto del mensaje, funcionando tanto para mensajes del bot como del usuario
        let messageText;
        if (messageElement.classList.contains('bot-message')) {
            // Para mensajes del bot, buscar en el div del contenido
            messageText = messageElement.querySelector('div').innerText || messageElement.textContent;
        } else if (messageElement.classList.contains('user-message')) {
            // Para mensajes del usuario, obtener directamente el texto
            messageText = messageElement.textContent || messageElement.innerText;
        } else {
            // Fallback para cualquier otro tipo de mensaje
            messageText = messageElement.querySelector('div')?.innerText || messageElement.textContent || messageElement.innerText;
        }
        
        console.log("Generando diagrama para el mensaje:", messageText);

        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'generated-diagram-container';
        loadingIndicator.innerHTML = `<div class="typing-indicator" style="padding: 20px; margin: auto;"><span></span><span></span><span></span></div>`;

        const imageDisplayArea = document.getElementById('image-panel').querySelector('.image-display-area');
        
        // Limpiar diagramas anteriores
        const existingDiagrams = imageDisplayArea.querySelectorAll('.generated-diagram-container');
        existingDiagrams.forEach(diagram => diagram.remove());
        
        const placeholderText = imageDisplayArea.querySelector('p');
        if (placeholderText) {
            placeholderText.remove();
        }

        imageDisplayArea.appendChild(loadingIndicator);
        imageDisplayArea.scrollTop = imageDisplayArea.scrollHeight;

        try {
            const response = await fetch('/diagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: messageText
                })
            });

            console.log("Respuesta del servidor:", response.status);

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            console.log("Datos recibidos:", data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.valor && data.valor.error) {
                throw new Error(data.valor.error);
            }
            
            if (!data.valor || !data.valor.nodes) {
                throw new Error("Los datos del diagrama no son válidos");
            }

            // Crear un nuevo contenedor para este diagrama específico
            const diagramContainer = document.createElement('div');
            diagramContainer.className = 'generated-diagram-container';
            
            // Generar un ID único para este diagrama con timestamp más preciso
            let diagramId;
            let attempts = 0;
            do {
                diagramId = 'diagram-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
                attempts++;
            } while (document.getElementById(diagramId) && attempts < 10);
            
            // Crear solo el contenedor del diagrama sin información visible
            diagramContainer.innerHTML = `<div id="${diagramId}" style="width:100%; height:400px; border: 1px solid #ccc; background-color: white; border-radius: 10px; margin-bottom: 10px;"></div>`;

            loadingIndicator.replaceWith(diagramContainer);

            // Esperar un momento para que el DOM se actualice
            setTimeout(() => {
                try {
                    // Procesar los datos del diagrama primero
                    let diagramData = data.valor;
                    
                    // Si no hay datos válidos, crear un diagrama de ejemplo
                    if (!diagramData || !diagramData.nodes || diagramData.nodes.length === 0) {
                        console.warn("No se recibieron datos válidos, usando diagrama de ejemplo");
                        diagramData = {
                            nodes: [
                                { key: "1", text: "Tema Principal", color: "lightblue" },
                                { key: "2", text: "Subtema 1", color: "lightgreen", parent: "1" },
                                { key: "3", text: "Subtema 2", color: "lightcoral", parent: "1" }
                            ],
                            links: [
                                { from: "1", to: "2" },
                                { from: "1", to: "3" }
                            ]
                        };
                    }

                    // Determinar el tipo de layout basado en los datos
                    let hasParentProperty = diagramData.nodes && diagramData.nodes.some(node => node.parent);
                    
                    // Verificar que el div existe y no tiene un diagrama ya asociado
                    const targetDiv = document.getElementById(diagramId);
                    if (!targetDiv) {
                        throw new Error(`No se pudo encontrar el div con ID: ${diagramId}`);
                    }

                    // Limpiar cualquier diagrama previo que pueda estar asociado
                    if (targetDiv.diagram) {
                        targetDiv.diagram.div = null;
                    }

                    // Inicializar GoJS en el nuevo div
                    const $ = go.GraphObject.make;
                    const myDiagram = new go.Diagram(diagramId);

                    // Configurar propiedades básicas del diagrama
                    myDiagram.initialContentAlignment = go.Spot.Center;
                    myDiagram.allowZoom = true;
                    myDiagram.allowHorizontalScroll = true;
                    myDiagram.allowVerticalScroll = true;
                    myDiagram.undoManager.isEnabled = true;

                    // Configurar el layout del diagrama según el tipo
                    if (hasParentProperty) {
                        // Layout para organigramas y estructuras jerárquicas
                        myDiagram.layout = $(go.TreeLayout, {
                            angle: 90,
                            layerSpacing: 80,
                            nodeSpacing: 40,
                            compaction: go.TreeLayout.CompactionNone,
                            alignment: go.TreeLayout.AlignmentCenterChildren,
                            arrangement: go.TreeLayout.ArrangementHorizontal
                        });
                    } else {
                        // Layout para procesos y flujos secuenciales
                        myDiagram.layout = $(go.LayeredDigraphLayout, {
                            direction: 90,
                            layerSpacing: 60,
                            columnSpacing: 40,
                            setsPortSpots: false
                        });
                    }

                    // Configurar el template de nodos
                    myDiagram.nodeTemplate =
                        $(go.Node, "Auto",
                            { 
                                selectionChanged: function(node) {
                                    node.diagram.clearHighlighteds();
                                    if (node.isSelected) {
                                        node.findLinksConnected().each(function(link) {
                                            link.isHighlighted = true;
                                        });
                                    }
                                }
                            },
                            $(go.Shape, "RoundedRectangle", { 
                                strokeWidth: 2, 
                                stroke: "#333",
                                fill: "white",
                                portId: "",
                                cursor: "pointer",
                                minSize: new go.Size(120, 40)
                            },
                                new go.Binding("fill", "color")),
                            $(go.TextBlock, { 
                                margin: 12, 
                                font: "bold 13px sans-serif", 
                                stroke: "#000",
                                maxSize: new go.Size(180, NaN), 
                                wrap: go.TextBlock.WrapFit,
                                textAlign: "center",
                                verticalAlignment: go.Spot.Center
                            },
                                new go.Binding("text", "text"))
                        );

                    // Configurar el template de enlaces
                    myDiagram.linkTemplate =
                        $(go.Link,
                            { 
                                routing: go.Link.Orthogonal, 
                                corner: 8,
                                selectable: false,
                                reshapable: true,
                                relinkableFrom: true,
                                relinkableTo: true
                            },
                            $(go.Shape, { 
                                strokeWidth: 2, 
                                stroke: "#666"
                            }),
                            $(go.Shape, { 
                                toArrow: "Standard", 
                                fill: "#666", 
                                stroke: "#666",
                                scale: 1.3
                            })
                        );

                    // Asegurar que todos los nodos tengan un color visible
                    if (diagramData.nodes) {
                        diagramData.nodes = diagramData.nodes.map(node => {
                            if (!node.color || node.color === 'white' || node.color === 'transparent') {
                                node.color = 'lightblue';  // Color por defecto
                            }
                            return node;
                        });
                    }
                    
                    // Crear el modelo apropiado según el tipo de datos
                    if (hasParentProperty) {
                        // Usar TreeModel para datos jerárquicos con relaciones padre-hijo
                        myDiagram.model = new go.TreeModel(diagramData.nodes || []);
                    } else {
                        // Usar GraphLinksModel para datos con enlaces explícitos
                        myDiagram.model = new go.GraphLinksModel(diagramData.nodes || [], diagramData.links || []);
                    }
                    
                    // Log interno para depuración (no visible para el usuario)
                    console.log("Diagrama generado exitosamente con ID:", diagramId);
                    console.log("Input procesado:", messageText.substring(0, 50) + "...");
                    console.log("Output generado - Nodos:", diagramData.nodes?.length || 0, "Enlaces:", diagramData.links?.length || 0);
                } catch (diagramError) {
                    console.error("Error al crear el diagrama GoJS:", diagramError);
                    console.error("Input que causó el error:", messageText.substring(0, 50) + "...");
                    
                    // Mostrar mensaje de error en el contenedor del diagrama
                    const targetDiv = document.getElementById(diagramId);
                    if (targetDiv) {
                        targetDiv.innerHTML = `<div style="padding: 20px; color: red; text-align: center;">Error al generar el diagrama: ${diagramError.message}</div>`;
                    }
                }
            }, 100);

            imageDisplayArea.scrollTop = imageDisplayArea.scrollHeight;

        } catch (error) {
            console.error("Error al generar el diagrama:", error);
            loadingIndicator.remove();
            addMessage("Lo siento, no se pudo generar el diagrama.", "bot");
        } finally {
            isGeneratingContent = false;
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
        
        // Limpiar el contenido del diagrama
        const diagramDiv = document.getElementById('myDiagramDiv');
        if (diagramDiv) {
            diagramDiv.innerHTML = '';
            diagramDiv.style.display = 'none';
        }
        
        // Limpiar contenedores generados
        const generatedContainers = imageDisplayArea.querySelectorAll('.generated-image-container, .generated-diagram-container, .generated-chart-container');
        generatedContainers.forEach(container => container.remove());
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