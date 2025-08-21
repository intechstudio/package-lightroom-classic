<svelte:options
  customElement={{ tag: "lightroom-preference", shadow: "none" }}
/>

<script>
  import {
    Block,
    BlockBody,
    BlockTitle,
    MeltCheckbox,
    MoltenPushButton,
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
  let watchForActiveWindow = false;
  let enableOverlay = false;
  let useControlKeyForOverlay = false;

  $: messageQueTimeout,
    watchForActiveWindow,
    enableOverlay,
    useControlKeyForOverlay,
    updatePackage();

  function updatePackage() {
    messagePort.postMessage({
      type: "update",
      messageQueTimeout: Number(messageQueTimeout),
      watchForActiveWindow,
      enableOverlay,
      useControlKeyForOverlay,
    });
  }

  onMount(() => {
    messagePort.onmessage = (e) => {
      const data = e.data;
      if (data.type === "client-status") {
        isReceiverConnected = data.isReceiverConnected;
        isTransmitConnected = data.isTransmitConnected;
        messageQueTimeout = String(data.messageQueTimeout);
        watchForActiveWindow = data.watchForActiveWindow;
        enableOverlay = data.enableOverlay;
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
      {#if !isReceiverConnected || !isTransmitConnected}
        <BlockBody>
          <p>Lightroom plugin must be installed!</p>
          <MoltenPushButton
            style="outlined"
            text={"lrplugin folder location"}
            click={() => {
              messagePort.postMessage({
                type: "open-plugin-folder",
              });
            }}
          />
        </BlockBody>
        <BlockBody>
          Package connected: {isReceiverConnected}<br />
          Lightroom connected: {isTransmitConnected}<br />
        </BlockBody>
      {/if}
      <BlockBody>
        Lightroom focus
        <MeltCheckbox
          title={"Only run actions when Lightroom is in focus"}
          bind:target={watchForActiveWindow}
        />
        <p class="text-gray-500 text-sm font-bold mt-1">
          Note: Requires Active Window package enabled
        </p>
      </BlockBody>

      <BlockBody>
        Overlay
        <MeltCheckbox
          title={"Enable overlay for Lightroom commands"}
          bind:target={enableOverlay}
        />
        <p class="text-gray-500 text-sm font-bold mt-1">
          Note: Requires Overlay package enabled
        </p>
        {#if enableOverlay}
          <MeltCheckbox
            title={"Use control key to switch between executing and showing command"}
            bind:target={useControlKeyForOverlay}
          />
        {/if}
      </BlockBody>
      <!--<MeltCombo title="Message que timeout" bind:value={messageQueTimeout} />-->
    </Block>
  </div>
</lightroom-app>
