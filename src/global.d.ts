interface SpeechManagerConfig {
    language: string;
    continuous: boolean;
    interimResults: boolean;
}

interface UIElements {
    textArea: HTMLTextAreaElement | null;
    displayElement: HTMLParagraphElement | null;
    micButton: HTMLButtonElement | null;
    interimDisplay: HTMLDivElement | null;
}

interface SpeechState {
    isListening: boolean;
    previousText: string;
    lastStopTime: number;
}

type SpeechCallback = (finalText: string, interimText: string) => void;
