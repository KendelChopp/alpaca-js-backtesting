const _ = require('lodash');

const Position = require('../Position/Position.js');

/**
 * A class representing cash and all of the positions taken
 */
class Portfolio {
  /**
   * Create a portfolio with some cash and market data
   *
   * @param {number} startValue - The amount of cash to start with
   * @param {MarketData} marketData - The market data to draw prices from
   */
  constructor(startValue, marketData) {
    this.cash = startValue;
    this.startValue = startValue;
    this.positions = [];
    this.marketData = marketData;
  }

  /**
   * Gets a position from the current list of positions
   *
   * @param {string} symbol - The symbol for a given security
   * @returns {Position} The position represented by the symbol if it exists
   */
  getPosition(symbol) {
    return _.find(this.positions, (position) => (position.symbol === symbol));
  }

  /**
   * Finds a position in the user's list of positions or it creates a new one
   *
   * @param {string} symbol - the symbol for the position
   * @returns {Position} The new position or the one that already existed
   */
  findOrCreatePosition(symbol) {
    let foundPosition = this.getPosition(symbol);
    if (!foundPosition) {
      foundPosition = new Position(symbol);
      this.positions.push(foundPosition);
    }

    return foundPosition;
  }

  /**
   * Create an order
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
    if (!options.symbol) {
      throw new Error('No symbol provided for order.');
    }
    if (!options.qty || options.qty < 1) {
      throw new Error('Quantity must be >= 1 to create an order.');
    }
    if (!options.side || (options.side !== 'sell' && options.side !== 'buy')) {
      throw new Error('Side not provided correctly. Must be buy or sell.');
    }

    const currentPrice = this.marketData.getPrice(options.symbol);

    if (options.side === 'sell') {
      const position = this.getPosition(options.symbol);
      if (position && position.quantity >= options.qty) {
        this.cash += options.qty * currentPrice;
        position.quantity -= options.qty;

        if (position.quantity == 0) {
          _.remove(this.positions, (position) => (position.quantity == 0));
        }
      } else {
        // TODO: improve warning handling here
        console.warn('Attempted to sell more of a position than in portfolio');
      }
    } else {
      if (this.cash < options.qty * currentPrice) {
        // TODO: improve warning handling here
        console.warn('Order not executed, not enough cash');
      } else {
        const position = this.findOrCreatePosition(options.symbol);
        this.cash -= options.qty * currentPrice;
        position.quantity += options.qty;
      }
    }
  }

  /**
   * Sums up the cash and value of all positions in the account
   *
   * @returns {number} The total value of the Portfolio
   */
  getValue() {
    const positionValue = _.sumBy(this.positions, (position) => {
      const price = this.marketData.getPrice(position.symbol);

      return price * position.quantity;
    });

    return positionValue + this.cash;
  }

  /**
   * Get some simple stats on the porfolio: starting value, end value, and return on investment
   *
   * @returns {object} An object containing the statistics for the portfolio
   */
  getStats() {
    const endValue = this.getValue();
    const roi = (endValue / this.startValue) - 1;

    return {
      startValue: this.startValue,
      endValue,
      roi
    }
  }
}

module.exports = Portfolio;
