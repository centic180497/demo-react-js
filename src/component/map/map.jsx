import React, { Component } from "react";
import { withStyles } from "@material-ui/core/styles";
import { Map, Marker, Popup, TileLayer,} from 'react-leaflet';
import PhotoCameraIcon from '@material-ui/icons/PhotoCamera';
import {Icon} from "leaflet";
// import 'leaflet/dist/leaflet.css';

const styles = (theme) => ({
    root: {
        flexGrow: 1,
        width:'100%',
        height:'100vh',

    },
    map:{
        width:'100%',
        height:'100vh',
    },

});
 const camera =new Icon({
    iconurl:<PhotoCameraIcon/>,
    IconSize:[25,25]
});

class mapleft extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }
    render(){
        const position = [16.071280,108.218600]
        const position2 = [16.074540,108.218000]
        const {classes,camera}=this.props
        return(
            <div className={classes.root}> 
                <Map center={position2} zoom={15} className={classes.map}>
                    <TileLayer
                    url='https://{s}.tile.osm.org/{z}/{x}/{y}.png'
                    attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
                    />
                    <Marker position={position2}>
                        <Popup>Marker<br />số 1</Popup>
                    </Marker>
                    <Marker position={position}>
                        <Popup>Marker<br />số 2</Popup>
                    </Marker>
                </Map>
            </div>
        );
    }
   
}
export default withStyles(styles) (mapleft,camera);


