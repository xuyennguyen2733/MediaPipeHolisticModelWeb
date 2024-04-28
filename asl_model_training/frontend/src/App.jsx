import { QueryClient, QueryClientProvider } from "react-query";
import { BrowserRouter, Link, Routes, Route } from "react-router-dom";
import ModelTrainer from "./components/ModelTrainer";
import ModelTrainerLite from "./components/ModelTrainerLite";
import ModelTesterLite from "./components/ModelTesterLite";
import ModelTester from "./components/ModelTester";
//import Demo from "./components/Demo";
import DemoComplete from "./components/DemoComplete";
import DummyPage from "./components/DummyPage";
import "./App.css";
import HalfVideo from "./components/HalfVideo";

function App() {
  const queryClient = new QueryClient();

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <nav className="nav">
            <Link to="/">home</Link>
            {/*<Link to="/demo">Demo</Link>*/}
            <Link to="/demo-complete">Demo Complete</Link>
            {/*<Link to="/train">Train a model</Link>*/}
            <Link to="/train-lite">Train a model (lite)</Link>
            <Link to="/test-lite">Test a model (lite)</Link>
            <Link to="/half">Half video</Link>
            {/*<Link to="/test">Test your model</Link>*/}
          </nav>
          <Routes>
            <Route path="/" element={<h1>home</h1>} />
            {/*<Route path="/demo" element={<Demo />} />*/}
            <Route path="/demo-complete" element={<DemoComplete />} />
            <Route path="/dummy" element={<DummyPage />} />
            {/*<Route path="/train" element={<ModelTrainer />} />*/}
            <Route path="/train-lite" element={<ModelTrainerLite />} />
            <Route path="/test-lite" element={<ModelTesterLite />} />
            <Route path="/half" element={<HalfVideo />} />
            {/*<Route path="/test" element={<ModelTester />} />*/}
            <Route path="*" element={<h1>not found</h1>} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </>
  );
}

export default App;
