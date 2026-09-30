import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("React Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Đã xảy ra lỗi giao diện!</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        return JSON.parse(userData);
      } catch(e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
      }
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const getPlanBadge = (plan) => {
    switch (plan) {
      case 'ultra':
        return <span className="badge badge-ultra">Ultra 💎</span>;
      case 'plus':
        return <span className="badge badge-pro">Plus ⭐</span>;
      default:
        return <span className="badge badge-normal">Normal</span>;
    }
  };

  return (
    <Router>
      <Suspense fallback={<div role="status" style={{ padding: 24 }}>Đang tải...</div>}>
      <Routes>
        <Route 
          path="/" 
          element={
            user ? (
              user.role === 'employee' 
                ? <ErrorBoundary><EmployeeDashboard user={user} handleLogout={handleLogout} /></ErrorBoundary>
                : <ErrorBoundary><Dashboard user={user} handleLogout={handleLogout} getPlanBadge={getPlanBadge} /></ErrorBoundary>
            ) : <Navigate to="/login" />
          } 
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/business/:id" element={user ? <ErrorBoundary><BusinessDashboard user={user} handleLogout={handleLogout} getPlanBadge={getPlanBadge} /></ErrorBoundary> : <Navigate to="/login" />} />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
