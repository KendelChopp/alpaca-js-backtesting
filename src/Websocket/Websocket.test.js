const _ = require("lodash");
const q = require("q");

const MarketData = require("../MarketData/MarketData.js");

const Websocket = require("./Websocket.js");

describe("Websocket", () => {
  let alpaca, marketData, start, end, websocket;

  beforeEach(() => {
    alpaca = { getBars: jest.fn() };
    marketData = new MarketData();
    start = new Date(2020, 6, 1);
    end = new Date(2020, 9, 1);

    websocket = new Websocket(alpaca, marketData, start, end);
  });

  describe("onConnect", () => {
    test("sets the connect callback", () => {
      const someCallback = jest.fn();
      websocket.onConnect(someCallback);
      expect(websocket.connectCallback).toBe(someCallback);
    });
  });

  describe("onDisconnect", () => {
    test("sets the disconnect callback", () => {
      const someCallback = jest.fn();
      websocket.onDisconnect(someCallback);
      expect(websocket.disconnectCallback).toBe(someCallback);
    });
  });

  describe("onStockBar", () => {
    test("sets the stock agg min callback", () => {
      const someCallback = jest.fn();
      websocket.onStockBar(someCallback);
      expect(websocket.stockAggMinCallback).toBe(someCallback);
    });
  });

  describe("subscribeForBars", () => {
    test("sets the channels", () => {
      const channels = ["AM.SPY", "AM.AAPL"];
      websocket.subscribeForBars(channels);
      expect(websocket.channels).toBe(channels);
    });
  });

  describe("loadData", () => {
    describe("when there are only valid channels", () => {
      let barRequest, channels, channelString, rawChannels;

      beforeEach(() => {
        channels = ["AM.SPY", "alpacadatav1/AM.AAPL"];
        rawChannels = ["SPY", "AAPL"];
        channelString = "SPY,AAPL";
        websocket.channels = channels;

        barRequest = q.defer();
        alpaca.getBars.mockReturnValue(barRequest.promise);
      });

      test("calls alpaca.getBars with the correct arguments", () => {
        websocket.loadData();
        expect(alpaca.getBars).toBeCalledWith("1Min", channelString, {
          start,
          end
        });
      });

      describe("after the bar request resolves", () => {
        let barData;

        beforeEach(() => {
          barData = {
            AAPL: {
              some: "apple data"
            },
            SPY: {
              some: "s&p data"
            }
          };

          barRequest.resolve(barData);
          jest.spyOn(marketData, "addSecurity");
        });

        test("calls add security with the correct data", async () => {
          await websocket.loadData();
          _.forEach(rawChannels, channel => {
            expect(marketData.addSecurity).toBeCalledWith(
              channel,
              barData[channel]
            );
          });
        });
      });
    });

    describe("when there is an invalid channel", () => {
      test("throws an error", async () => {
        websocket.channels = ["AM.SPY", "AS.AAPL"];
        try {
          await websocket.loadData();
        } catch (error) {
          expect(error.message).toBe(
            "Only minute aggregates are supported at this time."
          );
        }
      });
    });
  });

  describe("runSimulation", () => {
    beforeEach(() => {
      jest.spyOn(marketData, "simulateMinute").mockImplementation();
    });

    describe("when there is a stock agg min callback", () => {
      let callback, minuteCount, simulatedMinute;

      beforeEach(() => {
        callback = jest.fn();
        websocket.stockAggMinCallback = callback;

        minuteCount = 0;
        jest.spyOn(marketData, "hasData", "get").mockImplementation(() => {
          return minuteCount++ < 1;
        });

        simulatedMinute = [
          {
            subject: "AM.AAPL",
            data: {
              some: "data"
            }
          }
        ];

        jest
          .spyOn(marketData, "simulateMinute")
          .mockReturnValue(simulatedMinute);
      });

      test("calls the callback the correct number of times", () => {
        websocket.runSimulation();
        expect(marketData.simulateMinute).toBeCalled();
        expect(callback).toBeCalledWith(simulatedMinute[0].data);
      });
    });

    describe("when there is not a stock agg min callback", () => {
      beforeEach(() => {
        websocket.stockAggMinCallback = null;
      });

      test("is a no-op", () => {
        websocket.runSimulation();
        expect(marketData.simulateMinute).not.toBeCalled();
      });
    });
  });

  describe("connect", () => {
    let dataRequest;

    beforeEach(() => {
      dataRequest = q.defer();
      jest.spyOn(websocket, "loadData").mockReturnValue(dataRequest.promise);
      jest.spyOn(websocket, "runSimulation").mockImplementation();
    });

    describe("when there is a connect callback", () => {
      let callback;

      beforeEach(() => {
        callback = jest.fn();
        websocket.connectCallback = callback;
      });

      test("calls the callback", () => {
        websocket.connect();
        expect(callback).toBeCalled();
      });
    });

    test("loads the data", () => {
      websocket.connect();
      expect(websocket.loadData).toBeCalled();
    });

    describe("after the data loads", () => {
      beforeEach(() => {
        dataRequest.resolve();
      });

      test("calls runSimulation", async () => {
        await websocket.connect();
        expect(websocket.runSimulation).toBeCalled();
      });

      describe("when there is a disconnect callback", () => {
        let callback;

        beforeEach(() => {
          callback = jest.fn();
          websocket.disconnectCallback = callback;
        });

        test("calls the callback", async () => {
          await websocket.connect();
          expect(callback).toBeCalled();
        });
      });
    });
  });
});
