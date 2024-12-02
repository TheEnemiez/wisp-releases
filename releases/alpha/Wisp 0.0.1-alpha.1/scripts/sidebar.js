import { addPlaylist, loadPlaylists, selectPlaylist } from './playlists.js'
import { popupVisible } from './utils.js';

let hoverTimeout
let sidebarVisible = false

const sidebar = document.getElementById('sidebar')
const playlistList = document.getElementById('playlist-list')
const addPlaylistButton = document.getElementById('add-playlist')

export function renderPlaylists(newPlaylist = null, initialLoad = false) {
    console.log(`renderPlaylists called with:`, newPlaylist);

    const playlists = loadPlaylists();

    if (!playlistList) {
        console.error('Element with id "playlist-list" not found.');
        return;
    }

    // Handle empty state visibility
    const emptyState = document.querySelector('.empty-state');
    if (playlists.length === 0) {
        if (!emptyState) {
            const emptyText = document.createElement('div');
            emptyText.className = 'empty-state fade-in';
            emptyText.textContent = 'No playlists available. Create a new playlist to get started.';
            playlistList.appendChild(emptyText);
        }
        console.log('No playlists found, showing empty state.');
        return;
    } else if (emptyState) {
        // Remove the empty state with animation
        emptyState.classList.remove('fade-in');
        emptyState.classList.add('fade-out');
        setTimeout(() => emptyState.remove(), 500); // Match fade-out duration
    }

    if (newPlaylist) {
        // Delay the rendering of the new playlist if empty state was just removed
        if (emptyState) {
            setTimeout(() => {
                const newIndex = playlists.findIndex(playlist => playlist.id === newPlaylist.id);
                appendPlaylistItem(newPlaylist, newIndex, true);
            }, 500); // Match fade-out duration
        } else {
            const newIndex = playlists.findIndex(playlist => playlist.id === newPlaylist.id);
            appendPlaylistItem(newPlaylist, newIndex, true);
        }
    } else if (initialLoad) {
        console.log(`Initial playlist render triggered.`);
        playlistList.innerHTML = '';
        playlists.forEach((playlist, index) => {
            appendPlaylistItem(playlist, index, false);
        });
    } else {
        console.log(`Something unexpected triggered a full render.`);
    }
}
function appendPlaylistItem(playlist, index, isNew = false) {
    const li = document.createElement('li');
    li.classList.add('playlist-item');
    li.dataset.index = index;
    li.dataset.id = playlist.id;

    if (isNew) {
        li.classList.add('new'); // Mark as a new playlist
    }

    if (playlist.icon) {
        const img = document.createElement('img');
        img.src = playlist.icon;
        img.alt = `${playlist.name} icon`;
        img.width = 50;
        img.height = 50;
        li.appendChild(img);
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = playlist.name;

    li.addEventListener('click', () => {
        selectPlaylist(index);
    });

    li.appendChild(nameSpan);

    playlistList.appendChild(li);

    // Trigger fade-in animation for new playlists
    if (isNew) {
        requestAnimationFrame(() => {
            li.classList.remove('new');
            li.classList.add('animate'); // Add fade-in animation
        });
    }
}

document.body.addEventListener('mousemove', (e) => {
    if (popupVisible) {
        // If a popup is open, don't toggle the sidebar
        return;
    }

    if (e.clientX <= 50 && !sidebarVisible) {
        clearTimeout(hoverTimeout);
        sidebar.classList.add('visible');
        sidebarVisible = true;

        const playlists = loadPlaylists();
        const sidebarItems = document.querySelectorAll('#playlist-list li');

        playlists.forEach((playlist, index) => {
            const sidebarItem = sidebarItems[index];
            if (sidebarItem) {
                const textSpan = sidebarItem.querySelector('span');
                if (textSpan) {
                    textSpan.textContent = playlist.name;
                }
            }
        });

        const playlistItems = document.querySelectorAll('.playlist-item');
        playlistItems.forEach((item, index) => {
            item.classList.remove('animate');
            void item.offsetWidth;
            setTimeout(() => {
                item.classList.add('animate');
            }, index * 100);
        });
    } else if (e.clientX > 300 && sidebarVisible) {
        if (!hoverTimeout) {
            hoverTimeout = setTimeout(() => {
                sidebar.classList.remove('visible');
                sidebarVisible = false;
                hoverTimeout = null;

                // Close context menu when sidebar disappears
                const contextMenu = document.getElementById('context-menu');
                if (contextMenu) {
                    contextMenu.style.display = 'none';
                }
            }, 500);
        }
    } else if (e.clientX <= 300 && sidebarVisible) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
    }
});

// Handle mouse leave to close the sidebar
document.addEventListener('mouseleave', () => {
    if (sidebarVisible && !popupVisible) {
        hoverTimeout = setTimeout(() => {
            sidebar.classList.remove('visible');
            sidebarVisible = false;
            hoverTimeout = null;

            // Close context menu when sidebar disappears
            const contextMenu = document.getElementById('context-menu');
            if (contextMenu) {
                contextMenu.style.display = 'none';
            }
        }, 300);
    }
});


addPlaylistButton.addEventListener('click', () => {
    const playlists = loadPlaylists();
    const playlistName = `Playlist #${playlists.length + 1}`;
    addPlaylist(playlistName, 'New playlist description');
    renderPlaylists(); // Re-render playlists to handle the empty state removal
});


document.addEventListener('DOMContentLoaded', () => {
    renderPlaylists(null, true)
})