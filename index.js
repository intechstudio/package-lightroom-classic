let controller;
let preferenceMessagePort = undefined;

let myFirstVariable = false;

exports.loadPackage = async function (gridController, persistedData) {
  controller = gridController;

  gridController.sendMessageToEditor({
    type: "add-action",
    info: {
      actionId: 0,
      rendering: "standard",
      category: "template",
      color: "#5865F2",
      icon: "<div />",
      blockIcon: "<div />",
      selectable: true,
      movable: true,
      hideIcon: false,
      type: "single",
      toggleable: true,
      short: "xta",
      displayName: "Template Action",
      defaultLua: 'gps("package-svelte-template", val)',
      actionComponent: "template-action",
    },
  });

  myFirstVariable = persistedData?.myFirstVariable ?? false;
};

exports.unloadPackage = async function () {
  controller.sendMessageToEditor({
    type: "remove-action",
    actionId: 0,
  });
};

exports.addMessagePort = async function (port, senderId) {
  if (senderId == "preferences") {
    preferenceMessagePort?.close();
    preferenceMessagePort = port;
    port.on("close", () => {
      preferenceMessagePort = undefined;
    });
    port.on("message", (e) => {
      console.log({ e });
      if (e.data.type === "set-setting") {
        myFirstVariable = e.data.myFirstVariable;
        controller.sendMessageToEditor({
          type: "persist-data",
          data: {
            myFirstVariable,
          },
        });
      }
    });
    port.start();
    notifyStatusChange();
  }
};

exports.sendMessage = async function (args) {
  console.log(args); //Can be seen in Editor logs
};

function notifyStatusChange() {
  preferenceMessagePort?.postMessage({
    type: "client-status",
    myFirstVariable,
  });
}
