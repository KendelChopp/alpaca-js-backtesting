const _ = require('lodash');

const Security = require('../Security/Security.js');

/**
 * Class tracking market data and time for all relevant securities
 */
class MarketData {
  /**
   * Initialize a new MarketData object
   */
  constructor() {
    this.securities = {};
    this.time = 0;
    this.maxTime = 0;
  }

  /**
   * Adds security with data from Alpaca data
   *
   * @param {string} symbol - the symbol for the security
   * @param {Object[]} data - The array of data points from Alpaca
   */
  addSecurity(symbol, data) {
    // TODO: Convert data to a separate class to ensure it is structured
    this.securities[symbol] = new Security(symbol, data);
    this.maxTime = Math.max(data.length, this.maxTime);
  }

  /**
   * Simulates a minute by mapping the security's information for that minute and updating the
   * current price of all the securities
   *
   * @returns {Object[]} object containing subjects and data
   */
  simulateMinute() {
    const validSecurities = _.filter(this.securities, (security) => Boolean(security.data[this.time]));
    const dataMap = _.map(validSecurities, (security) => {
      security.price = security.data[this.time].closePrice;
      return {
        subject: `AM.${security.symbol}`,
        data: {
          ...security.data[this.time],
          ev: 'AM',
          symbol: security.symbol
        }
      };
    });

    this.time++;
    return dataMap;
  }

  /**
   * Whether or not there is data for the simulation to continue
   *
   * @type {boolean}
   */
  get hasData() {
    return this.time < this.maxTime;
  }

  /**
   * Gets the current price of a security based on the symbol
   *
   * @param {string} symbol - the symbol for the security
   * @returns {number} the value of the security
   */
  getPrice(symbol) {
    const security = this.securities[symbol];
    return security.price;
  }
}

module.exports = MarketData;
