import React, { Component } from "react";
import { withStyles } from "@material-ui/core/styles";
import { FormControl } from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/Grid";

import Mapapi from "./gg map/map";
import '../../App.css'

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
    // settitle:{
    //     textDecoration:'none',
    // },
    rootNavigation: {
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
        this.state = {
            list:[
                {
                    id:1,
                    img:'image',
                    camera:'camera235',
                    address:'thạc gián,thanh khê,đà nẵng',
                    position:{lat: 16.074805,lng: 108.220232,}
                },
                {
                    id:2,
                    img:'image',
                    camera:'camera236',
                    address:'hòa quý,thanh khê,đà nẵng',
                    position:{lat: 16.076877,lng: 108.216349}
                },
                {
                    id:3,
                    img:'image',
                    camera:'camera237',
                    address:'hòa quý,thanh khê,đà nẵng',
                    position:{lat: 16.074562,lng: 108.220232,}
                },
                {
                    id:4,
                    img:'image',
                    camera:'camera238',
                    address:'thạc gián,thanh khê,đà nẵng',
                    position:{lat: 16.074589,lng: 108.216399,}
                },
            ], 
            item: null,
            idActive: ''
        };
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick(item) {
        console.log(item,'item');
        
        this.setState({ item, idActive: item.id });
    }

    renderListCamera(item, classes,index,) {
        return (
            <div
                                    className={classes.listitem}
                                    onClick={() => {
                                        this.handleClick(item)
                                    }}
                                    key={index}
            >
                                    <Grid item xs={4} >
                                        <span>{item.img}</span>
                                    </Grid>
                                    <Grid item xs={8}>
                                        <Grid item xs={12}>
                                            <div  className={classes.setlist}>
                                                <span>{item.camera}</span>
                                                <span>
                                                   {item.address}
                                                </span>
                                            </div>
                                        </Grid>
                                    </Grid>
                                </div>
        )
    }
    render() {
        const { classes } = this.props;
        return (
            <div className={classes.root}>
                <Grid container spacing={3}>
                    <div className={classes.rootNavigation}>
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
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <div className={classes.title}>
                                        <span className={classes.list}>
                                            danh sách camera
                                        </span>
                                    </div>
                                </Grid>
                                {this.state.list.map((v,index) => this.renderListCamera(v, classes,index))}
                              
                            </Grid>
                        </Grid>
                    </div>
                    <Grid item xs={12}>
                        <Mapapi
                            item={this.state.item}
                            idActive={this.state.idActive}
                            handleClick={this.handleClick}
                        />
                    </Grid>
                </Grid>
            </div>
        );
    }
}
export default withStyles(styles)(Setting);
