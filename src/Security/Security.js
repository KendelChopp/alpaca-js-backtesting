/**
 * Underlying class tracking the price of a Security
 */
class Security {
  constructor(symbol, data) {
    this.symbol = symbol;
    this.price = 0;
    this.data = data;
  }
}

module.exports = Security;
