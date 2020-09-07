const Security = require('./Security.js');

describe('Security', () => {
  let symbol, data, security;

  beforeEach(() => {
    data = { some: 'data' };
    symbol = 'AAPL';
    security = new Security(symbol, data);
  });

  test('sets the correct variables', () => {
    expect(security.symbol).toBe(symbol);
    expect(security.price).toBe(0);
    expect(security.data).toBe(data);
  });
});
