import * as types from '../const/index';
import axios from 'axios';


export const userLoginFetch = (user) => {
   return dispatch=>{
  console.log(user);
   return axios
        .post('http://103.101.76.161:8001/api/user/login',{
          username:user.username,
          password:user.password,
        })
        .then((response) => {
          console.log(response);
          localStorage.setItem("token", response.data.access_token);

          dispatch(loginUser(response.data.user));
            // Snackbar.success({
            //     message: 'Logged in successfully',
            //     duration: 2,
            // });
            
            alert('thành conng');
          
        })
        .catch(() => {
          alert('thaast bai')
          
        });
    }
    // return dispatch => {
    //   return fetch("http://103.101.76.161:8001/api/user/login", {
    //     method: "POST",
    //     headers: {
    //       'Content-Type': 'application/json',
    //       Accept: 'application/json',
    //     },
    //     body: JSON.stringify({user})
    //   })
    //     .then(resp => resp.json())
        
    //     .then(data => {
    //       if (data.message) {
    //         alert('thẤT BẠI');
    //       } else {
    //         alert('thành công');
    //         localStorage.setItem("token", data.access_token)
    //         dispatch(loginUser(data.user))
    //       }
    //     })
    // }
}
// export const gettokenFetch=()=>{
//   return dispatch =>{
//     const token=localStorage.token;
//     if(token){
//       return fetch('http://103.101.76.161:8001',{
//         method:"get",
//         header:{
//           'Content-Type': 'application/json',
//           Accept: 'application/json',
//           'Authorization': `Bearer ${token}`
//         }
//       })
//       .then(resp=>resp.json())
//     }
//   }
// }
const loginUser = userObj => {
    return{
        type:types.LOGIN_USER,
        payload: userObj,
    }
}
