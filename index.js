const net = require("net");
const fs = require("fs");
const path = require("path");
const openExplorer = require("open-file-explorer");

let controller;
let preferenceMessagePort = undefined;

let receiverPort;
let isReceiverConnected = false;
let receiverConnectTimeoutId;
let transmitPort;
let isTransmitConnected = false;
let transmitConnectTimeoutId;

let photosToBeSent = [];
let currentSentIndex = 0;
let messageQueTimeout = 180;
let MAX_MESSAGE_SIZE = 390;
let transmitPortNumber = 0;
let watchForActiveWindow = false;
let enableOverlay = false;
let useControlKeyForOverlay = false;
let currentControlKeyValue = false;

let isLightroomActive = false;

let packageShutDown = false;

let actionPorts = new Set();

function sendNextPhotosBatch() {
  /*let dataString = "{";
  let isFirst = true;
  photosToBeSent.forEach((photo) => {
    let originalName = photo.name;
    let extensionIndex = originalName.lastIndexOf(".");
    let name = originalName.substring(Math.max(0, extensionIndex - 4), extensionIndex);
    dataString = `${dataString}${isFirst ? '' : ','}{id=${photo.id},name=${name}}`;
    isFirst = false;
  })
  dataString += "}"
  let script = `LrImportNames(${dataString}, 0)`*/
  let ids = photosToBeSent.map((e) => e.id);
  let names = photosToBeSent.map((photo) => {
    let originalName = photo.name;
    let extensionIndex = originalName.lastIndexOf(".");
    return originalName.substring(
      Math.max(0, extensionIndex - 4),
      extensionIndex,
    );
  });
  let script = `LrImportNames(${JSON.stringify(ids)
    .replace("[", "{")
    .replace("]", "}")}, ${JSON.stringify(names)
    .replace("[", "{")
    .replace("]", "}")})`;
  console.log({ script });
  console.log("SENDING EXECUTE");
  controller.sendMessageToEditor({
    type: "execute-lua-script",
    script,
  });
}

function destroyReceiver() {
  clearTimeout(receiverConnectTimeoutId);
  if (receiverPort) {
    receiverPort.destroy();
    receiverPort = undefined;
    isReceiverConnected = false;
    notifyStatusChange();
  }
}

function destroyTransmit() {
  clearTimeout(transmitConnectTimeoutId);
  if (transmitPort) {
    transmitPort.destroy();
    transmitPort = undefined;
    isTransmitConnected = false;
    notifyStatusChange();
  }
}

function createReceiverPort() {
  if (packageShutDown) return;

  destroyReceiver();
  receiverPort = new net.Socket();

  receiverPort.connect(23111, "127.0.0.1", () => {
    isReceiverConnected = true;
    clearTimeout(receiverConnectTimeoutId);
    notifyStatusChange();
  });
  receiverPort.on("data", handlePortMessage);
  receiverPort.on("error", console.error);
  receiverPort.on("close", () => {
    isReceiverConnected = false;
    receiverConnectTimeoutId = setTimeout(createReceiverPort, 2000);
    notifyStatusChange();
  });
}

function createTransmitPort() {
  if (packageShutDown) return;

  destroyTransmit();
  transmitPort = new net.Socket();

  transmitPort.connect(transmitPortNumber, "127.0.0.1", () => {
    isTransmitConnected = true;
    clearTimeout(transmitConnectTimeoutId);
    reschedulePingMessage();
    notifyStatusChange();
  });
  transmitPort.on("error", console.error);
  transmitPort.on("close", () => {
    isTransmitConnected = false;
    transmitConnectTimeoutId = setTimeout(createTransmitPort, 2000);
    notifyStatusChange();
  });
}

let messageHandlerId;
let messageGroupQue = [];
let messageGroupData = new Map();

let pingMessageTimeoutId;
function reschedulePingMessage() {
  clearTimeout(pingMessageTimeoutId);
  pingMessageTimeoutId = setTimeout(sendPingMessage, 4000);
}

function sendPingMessage() {
  transmitPort?.write(`1\n`); //Send keepalive message
  reschedulePingMessage();
}

function scheduleMessage() {
  let nextGroupId = messageGroupQue.shift();
  if (!nextGroupId) return;

  let args = messageGroupData.get(nextGroupId);
  messageGroupData.delete(nextGroupId);

  let request = args.join(",");
  transmitPort?.write(`${request}\n`);
  reschedulePingMessage();
}

function handlePortMessage(data) {
  console.log(`LIGHTROOM DATA: ${data.toString()}`);
  dataMessages = data.toString().split("\n");
  for (let messageString of dataMessages) {
    try {
      console.log(`HANDLING MESSAGE: ${messageString}`);
      let message = JSON.parse(messageString);
      if (message.type == "receiver-port") {
        console.log(`RECEIVING PORT: ${message.port}`);
        if (transmitPortNumber !== message.port || !isTransmitConnected) {
          transmitPortNumber = message.port;
          createTransmitPort();
        }
      }
      if (message.type == "photos-name-result") {
        console.log("INSIDE MESSAGE HANDLER");
        photosToBeSent = message.result;
        currentSentIndex = 0;
        sendNextPhotosBatch();
      }
      if (message.type == "active-photo-result") {
        let photo = message.photo;
        let script = `LrImportActive(${photo.id},"${
          photo.isoSpeed
        }","${photo.aperture.toString().replace("ƒ", "f")}","${
          photo.shutterSpeed
        }","${photo.focalLength}",${photo.rating},"${
          photo.flag == 1 ? "P" : photo.flag == 0 ? "" : "R"
        }")`;
        console.log(`SENDING: ${script}`);
        controller.sendMessageToEditor({
          type: "execute-lua-script",
          script,
        });
      }
      if (message.type == "range-result") {
        console.log({ message });
        actionPorts.forEach((e) => {
          e.postMessage(message);
        });
      }
    } catch (error) {
      console.error(error);
    }
  }
}

let actionId = 0;

exports.loadPackage = async function (gridController, persistedData) {
  packageShutDown = false;
  controller = gridController;

  watchForActiveWindow = persistedData?.watchForActiveWindow ?? false;
  enableOverlay = persistedData?.enableOverlay ?? false;
  useControlKeyForOverlay = persistedData?.useControlKeyForOverlay ?? false;

  let lightroomIconSvg = fs.readFileSync(
    path.resolve(__dirname, "lightroom-action-icon.svg"),
    { encoding: "utf-8" },
  );

  function createLightroomAction(overrides) {
    gridController.sendMessageToEditor({
      type: "add-action",
      info: {
        actionId: actionId++,
        rendering: "standard",
        category: "lightroom",
        color: "#5865F2",
        icon: lightroomIconSvg,
        blockIcon: lightroomIconSvg,
        selectable: true,
        movable: true,
        hideIcon: false,
        type: "single",
        toggleable: true,
        ...overrides,
      },
    });
  }

  createLightroomAction({
    short: "xlrip",
    displayName: "Set Image Property",
    defaultLua: 'gps("package-lightroom-classic", "rating", "+1")',
    actionComponent: "image-property-action",
  });

  createLightroomAction({
    short: "xlrvc",
    displayName: "View Control",
    defaultLua: 'gps("package-lightroom-classic", "next-photo")',
    actionComponent: "view-control-action",
  });

  createLightroomAction({
    short: "xlrdc",
    displayName: "Develop Control",
    defaultLua:
      'gps("package-lightroom-classic", "develop", "Temperature", self:get_auto_value(), self:get_auto_mode())',
    actionComponent: "develop-control-action",
  });

  createLightroomAction({
    short: "xlrsv",
    displayName: "Show View",
    defaultLua: 'gps("package-lightroom-classic", "view", "loupe")',
    actionComponent: "show-view-action",
  });

  createLightroomAction({
    short: "xlroc",
    displayName: "Control Overlay",
    defaultLua:
      'gps("package-lightroom-classic", "control-overlay", self:get_auto_value())',
    actionComponent: "overlay-control-action",
  });

  createReceiverPort();

  messageHandlerId = setInterval(scheduleMessage, 50);

  if (watchForActiveWindow) {
    setTimeout(tryActivateActiveWindow, 50);
  }
};

exports.unloadPackage = async function () {
  packageShutDown = true;
  clearTimeout(messageHandlerId);
  while (actionId >= 0) {
    controller.sendMessageToEditor({
      type: "remove-action",
      actionId: --actionId,
    });
  }
  clearTimeout(transmitConnectTimeoutId);
  clearTimeout(receiverConnectTimeoutId);
  clearTimeout(pingMessageTimeoutId);
  destroyReceiver();
  destroyTransmit();
  controller.sendMessageToEditor({
    type: "send-package-message",
    targetPackageId: "package-active-win",
    message: {
      type: "unsubscribe",
    },
  });
  preferenceMessagePort?.close();
  actionPorts.forEach((e) => e.close());
};

exports.addMessagePort = async function (port, senderId) {
  if (senderId == "preferences") {
    preferenceMessagePort?.close();
    preferenceMessagePort = port;
    port.on("close", () => {
      preferenceMessagePort = undefined;
    });
    port.on("message", (e) => {
      if (e.data.type === "update") {
        if (watchForActiveWindow != e.data.watchForActiveWindow) {
          if (!watchForActiveWindow) {
            tryActivateActiveWindow();
          } else {
            clearTimeout(activeWindowSubscribeTimeoutId);
            controller.sendMessageToEditor({
              type: "send-package-message",
              targetPackageId: "package-active-win",
              message: {
                type: "unsubscribe",
              },
            });
          }
        }
        messageQueTimeout = e.data.messageQueTimeout ?? messageQueTimeout;
        useControlKeyForOverlay = e.data.useControlKeyForOverlay;
        enableOverlay = e.data.enableOverlay;
        watchForActiveWindow = e.data.watchForActiveWindow;
        controller.sendMessageToEditor({
          type: "persist-data",
          data: {
            watchForActiveWindow,
            enableOverlay,
            useControlKeyForOverlay,
          },
        });
      } else if (e.data.type === "open-plugin-folder") {
        openExplorer(__dirname);
      }
    });
    port.start();
    notifyStatusChange();
  } else if (senderId == "action-range") {
    actionPorts.add(port);
    port.on("message", (e) => {
      if (e.data.type == "develop-range") {
        let request = `develop-range,${e.data.parameterName}\n`;
        transmitPort?.write(request);
      }
    });
    port.on("close", () => {
      actionPorts.delete(port);
    });
    port.start();
  }
};

exports.sendMessage = async function (args) {
  console.log({ args });
  if (Array.isArray(args)) {
    let messageGroupId = args[0];
    if (messageGroupId === "control-overlay") {
      currentControlKeyValue = args[1] !== 0;
      return;
    }
    let hotkeyScript = undefined;
    if (messageGroupId == "back") {
      hotkeyScript = "gks(25,0,2,41)";
    } else if (messageGroupId == "enhance") {
      hotkeyScript = "gks(25,1,1,1,1,1,4,0,2,12,1,0,4,1,0,1)";
    } else if (messageGroupId == "export") {
      hotkeyScript = "gks(25,1,1,1,1,1,2,0,2,8,1,0,1,1,0,2)";
    } else if (messageGroupId == "import") {
      hotkeyScript = "gks(25,1,1,1,1,1,2,0,2,8,1,0,1,1,0,2)";
    }
    if (hotkeyScript !== undefined) {
      if (!watchForActiveWindow) {
        controller.sendMessageToEditor({
          type: "show-message",
          message: `Lightroom focus must be active for ${messageGroupId} shortcut to work. Enable it in Lightroom Preference!`,
          messageType: "fail",
        });
        return;
      }
      if (!isLightroomActive) return;

      if (
        enableOverlay &&
        (!useControlKeyForOverlay || currentControlKeyValue)
      ) {
        showOverlayMessage(
          messageGroupId.charAt(0).toUpperCase() + messageGroupId.substring(1),
        );
        if (useControlKeyForOverlay) {
          return;
        }
      }
      controller.sendMessageToEditor({
        type: "execute-lua-script",
        script: hotkeyScript,
      });
      return;
    }
    if (enableOverlay && (!useControlKeyForOverlay || currentControlKeyValue)) {
      switch (messageGroupId) {
        case "rating":
          switch (args[1]) {
            case "+1":
              showOverlayMessage("Increase rating");
              break;
            case "-1":
              showOverlayMessage("Decrease rating");
              break;
            default:
              showOverlayMessage(`Set rating to ${args[1]}`);
              break;
          }
          break;
        case "flag":
          switch (args[1]) {
            case "pick":
              showOverlayMessage("Pick image");
              break;
            case "reject":
              showOverlayMessage("Reject image");
              break;
            case "remove":
              showOverlayMessage("Remove flag");
              break;
          }
          break;
        case "color":
          showOverlayMessage(`Set photo label color to ${args[1]}`);
          break;
        case "next-photo":
          showOverlayMessage("Jump to next photo");
          break;
        case "previous-photo":
          showOverlayMessage("Jump to previous photo");
          break;
        case "develop":
          {
            if (args[3]) {
              showOverlayMessage(`Change ${args[1]} by ${args[2]}`);
            } else {
              showOverlayMessage(`Set ${args[1]} to ${args[2]}`);
            }
          }
          break;
        case "remove":
          showOverlayMessage(`Set Remove parameter ${args[1]} to ${args[2]}`);
          break;
        case "undo":
          showOverlayMessage("Undo");
          break;
        case "redo":
          showOverlayMessage("Redo");
          break;
        case "create-virtual":
          showOverlayMessage("Create virtual copy");
          break;
        case "view":
          showOverlayMessage(`Show view ${args[1]}`);
          break;
        case "zoom-toggle":
          showOverlayMessage("Toggle zoom");
          break;
        case "zoom-in":
          showOverlayMessage("Zoom in");
          break;
        case "zoom-out":
          showOverlayMessage("Zoom out");
          break;
        case "zoom-onetoone":
          showOverlayMessage("Zoom one-to-one");
          break;
        case "copy":
          showOverlayMessage("Copy photo settings");
          break;
        case "paste":
          showOverlayMessage("Paste photo settings");
          break;
        case "reset":
          showOverlayMessage("Reset all adjustments");
          break;
        case "selectall":
          showOverlayMessage("Select all photos");
          break;
        case "goto-remove":
          showOverlayMessage("Go to remove panel");
          break;
        case "goto-mask":
          showOverlayMessage("Go to masking panel");
          break;
        case "goto-crop":
          showOverlayMessage("Go to crop view");
          break;
      }
      if (useControlKeyForOverlay) {
        return;
      }
    }
    if (watchForActiveWindow && !isLightroomActive) {
      return;
    }
    messageGroupData.set(messageGroupId, [...args]);
    if (!messageGroupQue.includes(messageGroupId)) {
      messageGroupQue.push(messageGroupId);
    }
  } else {
    if (args.type === "active-window-status") {
      clearTimeout(activeWindowSubscribeTimeoutId);
      isLightroomActive = args.status;
      console.log({ isLightroomActive });
    }
  }
};

function showOverlayMessage(text) {
  controller.sendMessageToEditor({
    type: "send-package-message",
    targetPackageId: "package-overlay",
    message: {
      type: "show-text",
      text: text,
    },
  });
}

let activeWindowSubscribeTimeoutId = undefined;
function tryActivateActiveWindow() {
  activeWindowSubscribeTimeoutId = setTimeout(
    activeWindowRequestNoResponse,
    50,
  );
  controller.sendMessageToEditor({
    type: "send-package-message",
    targetPackageId: "package-active-win",
    message: {
      type: "subscribe",
      filter: "Lightroom",
      target: "application",
    },
  });
}

function activeWindowRequestNoResponse() {
  activeWindowSubscribeTimeoutId = undefined;
  controller.sendMessageToEditor({
    type: "show-message",
    message:
      "Couldn't connect to Active Window package! Make sure it is enabled!",
    messageType: "fail",
  });
  watchForActiveWindow = false;
  notifyStatusChange();
}

function notifyStatusChange() {
  preferenceMessagePort?.postMessage({
    type: "client-status",
    isReceiverConnected,
    isTransmitConnected,
    messageQueTimeout,
    watchForActiveWindow,
    enableOverlay,
    useControlKeyForOverlay,
  });
}
