import React, { useState } from "react";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import CssBaseline from "@material-ui/core/CssBaseline";
import TextField from "@material-ui/core/TextField";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import { Formik, Form } from "formik";
import Container from "@material-ui/core/Container";
import * as Yup from "yup";
import { FormHelperText } from "@material-ui/core";
import axios from "axios";
import { connect } from "react-redux";
import { userLoginFetch } from "../redux/action/action";
import CircularProgress from "@material-ui/core/CircularProgress";
const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: "100%", // Fix IE 11 issue.
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
  color: {
    color: "red",
  },
  display: {
    width: "32px",
    height: "33px",
    textAlign: "center",
    marginLeft: "200px",
  },
  undisplay: {
    display: "none",
  },
}));
const SignIn = (props) => {
  console.log(props);
  const classes = useStyles();

  const handleSubmit = (value) => {
    console.log(value);
    setshowloading(true);
    props.userLoginFetch(value);
  };
  const [showloading, setshowloading] = useState(false);
  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}></Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Formik
          initialValues={{
            username: "admin",
            password: "centic.vn",
          }}
          validationSchema={Yup.object({
            username: Yup.string().required(
              "Tên dăng nhập Không Được Để trống"
            ),
            password: Yup.string()
              .min(6, "Mật khẩu không được để trống")
              .required("Required"),
          })}
          onSubmit={(values) => {
            console.log(values);

            handleSubmit(values);
          }}
        >
          {(propsFormik) => (
            <Form className={classes.form} onSubmit={propsFormik.handleSubmit}>
              <TextField
                variant="outlined"
                margin="normal"
                fullWidth
                id="username"
                label="Email Address"
                name="username"
                autoFocus
                value={propsFormik.values.username}
                onChange={propsFormik.handleChange}
              />
              <FormHelperText className={classes.color}>
                {propsFormik.errors.username}
              </FormHelperText>
              <TextField
                variant="outlined"
                margin="normal"
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                value={propsFormik.values.password}
                onChange={propsFormik.handleChange}
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
                disabled={props.loading}
              >
                {props.loading ? <CircularProgress size={24}/> : "Login"}
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </Container>
  );
};

function mapStateToProps({ login }) {
  return {
    loading: login.loading,
  };
}

const mapDispatchToProps = (dispatch) => ({
  userLoginFetch: (userInfo) => dispatch(userLoginFetch(userInfo)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SignIn);
