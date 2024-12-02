const { ipcRenderer } = require('electron');

// Minimize the window
document.getElementById('minimize-button').addEventListener('click', () => {
    ipcRenderer.send('minimize-window');
});

// Maximize or restore the window
const maximizeButton = document.getElementById('maximize-button');
maximizeButton.addEventListener('click', () => {
    ipcRenderer.send('maximize-window');
});

// Close the window
document.getElementById('close-button').addEventListener('click', () => {
    ipcRenderer.send('close-window');
});

// Update maximize icon based on window state
ipcRenderer.on('update-maximize-icon', (event, isMaximized) => {
    maximizeButton.textContent = isMaximized ? '🗗' : '▢';
});

document.addEventListener('keydown', function (event) {
    if (event.key === 'Tab') {
        event.preventDefault();
    }
});
