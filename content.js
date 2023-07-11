// content.js

function startSpeechRecognition() {
    // Start capturing audio
    let recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';

    recognition.onresult = function (event) {
        let transcript = event.results[0][0].transcript;
        document.getElementById('prompt-textarea').value = transcript;
        console.log(transcript);
    }
    recognition.start();
}

function createMicButton() {
    let micButton = document.createElement('button');
    let imageUrl = chrome.runtime.getURL("mic-icon.png");
    micButton.style.backgroundImage = `url('${imageUrl}')`;
    micButton.style.backgroundRepeat = 'no-repeat';
    micButton.style.backgroundSize = 'contain';
    micButton.style.backgroundPosition = 'center';
    micButton.style.width = '30px';
    micButton.style.height = '30px';
    micButton.style.border = '1px solid white';
    micButton.style.padding = '5px';
    micButton.onmouseover = () => {
        micButton.style.backgroundColor = 'grey';
    };
    micButton.onmouseout = () => {
        micButton.style.backgroundColor = 'transparent';
    };
    micButton.onclick = startSpeechRecognition;

    return micButton;
}

setTimeout(() => {
    let textArea = document.getElementById('prompt-textarea');
    let parentElement = textArea.parentElement;
    const micButton = createMicButton();
    parentElement.insertBefore(micButton, parentElement.firstChild);
}, 2000);