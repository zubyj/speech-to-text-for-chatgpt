function startSpeechRecognition() {
    // Start capturing audio
    let recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';

    recognition.onresult = function (event) {
        let transcript = event.results[0][0].transcript;
        document.getElementById('prompt-textarea').value += transcript;
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
    micButton.style.borderRadius = '100%';
    micButton.style.padding = '10px';
    micButton.style.marginRight = '15px';

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

    // Create a wrapper div
    let wrapperDiv = document.createElement('div');
    wrapperDiv.style.display = 'flex';
    wrapperDiv.style.alignItems = 'center';

    // Create the mic button
    const micButton = createMicButton();

    // Remove the textarea from its parent and append it to the wrapper div
    parentElement.removeChild(textArea);
    wrapperDiv.appendChild(micButton);
    wrapperDiv.appendChild(textArea);

    // Add the wrapper div to the original parent of the textarea
    parentElement.appendChild(wrapperDiv);
}, 2000);
