function startSpeechRecognition(micButton) {
    let recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';

    let oldImageUrl = micButton.style.backgroundImage;

    recognition.onstart = function () {
        let newImageUrl = chrome.runtime.getURL("src/assets/mic-icon-active.png");
        micButton.style.backgroundImage = `url('${newImageUrl}')`;
    }

    recognition.onresult = function (event) {
        let transcript = event.results[0][0].transcript;
        document.getElementById('prompt-textarea').value = transcript;
        console.log(transcript);
        let newImageUrl = chrome.runtime.getURL("src/assets/mic-icon.png");
        micButton.style.backgroundImage = `url('${newImageUrl}')`;
    }

    recognition.onend = function () {
        micButton.style.backgroundColor = 'transparent';
    }

    recognition.start();
}

function createMicButton() {
    let micButton = document.createElement('button');
    let imageUrl = chrome.runtime.getURL("src/assets/mic-icon.png");
    micButton.style.backgroundImage = `url('${imageUrl}')`;
    micButton.style.backgroundRepeat = 'no-repeat';
    micButton.style.backgroundSize = 'contain';
    micButton.style.backgroundPosition = 'center';
    micButton.style.width = '15px';
    micButton.style.height = '15px';
    micButton.style.padding = '10px';
    micButton.style.marginRight = '15px';
    micButton.onclick = () => startSpeechRecognition(micButton);  // Pass micButton as argument
    return micButton;
}

setTimeout(() => {
    let textArea = document.getElementById('prompt-textarea');
    let parentElement = textArea.parentElement;

    let wrapperDiv = document.createElement('div');
    wrapperDiv.style.display = 'flex';
    wrapperDiv.style.alignItems = 'center';

    const micButton = createMicButton();

    parentElement.removeChild(textArea);
    wrapperDiv.appendChild(micButton);
    wrapperDiv.appendChild(textArea);

    parentElement.appendChild(wrapperDiv);
}, 2000);
