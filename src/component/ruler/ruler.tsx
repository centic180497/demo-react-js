import * as React from "react";
import Ruler from "@scena/react-ruler";

export default class Text extends React.Component {
    render() {
        return (<Ruler type="horizontal" ref={e => {
            this.ruler = e;
        }}/>);
    }
    componentDidMount() {
        this.ruler.resize();

        window.addEventListener("resize", () => {
            this.ruler.resize();
        });
    }
}

export interface RulerInterface {
    scroll(scrollPos: number): any;
    resize(): any;
}
export interface RulerProps {
    type?: "horizontal" | "vertical";
    width?: number;
    height?: number;
    unit?: number;
    zoom?: number;
    direction?: "start" | "end";
    // style?: IObject<any>;
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    textFormat?: (scale: number) => string;
}