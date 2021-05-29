<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <div
        v-if="!isDataLoaded"
        class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center"
    >
      <svg
          class="animate-spin -ml-1 mr-3 h-12 w-12 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
      >
        <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
        ></circle>
        <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
    <div class="container">
      <add-ticker @add-ticker="addTicker" :disabled="tooManyTickersAdded" :hintsData="hintsData" :tickersList="tickersList"/>
      <template v-if="tickersList.length">
        <div>
          <button
              @click="page = page - 1"
              v-if="page > 1"
              class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Prev
          </button>
          <button
              @click="page = page + 1"
              v-if="hasNextPage"
              class="my-4 mx-2 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Next
          </button>
          <p>
            Filter: <input type="text" v-model="filter" @input="page = 1"/>
          </p>
        </div>
        <hr class="w-full border-t border-gray-600 my-4"/>
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
              v-for="(item, index) in paginatedTickers"
              :key="index"
              @click="selectTicker(item)"
              :class="{
              'border-4': selectedState === item,
              'bg-red-100': item.status === 'INVALID_CODE'
            }"
              class="bg-white overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
          >
            <div class="px-4 py-5 sm:p-6 text-center">
              <dt class="text-sm font-medium text-gray-500 truncate">
                {{ item.name }} - USD
              </dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">
                {{ formattedPrice(item.price) }}
              </dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
                @click.stop="handleTickerDelete(item)"
                class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
            >
              <svg
                  class="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="#718096"
                  aria-hidden="true"
              >
                <path
                    fill-rule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clip-rule="evenodd"
                ></path>
              </svg>
              Delete
            </button>
          </div>
        </dl>
        <hr class="w-full border-t border-gray-600 my-4"/>
      </template>

    <ticker-graph @calc-max-graph-elem="getMaxGraphElements" @close-graph="onGraphClose" :selectedState="selectedState" :graphs="graphs" />
    </div>
  </div>
</template>

<script>

import {subscribeToTicker, unsubscribeToTicker} from "@/api";
import AddTicker from "./components/AddTicker";
import TickerGraph from "./components/TickerGraph";

export default {
  name: "App",
  components: {
    TickerGraph,
    AddTicker
  },
  data() {
    return {
      tickersList: [],
      selectedState: {},
      hintsData: {},
      isDataLoaded: false,
      graphs: [],
      isTickerInList: false,
      page: 1,
      filter: ""
    };
  },
  created: function () {
    const windowData = Object.fromEntries(
        new URL(window.location).searchParams.entries()
    );
    const VALID_KEYS = ["filter", "page"];
    VALID_KEYS.forEach(key => {
      if (windowData[key]) {
        this[key] = windowData[key];
      }
    });

    const tickersData = localStorage.getItem("cryptonomicon-list");
    if (tickersData) {
      this.tickersList = JSON.parse(tickersData);
      this.tickersList.forEach(ticker => {
        subscribeToTicker(ticker.name, (newPrice, message) => {
          this.updateTicker(ticker.name, newPrice, message);
        });
      });
    }
    this.getData().then(response => {
      this.hintsData = response.Data;
      this.isDataLoaded = true;
    });
  },

  computed: {
    startIndex() {
      return (this.page - 1) * 6;
    },
    endIndex() {
      return this.page * 6;
    },
    filteredTickers() {
      return this.tickersList.filter(ticker =>
          ticker.name.includes(this.filter)
      );
    },
    paginatedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex);
    },
    hasNextPage() {
      return this.filteredTickers.length > this.endIndex;
    },
    tooManyTickersAdded() {
      return this.tickersList.length > 40;
    }
  },
  methods: {
    getMaxGraphElements(value) {
      this.maxGraphElements = value;
    },
    onGraphClose(){
      this.selectedState = {};
      this.graphs = [];
    },
    async getData() {
      const response = fetch(
          `https://min-api.cryptocompare.com/data/all/coinlist?summary=true`
      );
      let data = await response;
      return data.json();
    },
    updateTicker(tickerName, price, message) {
      this.tickersList.filter(t => t.name === tickerName).forEach(t => {
        if(message === "INVALID_CODE") {
          t.status = message;
          return;
        }
        if (t === this.selectedState) {
          this.graphs.push(price);
          while (this.graphs.length > this.maxGraphElements) {
            this.graphs.shift();
          }
        }
        t.price = price;
      });
    },
    addTicker( ticker ) {
      const currentTicker = {
        name: ticker,
        price: "-"
      };
      this.tickersList = [...this.tickersList, currentTicker];
      subscribeToTicker(currentTicker.name, (newPrice, message) => {
        this.updateTicker(currentTicker.name, newPrice, message);
      });
      this.isTickerInList = false;
      this.filter = "";
    },
    handleTickerDelete(ticker) {
      this.tickersList = this.tickersList.filter(item => {
        return item.name !== ticker.name;
      });
      if (this.selectedState === ticker) {
        this.selectedState = null;
      }
      unsubscribeToTicker(ticker.name);
    },
    selectTicker(item) {
      this.selectedState = item;
    },
    formattedPrice(price) {
      if (price === "-") {
        return price;
      }
      return price > 1 ? price.toFixed(2) : price?.toPrecision(2);
    }
  },
  watch: {
    tickersList() {
      //why it doesn't work in add method??? - it is link to data and it wasn't changed
      //console.log(newValue === oldValue);
      localStorage.setItem(
          "cryptonomicon-list",
          JSON.stringify(this.tickersList)
      );
    },
    selectedState() {
      this.graphs = [];
    },
    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },
    filter() {
      this.page = 1;
    },
    pageStateOptions(value) {
      window.history.pushState(
          null,
          document.title,
          `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    }
  }
};
</script>
