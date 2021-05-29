<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Ticker</label
        >
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="ticker"
            @keydown.enter="addTicker"
            @keyup="setFilteredHintsList"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Example DOGE"
          />
        </div>
        <div
          v-if="hintsList.length"
          class="flex bg-white shadow-md p-1 rounded-md shadow-md flex-wrap"
        >
          <span
            v-for="(item, idx) in hintsList"
            :key="idx"
            @click="addTickerFromHints(item)"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
          >
            {{ item.Symbol }}
          </span>
        </div>
        <div v-if="isTickerInList" class="text-sm text-red-600">
          Current ticker is already in use
        </div>
      </div>
    </div>
    <add-button
      @click="addTicker"
      class="my-4"
      :disabled="disabled"
      :class="{
        'opacity-50 pointer-events-none':
          !normalizeSymbols(ticker).length || isTickerInList
      }"
    />
  </section>
</template>
<script>
import AddButton from "./AddButton";

export default {
  components: {
    AddButton
  },
  props: {
    disabled: {
      type: Boolean,
      required: false,
      default: false
    },
    hintsData: {
      type: Object,
      required: false
    },
    tickersList: {
      type: Object,
      required: false
    }
  },
  emits: {
    "add-ticker": function(value) {
      return typeof(value) === String;
    }
  },
  data() {
    return {
      ticker: "",
      isTickerInList: false,
      hintsList: []
    };
  },
  methods: {
    addTicker() {
      this.$emit("add-ticker", this.ticker);
      this.ticker = "";
    },
    setFilteredHintsList() {
      this.hintsList = this.filteredHints();
      console.log(this.hintsList);
      this.isTickerInList = false;
    },
    addTickerFromHints(hint) {
      this.ticker = hint.Symbol;
      if (this.getTickerInTickersList()) {
        this.isTickerInList = true;
      } else {
        this.addTicker();
      }
    },
    getTickerInTickersList() {
      return this.tickersList.find(ticker => {
        return this.ticker === ticker.name;
      });
    },
    normalizeSymbols(text) {
      return text.toLocaleLowerCase().replace(/ /g, "");
    },
    filteredHints() {
      let filteredList = [];
      Object.keys(this.hintsData).forEach(key => {
        if (this.isTickerInHintList(key) && filteredList.length < 4) {
          filteredList.push(this.hintsData[key]);
        }
      });
      console.log(filteredList);
      return filteredList;
    },
    isTickerInHintList(key) {
      let normalHintSymbol = this.normalizeSymbols(this.hintsData[key].Symbol);
      let normalHintFullName = this.normalizeSymbols(
        this.hintsData[key].FullName
      );
      let normalTicker = this.normalizeSymbols(this.ticker);
      return (
        (normalHintSymbol.includes(normalTicker) ||
          normalHintFullName.includes(normalTicker)) &&
        normalTicker.length
      );
    }
  }
};
</script>
