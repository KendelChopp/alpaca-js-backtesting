const Websocket = require("./Websocket/Websocket.js");

const Backtest = require("./index.js");

describe("Backtest", () => {
  let alpaca, startDate, endDate, backtest;

  beforeEach(() => {
    alpaca = { some: "alpaca object" };
    startDate = new Date(2020, 0, 1);
    endDate = new Date(2020, 1, 1);
    backtest = new Backtest({ alpaca, startDate, endDate });
  });

  test("sets up the websocket", () => {
    expect(backtest.data_stream_v2).toBeInstanceOf(Websocket);
  });

  describe("constructor", () => {
    describe("when no alpaca is passed", () => {
      test("throws an error", () => {
        expect(() => {
          new Backtest();
        }).toThrow("Missing alpaca object");
      });
    });

    describe("when no startDate is passed", () => {
      test("throws an error", () => {
        expect(() => {
          new Backtest({ alpaca });
        }).toThrow("You must provide a start date");
      });
    });

    describe("when no endDate is passed", () => {
      test("throws an error", () => {
        expect(() => {
          new Backtest({ alpaca, startDate });
        }).toThrow("You must provide an end date");
      });
    });
  });

  describe("createOrder", () => {
    beforeEach(() => {
      jest.spyOn(backtest._portfolio, "createOrder").mockImplementation();
    });

    test("defers to the portfolio create order", () => {
      const options = { some: "options" };
      backtest.createOrder(options);
      expect(backtest._portfolio.createOrder).toBeCalledWith(options);
    });
  });

  describe("getStats", () => {
    let stats;

    beforeEach(() => {
      stats = { some: "stats" };
      jest.spyOn(backtest._portfolio, "getStats").mockReturnValue(stats);
    });

    test("defers to the portfolio stats", () => {
      const backtestStats = backtest.getStats();
      expect(backtest._portfolio.getStats).toBeCalled();
      expect(backtestStats).toEqual(stats);
    });
  });
});
