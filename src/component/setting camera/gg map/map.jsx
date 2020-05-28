import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { Marker } from "./MarKer";
const pStyle = {
    height: 500,
    position: "relative",
    width: "100%",
    overflow: "hidden",
};
const Mapapi = (props) => {
        
    console.log(props, 'props');
    
    const [state, setState] = useState({
        showingInfoWindow: false,
        activeMarker: {},
        selectedPlace: {},
        apiMarker: [
            {
                id: 1,
                text: "marker 1",
                defaultShowingInfoWindow: false,
                position: { lat: 16.076877, lng: 108.216349 },
            },
            {
                id: 2,
                text: "marker 2",
                defaultShowingInfoWindow: false,
                position: { lat: 16.074805, lng: 108.220232 },
            },
        ],
    });

    useEffect(() => {
        if (props.show) {
            const newArray = state.apiMarker;
            const reusult = newArray.find((x) => x.id === props.show);
            reusult.defaultShowingInfoWindow = true;
            setState((s) => ({ ...s, apiMarker: newArray }));
            console.log(reusult);
            
            
        }
    }, [props]);

    const onMapClicked = (props) => {
        if (this.state.showingInfoWindow) {
            this.setState({
                showingInfoWindow: false,
                activeMarker: null,
            });
        }
    };

    return (
        <div className="map" style={pStyle}>
            <LoadScript
                onClick={onMapClicked}
                id="script-loader"
                googleMapsApiKey="AIzaSyDb5xOZiLOJAtKJWj4spvQf3UEQvE-3sc4"
            >
                <GoogleMap
                    zoom={17}
                    center={props.item?.position}
                >
                    {state.apiMarker.map((item, index) => {
                        return (
                            <Marker
                                key={index}
                                item={item}
                                positionActive={props.item}
                                handleClick={props.handleClick}
                            />
                        );
                    })}
                </GoogleMap>
            </LoadScript>
        </div>
    );
};
export default Mapapi;
