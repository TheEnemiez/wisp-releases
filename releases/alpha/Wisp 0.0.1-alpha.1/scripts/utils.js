
export let popupVisible = false; // Export this variable

export function sanitizeFolderName(name) {
    return name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
}

// Ensure unique name in an array
export function ensureUniqueName(baseName, existingNames) {
    let name = sanitizeFolderName(baseName);
    let counter = 1;

    while (existingNames.includes(name)) {
        name = `${sanitizeFolderName(baseName)} (${counter})`;
        counter++;
    }
    return name;
}

export function createPopup({ title, message, buttons = [], onCancel }) {
    return new Promise((resolve, reject) => {
        const existingPopup = document.querySelector('.popup-overlay');
        if (existingPopup) existingPopup.remove();

        // Set popup visible flag
        popupVisible = true;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';

        // Create popup container
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-labelledby', 'popup-title');
        popup.setAttribute('aria-describedby', 'popup-message');
        popup.setAttribute('tabindex', '-1');

        // Add title
        if (title) {
            const popupTitle = document.createElement('h2');
            popupTitle.className = 'popup-title';
            popupTitle.id = 'popup-title';
            popupTitle.textContent = title;
            popup.appendChild(popupTitle);
        }

        // Add message
        if (message) {
            const popupMessage = document.createElement('p');
            popupMessage.className = 'popup-message';
            popupMessage.id = 'popup-message';
            popupMessage.textContent = message;
            popup.appendChild(popupMessage);
        }

        // Add buttons dynamically
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'popup-buttons';

        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = `popup-${button.type}`;
            btn.textContent = button.label || 'Button';

            if (button.color) {
                btn.style.backgroundColor = button.color;
            }
            if (button.hoverColor) {
                btn.addEventListener('mouseover', () => {
                    btn.style.backgroundColor = button.hoverColor;
                });
                btn.addEventListener('mouseout', () => {
                    btn.style.backgroundColor = button.color;
                });
            }

            btn.addEventListener('click', () => {
                if (button.onClick) {
                    button.onClick();
                }
                resolve(true);
                closePopup();
            });

            buttonContainer.appendChild(btn);
        });

        popup.appendChild(buttonContainer);
        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                if (onCancel) onCancel();
                reject(false);
                closePopup();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        const closePopup = () => {
            popupVisible = false; // Reset popup visibility
            overlay.remove();
            document.removeEventListener('keydown', handleKeyDown);
        };

        overlay.addEventListener('remove', () => {
            document.removeEventListener('keydown', handleKeyDown);
        });
    });
}