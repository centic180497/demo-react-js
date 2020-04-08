import React from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import { withFormik } from 'formik';
import * as Yup from 'yup';
import {FormHelperText} from '@material-ui/core';


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
     console.log(props);
     
  const classes = useStyles();
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <form className={classes.form} noValidate>
          <TextField
            variant="outlined"
            margin="normal"
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoFocus
            value={props.values.email}
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
          >
            login
          </Button>
        </form>
      </div>
    </Container>
  );
}
const FormikForm = withFormik({
    mapPropsToValues() { // Init form field
        return {
            email: '',
           
        }
    },
    validationSchema: Yup.object().shape({ // Validate form field
        email: Yup.string()
            .required('Username is required')
            .min(5, 'Username ít nhất 5 kí tự')
            .max(10, 'Username nhiều nhất 10 kí tự'),
    }),
})(SignIn)

export default FormikForm;
