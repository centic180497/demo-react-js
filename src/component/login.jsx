import React from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import { makeStyles,} from '@material-ui/core/styles';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import Container from '@material-ui/core/Container';
import { withFormik } from 'formik';
import * as Yup from 'yup';
import {FormHelperText} from '@material-ui/core';
import axios from 'axios';
// import API_URL from '../config';
const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
  color:{
      color:'red',
  }
}));

 const SignIn = (props) => {
  const classes = useStyles();
  function onFinish(values) {
    console.log(values);
    
    axios
        .post('http://103.101.76.161:8001/api/user/login', {
          username: values.username,
          password: values.password,
        })
        .then((response) => {
      
            document.cookie = 'auth=' + response.data.jwt;
            document.cookie = 'username=' + response.data.user.username;
            Snackbar.success({
                message: 'Logged in successfully',
                duration: 2,
            });
        })
        .catch(() => {
          Snackbar.error({
                message: 'Login failed',
            });
        });
  }
  function handleclick(){
    
  }
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <form className={classes.form} onSubmit={onFinish}>
          <TextField
            variant="outlined"
            margin="normal"
            fullWidth
            id="username"
            label="Email Address"
            name="username"
            autoFocus
            value={props.values.username}
            onChange={props.handleChange} 
          />
          <FormHelperText className={classes.color}>{props.errors.email}</FormHelperText>
          <TextField
            variant="outlined"
            margin="normal"
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            value={props.values.Password}
            onChange={props.handleChange}
          />    
          <FormControlLabel
            control={<Checkbox value="remember" color="primary" />}
            label="Remember me"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
            onClick={handleclick()}
          >
            login
          </Button>
        </form>
      </div>
    </Container>
  );
}
const FormikForm = withFormik({
    mapPropsToValues() {
        return {
            email: '',
           
        }
    },
    validationSchema: Yup.object().shape({
      username: Yup.string()
            .required('Username is required')
            .min(5, 'Username ít nhất 5 kí tự')
            .max(10, 'Username nhiều nhất 10 kí tự'),
    }),
})(SignIn)

export default FormikForm;
