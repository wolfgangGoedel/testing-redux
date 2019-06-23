import { makeStore, actions, Api, Action, State } from "./store";
import { TestScheduler } from "rxjs/testing";
import { from } from "rxjs";
import { skip, distinctUntilChanged } from "rxjs/operators";
import { RunHelpers } from "rxjs/internal/testing/TestScheduler";
import { Store } from "redux";

describe("state", () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  test("after success", () => {
    scheduler.run(({ cold, hot, flush }) => {
      const act = hot("a", { a: actions.requested("0") });
      const api = {
        request: () => cold("---(a|)", { a: [1, 2, 3] })
      };

      const store = makeStore(api);
      act.subscribe(store.dispatch);

      flush();
      expect(store.getState()).toEqual({ s: [1, 2, 3] });
    });
  });

  test("after failure", () => {
    scheduler.run(({ cold, hot, flush }) => {
      const act = hot("a", { a: actions.requested("0") });
      const api = {
        request: () => cold<number[]>("---#")
      };

      const store = makeStore(api);
      act.subscribe(store.dispatch);

      flush();
      expect(store.getState()).toEqual({ e: "request failed" });
    });
  });

  test("after cancel", () => {
    scheduler.run(({ cold, hot, flush }) => {
      const act = hot("a--b", {
        a: actions.requested("0"),
        b: actions.canceled()
      });
      const api = {
        request: () => cold("----(a|)", { a: [1, 2, 3] })
      };

      const store = makeStore(api);
      const initialState = store.getState();
      act.subscribe(store.dispatch);

      flush();
      expect(store.getState()).toBe(initialState);
    });
  });

  test("after 2s timeout", () => {
    scheduler.run(({ cold, hot, expectObservable }) => {
      const act = hot("a", { a: actions.requested("0") });
      const api = {
        request: () => cold("3s (a|)", { a: [1, 2, 3] })
      };

      const store = makeStore(api);
      act.subscribe(store.dispatch);

      const state$ = from(store as any).pipe(
        distinctUntilChanged(),
        skip(1)
      );

      expectObservable(state$).toBe("2s e", {
        e: { e: "timeout" }
      });
    });
  });

  describe("use conditional api", () => {
    const withApi = ({ cold }: RunHelpers): Api => ({
      request: id => {
        switch (id) {
          case "slow":
            return cold("3s (a|)", { a: [1, 2, 3] });
          case "error":
            return cold<number[]>("1s #");
          default:
            return cold("1s (a|)", { a: [1, 2, 3] });
        }
      }
    });

    const given = (marbles: string, values: { [marble: string]: Action }) => {
      let store: Store<State, Action>;
      scheduler.run(h => {
        const action$ = h.hot(marbles, values);
        store = makeStore(withApi(h));
        action$.subscribe(store.dispatch);
      });
      return store!.getState();
    };

    const testState = (config: {
      actions: [string, { [marble: string]: Action }];
      state: [string, { [marble: string]: State }];
    }) =>
      scheduler.run(h => {
        const [actionMarbles, actionValues] = config.actions;
        const action$ = h.hot(actionMarbles, actionValues);
        const store = makeStore(withApi(h));
        action$.subscribe(store.dispatch);
        const state$ = from(store as any).pipe(
          distinctUntilChanged(),
          skip(1)
        );
        const [stateMarbles, stateValues] = config.state;
        h.expectObservable(state$).toBe(stateMarbles, stateValues);
      });

    test("success", () => {
      const state = given("-a", {
        a: actions.requested("some_id")
      });
      expect(state).toEqual({ s: [1, 2, 3] });
    });

    test("failure", () => {
      const state = given("-a", {
        a: actions.requested("error")
      });
      expect(state).toEqual({ e: "request failed" });
    });

    test("failure", () => {
      const state = given("-a 0.5s c", {
        a: actions.requested("error"),
        c: actions.canceled()
      });
      expect(state).toEqual({ s: [] });
    });

    test("timeout", () =>
      testState({
        actions: ["-a----", { a: actions.requested("slow") }],
        state: ["  - 2s s", { s: { e: "timeout" } }]
      }));

    test("race", () =>
      testState({
        actions: [
          "-a---b",
          { a: actions.requested("slow"), b: actions.requested("ok") }
        ],
        state: ["----- 1s s", { s: { s: [1, 2, 3] } }]
      }));
  });
});
