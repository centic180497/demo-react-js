import * as types from '../const/index';
const initialState = {
    currentUser: {},
    loading:false,
  }
   
  export default function reducer(state = initialState, action) {
      switch (action.type) {
        case types.LOGIN_USER:
          state.loading=!state.loading
          return {...state, currentUser: action.payload}
        default:
          return state;
      }
    }