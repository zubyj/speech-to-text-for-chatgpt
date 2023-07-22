/*
    This file is injected into the ChatGPT website.
    It is responsible for creating the mic button and handling the speech recognition.
*/
async function main() {
    // If the text area doesn't exist, then we aren't on the ChatGPT website
    let textArea = document.getElementById('prompt-textarea');
    if (!textArea) {
        return;
    }

    // If the mic button already exists, dont do anything.
    let micButton = document.getElementById('mic-button');
    if (micButton) {
        return;
    }
    // Else, create the mic button and append it to the text area
    micButton = document.createElement('button');
    micButton.id = 'mic-button';
    let imageUrl = chrome.runtime.getURL("./src/assets/mic.png");
    micButton.style.backgroundImage = `url('${imageUrl}')`;
    micButton.onclick = (e) => {
        e.preventDefault();
        if (micButton.classList.contains('active')) {
            recognition.stop();  // Use stop() instead of abort()
            clearTimeout(timeout);
            micButton.classList.remove('active');
            let newImageUrl = chrome.runtime.getURL("./src/assets/mic.png");
            micButton.style.backgroundImage = `url('${newImageUrl}')`;
            textArea.focus();
        } else {
            startSpeechRecognition(recognition);
        }
    };

    let prevText = ''; // Avoids overwriting existing text in the textarea.

    function startSpeechRecognition(recognition) {
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onstart = function () {
            let newImageUrl = chrome.runtime.getURL("/src/assets/mic-active.png");
            micButton.style.backgroundImage = `url('${newImageUrl}')`;
            micButton.classList.add('active');
            prevText = textArea.value + ' ';
            micActive = true;
        }

        recognition.onresult = function (event) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                recognition.stop();
                micButton.classList.remove('active');
                let newImageUrl = chrome.runtime.getURL("./src/assets/mic.png");
                micButton.style.backgroundImage = `url('${newImageUrl}')`;
                textArea.focus();
            }, 3000);

            let currSpeech = '';
            for (var i = 0; i < event.results.length; i++) {
                for (var j = 0; j < event.results[i].length; j++) {
                    currSpeech += event.results[i][j].transcript;
                }
            }
            textArea.value = prevText + currSpeech;
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        recognition.start();
    }

    let recognition = new webkitSpeechRecognition();
    let timeout;

    try {
        const response = await fetch(chrome.runtime.getURL('./src/assets/styles.css'));
        const data = await response.text();
        let style = document.createElement('style');
        style.innerHTML = data;
        document.head.appendChild(style);
    } catch (error) {
        console.error('Error fetching CSS file:', error);
    }

    let parentElement = textArea.parentElement;
    let wrapperDiv = document.createElement('div');
    wrapperDiv.classList.add('wrapper-div');
    parentElement.removeChild(textArea);
    wrapperDiv.appendChild(micButton);
    wrapperDiv.appendChild(textArea);
    parentElement.appendChild(wrapperDiv);
    textArea.focus();

    document.addEventListener('keydown', (event) => {
        const isMac = navigator.userAgent.includes('Mac');
        const shortcutPressed = isMac ? event.metaKey : event.ctrlKey;
        if (!shortcutPressed) {
            return;
        }
        // use switch statement
        event.preventDefault();

        const key = event.key.toLowerCase();
        if (key === 'm') {
            micButton.click();
        }
        else if (key === 'd') {
            prevText = '';
            textArea.value = '';
            if (micButton.classList.contains('active')) {
                micButton.click();
                micButton.click();
            }

        }
    });
}

main();
