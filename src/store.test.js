import { store } from "./store";

describe("the thing", () => {
  it("should behave", () => {
    const state = store.getState();
    expect(state).toEqual({});
  });
});
