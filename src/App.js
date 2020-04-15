import React from 'react';
// import SignIn from './component/login'
  // import Mapapi from './component/gg map/map'
import Setting from './component/setting camera/Setting'
import Filter from './component/autocomplete/index'

function App() {
  return (
    <div className="App">
        {/* <SignIn />
        <Mapapi/> */}
        <Setting/>
        <Filter></Filter>
    </div>
    
  );
}

export default App;
