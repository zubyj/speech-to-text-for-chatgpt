class SpeechRecognitionManager {
    constructor(micButton) {
        this.micButton = micButton;
        this.textArea = document.getElementById('prompt-textarea');
        this.recognition = new webkitSpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = true;
        this.recognition.continuous = true;
        this.isListening = false;


        this.setupRecognition();
        this.setupMicButton();
    }

    setupRecognition() {
        this.recognition.onstart = () => this.startRecognition();
        this.recognition.onspeechstart = () => clearTimeout(this.timeout);
        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onspeechend = () => this.endRecognition();
    }

    startRecognition() {
        if (!this.isListening) {
            this.recognition.start();
            this.updateMicButton("/src/assets/mic-active.png", 'add');
            this.isListening = true;
        }
    }

    handleResult(event) {
        let currSpeech = '';
        for (let result of event.results) {
            for (let transcript of result) {
                currSpeech += transcript.transcript;
            }
        }
        this.textArea.value = currSpeech;
    }

    endRecognition() {
        this.recognition.stop();
        this.updateMicButton("./src/assets/mic.png", 'remove');
        this.textArea.focus();
        this.isListening = false;
    }


    updateMicButton(imgPath, action) {
        const newImageUrl = chrome.runtime.getURL(imgPath);
        this.micButton.style.backgroundImage = `url('${newImageUrl}')`;
        this.micButton.classList[action]('active');
    }

    setupMicButton() {
        this.micButton.onclick = () => {
            if (this.micButton.classList.contains('active')) {
                this.recognition.stop();
                clearTimeout(this.timeout);
                this.updateMicButton("./src/assets/mic.png", 'remove');
            } else {
                this.startRecognition();
            }
        };
    }
}


function createMicButton() {
    let micButton = document.createElement('button');
    micButton.id = 'mic-button';
    let imageUrl = chrome.runtime.getURL("./src/assets/mic.png");
    micButton.style.backgroundImage = `url('${imageUrl}')`;
    return micButton;
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.message === 'TabUpdated') {
        setTimeout(() => {
            if (document.getElementById('mic-button')) return;

            injectStyles();

            const micButton = createMicButton();
            const textArea = document.getElementById('prompt-textarea');
            const speechManager = new SpeechRecognitionManager(micButton);

            setupEventListeners(textArea, micButton);

            wrapInDiv(textArea, micButton);
        }, 500);
    }
});

function injectStyles() {
    fetch(chrome.runtime.getURL('./src/assets/styles.css'))
        .then(response => response.text())
        .then(data => {
            let style = document.createElement('style');
            style.innerHTML = data;
            document.head.appendChild(style);
        });
}

function setupEventListeners(textArea, micButton) {
    textArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) micButton.style.display = 'inline-block';
    });

    const submitButton = textArea.parentNode.querySelector('button:nth-child(2)');
    submitButton.addEventListener('click', () => micButton.style.display = 'inline-block');
}

function wrapInDiv(textArea, micButton) {
    let parentElement = textArea.parentElement;
    let wrapperDiv = document.createElement('div');
    wrapperDiv.classList.add('wrapper-div');
    parentElement.removeChild(textArea);
    wrapperDiv.appendChild(micButton);
    wrapperDiv.appendChild(textArea);
    parentElement.appendChild(wrapperDiv);
    textArea.focus();
}
