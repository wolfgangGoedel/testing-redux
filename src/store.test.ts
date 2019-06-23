import { makeStore, actions } from "./store";
import { TestScheduler } from "rxjs/testing";
import { from } from "rxjs";
import { skip, distinctUntilChanged } from "rxjs/operators";

describe("state", () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  test("after success", () => {
    scheduler.run(({ cold, hot, flush }) => {
      const act = hot("a", { a: actions.doIt() });
      const req = cold("---(a|)", { a: [1, 2, 3] });

      const store = makeStore(req);
      act.subscribe(store.dispatch);

      flush();
      expect(store.getState()).toEqual({ s: [1, 2, 3] });
    });
  });

  test("after failure", () => {
    scheduler.run(({ cold, hot, flush }) => {
      const act = hot("a", { a: actions.doIt() });
      const req = cold<number[]>("---#");

      const store = makeStore(req);
      act.subscribe(store.dispatch);

      flush();
      expect(store.getState()).toEqual({ e: "request failed" });
    });
  });

  test("after cancel", () => {
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

  test("after 2s timeout", () => {
    scheduler.run(({ cold, hot, expectObservable }) => {
      const act = hot("a", { a: actions.doIt() });
      const req = cold("3s (a|)", { a: [1, 2, 3] });

      const store = makeStore(req);
      act.subscribe(store.dispatch);

      const state$ = from(store as any).pipe(
        distinctUntilChanged(),
        skip(1)
      );

      expectObservable(state$).toBe("2s e", {
        e: { e: "request failed" }
      });
    });
  });
});
