const _ = require("lodash");
const axios = require("axios");
const moment = require("moment-timezone");

/**
 * Websocket class mirroring Alpaca's and implementing its functionality for backtesting
 */
class Websocket {
  /**
   * Create a websocket with an API key and market data
   *
   * @param {Alpaca} alpaca - the Alpaca object used to read market data
   * @param {MarketData} marketData - the market data tracking the prices
   * @param {Date} start - The start date for testing the data
   * @param {Date} end - The end date for the testing data
   */
  constructor(alpaca, marketData, start, end) {
    this._alpaca = alpaca;
    this._marketData = marketData;
    this._startDate = start;
    this._endDate = end;
  }

  /**
   * Sets up a callback for when a connection is established
   *
   * @param {Function} connectCallback - The callback after a connection is opened
   */
  onConnect(connectCallback) {
    this.connectCallback = connectCallback;
  }

  /**
   * Sets up a callback for when a connection is disconnected or closed
   *
   * @param {Function} disconnectCallback - The callback after a connection is closed
   */
  onDisconnect(disconnectCallback) {
    this.disconnectCallback = disconnectCallback;
  }

  /**
   * Sets up a callback for when a connection error occurs (in development)
   *
   * @param {Function} errorCallback - The callback after a connection error occurs
   */
  onError(errorCallback) {
    this.errorCallback = errorCallback;
  }

  /**
   * Sets up a callback for when an aggregate minute channel updates. This is usually where
   * opening and closing of positions will occurr
   *
   * @param {Function} stockAggMinCallback - The callback when receiving an AM channel update
   */
  onStockBar(stockAggMinCallback) {
    this.stockAggMinCallback = stockAggMinCallback;
  }

  /**
   * Subscribe to some number of channels
   * Currently supports AM.* channels (no need to add AM. prefix)
   *
   * @param {string[]} channels - The channels to subscribe to
   */
  subscribeForBars(channels) {
    this.channels = channels;
  }

  /* Loops through all stocks and get market data from specified data provider
   * If a TWELVEDATA_API_KEY key is available then market data will be pulled from Twelvedata API
   * */
  async getStockData(stocks, provider) {
    let stockData = {};
    let stockIndex = 0;
    let stockRequestBuffer = [];

    for (let i = 0; i < stocks.length; i++) {
      for (let j = 0; j < 1; j++) {
        if (stocks[stockIndex]) {
          let data;

          switch (true) {
            case !_.isEmpty(process.env.TWELVEDATA_API_KEY):
              data = await this.getStockDataTwelveData(
                stocks[stockIndex],
                provider,
                process.env.TWELVEDATA_API_KEY
              );
              break;
            default:
              data = await this.getStockDataAlpaca(
                stocks[stockIndex],
                provider
              );
          }
          stockRequestBuffer.push(data);
        }
        stockIndex++;
      }

      // pause out loop for every X requests, when done clear buffer and repeat
      await Promise.all(stockRequestBuffer).then(data => {
        stockData[data[0].stock] = _.orderBy(
          data[0].values,
          ["Timestamp"],
          ["asc"]
        );
      });

      stockRequestBuffer.splice(0, stockRequestBuffer.length);
    }

    return stockData;
  }

  /**
   * Gets historical market data from TwelveData API for a specific stock
   */
  async getStockDataTwelveData(stock, provider, key) {
    return new Promise(function(resolve, reject) {
      let stockValues = {};
      stock = stock.replace("alpacadatav1/AM.", "");

      if (stock && provider._startDate && provider._endDate && key) {
        axios
          .get(
            "https://api.twelvedata.com/time_series?symbol=" +
              stock +
              "&apikey=" +
              key +
              "&interval=1min" +
              "&start_date=" +
              moment(provider._startDate).format("YYYY-MM-DD HH:mm:ss") +
              "&end_date=" +
              moment(provider._endDate).format("YYYY-MM-DD HH:mm:ss")
          )
          .then(response => {
            if (!_.isEmpty(response.data)) {
              stockValues = {
                stock: stock,
                values: _.map(response.data.values, value => {
                  return {
                    Symbol: stock,
                    Timestamp: value.datetime,
                    OpenPrice: parseFloat(value.open),
                    HighPrice: parseFloat(value.high),
                    LowPrice: parseFloat(value.low),
                    ClosePrice: parseFloat(value.close),
                    Volume: parseInt(value.volume)
                  };
                })
              };

              resolve(stockValues);
            } else {
              console.log("ERROR: data empty");
              console.log(response);
              resolve(stockValues);
            }
          })
          .catch(function(err) {
            console.log("ERROR: api error");
            console.error(err);
            resolve(stockValues);
          });
      } else {
        console.log("ERROR: no params provided");
        resolve(stockValues);
      }
    });
  }

  /**
   * Gets historical market data from Alpaca Data API v2 for a specific stock
   */
  async getStockDataAlpaca(stock, provider) {
    return new Promise(async function(resolve, reject) {
      let stockValues = {};
      stock = stock.replace("alpacadatav1/AM.", "");

      if (stock && provider._startDate && provider._endDate) {
        let startDate = moment
          .tz(
            moment(provider._startDate).format("YYYY-MM-DD") + "T14:30:00.000Z",
            "America/New_York"
          )
          .toDate();
        let endDate = moment
          .tz(
            moment(provider._endDate).format("YYYY-MM-DD") + "T20:59:59.999Z",
            "America/New_York"
          )
          .toDate();

        let response = provider._alpaca.getBarsV2(
          stock,
          {
            start: startDate,
            end: endDate,
            timeframe: "1Min"
          },
          provider._alpaca.configuration
        );
        const barset = [];

        for await (let b of response) {
          barset.push(b);
        }

        if (!_.isEmpty(barset)) {
          stockValues = {
            stock: stock,
            values: _.map(barset, value => {
              return {
                Symbol: stock,
                Timestamp: value.Timestamp,
                OpenPrice: parseFloat(value.OpenPrice),
                HighPrice: parseFloat(value.HighPrice),
                LowPrice: parseFloat(value.LowPrice),
                ClosePrice: parseFloat(value.ClosePrice),
                Volume: parseInt(value.Volume)
              };
            })
          };

          resolve(stockValues);
        } else {
          console.log("ERROR: data empty");
          console.log(response);
          resolve(stockValues);
        }
      }
    });
  }

  /**
   * Reads in the historical data from alpaca using `alpaca.getBarsV2` (WIP)
   */
  async loadData() {
    const channelData = await this.getStockData(this.channels, this);

    _.forOwn(channelData, (data, channel) => {
      this._marketData.addSecurity(channel, data);
    });
  }

  /**
   * Runs the simulation calling the stock aggregate minute callback every simulated minute with
   * the market data for that minute
   */
  runSimulation() {
    if (!this.stockAggMinCallback) {
      return;
    }

    while (this._marketData.hasData) {
      const simulatedSecurities = this._marketData.simulateMinute();
      _.forEach(simulatedSecurities, security => {
        this.stockAggMinCallback(security.data);
      });
    }
  }

  /**
   * Simulate connecting to the API, loads the data, and runs the simulation
   */
  async connect() {
    if (this.connectCallback) {
      this.connectCallback();
    }

    await this.loadData();
    this.runSimulation();

    if (this.disconnectCallback) {
      this.disconnectCallback();
    }

    if (this.errorCallback) {
      this.errorCallback();
    }
  }
}

module.exports = Websocket;
