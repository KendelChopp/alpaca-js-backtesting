/**
 * A position that has a symbol and some quantity
 */
class Position {
  /**
   * Constructor for building a Position
   *
   * @param {string} symbol - The symbol for the position
   * @param {number} quantity - The number open
   */
  constructor(symbol, quantity=0) {
    this.symbol = symbol;
    this.quantity = quantity;
  }
}

module.exports = Position;
