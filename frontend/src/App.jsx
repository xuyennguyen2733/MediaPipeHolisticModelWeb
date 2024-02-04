import { QueryClient, QueryClientProvider } from "react-query";
import { BrowserRouter, Link, Routes, Route } from "react-router-dom";
import ModelTrainer from "./components/ModelTrainer";
import ModelTester from "./components/ModelTester";
import "./App.css";

function App() {
  const queryClient = new QueryClient();

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <nav className="nav">
            <Link to="/">home</Link>
            <Link to="/train">Train a model</Link>
            <Link to="/test">Test your model</Link>
          </nav>
          <Routes>
            <Route path="/" element={<h1>home</h1>} />
            <Route path="/train" element={<ModelTrainer />} />
            <Route path="/test" element={<ModelTester />} />
            <Route path="*" element={<h1>not found</h1>} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </>
  );
}

export default App;
