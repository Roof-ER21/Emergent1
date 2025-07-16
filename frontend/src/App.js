import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const loginDev = async (role = 'super_admin') => {
    // Development login bypass
    const devUser = {
      id: 'dev-user-123',
      email: 'admin@theroofdocs.com',
      name: 'Admin User',
      role: role,
      picture: null
    };
    
    // Create a mock token for development
    const mockToken = 'dev-token-' + Date.now();
    localStorage.setItem('token', mockToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
    setUser(devUser);
    return devUser;
  };

  const logout = async () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginDev, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Login Component
const Login = () => {
  const { loginDev } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async (role) => {
    setLoading(true);
    try {
      await loginDev(role);
    } catch (error) {
      console.error('Dev login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 border-2 border-red-600">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600 mb-2">Roof-HR Suite</h1>
          <p className="text-gray-600">4-in-1 Enterprise Management System</p>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Select Your Role:</h3>
          
          <button
            onClick={() => handleDevLogin('super_admin')}
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Super Admin
          </button>
          
          <button
            onClick={() => handleDevLogin('hr_manager')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            HR Manager
          </button>
          
          <button
            onClick={() => handleDevLogin('sales_manager')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Sales Manager
          </button>
          
          <button
            onClick={() => handleDevLogin('sales_rep')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Sales Rep
          </button>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025 TheRoofDocs - Enterprise Suite</p>
        </div>
      </div>
    </div>
  );
};

// Central Hub/Launcher
const AppHub = () => {
  const { user, logout } = useAuth();
  const [selectedApp, setSelectedApp] = useState(null);

  const apps = [
    {
      id: 'sales-leaderboard',
      name: 'Sales Leaderboard',
      description: 'Track performance, competitions, and sales metrics',
      icon: '🏆',
      color: 'red',
      roles: ['super_admin', 'sales_manager', 'sales_rep']
    },
    {
      id: 'hr-recruitment',
      name: 'HR Recruitment',
      description: 'Manage applicants, interviews, and onboarding',
      icon: '👥',
      color: 'gray',
      roles: ['super_admin', 'hr_manager']
    },
    {
      id: 'qr-generator',
      name: 'QR Code Generator',
      description: 'Generate QR codes with individual landing pages',
      icon: '📱',
      color: 'red',
      roles: ['super_admin', 'sales_manager', 'sales_rep']
    }
  ];

  const availableApps = apps.filter(app => app.roles.includes(user?.role));

  const getRoleDisplay = (role) => {
    const roleMap = {
      'super_admin': 'Super Admin',
      'hr_manager': 'HR Manager',
      'sales_manager': 'Sales Manager',
      'sales_rep': 'Sales Rep'
    };
    return roleMap[role] || role;
  };

  if (selectedApp) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AppWrapper app={selectedApp} onBack={() => setSelectedApp(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-red-600">Roof-HR Suite</h1>
              <span className="ml-3 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                {getRoleDisplay(user?.role)}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.name}</span>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-red-600 px-3 py-1 rounded-md text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* App Hub */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Application</h2>
          <p className="text-gray-600 text-lg">Select the tool you need to access</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {availableApps.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-red-500 transition-all duration-200 cursor-pointer transform hover:scale-105"
              onClick={() => setSelectedApp(app)}
            >
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">{app.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{app.name}</h3>
                <p className="text-gray-600 mb-6">{app.description}</p>
                <button
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    app.color === 'red' 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  Launch App
                </button>
              </div>
            </div>
          ))}
        </div>

        {availableApps.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Applications Available</h3>
            <p className="text-gray-600">Your role doesn't have access to any applications.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// App Wrapper Component
const AppWrapper = ({ app, onBack }) => {
  const { user } = useAuth();

  const renderApp = () => {
    switch (app.id) {
      case 'sales-leaderboard':
        return <SalesLeaderboardApp />;
      case 'hr-recruitment':
        return <HRRecruitmentApp />;
      case 'qr-generator':
        return <QRGeneratorApp />;
      default:
        return <div>App not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* App Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-500 hover:text-red-600 transition-colors"
              >
                ← Back to Hub
              </button>
              <div className="flex items-center">
                <span className="text-2xl mr-3">{app.icon}</span>
                <h1 className="text-2xl font-bold text-red-600">{app.name}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* App Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderApp()}
      </main>
    </div>
  );
};

// Sales Leaderboard App
const SalesLeaderboardApp = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([
    { id: 1, name: 'John Smith', sales: 125000, deals: 15, rank: 1, growth: 12.5 },
    { id: 2, name: 'Sarah Johnson', sales: 98000, deals: 12, rank: 2, growth: 8.3 },
    { id: 3, name: 'Mike Wilson', sales: 87000, deals: 10, rank: 3, growth: -2.1 },
    { id: 4, name: 'Lisa Davis', sales: 76000, deals: 8, rank: 4, growth: 15.7 },
    { id: 5, name: 'Tom Brown', sales: 65000, deals: 7, rank: 5, growth: 5.2 }
  ]);

  const [competitions, setCompetitions] = useState([
    { id: 1, name: 'Q1 Sales Challenge', period: 'Jan - Mar 2025', status: 'active', prize: '$5,000' },
    { id: 2, name: 'Monthly Deal Closer', period: 'January 2025', status: 'completed', prize: '$1,000' },
    { id: 3, name: 'New Customer Acquisition', period: 'Feb - Apr 2025', status: 'upcoming', prize: '$3,000' }
  ]);

  const userStats = leaderboard.find(rep => rep.name === user?.name) || {
    sales: 45000, deals: 6, rank: 8, growth: 3.2
  };

  return (
    <div className="space-y-8">
      {/* Personal Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-red-600 text-sm font-medium">Total Sales</div>
            <div className="text-2xl font-bold text-red-900">${userStats.sales.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-gray-600 text-sm font-medium">Deals Closed</div>
            <div className="text-2xl font-bold text-gray-900">{userStats.deals}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-red-600 text-sm font-medium">Current Rank</div>
            <div className="text-2xl font-bold text-red-900">#{userStats.rank}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-gray-600 text-sm font-medium">Growth Rate</div>
            <div className={`text-2xl font-bold ${userStats.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {userStats.growth >= 0 ? '+' : ''}{userStats.growth.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Sales Leaderboard</h2>
          <p className="text-gray-600">Current month rankings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deals</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaderboard.map((rep, index) => (
                <tr key={rep.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-yellow-500' : 
                        index === 1 ? 'text-gray-400' : 
                        index === 2 ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${rep.rank}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${rep.sales.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{rep.deals}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${rep.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rep.growth >= 0 ? '+' : ''}{rep.growth.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Competitions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Active Competitions</h2>
          <p className="text-gray-600">Compete for prizes and recognition</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {competitions.map((competition) => (
              <div key={competition.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{competition.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    competition.status === 'active' ? 'bg-green-100 text-green-800' :
                    competition.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{competition.period}</p>
                <div className="text-lg font-bold text-red-600">{competition.prize}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// HR Recruitment App
const HRRecruitmentApp = () => {
  const [applicants, setApplicants] = useState([
    { id: 1, name: 'Alex Johnson', position: 'Sales Representative', status: 'interview', applied: '2025-01-15', email: 'alex.johnson@email.com' },
    { id: 2, name: 'Maria Garcia', position: 'Project Manager', status: 'review', applied: '2025-01-14', email: 'maria.garcia@email.com' },
    { id: 3, name: 'David Wilson', position: 'Field Worker', status: 'hired', applied: '2025-01-13', email: 'david.wilson@email.com' },
    { id: 4, name: 'Jennifer Lee', position: 'Sales Representative', status: 'rejected', applied: '2025-01-12', email: 'jennifer.lee@email.com' },
    { id: 5, name: 'Robert Brown', position: 'HR Assistant', status: 'new', applied: '2025-01-16', email: 'robert.brown@email.com' }
  ]);

  const [interviews, setInterviews] = useState([
    { id: 1, applicant: 'Alex Johnson', position: 'Sales Representative', date: '2025-01-20', time: '10:00 AM', interviewer: 'Sales Manager' },
    { id: 2, applicant: 'Maria Garcia', position: 'Project Manager', date: '2025-01-21', time: '2:00 PM', interviewer: 'HR Manager' },
    { id: 3, applicant: 'Robert Brown', position: 'HR Assistant', date: '2025-01-22', time: '11:00 AM', interviewer: 'HR Manager' }
  ]);

  const getStatusColor = (status) => {
    const colors = {
      'new': 'bg-blue-100 text-blue-800',
      'review': 'bg-yellow-100 text-yellow-800',
      'interview': 'bg-purple-100 text-purple-800',
      'hired': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const updateApplicantStatus = (id, newStatus) => {
    setApplicants(applicants.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    ));
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">Total Applicants</div>
          <div className="text-2xl font-bold text-gray-900">{applicants.length}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-red-600 text-sm font-medium">New Applications</div>
          <div className="text-2xl font-bold text-red-900">{applicants.filter(a => a.status === 'new').length}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">In Review</div>
          <div className="text-2xl font-bold text-gray-900">{applicants.filter(a => a.status === 'review').length}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-red-600 text-sm font-medium">Interviews</div>
          <div className="text-2xl font-bold text-red-900">{applicants.filter(a => a.status === 'interview').length}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">Hired</div>
          <div className="text-2xl font-bold text-gray-900">{applicants.filter(a => a.status === 'hired').length}</div>
        </div>
      </div>

      {/* Applicants */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Applicant Management</h2>
          <p className="text-gray-600">Track and manage job applications</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applicants.map((applicant) => (
                <tr key={applicant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-600 font-medium">{applicant.name.charAt(0)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{applicant.name}</div>
                        <div className="text-sm text-gray-500">{applicant.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{applicant.position}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{applicant.applied}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(applicant.status)}`}>
                      {applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <select
                      value={applicant.status}
                      onChange={(e) => updateApplicantStatus(applicant.id, e.target.value)}
                      className="text-sm border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="new">New</option>
                      <option value="review">Review</option>
                      <option value="interview">Interview</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interviews */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Scheduled Interviews</h2>
          <p className="text-gray-600">Upcoming interview appointments</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {interviews.map((interview) => (
              <div key={interview.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{interview.applicant}</h3>
                <p className="text-sm text-gray-600 mb-1">{interview.position}</p>
                <p className="text-sm text-gray-600 mb-1">{interview.date} at {interview.time}</p>
                <p className="text-sm text-gray-600">Interviewer: {interview.interviewer}</p>
                <button className="mt-3 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors">
                  Join Interview
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// QR Generator App
const QRGeneratorApp = () => {
  const { user } = useAuth();
  const [qrCodes, setQrCodes] = useState([
    { id: 1, name: 'Main Sales Page', url: 'https://theroofdocs.com/sales/john-smith', views: 145, leads: 12, created: '2025-01-10' },
    { id: 2, name: 'Emergency Services', url: 'https://theroofdocs.com/emergency/john-smith', views: 89, leads: 8, created: '2025-01-12' },
    { id: 3, name: 'Free Estimate', url: 'https://theroofdocs.com/estimate/john-smith', views: 203, leads: 18, created: '2025-01-08' }
  ]);

  const [newQR, setNewQR] = useState({
    name: '',
    pageType: 'sales',
    customMessage: '',
    contactInfo: true,
    leadCapture: true
  });

  const [showGenerator, setShowGenerator] = useState(false);

  const generateQR = () => {
    const newQRCode = {
      id: Date.now(),
      name: newQR.name,
      url: `https://theroofdocs.com/${newQR.pageType}/${user?.name?.toLowerCase().replace(' ', '-')}`,
      views: 0,
      leads: 0,
      created: new Date().toISOString().split('T')[0]
    };
    
    setQrCodes([...qrCodes, newQRCode]);
    setNewQR({ name: '', pageType: 'sales', customMessage: '', contactInfo: true, leadCapture: true });
    setShowGenerator(false);
  };

  const QRCodeSVG = ({ size = 100 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className="border border-gray-300">
      <rect width="100" height="100" fill="white"/>
      <g fill="black">
        <rect x="10" y="10" width="30" height="30"/>
        <rect x="60" y="10" width="30" height="30"/>
        <rect x="10" y="60" width="30" height="30"/>
        <rect x="50" y="50" width="10" height="10"/>
        <rect x="70" y="50" width="10" height="10"/>
        <rect x="50" y="70" width="10" height="10"/>
        <rect x="70" y="70" width="10" height="10"/>
      </g>
    </svg>
  );

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">Total QR Codes</div>
          <div className="text-2xl font-bold text-gray-900">{qrCodes.length}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-red-600 text-sm font-medium">Total Views</div>
          <div className="text-2xl font-bold text-red-900">{qrCodes.reduce((sum, qr) => sum + qr.views, 0)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-gray-600 text-sm font-medium">Total Leads</div>
          <div className="text-2xl font-bold text-gray-900">{qrCodes.reduce((sum, qr) => sum + qr.leads, 0)}</div>
        </div>
      </div>

      {/* Generate New QR */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">QR Code Generator</h2>
              <p className="text-gray-600">Create custom QR codes with landing pages</p>
            </div>
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              {showGenerator ? 'Cancel' : 'Generate New QR'}
            </button>
          </div>
        </div>

        {showGenerator && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">QR Code Name</label>
                  <input
                    type="text"
                    value={newQR.name}
                    onChange={(e) => setNewQR({...newQR, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g., Main Sales Page"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page Type</label>
                  <select
                    value={newQR.pageType}
                    onChange={(e) => setNewQR({...newQR, pageType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="sales">Sales Page</option>
                    <option value="emergency">Emergency Services</option>
                    <option value="estimate">Free Estimate</option>
                    <option value="contact">Contact Form</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message</label>
                  <textarea
                    value={newQR.customMessage}
                    onChange={(e) => setNewQR({...newQR, customMessage: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="Optional custom message for your landing page"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newQR.contactInfo}
                      onChange={(e) => setNewQR({...newQR, contactInfo: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Include contact information</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newQR.leadCapture}
                      onChange={(e) => setNewQR({...newQR, leadCapture: e.target.checked})}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Enable lead capture form</span>
                  </label>
                </div>

                <button
                  onClick={generateQR}
                  disabled={!newQR.name}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Generate QR Code
                </button>
              </div>

              <div className="flex items-center justify-center">
                <div className="text-center">
                  <QRCodeSVG size={200} />
                  <p className="mt-4 text-sm text-gray-600">QR Code Preview</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing QR Codes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your QR Codes</h2>
          <p className="text-gray-600">Manage and track your QR code performance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {qrCodes.map((qr) => (
                <tr key={qr.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <QRCodeSVG size={50} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{qr.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{qr.url}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{qr.views}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{qr.leads}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{qr.created}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button className="text-red-600 hover:text-red-800 text-sm">Download</button>
                      <button className="text-gray-600 hover:text-gray-800 text-sm">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AppHub />;
}

export default App;