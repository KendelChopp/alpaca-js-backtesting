const Security = require('../Security/Security.js');

const MarketData = require('./MarketData.js');

describe('MarketData', () => {
  let marketData;

  beforeEach(() => {
    marketData = new MarketData();
  });

  test('sets the correct defaults', () => {
    expect(marketData.maxTime).toBe(0);
    expect(marketData.time).toBe(0);
    expect(marketData.securities).toEqual({});
  });

  describe('addSecurity', () => {
    let data, symbol;

    beforeEach(() => {
      data = [{ some: 'data' }, { some: 'other data' }];
      symbol = 'AAPL';
    });

    test('adds a new security', () => {
      marketData.addSecurity(symbol, data);
      const newSecurity = marketData.securities[symbol];
      expect(newSecurity).toBeInstanceOf(Security);
      expect(newSecurity.data).toBe(data);
      expect(newSecurity.symbol).toBe(symbol);
    });

    describe('when max time is less than data.length', () => {
      beforeEach(() => {
        marketData.maxTime = 0;
      });

      test('sets maxTime to data.length', () => {
        marketData.addSecurity(symbol, data);
        expect(marketData.maxTime).toBe(data.length);
      });
    });

    describe('when max time is less than data.length', () => {
      let maxTime;

      beforeEach(() => {
        maxTime = 10;
        marketData.maxTime = maxTime;
      });

      test('does not change maxTime', () => {
        marketData.addSecurity(symbol, data);
        expect(marketData.maxTime).toBe(maxTime);
      });
    });
  });

  describe('simulateMinute', () => {
    let closePrice, validSecurity, invalidSecurity;

    beforeEach(() => {
      closePrice = 123;
      validSecurity = new Security('SPY', [{ closePrice }]);
      invalidSecurity = new Security('AAPL', []);

      marketData.securities = [validSecurity, invalidSecurity];
      marketData.time = 0;
    });

    test('updates the valid security price', () => {
      marketData.simulateMinute();
      expect(validSecurity.price).toBe(closePrice);
    });

    test('adds one to the current time', () => {
      marketData.simulateMinute();
      expect(marketData.time).toBe(1);
    });

    test('returns a stringified map of the valid securities', () => {
      const simulation = marketData.simulateMinute();
      const expected = JSON.stringify([{
        closePrice,
        ev: 'AM',
        sym: validSecurity.symbol
      }]);

      expect(simulation).toEqual(expected);
    });
  });

  describe('hasData', () => {
    describe('when time is less than maxTime', () => {
      test('returns true', () => {
        marketData.time = 0;
        marketData.maxTime = 1;
        expect(marketData.hasData).toBe(true);
      });
    });

    describe('when time is equal to maxTime', () => {
      test('returns false', () => {
        marketData.time = 1;
        marketData.maxTime = 1;
        expect(marketData.hasData).toBe(false);
      });
    });

    describe('when time is greater than maxTime', () => {
      test('returns false', () => {
        marketData.time = 2;
        marketData.maxTime = 1;
        expect(marketData.hasData).toBe(false);
      });
    });
  });

  describe('getPrice', () => {
    let price, symbol;

    beforeEach(() => {
      symbol = 'AAPL';
      price = 12;
      const security = new Security(symbol, []);
      security.price = price;
      marketData.securities = { [symbol]: security };
    });

    test('returns the price of the requested security', () => {
      expect(marketData.getPrice(symbol)).toBe(price);
    });
  });
});
