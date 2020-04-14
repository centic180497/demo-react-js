import React, { useState, useEffect } from "react";
import { Marker as MarkerComponent, InfoWindow } from "@react-google-maps/api";

export const Marker = ({ show, position, textInfoWindow }) => {
    const [showingInfoWindow, setShowingInfoWindow] = useState(show);
    useEffect(() => {
        setShowingInfoWindow(show);
    }, [show]);
    return (
        <>
            <MarkerComponent
                onClick={() => {
                    setShowingInfoWindow(!showingInfoWindow);
                }}
                position={position}
            />
            {showingInfoWindow && (
                <InfoWindow
                    className={`imforwindows`}
                    position={position}
                    onCloseClick={() => {
                        setShowingInfoWindow(!showingInfoWindow);
                    }}
                >
                    <div>
                        <h1>{textInfoWindow}</h1>
                    </div>
                </InfoWindow>
            )}
        </>
    );
};
