export class SpeechRecognitionService {
    constructor(config, callback) {
        this.finalText = '';
        this.recognition = new webkitSpeechRecognition();
        this.onTextCallback = callback;
        this.setupRecognition(config);
    }
    setupRecognition(config) {
        this.recognition.continuous = config.continuous;
        this.recognition.interimResults = true; // Always enable interim results
        this.recognition.lang = config.language;
        let finalTranscript = '';
        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                }
                else {
                    interimTranscript += transcript;
                }
            }
            // Call callback with both transcripts
            this.onTextCallback(finalTranscript, interimTranscript);
        };
        this.recognition.onend = () => {
            finalTranscript = '';
        };
        this.recognition.onerror = this.handleError;
    }
    handleError(error) {
        console.error('Speech recognition error:', error);
        // Implement error handling UI feedback
    }
    start() {
        this.recognition.start();
    }
    stop() {
        this.recognition.stop();
    }
    setLanguage(language) {
        this.recognition.lang = language;
    }
}
