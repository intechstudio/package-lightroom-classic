<svelte:options customElement={{ tag: "show-view-action", shadow: "none" }} />

<script>
  import { MeltCombo } from "@intechstudio/grid-uikit";
  import { onMount } from "svelte";
  let parameterCode = "";
  let currentCodeValue = "";
  let ref;
  let isInitialized = false;

  function handleConfigUpdate(config) {
    const regex = /^gps\("package-lightroom-classic", "view", *"(.*?)"\)$/;
    if (currentCodeValue != config.script) {
      currentCodeValue = config.script;
      const match = config.script.match(regex);
      if (match) {
        parameterCode = match[1] ?? "loupe";
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
        var code = `gps("package-lightroom-classic", "view", "${parameterCode}")`;
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

<show-view
  class="{$$props.class} flex flex-col w-full pb-2 px-2 pointer-events-auto"
  bind:this={ref}
>
  <div class="w-full flex">
    <MeltCombo
      title={"View name"}
      bind:value={parameterCode}
      size={"full"}
      searchable={true}
      suggestions={[
        { info: "Loupe", value: "loupe" },
        { info: "Grid", value: "grid" },
        { info: "Compare", value: "compare" },
        { info: "Survey", value: "survey" },
        { info: "People", value: "people" },
        { info: "Develop Loupe", value: "develop_loupe" },
        {
          info: "Develop Before After Horiz",
          value: "develop_before_after_horiz",
        },
        {
          info: "Develop Before After Vert",
          value: "develop_before_after_vert",
        },
        { info: "Develop Before", value: "develop_before" },
        { info: "Develop Reference Horiz", value: "develop_reference_horiz" },
        { info: "Develop Reference Vert", value: "develop_reference_vert" },
      ]}
    />
  </div>
</show-view>
