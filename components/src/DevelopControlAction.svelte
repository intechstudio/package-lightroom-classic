<svelte:options
  customElement={{ tag: "develop-control-action", shadow: "none" }}
/>

<script>
  import { MeltCombo, MeltCheckbox } from "@intechstudio/grid-uikit";
  import { onMount } from "svelte";
  import suggestions from "./develop-control-suggestions.js";
  let parameterCode = "";
  let parameterValue = "";
  let isRelativeMode = "";
  let currentCodeValue = "";
  let ref;
  let isInitialized = false;
  let isMinimalistMode = false;
  let currentRange = "-";

  // @ts-ignore
  const messagePort = createPackageMessagePort(
    "package-lightroom-classic",
    "action-range",
  );

  function handleConfigUpdate(config, minimalist) {
    const regex =
      /^gps\("package-lightroom-classic", "develop", *"(.*?)", *(.*?), *(.*?)\)$/;
    if (currentCodeValue != config.script) {
      currentCodeValue = config.script;
      const match = config.script.match(regex);
      if (match) {
        parameterCode = match[1] ?? "Temperature";
        parameterValue = match[2] ?? "val";
        isRelativeMode = match[3];
        isInitialized = true;
      }
    }
    if (isMinimalistMode !== minimalist) {
      isMinimalistMode = minimalist;
      if (minimalist) {
        parameterValue = "self:get_auto_value()";
        isRelativeMode = "self:get_auto_mode()";
      }
    }
  }

  onMount(() => {
    const event = new CustomEvent("updateConfigHandler", {
      bubbles: true,
      detail: { handler: handleConfigUpdate },
    });
    ref.dispatchEvent(event);
    messagePort.onmessage = (e) => {
      const data = e.data;
      if (data.type === "range-result" && data.name == parameterCode) {
        currentRange = `MIN: ${data.min} , MAX: ${data.max}`;
      }
    };
    messagePort.start();
    return () => {
      messagePort.close();
    };
  });

  $: parameterCode,
    (function () {
      if (!parameterCode) return;

      currentRange = "-";
      messagePort.postMessage({
        type: "develop-range",
        parameterName: parameterCode,
      });
    })();

  $: parameterCode,
    parameterValue,
    isRelativeMode,
    isInitialized &&
      (function () {
        var code = `gps("package-lightroom-classic", "develop", "${parameterCode}", ${parameterValue}, ${isRelativeMode})`;
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
    <div class={!isMinimalistMode ? "w-1/2" : "w-full"}>
      <MeltCombo
        title={"Parameter name"}
        bind:value={parameterCode}
        size={"full"}
        searchable={true}
        {suggestions}
      />
    </div>
    {#if !isMinimalistMode}
      <div class="w-1/2">
        <MeltCombo
          title={"Parameter value"}
          bind:value={parameterValue}
          size={"full"}
        />
      </div>
    {/if}
  </div>
  {#if !isMinimalistMode}<MeltCheckbox
      target={isRelativeMode == "1"}
      title={"Relative Mode"}
    />{/if}
  <p class="pt-2">Current range: {currentRange}</p>
</develop-control>
