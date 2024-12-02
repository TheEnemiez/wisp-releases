import { loadPlaylists, savePlaylists, selectPlaylist } from './playlists.js';
import { createPopup } from './utils.js';

let currentSelectedPlaylistId = null; // Add this global variable

function showContextMenu(event, menuType, itemId) {
    const contextMenu = document.getElementById('context-menu');

    // Clear previous menu items
    contextMenu.innerHTML = '';

    // Choose the appropriate menu options based on the item type (playlist or song)
    const menu = menuOptions[menuType];

    // Dynamically create menu items based on the chosen menu
    menu.forEach(option => {
        const btn = document.createElement('button');
        btn.textContent = option.name;

        // Close the context menu after any action is performed
        btn.addEventListener('click', () => {
            option.onClick(itemId); // Perform the action
            contextMenu.style.display = 'none'; // Close the context menu
        });

        contextMenu.appendChild(btn);
    });

    // Position the context menu based on the mouse event
    contextMenu.style.left = `${event.pageX + 4}px`;
    contextMenu.style.top = `${event.pageY - 15}px`;
    contextMenu.style.display = 'block';
}

function closeContextMenu(event) {
    const contextMenu = document.getElementById('context-menu');
    if (!contextMenu.contains(event.target)) {
        contextMenu.style.display = 'none';
    }
}

const menuOptions = {
    menuForPlaylists: [
        {
            name: 'Delete',
            onClick: (itemId) => {
                createPopup({
                    title: 'Confirm Deletion',
                    message: `Are you sure you want to delete this playlist?`,
                    buttons: [
                        {
                            type: 'delete_playlist',
                            label: 'Delete',
                            styleClass: 'square_button',
                            onClick: () => {
                                deletePlaylist(itemId);
                            }
                        },
                        {
                            type: 'cancel',
                            label: 'Cancel',
                            styleClass: '',
                            onClick: () => {
                                console.log('Deletion canceled');
                            }
                        }
                    ],
                    onCancel: () => {
                        console.log('Popup closed without action');
                    }
                }).then(() => {
                    console.log('Action confirmed');
                }).catch(() => {
                    console.log('Action canceled');
                });
            }
        },
        {
            name: 'Duplicate',
            onClick: (itemId) => {
                console.log(`Duplicating playlist with ID: ${itemId}`);
            }
        }
    ]
};

function deletePlaylist(playlistId) {
    const playlists = loadPlaylists();
    const updatedPlaylists = playlists.filter(playlist => playlist.id !== parseInt(playlistId));
    const playlistToDelete = playlists.find(playlist => playlist.id === parseInt(playlistId));

    if (playlistToDelete) {
        savePlaylists(updatedPlaylists);

        const playlistItem = document.querySelector(`[data-id='${playlistId}']`);
        const playlistList = document.getElementById('playlist-list');

        if (playlistItem) {
            // Capture precise measurements
            const computedStyles = window.getComputedStyle(playlistItem);
            const deletedItemHeight = Math.round(playlistItem.offsetHeight);
            const deletedItemMargin = Math.round(parseFloat(computedStyles.marginTop) + parseFloat(computedStyles.marginBottom));
            const totalDeletedItemHeight = Math.round(deletedItemHeight + deletedItemMargin);

            // Add fade-out class
            playlistItem.classList.add('fade-out');
            playlistItem.style.pointerEvents = 'none';

            // Prepare list for animation
            playlistList.style.position = 'relative';
            playlistList.style.height = `${Math.round(playlistList.offsetHeight)}px`;

            // Collect all playlist items
            const allItems = Array.from(playlistList.querySelectorAll('.playlist-item'));
            const deletedIndex = allItems.indexOf(playlistItem);

            // Store precise initial positions for all items
            const initialPositions = allItems.map(item => {
                return {
                    element: item,
                    top: Math.round(item.offsetTop),
                };
            });

            // Prepare items for smooth movement
            initialPositions.forEach((itemPos, index) => {
                const item = itemPos.element;

                // Only move items below the deleted playlist
                if (index > deletedIndex) {
                    item.style.position = 'absolute';
                    item.style.top = `${itemPos.top}px`;
                    item.style.left = '0';
                    item.style.width = '100%';
                    item.style.margin = '0';
                    item.style.zIndex = '1';
                    item.style.transition = 'top 400ms ease-out';

                    const newTop = Math.round(itemPos.top - totalDeletedItemHeight);
                    requestAnimationFrame(() => {
                        item.offsetHeight; // Trigger reflow
                        item.style.top = `${newTop + 10}px`;
                    });
                }
            });

            // Remove the playlist after animation
            setTimeout(() => {
                playlistItem.remove();

                // Reset items
                const remainingItems = Array.from(playlistList.querySelectorAll('.playlist-item'));
                remainingItems.forEach((item, newIndex) => {
                    item.style.position = '';
                    item.style.top = '';
                    item.style.left = '';
                    item.style.width = '';
                    item.style.margin = '';
                    item.style.zIndex = '';
                    item.style.transition = '';

                    // Update the `data-index` and reassign click listeners
                    item.dataset.index = newIndex;
                    item.onclick = () => selectPlaylist(newIndex); // Directly call `selectPlaylist`
                });

                // Reset list
                playlistList.style.height = 'auto';
                playlistList.style.position = '';

                // Handle empty state
                if (updatedPlaylists.length === 0) {
                    const emptyState = document.querySelector('.empty-state');
                    if (!emptyState) {
                        const emptyText = document.createElement('div');
                        emptyText.className = 'empty-state fade-in';
                        emptyText.textContent = 'No playlists available. Create a new playlist to get started.';
                        playlistList.appendChild(emptyText);
                    }
                }
            }, 450);

            // Reset UI if the deleted playlist was selected
            if (parseInt(playlistId) === currentSelectedPlaylistId) {
                const playlistTitle = document.getElementById('playlist-title');
                const playlistDescription = document.getElementById('playlist-description');
                const playlistIcon = document.getElementById('playlist-icon');
                const editButton = document.getElementById('edit-save-button');

                playlistTitle.textContent = 'No Playlist Selected';
                playlistDescription.textContent = 'Create a playlist to get started.';
                playlistIcon.style.display = 'none';
                editButton.style.display = 'none';
            }

            currentSelectedPlaylistId = null;
        }
    } else {
        console.error(`Playlist with ID ${playlistId} not found.`);
    }
}

function setupEventListeners() {
    const playlistsList = document.getElementById('playlist-list');
    if (playlistsList) {
        playlistsList.addEventListener('contextmenu', (event) => {
            event.preventDefault();  // Prevent the default context menu
            const playlistItem = event.target.closest('li');  // Ensure the event is captured on the <li> element
            if (playlistItem && playlistItem.dataset.id) {
                const playlistId = playlistItem.dataset.id; // Get the data-id from the right-clicked element
                showContextMenu(event, 'menuForPlaylists', playlistId);
            }
        });
    }

    const songsList = document.getElementById('songs-list');
    if (songsList) {
        songsList.addEventListener('contextmenu', (event) => {
            event.preventDefault();  // Prevent the default context menu
            const songItem = event.target.closest('li');  // Ensure the event is captured on the <li> element
            if (songItem && songItem.dataset.id) {
                const songId = songItem.dataset.id; // Get the data-id from the right-clicked element
                showContextMenu(event, 'menuForSong', songId);
            }
        });
    }

    // Click event to close the context menu when clicking outside
    document.addEventListener('click', closeContextMenu);
}

// Wait until the DOM is ready to set up event listeners
document.addEventListener('DOMContentLoaded', setupEventListeners);
