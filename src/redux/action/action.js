import * as types from "../const/index";
import axios from "axios";
class Client {
  login(url, options) {
    this.makeRequest(url, options);
  }

  makeRequest = async (url, options) => {
    try {
      const response = await axios({ url, method: options.method });
      return response.data;
    } catch (error) {
      throw new Error("request failure");
    }
  };
}

const Client4 = new Client();
export const userLoginFetch = (user) => {
  return (dispatch) => {
    dispatch(loginRequest());
    // const audio = new Audio('https://vnso-zn-5-tf-mp3-320s1-zmp3.zadn.vn/b79ca80ebd4954170d58/3940012832325404590?authen=exp=1587891421~acl=/b79ca80ebd4954170d58/*~hmac=f5f0597ff34fa839f78112443bbda898')
    // audio.play()
    return axios
      .post("http://103.101.76.161:8001/api/user/login", {
        username: user.username,
        password: user.password,
      })
      .then((response) => {
        console.log(response);
        localStorage.setItem("token", response.data.access_token);
        dispatch(loginSuccess(response.data));
      })
      .catch((error) => {
        dispatch(loginFailure(error.response.data));
      });
  };
};

const loginRequest = () => {
  return {
    type: "LOGIN_REQUEST",
  };
};

const loginSuccess = (userObj) => {
  return {
    type: "LOGIN_SUCCESS",
    payload: userObj,
  };
};

const loginFailure = (error) => ({
  type: "LOGIN_FAILURE",
  payload: error,
});

const options = {
  payload: { username: "" },
  headers: {},
  params: { type: "1" },
  method: "get",
};
