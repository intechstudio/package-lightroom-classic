const net = require("net");

let controller;
let preferenceMessagePort = undefined;

let receiverPort;
let isReceiverConnected = false;
let transmitPort;
let isTransmitConnected = false;

function destroyReceiver() {
  if (receiverPort) {
    receiverPort.destroySoon();
    receiverPort = undefined;
    isReceiverConnected = false;
    notifyStatusChange();
  }
}

function destroyTransmit() {
  if (transmitPort) {
    transmitPort.destroySoon();
    transmitPort = undefined;
    isTransmitConnected = true;
    notifyStatusChange();
  }
}

function createReceiverPort() {
  destroyReceiver();
  receiverPort = new net.Socket();

  receiverPort.connect(23111, "127.0.0.1", () => {
    isReceiverConnected = true;
    notifyStatusChange();
  });
  receiverPort.on("data", handlePortMessage);
  receiverPort.on("error", console.error);
  receiverPort.on("close", () => {
    isReceiverConnected = false;
    notifyStatusChange();
  });
}

function createTransmitPort() {
  destroyTransmit();
  transmitPort = new net.Socket();

  transmitPort.connect(23110, "127.0.0.1", () => {
    isTransmitConnected = true;
    notifyStatusChange();
  });
  transmitPort.on("error", console.error);
  transmitPort.on("close", () => {
    isTransmitConnected = false;
    notifyStatusChange();
  });
}

function handlePortMessage(data) {
  console.log(`LIGHTROOM DATA: ${data.toString()}`);
}

exports.loadPackage = async function (gridController, persistedData) {
  controller = gridController;

  gridController.sendMessageToEditor({
    type: "add-action",
    info: {
      actionId: 0,
      rendering: "standard",
      category: "lightroom",
      color: "#000e69",
      icon: "<div />",
      blockIcon: "<div />",
      selectable: true,
      movable: true,
      hideIcon: false,
      type: "single",
      toggleable: true,
      short: "xlip",
      displayName: "Set Image Property",
      defaultLua: 'gps("package-lightroom", "rating", val)',
      actionComponent: "image-property-action",
    },
  });

  createReceiverPort();
  createTransmitPort();
};

exports.unloadPackage = async function () {
  controller.sendMessageToEditor({
    type: "remove-action",
    actionId: 0,
  });
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
