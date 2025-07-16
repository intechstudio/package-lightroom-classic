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
    "package-lightroom",
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
      <BlockTitle>Lightroom Package</BlockTitle>
      <BlockBody>
        Receiver connected: {isReceiverConnected}<br />
        Transmit connected: {isTransmitConnected}<br />
      </BlockBody>
      <MeltCombo title="Message que timeout" bind:value={messageQueTimeout} />
    </Block>
  </div>
</lightroom-app>
