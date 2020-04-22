import * as types from '../const/index';
const initialState = {
    currentUser: {}
  }
   
  export default function reducer(state = initialState, action) {
      switch (action.type) {
        case types.LOGIN_USER:
          return {...state, currentUser: action.payload}
        default:
          return state;
      }
    }