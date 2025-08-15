<svelte:options
  customElement={{ tag: "lightroom-preference", shadow: "none" }}
/>

<script>
  import {
    Block,
    BlockBody,
    BlockTitle,
    MeltCheckbox,
    MoltenButton,
    MeltCombo,
  } from "@intechstudio/grid-uikit";
  import { onMount } from "svelte";

  // @ts-ignore
  const messagePort = createPackageMessagePort(
    "package-lightroom-classic",
    "preferences",
  );

  let isReceiverConnected = false;
  let isTransmitConnected = false;
  let messageQueTimeout = "180";
  let isInitialized = false;

  $: messageQueTimeout, updatePackage();

  function updatePackage() {
    messagePort.postMessage({
      type: "update",
      messageQueTimeout: Number(messageQueTimeout),
    });
  }

  onMount(() => {
    messagePort.onmessage = (e) => {
      const data = e.data;
      if (data.type === "client-status") {
        isReceiverConnected = data.isReceiverConnected;
        isTransmitConnected = data.isTransmitConnected;
        messageQueTimeout = String(data.messageQueTimeout);
        isInitialized = true;
      }
    };
    messagePort.start();
    return () => {
      messagePort.close();
    };
  });
</script>

<lightroom-app>
  <div class="px-4 bg-secondary rounded-lg">
    <Block>
      <BlockTitle>
        <div class="flex flex-row content-center">
          Lightroom Preference <div
            style="margin-left: 12px; width: 12px; height: 12px; border-radius: 50%; background-color: {isReceiverConnected &&
            isTransmitConnected
              ? '#00D248'
              : '#fb2323'}"
          />
        </div>
      </BlockTitle>
      <BlockBody>
        Two-way connection status : {isReceiverConnected && isTransmitConnected
          ? "Connected"
          : "Connecting"}
      </BlockBody>
      <BlockBody>
        Package connected: {isReceiverConnected}<br />
        Lightroom connected: {isTransmitConnected}<br />
      </BlockBody>
      <MeltCombo title="Message que timeout" bind:value={messageQueTimeout} />
    </Block>
  </div>
</lightroom-app>
