document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const state = {
        channels: {
            a: { sessionId: null, passcode: null, session: null },
            b: { sessionId: null, passcode: null, session: null }
        },
        inputDevices: [],
        outputDevices: [],
        supportsSinkId: 'setSinkId' in HTMLAudioElement.prototype
    };

    const languageMap = {
        'af': 'Afrikaans', 'sq': 'Albanian', 'ar': 'Arabic', 'hy': 'Armenian', 'bn': 'Bengali', 'bg': 'Bulgarian',
        'zh-HK': 'Cantonese', 'ca': 'Catalan', 'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
        'hr': 'Croatian', 'cs': 'Czech', 'da': 'Danish', 'nl': 'Dutch', 'en': 'English (US)', 'en-AU': 'English (AU)',
        'en-GB': 'English (UK)', 'et': 'Estonian', 'fi': 'Finnish', 'fr': 'French (FR)', 'fr-CA': 'French (CA)',
        'ka': 'Georgian', 'de': 'German', 'el': 'Greek', 'gu': 'Gujarati', 'he': 'Hebrew', 'hi': 'Hindi',
        'hu': 'Hungarian', 'is': 'Icelandic', 'id': 'Indonesian', 'ga': 'Irish', 'it': 'Italian', 'ja': 'Japanese',
        'kn': 'Kannada', 'ko': 'Korean', 'lv': 'Latvian', 'lt': 'Lithuanian', 'mk': 'Macedonian', 'ms': 'Malay',
        'mt': 'Maltese', 'no': 'Norwegian', 'fa': 'Persian', 'pl': 'Polish', 'pt': 'Portuguese (PT)',
        'pt-BR': 'Portuguese (BR)', 'ro': 'Romanian', 'ru': 'Russian', 'sr': 'Serbian', 'sk': 'Slovak',
        'sl': 'Slovenian', 'es': 'Spanish (ES)', 'es-MX': 'Spanish (MX)', 'sv': 'Swedish', 'tl': 'Tagalog',
        'th': 'Thai', 'tr': 'Turkish', 'uk': 'Ukrainian', 'ur': 'Urdu', 'vi': 'Vietnamese', 'cy': 'Welsh',
        'bs': 'Bosnian', 'ht': 'Haitian Creole', 'lo': 'Lao', 'pa': 'Punjabi', 'sw': 'Swahili', 'ta': 'Tamil',
        'zu': 'Zulu'
    };

    // --- DOM ELEMENTS ---
    const dom = {
        loginPage: document.getElementById('login-page'),
        appPage: document.getElementById('app-page'),
        loginForm: document.getElementById('login-form'),
        loginStatus: document.getElementById('login-status'),
        endSessionBtn: document.getElementById('end-session-btn'),
        refreshDevicesBtn: document.getElementById('refresh-devices-btn'),
        channels: {
            a: {
                sessionIdInput: document.getElementById('session-id-a'),
                passcodeInput: document.getElementById('passcode-a'),
                sessionIdDisplay: document.getElementById('session-id-display-a'),
                connectionToggleBtn: document.getElementById('connection-toggle-btn-a'),
                muteBtn: document.getElementById('mute-btn-a'),
                statusLightPresent: document.getElementById('status-light-present-a'),
                statusLightAttend: document.getElementById('status-light-attend-a'),
                inputDeviceSelect: document.getElementById('input-device-select-a'),
                sourceLanguageSelect: document.getElementById('source-language-select-a'),
                targetLanguageSelect: document.getElementById('target-language-select-a'),
                outputDeviceSelect: document.getElementById('output-device-select-a'),
                transcript: document.getElementById('transcript-a')
            },
            b: {
                sessionIdInput: document.getElementById('session-id-b'),
                passcodeInput: document.getElementById('passcode-b'),
                sessionIdDisplay: document.getElementById('session-id-display-b'),
                connectionToggleBtn: document.getElementById('connection-toggle-btn-b'),
                muteBtn: document.getElementById('mute-btn-b'),
                statusLightPresent: document.getElementById('status-light-present-b'),
                statusLightAttend: document.getElementById('status-light-attend-b'),
                inputDeviceSelect: document.getElementById('input-device-select-b'),
                sourceLanguageSelect: document.getElementById('source-language-select-b'),
                targetLanguageSelect: document.getElementById('target-language-select-b'),
                outputDeviceSelect: document.getElementById('output-device-select-b'),
                transcript: document.getElementById('transcript-b')
            }
        }
    };

    // --- INITIALIZATION ---
    function init() {
        populateLanguageDropdowns();
        setupEventListeners();
    }

    function setupEventListeners() {
        dom.loginForm.addEventListener('submit', handleLogin);
        dom.refreshDevicesBtn.addEventListener('click', populateDeviceLists);
        dom.endSessionBtn.addEventListener('click', handleEndSession);

        ['a', 'b'].forEach(channelId => {
            dom.channels[channelId].connectionToggleBtn.addEventListener('click', () => handleConnectionToggle(channelId));
            dom.channels[channelId].muteBtn.addEventListener('click', () => handleMuteToggle(channelId));
        });
    }

    function returnToLoginScreen() {
        ['a', 'b'].forEach(channelId => {
            if (state.channels[channelId].session) {
                state.channels[channelId].session.disconnect(null, false); 
            }
            state.channels[channelId].session = null;
            state.channels[channelId].sessionId = null;
            state.channels[channelId].passcode = null;
            dom.channels[channelId].sessionIdInput.value = '';
            dom.channels[channelId].passcodeInput.value = '';
            dom.channels[channelId].transcript.innerHTML = '';
            dom.channels[channelId].sessionIdDisplay.textContent = '';
            updateUIState(channelId, { presentStatus: 'disconnected', attendStatus: 'disconnected' });
            updateMuteButton(channelId, false);
        });
        
        dom.loginStatus.textContent = '';
        dom.loginStatus.className = 'status-message';
        dom.appPage.classList.remove('active');
        dom.loginPage.classList.add('active');
    }

    // --- LOGIN ---
    async function handleLogin(e) {
        e.preventDefault();
        showLoginStatus('Getting audio permissions...', false);
        try {
            await populateDeviceLists();
            for (const channelId of ['a', 'b']) {
                const chan = state.channels[channelId];
                const domChan = dom.channels[channelId];
                chan.sessionId = domChan.sessionIdInput.value.trim();
                chan.passcode = domChan.passcodeInput.value.trim();
                if (!chan.sessionId || !chan.passcode) {
                    throw new Error(`Session ID and Passcode are required for Channel ${channelId.toUpperCase()}.`);
                }
                domChan.sessionIdDisplay.textContent = `Ch ${channelId.toUpperCase()}: ${chan.sessionId}`;
            }
            dom.loginPage.classList.remove('active');
            dom.appPage.classList.add('active');
        } catch (err) {
            console.error("Login failed:", err);
            showLoginStatus(`Error: ${err.message}`, true);
        }
    }

    function showLoginStatus(message, isError) {
        dom.loginStatus.textContent = message;
        dom.loginStatus.className = isError ? 'status-message error' : 'status-message';
    }

    // --- DEVICE & LANGUAGE MANAGEMENT ---
    async function populateDeviceLists() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            const devices = await navigator.mediaDevices.enumerateDevices();
            state.inputDevices = devices.filter(d => d.kind === 'audioinput');
            state.outputDevices = devices.filter(d => d.kind === 'audiooutput');

            ['a', 'b'].forEach(channelId => {
                const domChan = dom.channels[channelId];
                populateSelect(domChan.inputDeviceSelect, state.inputDevices, 'Default Microphone');
                populateSelect(domChan.outputDeviceSelect, state.outputDevices, 'Default Speaker');
                if (!state.supportsSinkId) {
                    domChan.outputDeviceSelect.disabled = true;
                }
            });
             if (!state.supportsSinkId) {
                addSystemMessage('a', "Browser doesn't support output selection.", true);
             }
        } catch (error) {
            console.error("Could not get media devices:", error);
            showLoginStatus(`Error: Could not access audio devices. Please grant permission.`, true);
        }
    }

    function populateSelect(selectEl, deviceList, defaultLabel) {
        const currentVal = selectEl.value;
        selectEl.innerHTML = `<option value="">${defaultLabel}</option>`;
        deviceList.forEach(device => {
            const option = new Option(device.label || `${device.kind} ${device.deviceId.slice(0,6)}`, device.deviceId);
            selectEl.add(option);
        });
        if ([...selectEl.options].some(o => o.value === currentVal)) {
            selectEl.value = currentVal;
        }
    }

    function populateLanguageDropdowns() {
        ['a', 'b'].forEach(channelId => {
            const domChan = dom.channels[channelId];
            for (const [code, name] of Object.entries(languageMap)) {
                domChan.sourceLanguageSelect.add(new Option(name, code));
                domChan.targetLanguageSelect.add(new Option(name, code));
            }
            if (channelId === 'a') {
                domChan.sourceLanguageSelect.value = 'en';
                domChan.targetLanguageSelect.value = 'es-MX';
            } else {
                domChan.sourceLanguageSelect.value = 'es-MX';
                domChan.targetLanguageSelect.value = 'en';
            }
        });
    }

    // --- CORE CONNECTION LOGIC ---
    function handleConnectionToggle(channelId) {
        const session = state.channels[channelId].session;
        if (session && session.isConnecting) {
             session.disconnect('Connection cancelled by user.');
        } else if (session && (session.present.isConnected || session.attend.isConnected)) {
            session.disconnect('User initiated disconnect.');
        } else {
            connect(channelId);
        }
    }
    
    function handleMuteToggle(channelId) {
        const session = state.channels[channelId].session;
        if (session && session.present.isConnected) {
            session.toggleMute();
        }
    }

    function connect(channelId) {
        const chan = state.channels[channelId];
        const domChan = dom.channels[channelId];
        const sessionConfig = {
            sessionId: chan.sessionId,
            passcode: chan.passcode,
            inputDeviceId: domChan.inputDeviceSelect.value,
            outputDeviceId: domChan.outputDeviceSelect.value,
            sourceLanguage: domChan.sourceLanguageSelect.value,
            targetLanguage: domChan.targetLanguageSelect.value,
            name: `Babelfish User ${channelId.toUpperCase()}`
        };
        chan.session = new BabelfishSession(sessionConfig);
        chan.session.addEventListener('status_change', e => updateUIState(channelId, e.detail));
        chan.session.addEventListener('transcript', e => addTranscriptMessage(channelId, e.detail.text, e.detail.type, e.detail.phraseId, e.detail.isFinal));
        chan.session.addEventListener('system_message', e => addSystemMessage(channelId, e.detail.text, e.detail.isError));
        chan.session.addEventListener('mute_change', e => updateMuteButton(channelId, e.detail.isMuted));
        chan.session.connect();
    }
    
    function handleEndSession() {
        if (!confirm("Are you sure you want to end BOTH sessions for everyone?")) {
            return;
        }

        addSystemMessage('a', "Sending command to end all sessions...");
        addSystemMessage('b', "Sending command to end all sessions...");

        const ender = (channelId) => {
            return new Promise((resolve) => {
                const chan = state.channels[channelId];
                if (!chan.sessionId || !chan.passcode) return resolve();

                const tempWs = new WebSocket('wss://dev-endpoint.wordly.ai/present');
                
                const cleanup = () => {
                    tempWs.onopen = tempWs.onmessage = tempWs.onclose = tempWs.onerror = null;
                    if (tempWs.readyState !== WebSocket.CLOSED) tempWs.close();
                    resolve();
                };

                tempWs.onopen = () => {
                    tempWs.send(JSON.stringify({
                        type: 'connect', presentationCode: chan.sessionId, accessKey: chan.passcode
                    }));
                };
                tempWs.onmessage = (event) => {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'status' && msg.success) {
                        tempWs.send(JSON.stringify({ type: 'disconnect', end: true }));
                    }
                    cleanup();
                };
                tempWs.onclose = cleanup;
                tempWs.onerror = cleanup;
            });
        };

        Promise.all([ender('a'), ender('b')]).then(() => {
            returnToLoginScreen();
        });
    }

    function updateUIState(channelId, { presentStatus, attendStatus }) {
        const domChan = dom.channels[channelId];
        domChan.statusLightPresent.className = `session-status-light ${presentStatus}`;
        domChan.statusLightAttend.className = `session-status-light ${attendStatus}`;
        
        const isConnected = presentStatus === 'connected' || attendStatus === 'connected';
        const isConnecting = presentStatus === 'connecting' || attendStatus === 'connecting';
        
        domChan.connectionToggleBtn.textContent = isConnected ? 'Leave' : (isConnecting ? 'Cancel' : 'Join');
        domChan.connectionToggleBtn.className = `btn ${isConnected ? 'btn-connect disconnect' : 'btn-connect'}`;
        
        const shouldDisableSettings = isConnected || isConnecting;
        domChan.inputDeviceSelect.disabled = shouldDisableSettings;
        domChan.outputDeviceSelect.disabled = shouldDisableSettings || !state.supportsSinkId;
        domChan.sourceLanguageSelect.disabled = shouldDisableSettings;
        domChan.targetLanguageSelect.disabled = shouldDisableSettings;

        domChan.muteBtn.disabled = presentStatus !== 'connected';
        if (presentStatus !== 'connected') {
            updateMuteButton(channelId, false);
        }
    }
    
    function updateMuteButton(channelId, isMuted) {
        dom.channels[channelId].muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
        dom.channels[channelId].muteBtn.classList.toggle('muted', isMuted);
    }

    // --- UI MESSAGING ---
    function addSystemMessage(channelId, text, isError = false) {
        const transcriptEl = dom.channels[channelId]?.transcript;
        if (!transcriptEl) return;
        const el = document.createElement('div');
        el.className = isError ? 'phrase system error' : 'phrase system';
        el.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        transcriptEl.insertBefore(el, transcriptEl.firstChild);
    }

    function addTranscriptMessage(channelId, text, type, phraseId, isFinal) {
        const transcriptEl = dom.channels[channelId]?.transcript;
        if (!transcriptEl) return;
        const uniqueId = `${channelId}-${type}-${phraseId}`;
        let el = document.getElementById(uniqueId);
        if (!el) {
            el = document.createElement('div');
            el.id = uniqueId;
            el.className = `phrase ${type}`;
            transcriptEl.insertBefore(el, transcriptEl.firstChild);
        }
        el.textContent = text;
        if (isFinal) {
            el.classList.add('final');
        }
    }

    // --- BABELFISH SESSION CLASS ---
    class BabelfishSession extends EventTarget {
        constructor(config) {
            super();
            this.config = config;
            this.present = { ws: null, status: 'disconnected', isConnected: false };
            this.attend = { ws: null, status: 'disconnected', isConnected: false };
            this.audioContext = null;
            this.mediaStream = null;
            this.scriptProcessor = null;
            this.audioQueue = [];
            this.isPlaying = false;
            this.currentAudioElement = null;
            this.isMuted = false;
        }

        get isConnecting() { return this.present.status === 'connecting' || this.attend.status === 'connecting'; }

        _emitStatus() { this.dispatchEvent(new CustomEvent('status_change', { detail: { presentStatus: this.present.status, attendStatus: this.attend.status } })); }
        _emitSystemMessage(text, isError = false) { this.dispatchEvent(new CustomEvent('system_message', { detail: { text, isError } })); }
        _emitTranscript(text, type, phraseId, isFinal) { this.dispatchEvent(new CustomEvent('transcript', { detail: { text, type, phraseId, isFinal } })); }
        _emitMuteChange() { this.dispatchEvent(new CustomEvent('mute_change', {detail: { isMuted: this.isMuted }})); }

        connect() {
            if (this.isConnecting || this.present.isConnected || this.attend.isConnected) return;
            this._connectPresent();
            this._connectAttend();
        }
        
        disconnect(reason = 'User disconnected.', shouldEmitMessage = true) {
             this._handleDisconnect('present', false, reason, shouldEmitMessage);
             this._handleDisconnect('attend', false, reason, shouldEmitMessage);
        }
        
        endSessionForAll() {
            if (this.present.isConnected) {
                this._send('present', { type: 'disconnect', end: true });
            }
        }
        
        toggleMute() {
            this.isMuted = !this.isMuted;
            this._emitSystemMessage(`Microphone ${this.isMuted ? 'muted' : 'unmuted'}.`);
            this._emitMuteChange();
        }

        _send(type, data) {
            const targetWs = (type === 'present') ? this.present.ws : this.attend.ws;
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(JSON.stringify(data));
            }
        }

        _connectPresent() {
            this.present.status = 'connecting';
            this._emitStatus();
            try {
                this.present.ws = new WebSocket('wss://dev-endpoint.wordly.ai/present');
                this.present.ws.onopen = () => {
                    this._send('present', {
                        type: 'connect',
                        presentationCode: this.config.sessionId,
                        accessKey: this.config.passcode,
                        languageCode: this.config.sourceLanguage,
                        speakerId: `babelfish-${this.config.name.replace(/\s/g, '')}-${Date.now()}`,
                        name: this.config.name,
                        connectionCode: 'wordly-join-app'
                    });
                };
                this.present.ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    if (message.type === 'status' && message.success) {
                        if (this.present.status === 'connecting') {
                            this.present.status = 'connected';
                            this.present.isConnected = true;
                            this._emitStatus();
                            this._emitSystemMessage('Mic (Sending) connected.');
                            this._send('present', { type: 'start', languageCode: this.config.sourceLanguage, sampleRate: 16000 });
                            this._startAudioCapture();
                        }
                    } else if (message.type === 'status' && !message.success) {
                        this._handleDisconnect('present', true, `Mic (Sending) failed: ${message.message} (Check Passcode).`);
                    } else if (message.type === 'result') {
                        this._emitTranscript(message.text, 'me', message.phraseld, message.final);
                    }
                };
                this.present.ws.onclose = (event) => this._handleDisconnect('present', event.code !== 1000, event.reason || 'Mic (Sending) connection closed.');
                this.present.ws.onerror = () => this._handleDisconnect('present', true, 'Mic (Sending) connection error. Check network or server address.');
            } catch (err) {
                this._handleDisconnect('present', true, `Failed to initialize Mic (Sending): ${err.message}`);
            }
        }
        
        _connectAttend() {
            this.attend.status = 'connecting';
            this._emitStatus();
            try {
                this.attend.ws = new WebSocket('wss://dev-endpoint.wordly.ai/attend');
                this.attend.ws.binaryType = 'arraybuffer';
                this.attend.ws.onopen = () => {
                     this._send('attend', {
                        type: 'connect',
                        presentationCode: this.config.sessionId,
                        accessKey: this.config.passcode,
                        languageCode: this.config.targetLanguage,
                        connectionCode: 'wordly-router-app'
                    });
                };
                this.attend.ws.onmessage = (event) => {
                    if (event.data instanceof ArrayBuffer) {
                        this._queueAudioForPlayback({ data: event.data });
                        return;
                    }
                    const message = JSON.parse(event.data);
                    switch (message.type) {
                        case 'status':
                            if (message.success) {
                                if (this.attend.status === 'connecting') {
                                    this.attend.status = 'connected';
                                    this.attend.isConnected = true;
                                    this._emitStatus();
                                    this._emitSystemMessage('Audio (Receiving) connected.');
                                    this._send('attend', { type: 'voice', enabled: true });
                                }
                            } else {
                                this._handleDisconnect('attend', true, `Audio (Receiving) failed: ${message.message} (Check Session ID).`);
                            }
                            break;
                        case 'phrase':
                            if (message.translatedText) this._emitTranscript(message.translatedText, 'translation', message.phraseld, message.isFinal);
                            break;
                        case 'speech':
                             if (message.synthesizedSpeech && message.synthesizedSpeech.data) {
                                const audioData = new Uint8Array(message.synthesizedSpeech.data).buffer;
                                this._queueAudioForPlayback({ data: audioData, deviceId: this.config.outputDeviceId });
                            }
                            break;
                    }
                };
                this.attend.ws.onclose = (event) => this._handleDisconnect('attend', event.code !== 1000, event.reason || 'Audio (Receiving) connection closed.');
                this.attend.ws.onerror = () => this._handleDisconnect('attend', true, 'Audio (Receiving) connection error. Check network or server address.');
            } catch(err) {
                 this._handleDisconnect('attend', true, `Failed to initialize Audio (Receiving): ${err.message}`);
            }
        }

        _handleDisconnect(type, isError, reason, shouldEmitMessage = true) {
            const target = this[type];
            if (target.status === 'disconnected') return;
            
            if (type === 'present') this._stopAudioCapture();
            if (type === 'attend') this._stopAudioPlayback();
            
            if (target.ws) {
                target.ws.onopen = target.ws.onmessage = target.ws.onclose = target.ws.onerror = null;
                if (target.ws.readyState !== WebSocket.CLOSED) target.ws.close(1000);
                target.ws = null;
            }
            target.status = isError ? 'error' : 'disconnected';
            target.isConnected = false;
            this._emitStatus();
            if (shouldEmitMessage) {
                this._emitSystemMessage(reason, isError);
            }

            if (!this.present.isConnected && !this.attend.isConnected) {
                this.isMuted = false;
                this._emitMuteChange();
            }
        }

        async _startAudioCapture() {
            try {
                const constraints = { audio: { deviceId: this.config.inputDeviceId ? { exact: this.config.inputDeviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000, channelCount: 1 } };
                this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                const source = this.audioContext.createMediaStreamSource(this.mediaStream);
                this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
                source.connect(this.scriptProcessor);
                this.scriptProcessor.connect(this.audioContext.destination);
                this.scriptProcessor.onaudioprocess = (e) => {
                    if (!this.present.isConnected || this.isMuted) return;
                    const pcmData = this._toPCM(e.inputBuffer.getChannelData(0));
                    if (this.present.ws && this.present.ws.readyState === WebSocket.OPEN) this.present.ws.send(pcmData);
                };
            } catch (err) {
                this._handleDisconnect('present', true, `Microphone error: ${err.message}`);
            }
        }

        _stopAudioCapture() {
            if (this.mediaStream) this.mediaStream.getTracks().forEach(track => track.stop());
            if (this.scriptProcessor) this.scriptProcessor.disconnect();
            if (this.audioContext) this.audioContext.close().catch(() => {});
            this.mediaStream = this.scriptProcessor = this.audioContext = null;
        }

        _toPCM(float32Array) {
            const int16Array = new Int16Array(float32Array.length);
            for (let i = 0; i < float32Array.length; i++) {
                const s = Math.max(-1, Math.min(1, float32Array[i]));
                int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            return int16Array.buffer;
        }
        
        // --- Transplanted Audio Playback Logic ---
        _queueAudioForPlayback(audioItem) {
            if (audioItem.data && audioItem.data.byteLength > 44) {
                this.audioQueue.push(audioItem);
                if (!this.isPlaying) this._processAudioQueue();
            }
        }

        async _processAudioQueue() {
            if (this.isPlaying || this.audioQueue.length === 0) return;
            this.isPlaying = true;
            const audioItem = this.audioQueue.shift();

            try {
                const blob = new Blob([new Uint8Array(audioItem.data)], { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(blob);
                
                const audioElement = new Audio();
                this.currentAudioElement = audioElement;
                audioElement.src = audioUrl;

                audioElement.oncanplaythrough = async () => {
                    const sinkId = this.config.outputDeviceId;
                    if (sinkId && state.supportsSinkId) {
                        try {
                            await audioElement.setSinkId(sinkId);
                        } catch (error) {
                            console.error(`Error setting Sink ID ${sinkId}:`, error);
                            this._emitSystemMessage('Error setting audio device', true);
                        }
                    }
                    try {
                        await audioElement.play();
                    } catch (playError) {
                        console.error(`Error playing audio:`, playError);
                        this._cleanupAudio(audioUrl);
                    }
                };
                
                audioElement.onended = () => this._cleanupAudio(audioUrl);
                audioElement.onerror = (e) => {
                    console.error("Audio element error:", e);
                    this._cleanupAudio(audioUrl);
                }
                audioElement.load();
            } catch (error) {
                console.error(`Error processing audio blob:`, error);
                this.isPlaying = false;
                setTimeout(() => this._processAudioQueue(), 0);
            }
        }
        
        _cleanupAudio(audioUrl) {
            URL.revokeObjectURL(audioUrl);
            this.currentAudioElement = null;
            this.isPlaying = false;
            setTimeout(() => this._processAudioQueue(), 0);
        }
        
        _stopAudioPlayback() {
            if (this.currentAudioElement) {
                this.currentAudioElement.pause();
                this.currentAudioElement.src = '';
                this.currentAudioElement = null;
            }
            this.audioQueue = [];
            this.isPlaying = false;
        }
    }

    init();
});
