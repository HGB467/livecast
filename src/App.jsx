import { Routes, Route } from "@solidjs/router"
import Home from "./components/Home";
import Publish from "./components/Publish";
import Stream from "./components/Stream";

function App() {
  return (
    <>
    <Routes>
    <Route path="/publish" component={Publish} />
    <Route path="/" component={Home} />
    <Route path="/stream" component={Stream} />
  </Routes>
</>
  );
}

export default App;
