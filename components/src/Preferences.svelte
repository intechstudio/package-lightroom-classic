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
  } from "@intechstudio/grid-uikit";
  import { onMount } from "svelte";

  // @ts-ignore
  const messagePort = createPackageMessagePort(
    "package-lightroom",
    "preferences"
  );

  let isReceiverConnected = false;
  let isTransmitConnected = false;

  onMount(() => {
    messagePort.onmessage = (e) => {
      const data = e.data;
      if (data.type === "client-status") {
        isReceiverConnected = data.isReceiverConnected;
        isTransmitConnected = data.isTransmitConnected;
      }
    };
    messagePort.start();
    return () => {
      messagePort.close();
    };
  });
</script>

<lightroom-app>
  <div class="px-4">
    <Block>
      <BlockTitle>Lightroom Package</BlockTitle>
      <BlockBody>
        Receiver connected: {isReceiverConnected}<br />
        Transmit connected: {isTransmitConnected}<br />
        <MoltenButton
          title="Reconnect ports"
          click={() => {
            messagePort.postMessage({
              type: "reconnect",
            });
          }}
        />
      </BlockBody>
    </Block>
  </div>
</lightroom-app>
