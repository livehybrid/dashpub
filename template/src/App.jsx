import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/index';
import LoginPage from './pages/login';
import Custom404 from './pages/404.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/:dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Custom404 />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
