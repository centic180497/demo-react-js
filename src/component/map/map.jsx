import React, { Component } from "react";
import { withStyles } from "@material-ui/core/styles";
import { Map, Marker, Popup, TileLayer} from 'react-leaflet';
import {Icon} from "leaflet";
import icon from "../../asset/marker.png";



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
const iconcamera= new Icon({
    iconUrl:icon,
    iconSize:[40,40],
    iconAnchor:[25,10]
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
        const {classes}=this.props
        return(
            <div className={classes.root}> 
                <Map center={position2} zoom={15} className={classes.map}>
                    <TileLayer
                    url='http://10.49.46.11:8080/styles/osm-bright/{z}/{x}/{y}.png'
                    attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
                    />
                    <Marker position={position2}
                     icon={iconcamera}
                    >
                        <Popup>Marker<br />số 1</Popup>
                    </Marker>
                    <Marker position={position} icon={iconcamera}>
                        <Popup>Marker<br/>số 2</Popup>
                    </Marker>
                </Map>
            </div>
        );
    }
   
}
export default withStyles(styles) (mapleft);


