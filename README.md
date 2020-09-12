# @kendelchopp/alpaca-js-backtesting
## Disclaimer
This package is in no way affiliated with Alpaca

## Getting Started
### Installing the package
```
$ npm install @kendelchopp/alpaca-js-backtesting
```

### Writing the code
1. Initialize your Alpaca object with the keys

```JavaScript
const Alpaca = require('@alpacahq/alpaca-trade-api');

const alpaca = new Alpaca({
  keyId: process.env.API_KEY,
  secretKey: process.env.SECRET_API_KEY,
  paper: true,
  usePolygon: false
});
```

2. Initialize your Backtest object

**Note:** When passing in your alpaca object, you are giving this package the ability to use your keys to make API requests. This package will make API requests for the market data so that it can run the simulation. Be careful when sending out your alpaca object.

```JavaScript
const Backtest = require('@kendelchopp/alpaca-js-backtesting');

const backtest = new Backtest({
  alpaca,
  startDate: new Date(2020, 0, 1),
  endDate: new Date(2020, 1, 1)
});
```

3. Run your algorithm replacing Alpaca/websockets accordingly.

For example (commented out lines are the old lines to be replaced):
```JavaScript
// const client = alpaca.data_ws;
const client = backtest.data_ws;

// alpaca.createOrder({...})
backtest.createOrder({...})
```

4. Add a disconnect handler to see how your algorithm performed

```JavaScript
client.onDisconnect(() => {
  console.log(backtest.getStats());
});
```

## Alpaca Compatibility
This table lists the version of @kendelchopp/alpaca-js-backtesting with the version of [alpaca-trade-api-js](https://github.com/alpacahq/alpaca-trade-api-js) it was tested with. Using other versions may require some syntax changes.

| @kendelchopp/alpaca-js-backtesting | @alpacahq/alpaca-trade-api-js |
| ---------------------------------- | ----------------------------- |
| 1.0.0                              | 1.4.1                         |
| 1.1.0                              | 1.4.1                         |
| 1.1.1                              | 1.4.1                         |
| 1.1.2                              | 1.4.1                         |
| 1.1.3                              | 1.4.1                         |

## Relevant Functions
### Backtest#createOrder
Creates an order using the same parameters as Alpaca#createOrder

#### Example
```JavaScript
backtest.createOrder({
  symbol: 'SPY',
  qty: 300,
  side: 'sell',
  type: 'market',
  time_in_force: 'day'
})
```

### Backtest#getStats
Gets the stats for the portfolio including starting and ending value and ROI

#### Example
```JavaScript
console.log(backtest.getStats());
```

### Websocket#connect
Simulates connecting to the API, loads the data, and runs the simulation

#### Example
```JavaScript
client.connect();
```

### Websocket#onConnect
Runs a function when establishing the connection. When backtesting, you will usually just use this to subscribe to channels

#### Example
```JavaScript
client.onConnect(() => {
  client.subscribe(['alpacadatav1/AM.SPY']);
});
```

### Websocket#onDisconnect
Runs a function when the simulation is completed. You can print out the stats here.

#### Example
```JavaScript
client.onDisconnect(() => {
  console.log(backtest.getStats());
});
```

### Websocket#onStockAggMin
This runs your function when a simulated minute occurrs and returns the relevant data. This is where your trading will likely take place. Subject will look something like `AM.SPY` and data will look like a standard bar data.

#### Example
```JavaScript
client.onStockAggMin((subject, data) => {
  if (data.closePrice < 500) {
    backtest.createOrder({
      symbol: 'SPY',
      qty: 300,
      side: 'buy',
      type: 'market',
      time_in_force: 'day'
    });

    console.log('Bought SPY');
  }
});
```

### Websocket#subscribe
Subscribes to the channels listed. Currently, only aggregate minute channels are supported.

#### Example
```JavaScript
client.onConnect(() => {
  client.subscribe(['alpacadatav1/AM.SPY', 'alpacadatav1/AM.AAPL']);
});
```
