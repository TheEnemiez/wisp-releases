const fs = require('fs')
const path = require('path');
const { ipcRenderer } = require('electron');
const playlistsFile = path.join(__dirname, './playlists.json');
import { renderPlaylists } from './sidebar.js';
const { generateCrystalImageData, createPNG } = require(path.resolve(__dirname, './imgGen.js'));
let originalState = {};

// Load playlists from the JSON file
export function loadPlaylists() {
    if (fs.existsSync(playlistsFile)) {
        const data = fs.readFileSync(playlistsFile, 'utf8');
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('Error parsing playlists.json:', error);
            return [];
        }
    }
    return [];
}
// Save playlists to the JSON file
export function savePlaylists(playlists) {
    try {
        fs.writeFileSync(playlistsFile, JSON.stringify(playlists, null, 2));
    } catch (error) {
        console.error('Error saving playlists.json:', error);
    }
}

export function addPlaylist(name, description = '', isPublic = false) {
    const playlists = loadPlaylists();

    // Ensure unique playlist name
    const baseName = name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
    let uniqueName = baseName;
    let counter = 1;
    while (playlists.some((playlist) => playlist.name === uniqueName)) {
        uniqueName = `${baseName} (${counter})`;
        counter++;
    }

    // Generate a unique ID for the playlist
    const id = Date.now();

    // Define the path for the icon
    const iconsDir = path.join(__dirname, './icons');
    const iconFileName = `${id}.png`;
    const iconFilePath = path.join(iconsDir, iconFileName);

    // Ensure the icons directory exists
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir);
    }

    // Generate the crystal image data
    const width = 256; // Adjusted resolution for icons
    const height = 256;
    const pixelData = generateCrystalImageData(width, height);

    // Create the PNG buffer
    const pngBuffer = createPNG(pixelData, width, height);

    try {
        fs.writeFileSync(iconFilePath, pngBuffer); // Save the PNG directly
    } catch (error) {
        console.error('Error saving icon:', error);
        return null; // Exit if saving fails
    }

    // Add playlist to the list
    const newPlaylist = {
        name: uniqueName,
        description,
        isPublic,
        id,
        icon: `./icons/${iconFileName}`, // Save relative path to the icon
    };

    playlists.push(newPlaylist);
    savePlaylists(playlists);

    // Render only the new playlist and get the DOM element
    const newPlaylistElement = renderPlaylists(newPlaylist);

    // Trigger animation for the new element
    if (newPlaylistElement) {
        newPlaylistElement.classList.add('animate');
        setTimeout(() => {
            newPlaylistElement.classList.remove('animate'); // Cleanup animation class
        }, 1000); // Adjust timeout to match animation duration
    }

    return newPlaylist;
}


// Remove a playlist by ID
export function removePlaylist(id) {
    const playlists = loadPlaylists();
    const updatedPlaylists = playlists.filter((playlist) => playlist.id !== id);
    savePlaylists(updatedPlaylists);
}

export function enableEditMode(selected, index) {
    const playlistTitle = document.getElementById('playlist-title');
    const playlistDescription = document.getElementById('playlist-description');
    const editButton = document.getElementById('edit-save-button');
    const cancelButton = document.getElementById('edit-cancel-button');
    const playlistIcon = document.getElementById('playlist-icon');
    const playlistList = document.getElementById('playlist-list');

    if (!playlistIcon) {
        console.error('Playlist icon element not found in the DOM.');
    } else {
        console.log('Playlist icon element found:', playlistIcon);
    }

    const maxTitleLength = 20;
    const maxDescriptionLength = 100;

    const allowedChars = /^[a-zA-Z0-9\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]*$/;

    const enforceInputRestrictions = (element, maxLength) => {
        const cleanInput = () => {
            let text = element.textContent;
            // Remove invalid characters
            if (!allowedChars.test(text)) {
                element.textContent = text.replace(/[^a-zA-Z0-9\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g, '');
            }
            // Enforce max length
            if (element.textContent.length > maxLength) {
                element.textContent = element.textContent.slice(0, maxLength);
            }
        };
        element.addEventListener('input', cleanInput);
        return cleanInput;
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent adding a new line
            editButton.click(); // Trigger the save button click
        }
    };

    if (!playlistTitle.isContentEditable) {
        // Enter edit mode
        originalState = {
            title: playlistTitle.textContent,
            description: playlistDescription.textContent,
            icon: playlistIcon.src,
        };

        playlistTitle.contentEditable = true;
        playlistDescription.contentEditable = true;

        playlistTitle.classList.add('editable');
        playlistDescription.classList.add('editable');

        playlistTitle.style.whiteSpace = 'pre-wrap';
        playlistDescription.style.whiteSpace = 'pre-wrap';

        playlistTitle.style.width = 'fit-content';
        playlistDescription.style.width = 'fit-content';

        playlistIcon.style.pointerEvents = 'auto';
        // Add event listeners to enforce character restrictions and limits
        const titleCleaner = enforceInputRestrictions(playlistTitle, maxTitleLength);
        const descriptionCleaner = enforceInputRestrictions(playlistDescription, maxDescriptionLength);

        // Add keydown event listener to handle Enter key
        playlistTitle.addEventListener('keydown', handleKeyDown);
        playlistDescription.addEventListener('keydown', handleKeyDown);

        playlistIcon.style.cursor = 'zoom-in';

        playlistIcon.onclick = async () => {
            try {
                const file = await ipcRenderer.invoke('open-file-dialog'); // Call the IPC handler
                console.log('File dialog result:', file);

                if (!file.canceled && file.filePaths.length > 0) {
                    const selectedFilePath = file.filePaths[0];

                    // Display the new icon as a preview
                    const newIconPreviewPath = `file://${selectedFilePath}`;
                    playlistIcon.src = newIconPreviewPath;

                    // Save the selected file path for saving later
                    originalState.newIconPath = selectedFilePath; // Store new icon path temporarily
                }
            } catch (err) {
                console.error('Error during file dialog:', err);
            }
        };
        editButton.onclick = async () => {
            if (originalState.newIconPath) {
                const iconDir = path.join(__dirname, './icons');
                const newIconPath = path.join(iconDir, `${selected.id}.png`);

                console.log('Copying new icon...');
                try {
                    fs.copyFileSync(originalState.newIconPath, newIconPath);
                    console.log('Icon updated successfully:', newIconPath);
                    selected.icon = `./icons/${selected.id}.png`; // Update the icon reference
                } catch (err) {
                    console.error('Error saving new icon:', err);
                }

                // Clear the temporary new icon path
                delete originalState.newIconPath;
            }

            // Update the playlist data in memory
            const playlists = loadPlaylists();
            playlists[index].name = playlistTitle.textContent.trim();
            playlists[index].description = playlistDescription.textContent.trim();
            playlists[index].icon = selected.icon;

            console.log('Saving playlists to disk...');
            savePlaylists(playlists);
            console.log('Playlists saved to disk:', playlists);

            // Update the main icon
            const cacheBustedIcon = `${selected.icon}?t=${Date.now()}`;
            playlistIcon.src = cacheBustedIcon;
            console.log('Main icon updated to:', cacheBustedIcon);

            // Update the sidebar dynamically
            const sidebarPlaylistItems = document.querySelectorAll('#playlist-list li');
            if (sidebarPlaylistItems) {
                console.log('Found sidebar playlist items:', sidebarPlaylistItems);
                const sidebarItem = [...sidebarPlaylistItems].find(
                    (item) => item.dataset.index === index.toString()
                );
                if (sidebarItem) {
                    console.log('Sidebar playlist item found:', sidebarItem);
                    const sidebarImg = sidebarItem.querySelector('img');
                    const sidebarText = sidebarItem.querySelector('span');

                    if (sidebarImg) {
                        sidebarImg.src = cacheBustedIcon;
                        console.log('Sidebar image updated to:', cacheBustedIcon);
                    }
                    if (sidebarText) {
                        sidebarText.textContent = playlists[index].name;
                        console.log('Sidebar text updated to:', playlists[index].name);
                    }
                } else {
                    console.log('Sidebar playlist item not found for index:', index);
                }
            }

            // Reset edit mode
            playlistTitle.contentEditable = false;
            playlistDescription.contentEditable = false;

            playlistTitle.classList.remove('editable');
            playlistDescription.classList.remove('editable');

            playlistIcon.style.pointerEvents = 'none'; // Disable interaction with the icon
            playlistIcon.style.cursor = 'default';

            cancelButton.style.display = 'none';
            editButton.textContent = '✎'; // Reset to edit icon
            editButton.onclick = () => enableEditMode(selected, index); // Reassign to re-enter edit mode

            // Remove event listeners
            playlistTitle.removeEventListener('keydown', handleKeyDown);
            playlistDescription.removeEventListener('keydown', handleKeyDown);

            console.log('Edit mode reset and event listeners removed.');
            // Trigger animation after saving changes
            playlistTitle.innerHTML = ''; // Clear current text
            [...playlists[index].name].forEach((char, i) => {
                const span = document.createElement('span');
                span.textContent = char === ' ' ? '\u00A0' : char; // Preserve spaces
                span.classList.add('text-animate');
                span.style.animationDelay = `${i * 0.03}s`;
                playlistTitle.appendChild(span);
            });

            playlistDescription.innerHTML = ''; // Clear current text
            [...(playlists[index].description || 'No description available.')].forEach((char, i) => {
                const span = document.createElement('span');
                span.textContent = char === ' ' ? '\u00A0' : char; // Preserve spaces
                span.classList.add('text-animate');
                span.style.animationDelay = `${i * 0.03}s`;
                playlistDescription.appendChild(span);
            });
            playlistIcon.classList.remove('fade-in'); // Reset animation
            void playlistIcon.offsetWidth; // Trigger reflow to restart animation
            playlistIcon.classList.add('fade-in');

        };

        cancelButton.onclick = () => {
            playlistIcon.src = originalState.icon;

            console.log('Reverting to original icon:', originalState.icon);

            // Clear the temporary new icon path
            delete originalState.newIconPath;

            // Revert to original values
            playlistTitle.textContent = originalState.title;
            playlistDescription.textContent = originalState.description;

            console.log('Reverted to original values:', {
                title: originalState.title,
                description: originalState.description,
            });

            // Reset edit mode
            playlistTitle.contentEditable = false;
            playlistDescription.contentEditable = false;

            playlistTitle.classList.remove('editable');
            playlistDescription.classList.remove('editable');

            playlistIcon.style.pointerEvents = 'none'; // Disable interaction with the icon
            playlistIcon.style.cursor = 'default';

            cancelButton.style.display = 'none';
            editButton.textContent = '✎'; // Reset to edit icon
            editButton.onclick = () => enableEditMode(selected, index); // Reassign to re-enter edit mode

            // Remove event listeners
            playlistTitle.removeEventListener('keydown', handleKeyDown);
            playlistDescription.removeEventListener('keydown', handleKeyDown);

            console.log('Cancel mode reset and event listeners removed.');

            // Trigger animation after canceling changes
            playlistTitle.innerHTML = ''; // Clear current text
            [...originalState.title].forEach((char, i) => {
                const span = document.createElement('span');
                span.textContent = char === ' ' ? '\u00A0' : char; // Preserve spaces
                span.classList.add('text-animate');
                span.style.animationDelay = `${i * 0.03}s`;
                playlistTitle.appendChild(span);
            });

            playlistDescription.innerHTML = ''; // Clear current text
            [...(originalState.description || 'No description available.')].forEach((char, i) => {
                const span = document.createElement('span');
                span.textContent = char === ' ' ? '\u00A0' : char; // Preserve spaces
                span.classList.add('text-animate');
                span.style.animationDelay = `${i * 0.03}s`;
                playlistDescription.appendChild(span);
            });
            playlistIcon.classList.remove('fade-in'); // Reset animation
            void playlistIcon.offsetWidth; // Trigger reflow to restart animation
            playlistIcon.classList.add('fade-in');

        };

        cancelButton.style.display = 'block'; // Show cancel button
        editButton.textContent = '⎙'; // Change edit button to save icon
    }
}

export function savePlaylistChanges(index, newName, newDescription) {
    const playlists = loadPlaylists();

    if (playlists[index]) {
        playlists[index].name = newName.trim();
        playlists[index].description = newDescription.trim();

        savePlaylists(playlists);

        // Update the main display
        selectPlaylist(index);

        // Refresh the sidebar to reflect updated names
        renderPlaylists();
    }
}

export function selectPlaylist(index) {
    const playlists = loadPlaylists();
    const selected = playlists[index];
    const playlistTitle = document.getElementById('playlist-title');
    const playlistDescription = document.getElementById('playlist-description');
    const playlistIcon = document.getElementById('playlist-icon');
    const editButton = document.getElementById('edit-save-button');

    // Reset edit mode if it was active
    if (playlistTitle.isContentEditable || playlistDescription.isContentEditable) {
        playlistTitle.contentEditable = false;
        playlistDescription.contentEditable = false;

        playlistTitle.classList.remove('editable');
        playlistDescription.classList.remove('editable');
        editButton.textContent = '✎'; // Reset button to edit icon
    }

    if (selected) {
        console.log(`Selected Playlist: ${selected.name}`);

        // Fade-in the playlist icon
        if (selected.icon) {
            playlistIcon.src = selected.icon;
            playlistIcon.classList.remove('fade-in'); // Reset animation
            void playlistIcon.offsetWidth; // Trigger reflow to restart animation
            playlistIcon.classList.add('fade-in');
            playlistIcon.style.display = 'block';
        } else {
            playlistIcon.style.display = 'none';
        }

        // Animate the title
        playlistTitle.innerHTML = ''; // Clear current text
        [...selected.name].forEach((char, i) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char; // Preserve spaces
            span.classList.add('text-animate');
            span.style.animationDelay = `${i * 0.03}s`;
            playlistTitle.appendChild(span);
        });

        // Animate the description
        playlistDescription.innerHTML = ''; // Clear current text
        [...(selected.description || 'No description available.')].forEach((char, i) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char; // Preserve spaces
            span.classList.add('text-animate');
            span.style.animationDelay = `${i * 0.03}s`;
            playlistDescription.appendChild(span);
        });

        // Reset edit/save button
        if (editButton) {
            editButton.style.display = 'block';
            editButton.textContent = '✎';
            editButton.onclick = () => enableEditMode(selected, index);
        } else {
            console.error('Edit button is not found in the DOM.');
        }
    } else {
        // No playlist is selected
        playlistTitle.textContent = 'No Playlist Selected';
        playlistDescription.textContent = 'Create a playlist to get started.';
        playlistIcon.style.display = 'none';
        editButton.style.display = 'none';
    }
}