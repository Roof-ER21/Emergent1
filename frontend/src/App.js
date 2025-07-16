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
    const devUsers = {
      'super_admin': {
        id: 'admin-123',
        email: 'admin@theroofdocs.com',
        name: 'Admin User',
        role: 'super_admin',
        picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        phone: '(555) 123-4567',
        territory: 'All Regions'
      },
      'sales_manager': {
        id: 'manager-456',
        email: 'manager@theroofdocs.com',
        name: 'Sales Manager',
        role: 'sales_manager',
        picture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        phone: '(555) 234-5678',
        territory: 'Mid-Atlantic'
      },
      'sales_rep': {
        id: 'rep-789',
        email: 'john.smith@theroofdocs.com',
        name: 'John Smith',
        role: 'sales_rep',
        picture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        phone: '(555) 345-6789',
        territory: 'Northern Virginia'
      },
      'hr_manager': {
        id: 'hr-101',
        email: 'hr@theroofdocs.com',
        name: 'HR Manager',
        role: 'hr_manager',
        picture: 'https://images.unsplash.com/photo-1494790108755-2616b9cf1d1e?w=150&h=150&fit=crop&crop=face',
        phone: '(555) 456-7890',
        territory: 'Corporate'
      }
    };
    
    const devUser = devUsers[role] || devUsers['super_admin'];
    
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
          
          <button
            onClick={() => handleDevLogin('hr_manager')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            HR Manager
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
      color: 'red'
    },
    {
      id: 'hr-recruitment',
      name: 'HR Recruitment',
      description: 'Manage applicants, interviews, and onboarding',
      icon: '👥',
      color: 'gray'
    },
    {
      id: 'qr-generator',
      name: 'QR Code Generator',
      description: 'Generate QR codes with individual landing pages',
      icon: '📱',
      color: 'red'
    }
  ];

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
          <p className="text-gray-600 text-lg">All applications available with role-based permissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {apps.map((app) => (
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
    <div className="min-h-screen bg-gray-900">
      {/* App Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                ← Back to Hub
              </button>
              <div className="flex items-center">
                <span className="text-2xl mr-3">{app.icon}</span>
                <h1 className="text-2xl font-bold text-red-400">{app.name}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.name}</span>
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

// Sales Leaderboard App (placeholder)
const SalesLeaderboardApp = () => {
  const { user } = useAuth();
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Sales Leaderboard</h2>
      <p className="text-gray-600">Performance tracking and competitions coming soon...</p>
    </div>
  );
};

// HR Recruitment App (placeholder)
const HRRecruitmentApp = () => {
  const { user } = useAuth();
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">HR Recruitment</h2>
      <p className="text-gray-600">Applicant tracking and interview management coming soon...</p>
    </div>
  );
};

// QR Generator App - Main Focus
const QRGeneratorApp = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [salesReps, setSalesReps] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterTerritory, setFilterTerritory] = useState('all');
  const [selectedRep, setSelectedRep] = useState(null);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadData, setLeadData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    message: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('');

  const isAdmin = user?.role === 'super_admin' || user?.role === 'sales_manager';
  const currentRep = salesReps.find(rep => rep.id === user?.id);

  // Fetch sales reps from API
  const fetchSalesReps = async () => {
    try {
      const response = await axios.get(`${API}/qr-generator/reps`);
      setSalesReps(response.data);
    } catch (error) {
      console.error('Error fetching sales reps:', error);
      setError('Failed to load sales reps');
    }
  };

  // Fetch leads from API
  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API}/qr-generator/leads`);
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setError('Failed to load leads');
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchSalesReps(), fetchLeads()]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Create new sales rep
  const createSalesRep = async (repData) => {
    try {
      const response = await axios.post(`${API}/qr-generator/reps`, repData);
      setSalesReps([...salesReps, response.data]);
      return response.data;
    } catch (error) {
      console.error('Error creating sales rep:', error);
      throw error;
    }
  };

  // Update sales rep
  const updateSalesRep = async (repId, updateData) => {
    try {
      const response = await axios.put(`${API}/qr-generator/reps/${repId}`, updateData);
      setSalesReps(salesReps.map(rep => rep.id === repId ? response.data : rep));
      return response.data;
    } catch (error) {
      console.error('Error updating sales rep:', error);
      throw error;
    }
  };

  // Upload file for sales rep
  const uploadFile = async (repId, fileData, type) => {
    try {
      const endpoint = type === 'picture' ? 'upload-picture' : 'upload-video';
      await axios.post(`${API}/qr-generator/reps/${repId}/${endpoint}`, fileData);
      // Refresh the sales rep data
      await fetchSalesReps();
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      throw error;
    }
  };

  // Update lead status
  const updateLead = async (leadId, updateData) => {
    try {
      const response = await axios.put(`${API}/qr-generator/leads/${leadId}`, updateData);
      setLeads(leads.map(lead => lead.id === leadId ? response.data : lead));
      return response.data;
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading QR Code Generator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Error</div>
        <div className="text-red-600 mt-1">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredReps = salesReps.filter(rep => {
    const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rep.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rep.territory.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || rep.department === filterDepartment;
    const matchesTerritory = filterTerritory === 'all' || rep.territory === filterTerritory;
    return matchesSearch && matchesDepartment && matchesTerritory;
  });

  const QRCodeSVG = ({ size = 100, value = 'QR123456' }) => {
    const canvasRef = React.useRef(null);
    
    React.useEffect(() => {
      if (canvasRef.current) {
        try {
          // Simple QR code pattern - for production use a proper QR library
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          // Clear canvas
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, size, size);
          
          // Draw QR code pattern
          ctx.fillStyle = 'black';
          const cellSize = size / 10;
          
          // Corner squares
          ctx.fillRect(0, 0, cellSize * 3, cellSize * 3);
          ctx.fillRect(cellSize * 7, 0, cellSize * 3, cellSize * 3);
          ctx.fillRect(0, cellSize * 7, cellSize * 3, cellSize * 3);
          
          // Center pattern
          ctx.fillRect(cellSize * 4, cellSize * 4, cellSize * 2, cellSize * 2);
          
          // Random pattern for uniqueness
          const seed = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const random = (seed * 9301 + 49297) % 233280;
          
          for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
              if ((i + j + random) % 3 === 0) {
                ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
              }
            }
          }
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    }, [size, value]);

    return (
      <div className="bg-white p-2 rounded border border-gray-300" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={size - 16}
          height={size - 16}
          style={{ width: size - 16, height: size - 16 }}
        />
      </div>
    );
  };

  const RepLandingPage = ({ rep, onClose }) => {
    const [submittingLead, setSubmittingLead] = useState(false);
    const [leadSuccess, setLeadSuccess] = useState(false);
    const [leadData, setLeadData] = useState({
      name: '',
      email: '',
      phone: '',
      address: '',
      message: ''
    });

    const handleLeadSubmit = async (e) => {
      e.preventDefault();
      setSubmittingLead(true);
      
      try {
        const response = await axios.post(`${API}/qr-generator/leads`, {
          ...leadData,
          rep_id: rep.id
        });
        setLeadSuccess(true);
        setLeadData({ name: '', email: '', phone: '', address: '', message: '' });
        setTimeout(() => setLeadSuccess(false), 3000);
      } catch (error) {
        console.error('Error submitting lead:', error);
        alert('Error submitting lead. Please try again.');
      } finally {
        setSubmittingLead(false);
      }
    };

    const handleInputChange = (e) => {
      setLeadData({
        ...leadData,
        [e.target.name]: e.target.value
      });
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Landing Page Preview</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Mobile-optimized landing page */}
          <div className="p-6 bg-gray-50">
            <div className="max-w-sm mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Header with picture and video */}
              <div className="bg-red-600 text-white p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={rep.picture?.startsWith('data:') ? rep.picture : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face`}
                      alt={rep.name}
                      className="w-16 h-16 rounded-full border-2 border-white object-cover"
                    />
                    <div>
                      <h1 className="text-xl font-bold">{rep.name}</h1>
                      <p className="text-red-100">{rep.territory}</p>
                    </div>
                  </div>
                  <div className="w-24 h-16 bg-black rounded">
                    {rep.welcome_video?.startsWith('data:') ? (
                      <video
                        width="96"
                        height="64"
                        src={rep.welcome_video}
                        controls
                        className="rounded"
                      />
                    ) : (
                      <iframe
                        width="96"
                        height="64"
                        src={rep.welcome_video || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
                        title="Welcome Video"
                        className="rounded"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* About Me Section */}
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">About Me</h2>
                <p className="text-gray-600 mb-4">{rep.about_me || 'Professional roofing expert dedicated to quality service.'}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-700">
                    <span className="text-red-600 mr-2">📞</span>
                    {rep.phone || 'Contact for phone'}
                  </div>
                  <div className="flex items-center text-gray-700">
                    <span className="text-red-600 mr-2">✉️</span>
                    {rep.email}
                  </div>
                  <div className="flex items-center text-gray-700">
                    <span className="text-red-600 mr-2">📍</span>
                    {rep.territory}
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="p-4 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Get Your Free Roof Estimate</h3>
                {leadSuccess ? (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                    Thank you! Your request has been submitted successfully.
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-3">
                    <input
                      type="text"
                      name="name"
                      placeholder="Your Name"
                      value={leadData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Your Email"
                      value={leadData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Your Phone"
                      value={leadData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      type="text"
                      name="address"
                      placeholder="Your Address"
                      value={leadData.address}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <textarea
                      name="message"
                      placeholder="Tell us about your roofing needs..."
                      rows="3"
                      value={leadData.message}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="submit"
                      disabled={submittingLead}
                      className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
                    >
                      {submittingLead ? 'Submitting...' : 'Get My Free Estimate'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const OverviewTab = () => {
    const totalConversions = leads.filter(lead => lead.status === 'converted').length;
    const totalLeads = leads.length;
    const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0;
    
    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-500/20 text-red-400 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{salesReps.length}</p>
                <p className="text-sm text-gray-400">Total Reps</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalLeads}</p>
                <p className="text-sm text-gray-400">Total Leads</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-500/20 text-green-400 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{salesReps.filter(r => r.qr_code).length}</p>
                <p className="text-sm text-gray-400">QR Codes</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400 mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{conversionRate}%</p>
                <p className="text-sm text-gray-400">Conversion Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">Sales Representatives</h2>
            <p className="text-gray-400">Manage QR codes and landing pages</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search reps by name, email, or territory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white"
            >
              <option value="all">All Departments</option>
              <option value="Sales">Sales</option>
              <option value="Management">Management</option>
            </select>
            <select
              value={filterTerritory}
              onChange={(e) => setFilterTerritory(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-white"
            >
              <option value="all">All Territories</option>
              <option value="Northern Virginia">Northern Virginia</option>
              <option value="Southern Virginia">Southern Virginia</option>
              <option value="Maryland">Maryland</option>
            </select>
          </div>

          {/* Reps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReps.map((rep) => {
              const repLeads = leads.filter(lead => lead.rep_id === rep.id);
              const repConversions = repLeads.filter(lead => lead.status === 'converted');
              const repConversionRate = repLeads.length > 0 ? ((repConversions.length / repLeads.length) * 100).toFixed(1) : 0;
              
              return (
                <div key={rep.id} className="bg-gray-750 border border-gray-600 rounded-lg p-6 hover:border-red-500 transition-all duration-200 transform hover:scale-105">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center border-2 border-red-400">
                      <img 
                        src={rep.picture?.startsWith('data:') ? rep.picture : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face`}
                        alt={rep.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{rep.name}</h3>
                      <p className="text-sm text-gray-400">{rep.territory}</p>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                          {rep.department}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <QRCodeSVG size={50} value={rep.qr_code || 'QR123456'} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{repLeads.length}</div>
                      <div className="text-xs text-gray-400">Leads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{repConversions.length}</div>
                      <div className="text-xs text-gray-400">Conversions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{repConversionRate}%</div>
                      <div className="text-xs text-gray-400">Rate</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedRep(rep)}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      View Page
                    </button>
                    {isAdmin && (
                      <button className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium">
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const LeadsTab = () => {
    const handleLeadStatusChange = async (leadId, newStatus) => {
      try {
        await updateLead(leadId, { status: newStatus });
      } catch (error) {
        console.error('Error updating lead status:', error);
      }
    };

    const handleLeadAssign = async (leadId, assignedTo) => {
      try {
        await updateLead(leadId, { assigned_to: assignedTo, status: 'assigned' });
      } catch (error) {
        console.error('Error assigning lead:', error);
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Lead Management</h2>
            <p className="text-gray-600">Track and distribute leads from QR code landing pages</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rep</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.email}</div>
                        <div className="text-sm text-gray-500">{lead.phone}</div>
                        {lead.message && (
                          <div className="text-sm text-gray-500 mt-1 italic">"{lead.message}"</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.rep_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.status}
                        onChange={(e) => handleLeadStatusChange(lead.id, e.target.value)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                          lead.status === 'contacted' ? 'bg-green-100 text-green-800' :
                          lead.status === 'converted' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="new">New</option>
                        <option value="assigned">Assigned</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        lead.priority === 'high' ? 'bg-red-100 text-red-800' :
                        lead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {isAdmin && (
                          <button 
                            onClick={() => handleLeadAssign(lead.id, lead.rep_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Assign
                          </button>
                        )}
                        <button className="text-gray-600 hover:text-gray-900">View</button>
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

  const MyPageTab = () => {
    const [uploading, setUploading] = useState(false);
    const [uploadType, setUploadType] = useState('');

    const handleFileUpload = async (e, type) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploading(true);
      setUploadType(type);

      try {
        // Convert file to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result;
          
          const fileData = {
            file_data: base64String,
            file_type: file.type,
            file_name: file.name
          };

          await uploadFile(currentRep.id, fileData, type);
          
          setUploading(false);
          setUploadType('');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploading(false);
        setUploadType('');
        alert('Error uploading file. Please try again.');
      }
    };

    const handleUpdateProfile = async (updateData) => {
      try {
        await updateSalesRep(currentRep.id, updateData);
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
      }
    };

    if (!currentRep) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800 font-medium">Sales Rep Profile Not Found</div>
          <div className="text-yellow-600 mt-1">Please contact your administrator to set up your profile.</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Profile Management */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Manage Your Profile</h2>
            <div className="flex space-x-2">
              <label className="cursor-pointer bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-sm">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'picture')}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading && uploadType === 'picture' ? 'Uploading...' : 'Upload Photo'}
              </label>
              <label className="cursor-pointer bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors text-sm">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, 'video')}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading && uploadType === 'video' ? 'Uploading...' : 'Upload Video'}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">About Me</label>
                <textarea
                  value={currentRep.about_me || ''}
                  onChange={(e) => handleUpdateProfile({ about_me: e.target.value })}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Tell customers about yourself..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={currentRep.phone || ''}
                  onChange={(e) => handleUpdateProfile({ phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your phone number"
                />
              </div>
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium text-gray-900 mb-2">QR Code</h3>
                <div className="flex items-center space-x-4">
                  <QRCodeSVG size={80} value={currentRep.qr_code || 'QR123456'} />
                  <div>
                    <p className="text-sm text-gray-600">Your QR Code</p>
                    <p className="text-xs text-gray-500 font-mono">{currentRep.qr_code}</p>
                    <p className="text-xs text-gray-500 mt-1">Share this code with customers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Landing Page Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Landing Page Preview</h3>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-red-600 text-white p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <img 
                        src={currentRep.picture?.startsWith('data:') ? currentRep.picture : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face`}
                        alt={currentRep.name}
                        className="w-12 h-12 rounded-full border-2 border-white object-cover"
                      />
                      <div>
                        <h1 className="text-lg font-bold">{currentRep.name}</h1>
                        <p className="text-red-100 text-sm">{currentRep.territory}</p>
                      </div>
                    </div>
                    <div className="w-16 h-12 bg-black rounded text-xs flex items-center justify-center">
                      {currentRep.welcome_video ? 'Video' : 'Upload Video'}
                    </div>
                  </div>
                </div>

                {/* About Me */}
                <div className="p-3">
                  <h2 className="text-md font-semibold text-gray-900 mb-2">About Me</h2>
                  <p className="text-sm text-gray-600 mb-3">{currentRep.about_me || 'Add your bio to tell customers about yourself...'}</p>
                  
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-red-600 mr-2">📞</span>
                      {currentRep.phone || 'Add phone number'}
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <span className="text-red-600 mr-2">✉️</span>
                      {currentRep.email}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="p-3 bg-gray-50 border-t">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Get Your Free Roof Estimate</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Your Name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled
                    />
                    <button className="w-full bg-red-600 text-white py-2 px-3 rounded text-sm font-semibold">
                      Get My Free Estimate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {isAdmin ? 'Rep Overview' : 'Overview'}
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('leads')}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'leads'
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                Lead Management
              </button>
            )}
            {user?.role === 'sales_rep' && (
              <button
                onClick={() => setActiveTab('mypage')}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'mypage'
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Landing Page
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'leads' && <LeadsTab />}
      {activeTab === 'mypage' && <MyPageTab />}

      {/* Rep Landing Page Preview Modal */}
      {selectedRep && (
        <RepLandingPage 
          rep={selectedRep} 
          onClose={() => setSelectedRep(null)} 
        />
      )}
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
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