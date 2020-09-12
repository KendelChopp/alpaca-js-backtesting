const _ = require('lodash');

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
   * Sets up a callback for when an aggregate minute channel updates. This is usually where
   * opening and closing of positions will occurr
   *
   * @param {Function} stockAggMinCallback - The callback when receiving an AM channel update
   */
  onStockAggMin(stockAggMinCallback) {
    this.stockAggMinCallback = stockAggMinCallback;
  }

  /**
   * Subscribe to some number of channels
   * Currently supports AM.* channels
   *
   * @param {string[]} channels - The channels to subscribe to
   */
  subscribe(channels) {
    this.channels = channels;
  }

  /**
   * Reads in the historical data from alpaca using `alpaca.getBars`
   */
  async loadData() {
    const rawChannels = _.map(this.channels, (channel) => {
      const isV1Minute = channel.startsWith('alpacadatav1/AM.');
      const isMinute = channel.startsWith('AM.');
      if (!isMinute && !isV1Minute) {
        throw new Error('Only minute aggregates are supported at this time.');
      }

      return isMinute ? channel.substring(3) : channel.substring(16);
    });

    const channelString = _.join(rawChannels, ',');

    const channelData = await this._alpaca.getBars(
      '1Min',
      channelString,
      {
        start: this._startDate,
        end: this._endDate
      }
    );

    _.forEach(rawChannels, (channel) => {
      this._marketData.addSecurity(channel, channelData[channel]);
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
      _.forEach(simulatedSecurities, (security) => {
        this.stockAggMinCallback(security.subject, security.data);
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
  }
}

module.exports = Websocket;
