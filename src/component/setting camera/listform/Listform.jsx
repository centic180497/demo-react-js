import React, { Component } from "react";
import { withStyles } from "@material-ui/core/styles";
import {
    FormControl,
    InputLabel,
    InputAdornment,
    OutlinedInput,
    IconButton,
    Paper,
    FilledInput,
    FormHelperText,
    clsx,
} from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import Select from "@material-ui/core/Select";
import Input from "@material-ui/core/Input";
import MenuItem from "@material-ui/core/MenuItem";
const styles = (theme) => ({
    root: {
        flexGrow: 1,
    },
    header: {
        // width: "100%",
        // border: 'solid 1px #808080',
        background: "rgba(0, 0, 0, 0.04)",
        // borderRadius: '5px!important',
        boxShadow:
            "0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)",
        height: "50px",
    },
    title: {
        textAlign: "left",
    },
    content: {
        boxShadow:
            "0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)",
    },
    menu: {
        display: "flex",
        listStyleType: "none",
        width: "100%",
        textAlign: "left",
    },
    menuitem: {
        marginTop: "15px",
    },
    list: {
        fontSize: "20px",
        marginLeft: "6px",
    },
    form: {
        width: "97%",
        marginTop: "5px",
        boxShadow:
            "0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)",
    },
    listitem: {
        width: " 100%",
        display: "flex",
        boxShadow:
            " 0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)",
        marginTop: "10px",
        textAlign: "left",
        borderRadius: "4px",
        padding: " 10px 20px",
        marginBottom: "5px",
    },
    setlist: {
        display: "grid",
    },
});
class Listitem extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }
    render() {
        const { classes } = this.props;
        return (
            <>
                <Grid container spacing={3}>
                    <Grid item xs={4}>
                        <span className={classes.menuitem}>abcd</span>
                    </Grid>
                    <Grid item xs={4}>
                        <span className={classes.menuitem}>abcd</span>
                    </Grid>
                    <Grid item xs={4}>
                        <span className={classes.menuitem}>abcd</span>
                    </Grid>
                    <Grid container>
                        <Grid item xs={12}>
                            <FormControl className={classes.form}>
                                <InputLabel id="demo-simple-select-label">
                                    Tìm Kiếm Nâng Cao
                                </InputLabel>
                                <Select
                                    labelId="demo-simple-select-label"
                                    id="demo-simple-select"
                                >
                                    <MenuItem>Ten</MenuItem>
                                    <MenuItem>Twenty</MenuItem>
                                    <MenuItem>Thirty</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <div className={classes.title}>
                                <span className={classes.list}>
                                    danh sách camera
                                </span>
                            </div>
                        </Grid>
                        <div className={classes.listitem}>
                            <Grid item xs={4}>
                                ádasd
                            </Grid>
                            <Grid item xs={8}>
                                <Grid item xs={12}>
                                    <div className={classes.setlist}>
                                        <span>camera 235,</span>
                                        <span>
                                            thạc gián, thanh khê, đà nẵng
                                        </span>
                                    </div>
                                </Grid>
                            </Grid>
                        </div>
                        <div className={classes.listitem}>
                            <Grid item xs={4}>
                                ádasd
                            </Grid>
                            <Grid item xs={8}>
                                <Grid item xs={12}>
                                    <div className={classes.setlist}>
                                        <span>camera 235,</span>
                                        <span>
                                            thạc gián, thanh khê, đà nẵng
                                        </span>
                                    </div>
                                </Grid>
                            </Grid>
                        </div>
                        <div className={classes.listitem}>
                            <Grid item xs={4}>
                                ádasd
                            </Grid>
                            <Grid item xs={8}>
                                <Grid item xs={12}>
                                    <div className={classes.setlist}>
                                        <span>camera 235,</span>
                                        <span>
                                            thạc gián, thanh khê, đà nẵng
                                        </span>
                                    </div>
                                </Grid>
                            </Grid>
                        </div>
                    </Grid>
                </Grid>
            </>
        );
    }
}
export default withStyles(styles)(Listitem);
