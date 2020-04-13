import React, { Component } from "react";
import { withStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Listitem from "./listform/Listform";
import Mapapi from "../setting camera/gg map/map";

// import Mapapi from "..";
const styles = (theme) => ({
    root: {
        flexGrow: 1,
    },
    "root--navigation": {
        display: "block",
        position: "absolute",
        zIndex: "999999999",
        background: "#ffffff",
        width: " 470px",
        top: 0,
        left: 0,
        padding: "20px",
    },
});

class Setting extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const { classes } = this.props;
        return (
            <div className={classes.root}>
                <Grid container spacing={3}>
                    <div className={classes["root--navigation"]}>
                        <Listitem />
                    </div>
                    <Grid item xs={12}>
                        <Mapapi />
                    </Grid>
                </Grid>
            </div>
        );
    }
}
export default withStyles(styles)(Setting);
