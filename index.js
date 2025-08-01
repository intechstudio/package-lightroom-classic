const net = require("net");
const fs = require("fs");
const path = require("path");

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
  if (receiverPort) {
    receiverPort.destroySoon();
    receiverPort = undefined;
    isReceiverConnected = false;
    notifyStatusChange();
  }
  clearTimeout(receiverConnectTimeoutId);
}

function destroyTransmit() {
  if (transmitPort) {
    transmitPort.destroySoon();
    transmitPort = undefined;
    isTransmitConnected = false;
    notifyStatusChange();
  }
  clearTimeout(transmitConnectTimeoutId);
}

function createReceiverPort() {
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
    //destroyTransmit(); //Cant release socket from plugin side
    notifyStatusChange();
  });
}

function createTransmitPort() {
  destroyTransmit();
  transmitPort = new net.Socket();

  transmitPort.connect(transmitPortNumber, "127.0.0.1", () => {
    isTransmitConnected = true;
    clearTimeout(transmitConnectTimeoutId);
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

function scheduleMessage() {
  let nextGroupId = messageGroupQue.shift();
  if (!nextGroupId) return;

  let args = messageGroupData.get(nextGroupId);
  messageGroupData.delete(nextGroupId);

  let request = args.join(",");
  transmitPort.write(`${request}\n`);
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
        transmitPortNumber = message.port;
        createTransmitPort();
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
    } catch (error) {
      console.error(error);
    }
  }
}

let actionId = 0;

exports.loadPackage = async function (gridController, persistedData) {
  controller = gridController;

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
      'gps("package-lightroom-classic", "develop", "Temperature", val, 0)',
    actionComponent: "develop-control-action",
  });

  createLightroomAction({
    short: "xlrsv",
    displayName: "Show View",
    defaultLua: 'gps("package-lightroom-classic", "view", "loupe")',
    actionComponent: "show-view-action",
  });

  createReceiverPort();

  messageHandlerId = setInterval(scheduleMessage, 50);
};

exports.unloadPackage = async function () {
  clearTimeout(messageHandlerId);
  while (actionId >= 0) {
    controller.sendMessageToEditor({
      type: "remove-action",
      actionId: --actionId,
    });
  }
  destroyReceiver();
  destroyTransmit();
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
        messageQueTimeout = e.data.messageQueTimeout;
      }
    });
    port.start();
    notifyStatusChange();
  }
};

exports.sendMessage = async function (args) {
  let messageGroupId = args[0];
  if (messageGroupId == "back") {
    controller.sendMessageToEditor({
      type: "execute-lua-script",
      script: "gks(25,0,2,41)",
    });
    return;
  }
  if (messageGroupId == "enhance") {
    controller.sendMessageToEditor({
      type: "execute-lua-script",
      script: "gks(25,1,1,1,1,1,4,0,2,12,1,0,4,1,0,1)",
    });
    return;
  }
  if (messageGroupId == "export") {
    controller.sendMessageToEditor({
      type: "execute-lua-script",
      script: "gks(25,1,1,1,1,1,2,0,2,8,1,0,1,1,0,2)",
    });
    return;
  }
  if (messageGroupId == "import") {
    controller.sendMessageToEditor({
      type: "execute-lua-script",
      script: "gks(25,1,1,1,1,1,2,0,2,12,1,0,2,1,0,1)",
    });
    return;
  }
  messageGroupData.set(messageGroupId, args);
  if (!messageGroupQue.includes(messageGroupId)) {
    messageGroupQue.push(messageGroupId);
  }
};

function notifyStatusChange() {
  preferenceMessagePort?.postMessage({
    type: "client-status",
    isReceiverConnected,
    isTransmitConnected,
    messageQueTimeout,
  });
}
