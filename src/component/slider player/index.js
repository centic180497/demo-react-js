import React from 'react';
import SlideRuler from 'slide-ruler';
import ReactPlayer from 'react-player';

 
class SlideRulerPage extends React.Component {
 
  constructor(props){
    super(props);
    this.state={
        timeValue:'',
        played: 0
    }
    this.handleValue = this.handleValue.bind(this);
    this._renderSlideRuler = this._renderSlideRuler.bind(this);
  }
 
  componentDidMount(){
    this._renderSlideRuler();
  }
 
  handleValue(value){
    console.log(value);
    this.player.seekTo(parseFloat(value))
    
    this.setState({
        played: parseFloat(value)
    }) //SlideRuler return value
  }
 
  _renderSlideRuler(){
    return new SlideRuler (
      {
        el: this.refs.slideRuler,
        maxValue: 237,
        type:'time',
        minValue: 1,
        currentValue: 0.1,
        handleValue: this.handleValue,
        precision: 1
      }
    );
  }

//    onProgress ={ played: 0.12, playedSeconds: 11.3, loaded: 0.34, loadedSeconds: 16.7 }


    ref = (player) => {
        this.player = player
    }
    
  render(){
    return (
        <div>
            <div>
                 <ReactPlayer
                    style={{marginTop:'100px'}}
                    ref={this.ref}
                    className='react-player'
                    url='https://www.youtube.com/watch?v=qEBtvP7P5GE'
                    width='100%'
                    height='100%'
                    playing
                    controls
                    played={this.player}
                 />
                </div>
            <div ref='slideRuler'></div>
            <div>
                <div ref='slideRuler'></div>
            </div>
        </div>
      
    )
  }
}
 
export default SlideRulerPage;