import { makeStore } from "./store";
import { TestScheduler } from "rxjs/testing";

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

describe("the thing", () => {
  it("should...", () => {
    scheduler.run(({ cold, flush }) => {
      const req = cold("---(a|)", { a: [1, 2, 3] });
      const store = makeStore(req);

      store.dispatch({ type: "DO_IT" });
      flush();
      expect(store.getState()).toEqual({ s: [1, 2, 3] });
    });
  });
});
