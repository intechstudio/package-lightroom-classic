<svelte:options
  customElement={{ tag: "develop-control-action", shadow: "none" }}
/>

<script>
  import { MeltCombo, MeltCheckbox } from "@intechstudio/grid-uikit";
  import { onMount } from "svelte";
  import suggestions from "./develop-control-suggestions.js";
  let parameterCode = "";
  let parameterValue = "";
  let isRelativeMode = false;
  let currentCodeValue = "";
  let ref;
  let isInitialized = false;

  function handleConfigUpdate(config) {
    const regex =
      /^gps\("package-lightroom-classic", "develop", *"(.*?)", *(.*?), (1|0)\)$/;
    if (currentCodeValue != config.script) {
      currentCodeValue = config.script;
      const match = config.script.match(regex);
      if (match) {
        parameterCode = match[1] ?? "Temperature";
        parameterValue = match[2] ?? "val";
        isRelativeMode = match[3] == "1";
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
    parameterValue,
    isRelativeMode,
    isInitialized &&
      (function () {
        var code = `gps("package-lightroom-classic", "develop", "${parameterCode}", ${parameterValue}, ${
          isRelativeMode ? 1 : 0
        })`;
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

<develop-control
  class="{$$props.class} flex flex-col w-full pb-2 px-2 pointer-events-auto"
  bind:this={ref}
>
  <div class="w-full flex">
    <div class="w-1/2">
      <MeltCombo
        title={"Parameter name"}
        bind:value={parameterCode}
        size={"full"}
        searchable={true}
        {suggestions}
      />
    </div>
    <div class="w-1/2">
      <MeltCombo
        title={"Parameter value"}
        bind:value={parameterValue}
        size={"full"}
      />
    </div>
  </div>
  <MeltCheckbox bind:target={isRelativeMode} title={"Relative Mode"} />
</develop-control>
