const MarketData = require('../MarketData/MarketData.js');
const Position = require('../Position/Position.js');

const Portfolio = require('./Portfolio.js');

describe('Portfolio', () => {
  let portfolio, startValue, marketData;

  beforeEach(() => {
    startValue = 100;
    marketData = new MarketData();

    portfolio = new Portfolio(startValue, marketData);
  });

  test('sets the correct defaults', () => {
    expect(portfolio.cash).toBe(startValue);
    expect(portfolio.startValue).toBe(startValue);
    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.marketData).toBe(marketData);
  });

  describe('getPosition', () => {
    let position, symbol;

    beforeEach(() => {
      symbol = 'AAPL';
      position = new Position(symbol)
      portfolio.positions = [position];
    });

    describe('when the position exists', () => {
      test('returns the position', () => {
        expect(portfolio.getPosition(symbol)).toBe(position);
      });
    });

    describe('when the position does not exist', () => {
      test('returns undefined', () => {
        expect(portfolio.getPosition('nonsense')).toBeUndefined();
      });
    });
  });

  describe('findOrCreatePosition', () => {
    describe('when the position exists', () => {
      let position;

      beforeEach(() => {
        position = new Position('AAPL');
        jest.spyOn(portfolio, 'getPosition').mockReturnValue(position);
      });

      test('returns the found position', () => {
        expect(portfolio.findOrCreatePosition('AAPL')).toBe(position);
      });
    });

    describe('when the position does not exist', () => {
      beforeEach(() => {
        jest.spyOn(portfolio, 'getPosition').mockReturnValue(undefined);
      });

      test('creates a new position and returns it', () => {
        const symbol = 'AAPL';
        const newPosition = portfolio.findOrCreatePosition(symbol);
        const lastPosition = portfolio.positions[portfolio.positions.length - 1];
        expect(lastPosition.symbol).toBe(symbol);
        expect(lastPosition).toBe(newPosition);
        expect(lastPosition).toBeInstanceOf(Position);
      });
    });
  });

  describe('createOrder', () => {
    let options;

    beforeEach(() => {
      options = {};
    });

    const testThrowsError = (error) => {
      test('throws an error', () => {
        expect(() => portfolio.createOrder(options)).toThrow(error);
      });
    };

    describe('when symbol is provided', () => {
      let symbol;

      beforeEach(() => {
        symbol = 'AAPL';
        options.symbol = symbol;
      });

      describe('when quantity is supplied', () => {
        describe('when quantity is >= 1', () => {
          let quantity;

          beforeEach(() => {
            quantity = 2;
            options.qty = quantity;
          });

          describe('when side is provided', () => {
            let currentPrice;

            beforeEach(() => {
              currentPrice = 10;

              jest.spyOn(console, 'warn').mockImplementation();
              jest.spyOn(marketData, 'getPrice').mockReturnValue(currentPrice);
            });

            const testGetsCurrentPrice = () => {
              test('gets the current price from market data', () => {
                portfolio.createOrder(options);
                expect(marketData.getPrice).toBeCalledWith(symbol);
              });
            };

            describe('when side is sell', () => {
              beforeEach(() => {
                options.side = 'sell';
                jest.spyOn(portfolio, 'getPosition');
              });

              testGetsCurrentPrice();

              test('gets the position', () => {
                portfolio.createOrder(options);
                expect(portfolio.getPosition).toBeCalledWith(symbol);
              });

              describe('when the position exists', () => {
                let startingCash, position;

                beforeEach(() => {
                  startingCash = 500;
                  position = new Position(symbol);
                  jest.spyOn(portfolio, 'getPosition').mockReturnValue(position);
                  portfolio.positions = [position];
                  portfolio.cash = startingCash;
                });

                describe('when the position quantity is greater than the options quantity', () => {
                  beforeEach(() => {
                    position.quantity = quantity + 1;
                  });

                  test('adds the value to the cash', () => {
                    portfolio.createOrder(options);
                    expect(portfolio.cash).toBe(startingCash + quantity * currentPrice);
                  });

                  test('subtracts the quantity from the position', () => {
                    portfolio.createOrder(options);
                    expect(position.quantity).toBe(1);
                  });
                });

                describe('when the quantity is equal to the options quantity', () => {
                  beforeEach(() => {
                    position.quantity = quantity;
                  });

                  test('adds the value to the cash', () => {
                    portfolio.createOrder(options);
                    expect(portfolio.cash).toBe(startingCash + quantity * currentPrice);
                  });

                  test('subtracts the quantity from the position', () => {
                    portfolio.createOrder(options);
                    expect(position.quantity).toBe(0);
                  });

                  test('removes it from the portfolio', () => {
                    portfolio.createOrder(options);
                    expect(portfolio.positions).toHaveLength(0);
                  });
                });

                describe('when the quantity is less than the options quantity', () => {
                  beforeEach(() => {
                    position.quantity = quantity - 1;
                  });

                  test('sends a warning message', () => {
                    portfolio.createOrder(options);
                    expect(console.warn).toBeCalledWith(
                      'Attempted to sell more of a position than in portfolio'
                    );
                  });
                });
              });

              describe('when the position does not exist', () => {
                beforeEach(() => {
                  jest.spyOn(portfolio, 'getPosition').mockReturnValue(undefined);
                });

                test('sends a warning message', () => {
                  portfolio.createOrder(options);
                  expect(console.warn).toBeCalledWith(
                    'Attempted to sell more of a position than in portfolio'
                  );
                });
              });
            });

            describe('when side is buy', () => {
              beforeEach(() => {
                options.side = 'buy';
              });

              testGetsCurrentPrice();

              describe('when there is enough cash', () => {
                let position, startingQuantity;

                beforeEach(() => {
                  startingQuantity = 2;
                  position = new Position('AAPL');
                  position.quantity = startingQuantity;
                  portfolio.cash = quantity * currentPrice;

                  jest.spyOn(portfolio, 'findOrCreatePosition').mockReturnValue(position);
                });

                test('finds or creates the position', () => {
                  portfolio.createOrder(options);
                  expect(portfolio.findOrCreatePosition).toBeCalledWith(symbol);
                });

                test('sets the quantity', () => {
                  portfolio.createOrder(options);
                  expect(position.quantity).toBe(startingQuantity + quantity);
                });

                test('subtracts the cash', () => {
                  portfolio.createOrder(options);
                  expect(portfolio.cash).toBe(0);
                });
              });

              describe('when there is not enough cash', () => {
                beforeEach(() => {
                  portfolio.cash = 0;
                });

                test('sends a warning message', () => {
                  portfolio.createOrder(options);
                  expect(console.warn).toBeCalledWith('Order not executed, not enough cash');
                });
              });
            });

            describe('when side is neither buy nor sell', () => {
              beforeEach(() => {
                options.side = 'nonsense';
              });

              testThrowsError('Side not provided correctly. Must be buy or sell.');
            });
          });

          describe('when side is not provided', () => {
            beforeEach(() => {
              delete options.side;
            });

            testThrowsError('Side not provided correctly. Must be buy or sell.');
          });
        });

        describe('when quantity is < 1', () => {
          beforeEach(() => {
            options.qty = -2;
          });

          testThrowsError('Quantity must be >= 1 to create an order.');
        });
      });

      describe('when quantity is not supplied', () => {
        beforeEach(() => {
          delete options.qty;
        });

        testThrowsError('Quantity must be >= 1 to create an order.');
      });
    });

    describe('when symbol is not provided', () => {
      beforeEach(() => {
        delete options.symbol;
      });

      testThrowsError('No symbol provided for order.');
    });
  });

  describe('getValue', () => {
    let cash, position, price;

    beforeEach(() => {
      cash = 150;
      price = 200;
      position = new Position('AAPL');
      position.quantity = 2;
      portfolio.positions = [position];
      portfolio.cash = cash;
      jest.spyOn(marketData, 'getPrice').mockReturnValue(price);
    });

    test('gets the price of the position', () => {
      portfolio.getValue();
      expect(marketData.getPrice).toBeCalledWith(position.symbol);
    });

    test('adds up the values of the positions and cash', () => {
      expect(portfolio.getValue()).toBe(cash + position.quantity * price);
    });
  });

  describe('getStats', () => {
    let endValue, startValue;

    beforeEach(() => {
      endValue = 101;
      startValue = 100;
      jest.spyOn(portfolio, 'getValue').mockReturnValue(endValue);
      portfolio.startValue = startValue;
    });

    test('returns the correct values', () => {
      expect(portfolio.getStats()).toEqual({
        endValue,
        startValue,
        roi: (endValue / startValue) - 1
      });
    });
  });
});
