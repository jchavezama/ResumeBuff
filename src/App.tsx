import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import ScannerTool from "./pages/ScannerTool";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        
        {/* Main Content Area */}
        <main className="flex-grow">
          <Routes>
            {/* Set the root path to render the Home landing page */}
            <Route path="/" element={<Home />} />
            <Route path="/scanner" element={<ScannerTool />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;