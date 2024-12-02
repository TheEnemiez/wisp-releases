const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron'); // Import Menu explicitly
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false, // Disable default window frame for custom controls
        webPreferences: {
            enableRemoteModule: true,
            nodeIntegration: true, // Re-enable full Node.js integration in the renderer
            contextIsolation: false, // Allow direct communication without preload
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    Menu.setApplicationMenu(null); // Remove default menu bar

    ipcMain.handle('open-file-dialog', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Playlist Icon',
            filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }],
            properties: ['openFile'],
        });
        return result;
    });

    ipcMain.on('minimize-window', () => {
        console.log('Minimize window request received');
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('maximize-window', () => {
        console.log('Maximize window request received');
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    ipcMain.on('close-window', () => {
        console.log('Close window request received');
        if (mainWindow) mainWindow.close();
    });

    // Send maximize/unmaximize updates
    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('update-maximize-icon', true);
    });

    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('update-maximize-icon', false);
    });

    // macOS-specific behavior
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = new BrowserWindow({
                width: 800,
                height: 600,
                frame: false,
                webPreferences: {
                    enableRemoteModule: true,
                    nodeIntegration: true,
                    contextIsolation: false,
                },
            });
            mainWindow.loadFile(path.join(__dirname, 'index.html'));
        }
    });
});
