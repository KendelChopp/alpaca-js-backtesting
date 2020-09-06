/**
 * Underlying class tracking the price of a Security
 */
class Security {
  constructor(ticker, data) {
    this.ticker = ticker;
    this.price = 0;
    this.data = data;
  }
}

export default Security;
