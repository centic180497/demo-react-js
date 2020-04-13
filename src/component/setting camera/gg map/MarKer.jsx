import React, { useState } from "react";
import { Marker as MarkerComponent, InfoWindow } from "@react-google-maps/api";

export const Marker = ({ position, textInfoWindow, key }) => {
    const [showingInfoWindow, setShowingInfoWindow] = useState(false);

    return (
        <>
            <MarkerComponent
                onClick={() => {
                    console.log(1);
                    setShowingInfoWindow({
                        showingInfoWindow: true,
                    });
                }}
                position={position}
            />
            {showingInfoWindow.showingInfoWindow && (
                <InfoWindow
                    className={`imforwindows_${key}`}
                    position={position}
                    visible={showingInfoWindow.showingInfoWindow}
                    onCloseClick={() => {
                        setShowingInfoWindow({
                            showingInfoWindow: false,
                        });
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
