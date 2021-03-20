// TODO: refactor to use URLSearchParams
const tickersHandlers = new Map();
const BTCRelatedCurrencies = new Map();
const API_KEY =
  "445b186826e59dbcdb6019aecac395945aee35882e698dbe7d945ac5afb1b512";
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);
const sharedWorker = new SharedWorker("worker.js");
sharedWorker.port.start();
sharedWorker.port.postMessage([15, 30]);

window.sharedWorker = sharedWorker;

sharedWorker.port.onmessage = function(e) {
  console.log("Message received from worker", e.data);
};

const AGGREGATE_INDEX = "5";
const INVALID_PARAMETER = "500";
const NEW_WINDOW_CODE = "429";
const INVALID_MESSAGE = "INVALID_SUB";
const BTCCode = "BTC";
let BTCPrice;

socket.addEventListener("message", e => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    PRICE: newPrice,
    TOSYMBOL: convertedCurrency,
    PARAMETER: message,
    MESSAGE: info
  } = JSON.parse(e.data);

  if (type === NEW_WINDOW_CODE) {
    handlerOpenedTabs();
    return;
  }

  if (type === INVALID_PARAMETER && info === INVALID_MESSAGE) {
    handlerOnInvalidCurrency(message);
    return;
  }
  if (!BTCPrice) {
    sendToWS({
      action: "SubAdd",
      subs: [`5~CCCAGG~${BTCCode}~USD`]
    });
  }
  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }
  if (convertedCurrency === BTCCode) {
    BTCRelatedCurrencies.set(currency, newPrice);
    if (BTCPrice) {
      const price = newPrice * BTCPrice;
      updateHandlers(currency, price);
    }
    return;
  }
  if (currency === BTCCode) {
    BTCPrice = newPrice;
    [...BTCRelatedCurrencies.keys()].forEach(key => {
      const price = BTCRelatedCurrencies.get(key) * newPrice;
      updateHandlers(key, price);
    });
  }
  updateHandlers(currency, newPrice);
  //sharedWorker.port.postMessage({ currency, newPrice });
  //console.log({ currency, newPrice });
});

function handlerOnInvalidCurrency(message) {
  if (message.match(/~BTC$/)) {
    updateHandlers(message.split("~")[2], "", "INVALID_CODE");
    return;
  }
  sendToWS({
    action: "SubAdd",
    subs: [message.replace("~USD", "~BTC")]
  });
}

function handlerOpenedTabs() {
  //sharedWorker.port.postMessage("new tab");
  //sharedWorker.port.onmessage = e => {
  // console.log(e);
  //  };
  //updateHandlers(ev.currency, ev.newPrice);
}
function updateHandlers(currency, newPrice, message) {
  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach(fn => fn(newPrice, message));
}

function sendToWS(message) {
  const stringifierMessage = JSON.stringify(message);
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifierMessage);
    return;
  }
  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifierMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(ticker) {
  sendToWS({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

function unsubscribeToTickerOnWs(ticker) {
  sendToWS({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeToTicker = ticker => {
  if (ticker !== BTCCode) {
    tickersHandlers.delete(ticker);
    BTCRelatedCurrencies.delete(ticker);
    unsubscribeToTickerOnWs(ticker);
  }
  /*  const subscribers = tickersHandlers.get(ticker) || [];
    tickersHandlers.set(
      ticker,
      subscribers.filter(fn => fn !== cb)
    );*/
};
