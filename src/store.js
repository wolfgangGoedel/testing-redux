import { createStore, applyMiddleware } from "redux";
import { mergeMap, map, catchError, takeUntil } from "rxjs/operators";
import { createEpicMiddleware, ofType } from "redux-observable";
import { of } from "rxjs";

export const actions = {
  doIt: () => ({ type: "DO_IT" }),
  done: res => ({ type: "DONE", payload: res }),
  failed: () => ({ type: "FAILED" }),
  cancel: () => ({ type: "CANCEL" })
};

const makeEpic = () => (action$, state$, req) => {
  return action$.ofType("DO_IT").pipe(
    mergeMap(_ => req.pipe(takeUntil(action$.ofType("CANCEL")))),
    map(actions.done),
    catchError(_ => of(actions.failed()))
  );
};

const reducer = (state = {}, action) => {
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

export const makeStore = req => {
  const epicMiddleware = createEpicMiddleware({ dependencies: req });
  const store = createStore(reducer, applyMiddleware(epicMiddleware));

  epicMiddleware.run(makeEpic());
  return store;
};
