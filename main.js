const electron      = require('electron')
// Module to control application life.
const app           = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const ipcMain       = electron.ipcMain

const path  = require('path')
const url   = require('url')

const SerialPort    = require('serialport');
const Readline      = SerialPort.parsers.Readline;

const BAUDRATE  = 9600;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

let port    = null;
let parser  = new Readline();

function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    });

    mainWindow.webContents.on('did-finish-load', () => {
        SerialPort.list(function(error, data) {
            mainWindow.webContents.send('serialports', data);
        });
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function connectToDevice(device, callback)
{
    disconnetFromDevice();

    port = new SerialPort(device, {
        'baudRate': BAUDRATE
    });

    port.on('error', function(err) {
        if (callback)
        {
            callback(err);
        }
    });

    port.on('open', function() {
        port.pipe(parser);

        parser.on('data', console.log);

        if (callback)
        {
            callback(null);
        }
    });
}

function disconnetFromDevice(callback)
{
    if (port != null)
    {
        port.close();
    }

    port = null;

    if (callback)
    {
        callback(null);
    }
}

function submitMessageToDevice(device, message, callback)
{
    if (port == null)
    {
        if (callback)
        {
            callback("Impossible to submit the message, no device connected.");
        }

        return;
    }

    console.log("->" + message);

    port.write(message, 'utf8', function(err) {
        if (callback)
        {
            callback(err);
        }
    });
}

ipcMain.on('connect', (event, arg) => {
    connectToDevice(arg.device, function(err) {
        event.sender.send('connect', err ? 'failure' : 'success');
    });
});

ipcMain.on('disconnect', (event, arg) => {
    disconnetFromDevice(function(err) {
        event.sender.send('disconnect', err ? 'failure' : 'success');
    });
});

ipcMain.on('submit-value', (event, arg) => {
    let message = arg.key + ":" + arg.value;
    submitMessageToDevice(arg.device, message, function(err) {
        event.sender.send('submit-value', err ? 'failure' : 'success');
    });
});

ipcMain.on('reset', (event, arg) => {
    let message = "reset";
    submitMessageToDevice(arg.device, message, function(err) {
        event.sender.send('submit-value', err ? 'failure' : 'success');
    });
});
