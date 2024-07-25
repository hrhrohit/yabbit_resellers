// src/App.jsx
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useState } from 'react';
import LoginPage from "./Components/Login";
import DomainList from "./Components/DomainList";

function App() {
  const [accessToken, setAccessToken] = useState(null);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage setAccessToken={setAccessToken} />} />
        <Route 
          path="/domains" 
          element={
            accessToken ? <DomainList accessToken={accessToken} /> : <Navigate to="/login" />
          } 
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
