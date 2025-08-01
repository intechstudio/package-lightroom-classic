<svelte:options
  customElement={{ tag: "image-property-action", shadow: "none" }}
/>

<script>
  import { MeltCombo } from "@intechstudio/grid-uikit";
  import { onMount } from "svelte";
  let parameterCode = "";
  let parameterValue = "";
  let currentCodeValue = "";
  let ref;
  let isInitialized = false;

  $: parameterValueSuggestions = {
    rating: [
      { info: "Increase", value: "+1" },
      { info: "Decrease", value: "-1" },
      ...Array(5)
        .fill()
        .map((_, i) => {
          return { info: `Set to ${i + 1}`, value: `${i + 1}` };
        }),
    ],
    flag: [
      { info: "Pick", value: "pick" },
      { info: "Reject", value: "reject" },
      { info: "Remove flag", value: "remove" },
    ],
    color: [
      { info: "Red", value: "red" },
      { info: "Yellow", value: "yellow" },
      { info: "Green", value: "green" },
      { info: "Blue", value: "blue" },
      { info: "Purple", value: "purple" },
      { info: "None", value: "none" },
    ],
  }[parameterCode];

  function handleConfigUpdate(config) {
    const regex = /^gps\("package-lightroom-classic", *"(.*?)", *"(.*?)"\)$/;
    if (currentCodeValue != config.script) {
      currentCodeValue = config.script;
      const match = config.script.match(regex);
      if (match) {
        parameterCode = match[1] ?? "rating";
        parameterValue = match[2] ?? "val";
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
    isInitialized &&
      (function () {
        var code = `gps("package-lightroom-classic", "${parameterCode}", "${parameterValue}")`;
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

<image-property
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
        suggestions={[
          { info: "Rating", value: "rating" },
          { info: "Flag", value: "flag" },
          { info: "Color Label", value: "color" },
        ]}
      />
    </div>
    <div class="w-1/2">
      <MeltCombo
        title={"Parameter value"}
        bind:value={parameterValue}
        size={"full"}
        suggestions={parameterValueSuggestions}
      />
    </div>
  </div>
</image-property>
