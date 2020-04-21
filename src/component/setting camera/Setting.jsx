import React, { Component } from "react";
import { withStyles } from "@material-ui/core/styles";
import { FormControl } from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import { Scrollbars } from 'react-custom-scrollbars';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
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
    seach:{
        width:'100%',
        display:'flex',
    },
    seachAdvanced:{
        width:'100%',
    },
    seachspan:{
        float:'left',
        paddingLeft:'20px'
    },
    seachlogo:{
        width:'100%',
    },
    panel:{
        width:'100%',
    },
    auto:{
        width:'100%',
    },
    scroll:{
        height:'400px',

    },
    rootNavigation: {
        display: "block",
        position: "absolute",
        zIndex: "999999999",
        background: "#ffffff",
        width: "470px",
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
                {
                    id:4,
                    img:'image',
                    camera:'camera238',
                    address:'thạc gián,thanh khê,đà nẵng',
                    position:{lat: 16.074589,lng: 108.216399,}
                },
                {
                    id:4,
                    img:'image',
                    camera:'camera238',
                    address:'thạc gián,thanh khê,đà nẵng',
                    position:{lat: 16.074589,lng: 108.216399,}
                },
                {
                    id:4,
                    img:'image',
                    camera:'camera238',
                    address:'thạc gián,thanh khê,đà nẵng',
                    position:{lat: 16.074589,lng: 108.216399,}
                },
                {
                    id:4,
                    img:'image',
                    camera:'camera238',
                    address:'thạc gián,thanh khê,đà nẵng',
                    position:{lat: 16.074589,lng: 108.216399,}
                },
                {
                    id:4,
                    img:'image',
                    camera:'camera238',
                    address:'thạc gián,thanh khê,đà nẵng',
                    position:{lat: 16.074589,lng: 108.216399,}
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
    handleAutocompleteChange(title, event, value, target){
        
    }

    render() {
        const top100Films = [
            { title: 'The Shawshank Redemption', year: 1994 },
            { title: 'The Godfather', year: 1972 },
            { title: 'The Godfather: Part II', year: 1974 },
            { title: 'The Dark Knight', year: 2008 },
            { title: 'The Godfather', year: 1972 },
            { title: 'The Godfather: Part II', year: 1974 },
            { title: 'The Dark Knight', year: 2008 },
        ];
        const { classes } = this.props;
        return (
            <div className={classes.root}>
                <Grid container spacing={3}>
                    <div className={classes.rootNavigation}>
                        <Grid container spacing={3}>
                            <Grid item xs={4}>
                                <span className={classes.menuitem}>danh sách</span>
                            </Grid>
                            <Grid item xs={4}>
                                <span className={classes.menuitem}>cấu hình</span>
                            </Grid>
                            <Grid item xs={4}>
                                <span className={classes.menuitem}>thêm mới</span>
                            </Grid>
                            <Grid container>
                                <Grid item xs={12}>
                                    <div className={classes.seach}>
                                    <ExpansionPanel className={classes.panel}>
                                        <ExpansionPanelSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls="panel1a-content"
                                            id="panel1a-header"
                                            >
                                            <Typography className={classes.heading}>Tìm Kiếm Nâng cao</Typography>
                                            </ExpansionPanelSummary>
                                            <ExpansionPanelDetails>
                                                <TextField id="filled-search" label="Search field" type="search" variant="filled" className={classes.auto}/>
                                            </ExpansionPanelDetails>
                                            <ExpansionPanelDetails>
                                                <Autocomplete
                                                    className={classes.auto}
                                                    id="combo-box-demo"
                                                    options={top100Films}
                                                    getOptionLabel={(option) => option.title}
                                                    renderInput={(params) => <TextField {...params} label="Tỉnh/thành phố" variant="outlined" />}
                                                    onChange={(event, value, target) => this.handleAutocompleteChange('film', event, value, target)}
                                                />
                                            </ExpansionPanelDetails>
                                            <ExpansionPanelDetails>
                                                <Autocomplete
                                                    className={classes.auto}
                                                    id="combo-box-demo"
                                                    options={top100Films}
                                                    getOptionLabel={(option) => option.title}
                                                    renderInput={(params) => <TextField {...params} label="Quận/huyện" variant="outlined" />}
                                                />
                                            </ExpansionPanelDetails>
                                            <ExpansionPanelDetails>
                                                <Autocomplete
                                                    className={classes.auto}
                                                    id="combo-box-demo"
                                                    options={top100Films}
                                                    getOptionLabel={(option) => option.title}
                                                    renderInput={(params) => <TextField {...params} label="Phường/xã" variant="outlined" />}
                                                />
                                            </ExpansionPanelDetails>
                                            <ExpansionPanelDetails>
                                                <Autocomplete
                                                    className={classes.auto}
                                                    multiple
                                                    id="tags-outlined"
                                                    options={top100Films}
                                                    getOptionLabel={(option) => option.title}
                                                    // defaultValue={[top100Films[13]]}
                                                    filterSelectedOptions
                                                    renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        variant="outlined"
                                                        label="Nhóm"
                                                        placeholder="Favorites"
                                                    />
                                                    )}
                                                />
                                            </ExpansionPanelDetails>
                                    </ExpansionPanel>
                                    </div>
                                </Grid>
                                <Grid item xs={12}>
                                    <div className={classes.title}>
                                        <span className={classes.list}>
                                            danh sách camera
                                        </span>
                                    </div>
                                </Grid>
                                <Grid item xs={12} className={classes.scroll}> 
                                <Scrollbars> 
                                    {this.state.list.map((v,index) => this.renderListCamera(v, classes,index))}   
                                </Scrollbars>                
                                </Grid>
                        
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
