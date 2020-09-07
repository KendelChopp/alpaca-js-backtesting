const Position = require('./Position.js');

describe('Position', () => {
  let symbol, position;

  beforeEach(() => {
    symbol = 'AAPL';
    position = new Position(symbol);
  });

  test('sets the correct variables', () => {
    expect(position.symbol).toBe(symbol);
    expect(position.quantity).toBe(0);
  });
});
