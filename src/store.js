import { createStore } from "redux";

const reducer = (state = {}, action) => state;

export const makeStore = () => createStore(reducer);
