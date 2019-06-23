import { createStore, applyMiddleware, Reducer } from "redux";
import {
  map,
  catchError,
  takeUntil,
  timeoutWith,
  switchMap
} from "rxjs/operators";
import { createEpicMiddleware, Epic } from "redux-observable";
import { of, Observable } from "rxjs";

export type Action =
  | { type: "REQUESTED"; id: string }
  | { type: "RECEIVED"; response: number[] }
  | { type: "FAILED"; error: string }
  | { type: "CANCELED" };

export type State = { s: number[] } | { e: string };

export type Api = {
  request: (id: string) => Observable<number[]>;
};

export const actions = {
  requested: (id: string): Action => ({ type: "REQUESTED", id }),
  received: (response: number[]): Action => ({ type: "RECEIVED", response }),
  failed: (error: string): Action => ({ type: "FAILED", error }),
  canceled: (): Action => ({ type: "CANCELED" })
};

const rootEpic: Epic<Action, Action, State, Api> = (action$, _state$, api) => {
  return action$.ofType<{ type: "REQUESTED"; id: string }>("REQUESTED").pipe(
    switchMap(({ id }) =>
      api.request(id).pipe(
        map(actions.received),
        takeUntil(action$.ofType("CANCELED")),
        timeoutWith(2000, of(actions.failed("timeout")))
      )
    ),
    catchError(_ => of(actions.failed("request failed")))
  );
};

const reducer: Reducer<State, Action> = (state = { s: [] }, action) => {
  switch (action.type) {
    case "RECEIVED":
      return {
        s: action.response
      };
    case "FAILED":
      return {
        e: action.error
      };
    default:
      return state;
  }
};

export const makeStore = (api: Api) => {
  const epicMiddleware = createEpicMiddleware<Action, Action, State, Api>({
    dependencies: api
  });
  const store = createStore(reducer, applyMiddleware(epicMiddleware));

  epicMiddleware.run(rootEpic);
  return store;
};
