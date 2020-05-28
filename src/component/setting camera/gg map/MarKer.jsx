import React from "react";
import { Marker as MarkerComponent, InfoWindow } from "@react-google-maps/api";

export const Marker = (props) => {  
    return (
        <>
            <MarkerComponent
                zoom={17}
                position={props.item?.position}
                onClick={() => props.handleClick(props.item)}
            />
            {JSON.stringify(props.positionActive?.position) === JSON.stringify(props.item?.position) && (
                <InfoWindow
                    className={`imforwindows`}
                    position={props.item?.position}
                   
                >
                    <div>
                        <h1>{props.item?.text}</h1>
                    </div>
                </InfoWindow>
            )}
        </>
    );
};
