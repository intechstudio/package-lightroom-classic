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
    notifyStatusChange();
  });
}

function createTransmitPort() {
  destroyTransmit();
  transmitPort = new net.Socket();

  transmitPort.connect(23110, "127.0.0.1", () => {
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

function handlePortMessage(data) {
  console.log(`LIGHTROOM DATA: ${data.toString()}`);
}

let actionId = 0;

exports.loadPackage = async function (gridController, persistedData) {
  controller = gridController;

  let lightroomIconSvg = fs.readFileSync(
    path.resolve(__dirname, "lightroom_icon.svg"),
    { encoding: "utf-8" }
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
    short: "xlip",
    displayName: "Set Image Property",
    defaultLua: 'gps("package-lightroom", "rating", "+1")',
    actionComponent: "image-property-action",
  });

  createLightroomAction({
    short: "xlvc",
    displayName: "View Control",
    defaultLua: 'gps("package-lightroom", "next-photo")',
    actionComponent: "view-control-action",
  });

  createLightroomAction({
    short: "xldc",
    displayName: "Develop Control",
    defaultLua: 'gps("package-lightroom", "develop", "Temperature", val)',
    actionComponent: "develop-control-action",
  });

  createReceiverPort();
  createTransmitPort();
};

exports.unloadPackage = async function () {
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
      if (e.data.type === "reconnect") {
        createReceiverPort();
        createTransmitPort();
      }
    });
    port.start();
    notifyStatusChange();
  }
};

exports.sendMessage = async function (args) {
  let request = args.join(",");
  transmitPort.write(`${request}\n`);
};

function notifyStatusChange() {
  preferenceMessagePort?.postMessage({
    type: "client-status",
    isReceiverConnected,
    isTransmitConnected,
  });
}
