<script lang="ts">
  import { renderMathInElement } from "mathlive";
  import { onMount } from "svelte";
  import appState from "./stores.svelte";
  import { type Keyboards, Button } from "./keyboard/Keyboard.svelte";
  import KeyboardButton from './KeyboardButton.svelte';
  import Self from './VirtualKeyboard.svelte';
  import type { MathField } from "./cells/MathField.svelte";

  interface Props {
    keyboards: Keyboards;
    nested?: boolean;
    selectedTab?: number;
    customMatrix?: (arg: {detail: {targetMathField: MathField}}) => void;
  }
  
  let { keyboards, nested = false, selectedTab = $bindable(0), customMatrix }: Props = $props();

  let tabs = $derived(keyboards.keyboards.map( item => item.tabText ));
  let content = $derived(keyboards.keyboards[selectedTab].content);
  let childSelectedTab: number[] = $state([])

  const tabButtonElements: HTMLButtonElement[] = [];

  onMount(() => {
    childSelectedTab = Array(keyboards.keyboards.length).fill(0);

    if (!nested) {
      for (const tabButtonElement of tabButtonElements) {
        renderMathInElement(tabButtonElement);
      }
    }
  });

</script>

<style>
  div.tabs:not(.nested) {
    border-radius: 6px 6px 0px 0px;
    border: 1px solid #ccc;
    border-bottom: none;
  }

  button.tab {
    background-color: inherit;
    float: left;
    border: .5px solid #ccc;
    outline: none;
    padding: 6px 6px;
    transition: 0.3s;
    margin: 0;
    border-radius: 5px 5px 0px 0px;
  }

  button.tab:not(.nested) {
    height: 30.5px;
  }

  div.context {
    float: right;
    padding: 1px;
    width: 2rem;
    height: 1.9rem;
    display: flex;
  }

  div.nested > div.context {
    display: none;
  }

  button.tab.nested {
    padding: 4px 4px;
  }

  button.tab:hover:not(.mobile) {
    background-color: #ddd;
  }

  button.tab.selected {
    background-color: #ccc;
  }
  
  div.tab-content {
    display: grid;
    grid-auto-flow: row;
    border: 1px solid #ccc;
    border-radius: 0px 0px 6px 6px;
    height: 100%;
    padding: 1px;
  }

  div.tab-content.nested {
    padding: 0px;
    border: none;
    border-radius: 0px;
    overflow: auto;
  }

  div.button-row {
    display: grid;
    grid-auto-flow: column;
  }

  div.container {
    display: flex;
    flex-direction: column;
    width: 100vw;
    max-width: 400px;
    padding: 10px 0px;
  }

  div.container:not(.nested) {
    overflow-y: auto;
  }

  div.container.nested {
    height: 100%;
    width: 100%;
    min-width: 0px;
    padding: 0px;
  }

  @media print {
    div.container {
      display: none;
    }
  }
</style>

<div class="container" class:nested>
  <div class="tabs" class:nested>
    {#each tabs as tab, i (tab)}
      <button
        class="tab"
        class:mobile={appState.onMobile}
        class:nested
        class:selected={selectedTab === i}
        bind:this={tabButtonElements[i]}
        onclick={() => (selectedTab = i)}
        tabindex="-1"
      >
        {tab}
      </button>
    {/each}
    <div
      class="context"
    >
      <KeyboardButton
        button={new Button({buttonText: "≡", command: "showMenu", fontSize: "12pt"})}
        flex={true}
      />
    </div>
  </div>

  <div class="tab-content" class:nested>
    {#if content.type === "Keyboards"}
      <Self keyboards={content} nested={true} bind:selectedTab={childSelectedTab[selectedTab]}/>
    {:else }
      {#each content.buttons as buttonRow}
        <div 
          class="button-row"
          style={`grid-template-columns:${buttonRow.map((button) => button.size)
                                                   .reduce((accum, value) => accum+' '+value)};`}
        >
          {#each buttonRow as button (button.id)}
            {#if "click" in button}
              <KeyboardButton
                button={button}
                {customMatrix}
              />
            {:else}
              <div class="blank"></div>
            {/if}
          {/each}
        </div>
      {/each}
    {/if}
  </div>

</div>

