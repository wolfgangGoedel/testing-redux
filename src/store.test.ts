import { makeStore, actions } from "./store";
import { TestScheduler } from "rxjs/testing";

let scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

describe("state", () => {
  test("state after success", () => {
    scheduler.run(({ cold, hot, flush }) => {
      const act = hot("a", { a: actions.doIt() });
      const req = cold("---(a|)", { a: [1, 2, 3] });

      const store = makeStore(req);
      act.subscribe(store.dispatch);

      flush();
      expect(store.getState()).toEqual({ s: [1, 2, 3] });
    });
  });

  test("state after failure", () => {
    scheduler.run(({ cold, hot, flush }) => {
      const act = hot("a", { a: actions.doIt() });
      const req = cold<number[]>("---#");

      const store = makeStore(req);
      act.subscribe(store.dispatch);

      flush();
      expect(store.getState()).toEqual({ e: "request failed" });
    });
  });

  it("should contain to response", () => {
    scheduler.run(({ cold, hot, flush }) => {
      const act = hot("a--b", {
        a: actions.doIt(),
        b: actions.cancel()
      });
      const req = cold("----(a|)", { a: [1, 2, 3] });

      const store = makeStore(req);
      const initialState = store.getState();
      act.subscribe(store.dispatch);

      flush();
      expect(store.getState()).toBe(initialState);
    });
  });
});
