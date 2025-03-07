export interface SpeechManagerConfig {
    language: string;
    continuous: boolean;
    interimResults: boolean;
}

export interface UIElements {
    textArea: HTMLTextAreaElement | null;
    displayElement: HTMLParagraphElement | null;
    micButton: HTMLButtonElement | null;
}

export interface SpeechState {
    isListening: boolean;
    previousText: string;
    lastStopTime: number;
}

export type SpeechCallback = (text: string) => void;
