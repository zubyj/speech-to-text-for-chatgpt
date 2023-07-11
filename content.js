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
    micButton.onclick = () => {
        console.log('mic button clicked');
    };

    return micButton;
}
setTimeout(() => {
    let textArea = document.getElementById('prompt-textarea');
    let parentElement = textArea.parentElement;
    const micButton = createMicButton();
    parentElement.insertBefore(micButton, parentElement.firstChild);
}, 2000);
