import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/index';
import LoginPage from './pages/login';
import Custom404 from './pages/404.jsx';
import { ConfigProvider } from './contexts/ConfigContext';
import './App.css';

function App() {
  return (
    <ConfigProvider>
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
    </ConfigProvider>
  );
}

export default App;
