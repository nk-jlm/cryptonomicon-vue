const API_KEY =
  "f8c86ab06c07ac4feb01de695700400b3c862931fd0f114085981823b2475dc6";
// TODO: refactor to use URLSearchParams
const tickersHandlers = new Map();
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);
const AGGREGATE_INDEX = "5";

socket.addEventListener("message", e => {
  const { TYPE: type, FROMSYMBOL: currency, PRICE: newPrice } = JSON.parse(
    e.data
  );
  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }
  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach(fn => fn(newPrice));
});

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
  tickersHandlers.delete(ticker);
  unsubscribeToTickerOnWs(ticker);
  /*  const subscribers = tickersHandlers.get(ticker) || [];
    tickersHandlers.set(
      ticker,
      subscribers.filter(fn => fn !== cb)
    );*/
};

window.tickersHandlers = tickersHandlers;
