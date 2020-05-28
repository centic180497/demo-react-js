import React from 'react';
// import SignIn from './component/login';
import Mapleft from './component/map/map';
import BurgerMenu from './component/socket/index'

  // import Mapapi from './component/gg map/map'
// import Setting from './component/setting camera/Setting'
// import SlideRulerPage from '../src/component/slider player/index'
// import SlideRuler from './component/custom/index'
import Text from './component/ruler/ruler.tsx'

function App() {
  return (
    <div className="App">
      {/* <Mapleft>
      </Mapleft>
      <BurgerMenu></BurgerMenu>
        <SignIn/>
        <Setting></Setting> */}
      {/* <Navbar>
        <NavItem icon={<PlusIcon />} />
        <NavItem icon={<BellIcon />} />
        <NavItem icon={<MessengerIcon />} />

        <NavItem icon={<CaretIcon />}>
          <DropdownMenu></DropdownMenu>
        </NavItem>
    </Navbar> */}
    <Text/>
      
    </div>
    
  );
}

 
export default App;
