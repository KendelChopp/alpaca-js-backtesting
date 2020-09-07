const MarketData = require('./MarketData/MarketData.js');
const Portfolio = require('./Portfolio/Portfolio.js');
const Websocket = require('./Websocket/Websocket.js');

/**
 * Main class defining the high level functions and members. Functions similarly to Alpaca
 */
class Backtest {
  /**
   * Constructor for the back tester
   *
   * @param {object} options - The options
   * @param {Alpaca} options.alpaca - Your initialized Alpaca API
   * @param {number} options.startValue - Optional starting value (defaults to $100,000)
   * @param {Date} options.startDate - a required start date to test historically with
   * @param {Date} options.endDate - a required end date to test historical data on
   */
  constructor({ alpaca, startValue = 100000, startDate, endDate } = {}) {
    if (!alpaca) {
      throw new Error('Missing alpaca object');
    }

    if (!startDate) {
      throw new Error('You must provide a start date');
    }

    if (!endDate) {
      throw new Error('You must provide an end date');
    }

    this._marketData = new MarketData();
    this._portfolio = new Portfolio(startValue, this._marketData);
    this.data_ws = new Websocket(alpaca, this._marketData, startDate, endDate);
  }

  /**
   * Create an order through the portfolio
   *
   * @param {string} options.symbol - The symbol for the order
   * @param {number} options.qty - Quantity of the order
   * @param {string} options.side - 'buy' or 'sell'
   * @param {string} options.type - currently only supports 'market'
   * @param {string} options.time_in_force - not yet supported
   * @param {number} options.limit_price - not yet supported
   * @param {number} options.stop_price - not yet supported
   */
  createOrder(options) {
    this._portfolio.createOrder(options);
  }

  /**
   * Get the portfolio stats including start value, end value, and the return on investiment (ROI)
   *
   * @returns {object} The statistics for the portfolio
   */
  getStats() {
    return this._portfolio.getStats();
  }
};

module.exports = Backtest;
