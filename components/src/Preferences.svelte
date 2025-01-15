<svelte:options
  customElement={{ tag: "template-preference", shadow: "none" }}
/>

<script>
  import {
    Block,
    BlockBody,
    BlockTitle,
    MeltCheckbox,
  } from "@intechstudio/grid-uikit";
  import { onMount } from "svelte";

  // @ts-ignore
  const messagePort = createPackageMessagePort(
    "package-svelte-template",
    "preferences"
  );

  let myFirstVariable = false;

  $: myFirstVariable, handleDataChange();

  function handleDataChange() {
    messagePort.postMessage({
      type: "set-setting",
      myFirstVariable,
    });
  }

  onMount(() => {
    messagePort.onmessage = (e) => {
      const data = e.data;
      if (data.type === "client-status") {
        myFirstVariable = data.myFirstVariable;
      }
    };
    messagePort.start();
    return () => {
      messagePort.close();
    };
  });
</script>

<main-app>
  <div class="px-4">
    <Block>
      <BlockTitle>Template Package</BlockTitle>
      <BlockBody>
        Test variable
        <MeltCheckbox
          title={"This is a persistent variable"}
          bind:target={myFirstVariable}
        />
      </BlockBody>
    </Block>
  </div>
</main-app>
