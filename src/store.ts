import { createStore, applyMiddleware, Reducer } from "redux";
import { mergeMap, map, catchError, takeUntil } from "rxjs/operators";
import { createEpicMiddleware, Epic } from "redux-observable";
import { of, Observable } from "rxjs";

type Action =
  | { type: "DO_IT" }
  | { type: "DONE"; payload: number[] }
  | { type: "FAILED" }
  | { type: "CANCEL" };

type State = { s: number[] } | { e: string };

type Api = Observable<number[]>;

export const actions = {
  doIt: (): Action => ({ type: "DO_IT" }),
  done: (res: number[]): Action => ({ type: "DONE", payload: res }),
  failed: (): Action => ({ type: "FAILED" }),
  cancel: (): Action => ({ type: "CANCEL" })
};

const rootEpic: Epic<Action, Action, State, Api> = (action$, _state$, req) => {
  return action$.ofType("DO_IT").pipe(
    mergeMap(() => req.pipe(takeUntil(action$.ofType("CANCEL")))),
    map(actions.done),
    catchError(_ => of(actions.failed()))
  );
};

const reducer: Reducer<State, Action> = (state = { s: [] }, action) => {
  switch (action.type) {
    case "DONE":
      return {
        s: action.payload
      };
    case "FAILED":
      return {
        e: "request failed"
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
