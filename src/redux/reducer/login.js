import * as types from "../const/index";

const initialState = {
  currentUser: {},
  loading: false,
  error: {}
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case "LOGIN_REQUEST":
      return {
        ...state,
        loading: true,
      };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        currentUser: action.payload,
        loading: false,
      };
    case "LOGIN_FAILURE":
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    default:
      return state;
  }
}
