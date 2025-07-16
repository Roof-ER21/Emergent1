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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96 border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-400 mb-2">Roof-HR Suite</h1>
          <p className="text-gray-400">4-in-1 Enterprise Management System</p>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white mb-3">Select Your Role:</h3>
          
          <button
            onClick={() => handleDevLogin('super_admin')}
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
          >
            Super Admin
          </button>
          
          <button
            onClick={() => handleDevLogin('sales_manager')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
          >
            Sales Manager
          </button>
          
          <button
            onClick={() => handleDevLogin('sales_rep')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
          >
            Sales Rep
          </button>
          
          <button
            onClick={() => handleDevLogin('hr_manager')}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
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
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-red-400">Roof-HR Suite</h1>
              <span className="ml-3 px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded-full border border-red-500/30">
                {getRoleDisplay(user?.role)}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.name}</span>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-red-400 px-3 py-1 rounded-md text-sm transition-colors"
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
          <h2 className="text-3xl font-bold text-white mb-4">Choose Your Application</h2>
          <p className="text-gray-400 text-lg">All applications available with role-based permissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 hover:border-red-500 transition-all duration-200 cursor-pointer transform hover:scale-105"
              onClick={() => setSelectedApp(app)}
            >
              <div className="p-8 text-center">
                <div className="text-6xl mb-6">{app.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{app.name}</h3>
                <p className="text-gray-400 mb-6">{app.description}</p>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading QR Code Generator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-red-400 font-medium">Error</div>
        </div>
        <div className="text-red-300 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

    const handleCTAClick = () => {
      window.open('https://theroofdocs.com', '_blank');
    };

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Landing Page Preview</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl transition-colors"
            >
              ×
            </button>
          </div>
          
          {/* Mobile-optimized landing page */}
          <div className="p-6 bg-gray-900">
            <div className="max-w-sm mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
              
              {/* Header Section */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full border-3 border-white/30 overflow-hidden bg-white/20">
                      <img 
                        src={rep.picture?.startsWith('data:') ? rep.picture : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face`}
                        alt={rep.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">{rep.name}</h1>
                      <p className="text-red-100 text-sm">{rep.territory}</p>
                    </div>
                  </div>
                  <div className="w-20 h-14 bg-black/30 rounded-lg flex items-center justify-center">
                    <div className="text-white/70 text-xs text-center">
                      <div className="w-6 h-6 mx-auto mb-1">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      Video
                    </div>
                  </div>
                </div>
                
                {/* Hero CTA */}
                <div className="text-center">
                  <h2 className="text-lg font-bold mb-2">Get Your FREE Home Inspection Today!</h2>
                  <p className="text-red-100 text-sm mb-4">Professional assessment of your roof, siding, gutters, windows, and doors</p>
                  <button
                    onClick={handleCTAClick}
                    className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors w-full"
                  >
                    Schedule Free Inspection
                  </button>
                </div>
              </div>

              {/* Services Section */}
              <div className="p-6 bg-white">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Our Services</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: 'Roofing', desc: 'Complete roof replacement and repairs', icon: '🏠' },
                    { title: 'Siding', desc: 'Vinyl, wood, and fiber cement siding', icon: '🧱' },
                    { title: 'Gutters', desc: 'Seamless gutter installation and repair', icon: '💧' },
                    { title: 'Windows & Doors', desc: 'Energy-efficient windows and door installation', icon: '🪟' },
                    { title: 'Solar', desc: 'Solar panel installation and energy solutions', icon: '☀️' }
                  ].map((service, index) => (
                    <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl mr-2">{service.icon}</div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{service.title}</h4>
                        <p className="text-xs text-gray-600">{service.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smart Homeowner Benefits */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Homeowner Benefits</h3>
                <p className="text-gray-600 text-sm mb-4">Save thousands, earn rewards, and get complete peace of mind</p>
                
                <div className="bg-white p-4 rounded-lg mb-4">
                  <h4 className="font-bold text-gray-900 mb-2">Massive Savings</h4>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">$15,000</div>
                    <div className="text-sm text-gray-600 mb-2">Average Single-Family Home Roof</div>
                    <div className="text-green-600 font-semibold">Potential Savings: $13,500</div>
                  </div>
                </div>
                
                <button
                  onClick={handleCTAClick}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Calculate Your Savings
                </button>
              </div>

              {/* Local & Trusted */}
              <div className="p-6 bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Local & Trusted</h3>
                <p className="text-gray-600 text-sm mb-4">Your Neighborhood Experts</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">9</div>
                    <div className="text-xs text-gray-600">Years in Business</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">5,000+</div>
                    <div className="text-xs text-gray-600">Projects Completed</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">GAF Master Elite</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Licensed & Insured</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">BBB A+ Rating</span>
                    <span className="text-green-600">✓</span>
                  </div>
                </div>
                
                <button
                  onClick={handleCTAClick}
                  className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-900 transition-colors mt-4"
                >
                  See Local Projects
                </button>
              </div>

              {/* Referral Rewards */}
              <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Referral Rewards Program</h3>
                <p className="text-gray-600 text-sm mb-4">Earn cash and rewards for every friend you refer</p>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div>
                      <span className="font-bold text-lg">1</span>
                      <span className="text-gray-600 ml-2">Referral</span>
                    </div>
                    <div className="text-green-600 font-bold">$100 Cash</div>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div>
                      <span className="font-bold text-lg">5</span>
                      <span className="text-gray-600 ml-2">Referrals</span>
                    </div>
                    <div className="text-green-600 font-bold">$500 Cash</div>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Exclusive Rewards Include:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Commanders tickets entry</li>
                    <li>• Disney World trip for two</li>
                    <li>• Exclusive rewards program access</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleCTAClick}
                  className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
                >
                  Start Referring Today
                </button>
              </div>

              {/* Complete Project Solution */}
              <div className="p-6 bg-white">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Project Solution</h3>
                <p className="text-gray-600 text-sm mb-4">From tear-off to solar - we handle everything</p>
                
                <div className="space-y-3 mb-4">
                  {[
                    { step: '1', title: 'Free Inspection', desc: 'Comprehensive roof and property assessment' },
                    { step: '2', title: 'Insurance Coordination', desc: 'We handle all insurance paperwork and claims' },
                    { step: '3', title: 'Professional Tear-Off', desc: 'Safe removal of old materials with cleanup' },
                    { step: '4', title: 'Premium Installation', desc: 'Top-quality materials with expert craftsmanship' },
                    { step: '5', title: 'Solar Integration', desc: 'Optional solar panel installation for energy savings' },
                    { step: '6', title: 'Final Walkthrough', desc: 'Quality check and lifetime warranty activation' }
                  ].map((step, index) => (
                    <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">
                        {step.step}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{step.title}</h4>
                        <p className="text-xs text-gray-600">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCTAClick}
                    className="bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm"
                  >
                    See Our Process
                  </button>
                  <button
                    onClick={handleCTAClick}
                    className="bg-gray-800 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-900 transition-colors text-sm"
                  >
                    Free Inspection
                  </button>
                </div>
              </div>

              {/* Customer Testimonials */}
              <div className="p-6 bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900 mb-4">What Our Customers Say</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Mike Thompson', text: 'The Roof Docs did an amazing job on our roof replacement. Professional team and quality work!' },
                    { name: 'Jennifer Martinez', text: 'Excellent service from start to finish. Our new siding looks fantastic!' },
                    { name: 'Robert Chen', text: 'Outstanding window installation. Energy efficient and beautiful. Highly recommend The Roof Docs!' }
                  ].map((review, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg">
                      <p className="text-gray-600 text-sm italic mb-2">"{review.text}"</p>
                      <div className="font-semibold text-gray-900 text-sm">- {review.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact {rep.name}</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{rep.phone || 'Contact for phone'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{rep.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">About {rep.name}</p>
                  <p className="text-sm text-blue-700 mt-1">{rep.about_me || 'Professional roofing expert dedicated to quality service and customer satisfaction.'}</p>
                </div>
              </div>

              {/* Final CTA Section */}
              <div className="p-6 bg-gradient-to-r from-red-600 to-red-700 text-white">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">Get Your FREE Home Inspection</h3>
                  <p className="text-red-100 text-sm">Professional assessment • No obligation • Quick response</p>
                </div>
                
                {leadSuccess ? (
                  <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-6 rounded-lg text-center">
                    <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">Thank you for your request!</p>
                    <p className="text-sm">We'll contact you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name *"
                        value={leadData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200"
                      />
                      <input
                        type="email"
                        name="email"
                        placeholder="Your Email *"
                        value={leadData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200"
                      />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Your Phone"
                        value={leadData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200"
                      />
                      <input
                        type="text"
                        name="address"
                        placeholder="Property Address"
                        value={leadData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200"
                      />
                      <textarea
                        name="message"
                        placeholder="Tell us about your roofing needs..."
                        rows="3"
                        value={leadData.message}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-red-700/30 border border-red-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent text-white placeholder-red-200 resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingLead}
                      className="w-full bg-white text-red-600 py-4 px-6 rounded-lg hover:bg-red-50 transition-all duration-200 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {submittingLead ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        'Schedule Your FREE Inspection'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCTAClick}
                      className="w-full bg-red-800 text-white py-3 px-6 rounded-lg hover:bg-red-900 transition-all duration-200 font-semibold"
                    >
                      Visit Our Website
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
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Lead Management</h2>
            <p className="text-gray-400">Track and distribute leads from QR code landing pages</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rep</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{lead.name}</div>
                        <div className="text-sm text-gray-400">{lead.email}</div>
                        <div className="text-sm text-gray-400">{lead.phone}</div>
                        {lead.message && (
                          <div className="text-sm text-gray-400 mt-1 italic max-w-xs truncate">"{lead.message}"</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{lead.rep_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.status}
                        onChange={(e) => handleLeadStatusChange(lead.id, e.target.value)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full border-0 ${
                          lead.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                          lead.status === 'assigned' ? 'bg-yellow-500/20 text-yellow-400' :
                          lead.status === 'contacted' ? 'bg-green-500/20 text-green-400' :
                          lead.status === 'converted' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
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
                        lead.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        lead.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {isAdmin && (
                          <button 
                            onClick={() => handleLeadAssign(lead.id, lead.rep_id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Assign
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-300 transition-colors">View</button>
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