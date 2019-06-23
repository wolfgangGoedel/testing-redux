import { createStore, applyMiddleware, Reducer } from "redux";
import {
  mergeMap,
  map,
  catchError,
  takeUntil,
  timeoutWith
} from "rxjs/operators";
import { createEpicMiddleware, Epic } from "redux-observable";
import { of, Observable } from "rxjs";

type Action =
  | { type: "REQUESTED" }
  | { type: "RECEIVED"; payload: number[] }
  | { type: "FAILED"; error: string }
  | { type: "CANCELED" };

type State = { s: number[] } | { e: string };

type Api = Observable<number[]>;

export const actions = {
  doIt: (): Action => ({ type: "REQUESTED" }),
  done: (res: number[]): Action => ({ type: "RECEIVED", payload: res }),
  failed: (err: string): Action => ({ type: "FAILED", error: err }),
  cancel: (): Action => ({ type: "CANCELED" })
};

const rootEpic: Epic<Action, Action, State, Api> = (action$, _state$, req) => {
  return action$.ofType("REQUESTED").pipe(
    mergeMap(() =>
      req.pipe(
        takeUntil(action$.ofType("CANCELED")),
        map(actions.done),
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
        s: action.payload
      };
    case "FAILED":
      return {
        e: action.error
      };
    default:
      return state;
  }
};

export const makeStore = (req: Api) => {
  const epicMiddleware = createEpicMiddleware<Action, Action, State, Api>({
    dependencies: req
  });
  const store = createStore(reducer, applyMiddleware(epicMiddleware));

  epicMiddleware.run(rootEpic);
  return store;
};
