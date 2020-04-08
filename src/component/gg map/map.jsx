import React, { Component } from "react";
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { Marker } from "./MarKer";
import "../../App.css";
const pStyle = {
    height: 500,
    position: "relative",
    top: "200px",
};
class Mapapi extends Component {
    constructor(props) {
        super(props);
        this.state = {
            showingInfoWindow: false,
            activeMarker: {},
            selectedPlace: {},
        };
        this.onMarkerClick = this.onMarkerClick.bind(this);
        this.onMapClicked = this.onMapClicked.bind(this);
    }
    onMarkerClick = function (props, marker) {
        this.setState({

            selectedPlace: props,
            activeMarker: marker,
            showingInfoWindow: true,
        });
    };
    onMapClicked = function (props) {
        if (this.state.showingInfoWindow) {
            this.setState({
                showingInfoWindow: false,
                activeMarker: null,
            });
        }
    };

    render() {
        return (
            <div className="map" style={pStyle}>
                <LoadScript
                    id="script-loader"
                    googleMapsApiKey="AIzaSyDb5xOZiLOJAtKJWj4spvQf3UEQvE-3sc4"
                    // {...other.props}
                >
                    <GoogleMap
                        onClick={this.onMapClicked}
                        zoom={14}
                        center={{ lat: 16.074805, lng: 108.220232 }}
                        //  {...other props }
                    >
                        {/* <Marker
                            onClick={this.onMarkerClick}
                            position={{ lat: 16.074805, lng: 108.220232 }}
                            key={1}
                        />

                        <Marker
                            onClick={this.onMarkerClick}
                            position={{ lat: 16.076877, lng: 108.216349 }}
                            key={2}
                        />

                        {this.state.showingInfoWindow && (
                            <InfoWindow
                                position={{ lat: 16.074805, lng: 108.220232 }}
                                marker={this.state.activeMarker}
                                visible={this.state.showingInfoWindow}
                            >
                                <div>
                                    <h1>{"marker số 1"}</h1>
                                </div>
                            </InfoWindow>
                        )}

                        {this.state.showingInfoWindow && (
                            <InfoWindow
                                position={{ lat: 16.076877, lng: 108.216349 }}
                                marker={this.state.activeMarker}
                                visible={this.state.showingInfoWindow}
                            >
                                <div>
                                    <h1>{"marker số 2"}</h1>
                                </div>
                            </InfoWindow>
                        )} */}

                        <Marker
                            position={{ lat: 16.076877, lng: 108.216349 }}
                            textInfoWindow="marker số 2"
                        />
                        <Marker
                            position={{ lat: 16.074805, lng: 108.220232 }}
                            textInfoWindow="marker số 1"
                        />
                    </GoogleMap>
                </LoadScript>
            </div>
        );
    }
}
export default Mapapi;
