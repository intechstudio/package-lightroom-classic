<svelte:options
  customElement={{ tag: "view-control-action", shadow: "none" }}
/>

<script>
  import { MeltCombo } from "@intechstudio/grid-uikit";
  import { onMount } from "svelte";
  let parameterCode = "";
  let currentCodeValue = "";
  let ref;
  let isInitialized = false;

  function handleConfigUpdate(config) {
    const regex = /^gps\("package-lightroom-classic", *"(.*?)"\)$/;
    if (currentCodeValue != config.script) {
      currentCodeValue = config.script;
      const match = config.script.match(regex);
      if (match) {
        parameterCode = match[1] ?? "next-photo";
        isInitialized = true;
      }
    }
  }

  onMount(() => {
    const event = new CustomEvent("updateConfigHandler", {
      bubbles: true,
      detail: { handler: handleConfigUpdate },
    });
    ref.dispatchEvent(event);
  });

  $: parameterCode,
    isInitialized &&
      (function () {
        var code = `gps("package-lightroom-classic", "${parameterCode}")`;
        if (currentCodeValue != code) {
          currentCodeValue = code;
          const event = new CustomEvent("updateCode", {
            bubbles: true,
            detail: { script: String(code) },
          });
          if (ref) {
            ref.dispatchEvent(event);
          }
        }
      })();
</script>

<view-control
  class="{$$props.class} flex flex-col w-full pb-2 px-2 pointer-events-auto"
  bind:this={ref}
>
  <div class="w-full flex">
    <MeltCombo
      title={"Action"}
      bind:value={parameterCode}
      size={"full"}
      searchable={true}
      suggestions={[
        { info: "Next Photo", value: "next-photo" },
        { info: "Previous Photo", value: "previous-photo" },
        { info: "Undo", value: "undo" },
        { info: "Redo", value: "redo" },
        { info: "Create Virtual Copy", value: "create-virtual" },
        { info: "Toogle Zoom", value: "zoom-toggle" },
        { info: "Zoom In", value: "zoom-in" },
        { info: "Zoom Out", value: "zoom-out" },
        { info: "Zoom to 100%", value: "zoom-onetoone" },
        { info: "Copy Image Settings", value: "copy" },
        { info: "Paste Image Settings", value: "paste" },
        { info: "Reset Image Settings", value: "reset" },
        { info: "Select All Images", value: "selectall" },
        { info: "Remove Tool", value: "goto-remove" },
        { info: "Masking Tool", value: "goto-mask" },
        { info: "Crop Tool", value: "goto-crop" },
        // TODO: implement Export/Import via keyboard shortcuts (no API available)
        // { info: "Export", value: "export" },
        // { info: "Import", value: "import" },
      ]}
    />
  </div>
</view-control>
