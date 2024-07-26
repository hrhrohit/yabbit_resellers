import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDomains,
  getUserCount,
  getDomainInfo,
  getUser,
  getDeviceCount,
  getDomainMeetings,
  getCallHistory,
  getCallqueues,
  setAuthToken,
} from '../ApiConfig';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FaSearch, FaUserCircle, FaChartLine, FaPhoneAlt } from 'react-icons/fa';

const DomainList = ({ accessToken }) => {
  // ... (keep all your existing state variables and useEffect hooks)
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [domainsState, setDomainsState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState([]);
  const [graphMetric, setGraphMetric] = useState('PBX Seats');
  const [graphPeriod, setGraphPeriod] = useState('7 DAYS');
  const [callHistoryData, setCallHistoryData] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [users, setUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const usersPerPage = 5;
  const [selectedUserDomain, setSelectedUserDomain] = useState('');

  useEffect(() => {
    if (accessToken) {
      setAuthToken(accessToken);
    }

    const fetchDomainDetails = async (domain) => {
      try {
        const [
          vmailTrans,
          userCountResponse,
          fetchUserData,
          callQueuesResponse,
        ] = await Promise.all([
          getDomainInfo(domain.domain),
          getUserCount(domain.domain),
          getUser(domain.domain),
          getCallqueues(domain.domain),
        ]);

        const devicePromises = fetchUserData.data.map((user) =>
          getDeviceCount(domain.domain, user.user)
        );
        const meetingPromises = fetchUserData.data.map((user) =>
          getDomainMeetings(domain.domain, user.user)
        );

        const [deviceResponses, meetingResponses] = await Promise.all([
          Promise.all(devicePromises),
          Promise.all(meetingPromises),
        ]);

        const totalDevices = deviceResponses.reduce(
          (sum, response) => sum + response.data.total,
          0
        );
        const totalMeetingRooms = meetingResponses.reduce(
          (sum, response) => sum + response.data.total,
          0
        );
        const callQueueCount = callQueuesResponse.data.length;

        return {
          ...domain,
          pbxUserCount: userCountResponse.data.total,
          vmailTransValue: vmailTrans?.data?.['voicemail-transcription-enabled'],
          totalDevices,
          totalMeetingRooms,
          callQueueCount,
        };
      } catch (error) {
        console.error(`Error fetching data for ${domain.domain}:`, error);
        return {
          ...domain,
          pbxUserCount: 'N/A',
          vmailTransValue: 'N/A',
          totalDevices: 'N/A',
          totalMeetingRooms: 'N/A',
          callQueueCount: 'N/A',
        };
      }
    };

    const fetchCallHistoryData = async (domain) => {
      const endDate = new Date().toISOString().split('T')[0] + ' 23:59:59';
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0] + ' 00:00:00';

      try {
        const response = await getCallHistory(domain, startDate, endDate);
        const calls = response.data;

        if (!Array.isArray(calls)) {
          console.error('Unexpected response format:', calls);
          return;
        }

        const groupedCalls = calls.reduce((acc, call) => {
          const dateStr = call.start_time || call['call-answer-datetime'];
          if (!dateStr) {
            return acc;
          }

          const date = new Date(dateStr);
          if (isNaN(date)) {
            return acc;
          }

          const monthYear = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, '0')}`;
          acc[monthYear] = (acc[monthYear] || 0) + 1;
          return acc;
        }, {});

        const sortedData = Object.entries(groupedCalls)
          .map(([monthYear, count]) => ({ monthYear, count }))
          .sort(
            (a, b) => new Date(`${a.monthYear}-01`) - new Date(`${b.monthYear}-01`)
          );

        setCallHistoryData(sortedData);
      } catch (error) {
        console.error('Error fetching call history:', error);
      }
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        const domainsResponse = await getDomains();
        const domainsData = domainsResponse.data;

        const domainsWithDetails = await Promise.all(
          domainsData.map(fetchDomainDetails)
        );

        setDomainsState(domainsWithDetails);
        setLoading(false);

        const mockGraphData = generateMockGraphData();
        setGraphData(mockGraphData);

        if (domainsWithDetails.length > 0) {
          setSelectedDomain(domainsWithDetails[0].domain);
          await fetchCallHistoryData(domainsWithDetails[0].domain);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch domain data');
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  const generateMockGraphData = useCallback(() => {
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      data.push({
        date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
        value: Math.floor(Math.random() * (4650 - 4635 + 1) + 4635),
      });
    }

    return data;
  }, []);

  const filteredData = useMemo(
    () =>
      domainsState.filter((item) =>
        item.domain.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [domainsState, searchTerm]
  );

  const sortedByDeviceCount = useMemo(
    () => [...filteredData].sort((a, b) => b.totalDevices - a.totalDevices),
    [filteredData]
  );

  const handleDomainClick = useCallback(
    (domain) => {
      navigate(`/domain-details/${domain}`, { state: { domainName: domain } });
    },
    [navigate]
  );

  const ResellerGraph = useCallback(
    () => (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-[#00B4FC] p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white plus-jakarta-sans-bold">
            Reseller Graph
          </h2>
          <div className="flex space-x-2">
            <select
              value={graphPeriod}
              onChange={(e) => setGraphPeriod(e.target.value)}
              className="bg-white text-[#00B4FC] rounded px-2 py-1 text-sm"
            >
              <option>7 DAYS</option>
              <option>30 DAYS</option>
              <option>60 DAYS</option>
            </select>
            <select
              value={graphMetric}
              onChange={(e) => setGraphMetric(e.target.value)}
              className="bg-white text-[#00B4FC] rounded px-2 py-1 text-sm"
            >
              <option>PBX Seats</option>
              <option>Telephone Numbers</option>
              <option>Call Center Seats</option>
              <option>Call Recording Seats</option>
              <option>SIP Trunks</option>
              <option>Meeting Rooms</option>
              <option>Voicemail Transcription</option>
            </select>
          </div>
        </div>
        <div className="p-4" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[4630, 4655]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00B4FC"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
    [graphPeriod, graphMetric, graphData]
  );

  const CallHistoryGraph = useCallback(
    () => (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-[#00B4FC] p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white plus-jakarta-sans-bold">
            Call History Graph
          </h2>
        </div>
        <div className="p-4" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={callHistoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthYear" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#00B4FC"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    ),
    [callHistoryData]
  );

  const fetchUserData = async () => {
    try {
      const response = await getUser(selectedDomain);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    if (selectedDomain) {
      fetchUserData();
    }
  }, [selectedDomain]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      user['name-first-name'].toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user['name-last-name'].toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user['caller-id-number'].toString().includes(userSearchTerm) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.domain.toLowerCase().includes(selectedUserDomain.toLowerCase())
    );
  }, [users, userSearchTerm, selectedUserDomain]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentUserPage - 1) * usersPerPage;
    return filteredUsers.slice(startIndex, startIndex + usersPerPage);
  }, [filteredUsers, currentUserPage]);

  const UserTable = useCallback(
    () => (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mt-4">
        <div className="bg-[#00B4FC] p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white plus-jakarta-sans-bold">
            User Data
          </h2>
          <input
            type="text"
            placeholder="Search users"
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="bg-white text-[#00B4FC] rounded px-2 py-1 text-sm"
          />
          <select
            value={selectedUserDomain}
            onChange={(e) => setSelectedUserDomain(e.target.value)}
            className="bg-white text-[#00B4FC] rounded px-2 py-1 text-sm"
          >
            <option value="">All Domains</option>
            {domainsState.map((domain) => (
              <option key={domain.domain} value={domain.domain}>
                {domain.domain}
              </option>
            ))}
          </select>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Caller ID Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-100 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">{user.user}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user['name-first-name']}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user['name-last-name']}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user['caller-id-number']}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setCurrentUserPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentUserPage === 1}
              className="bg-[#00B4FC] text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              Previous
            </button>
            <span>
              Page {currentUserPage} of {Math.ceil(filteredUsers.length / usersPerPage)}
            </span>
            <button
              onClick={() =>
                setCurrentUserPage((prev) =>
                  Math.min(prev + 1, Math.ceil(filteredUsers.length / usersPerPage))
                )
              }
              disabled={currentUserPage === Math.ceil(filteredUsers.length / usersPerPage)}
              className="bg-[#00B4FC] text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    ),
    [paginatedUsers, currentUserPage, filteredUsers, userSearchTerm, selectedUserDomain]
  );


  const DomainCard = ({ domain }) => (
    <div 
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow duration-300"
      // onClick={() => handleDomainClick(domain.domain)}
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{domain.domain}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center">
          <FaUserCircle className="text-blue-500 mr-2" />
          <span>{domain.pbxUserCount} Users</span>
        </div>
        <div className="flex items-center">
          <FaChartLine className="text-green-500 mr-2" />
          <span>{domain.totalDevices} Devices</span>
        </div>
        <div className="flex items-center">
          <FaPhoneAlt className="text-purple-500 mr-2" />
          <span>{domain.callQueueCount} Queues</span>
        </div>
        <div className="flex items-center">
          <FaUserCircle className="text-orange-500 mr-2" />
          <span>{domain.totalMeetingRooms} Rooms</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Yabbit Reseller Domain Management</h1>
        
        <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-white">Domain List</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search domains"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white bg-opacity-20 text-white placeholder-gray-300 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300" />
            </div>
          </div>
          
          {loading ? (
            <p className="text-white">Loading...</p>
          ) : error ? (
            <p className="text-red-300">{error}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedByDeviceCount.map((domain) => (
                <DomainCard key={domain.domain} domain={domain} />
              ))}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Reseller Graph</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                  <XAxis dataKey="date" stroke="white" />
                  <YAxis domain={[4630, 4655]} stroke="white" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)' }} />
                  <Line type="monotone" dataKey="value" stroke="#00B4FC" strokeWidth={2} dot={{ fill: '#00B4FC' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Call History</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={callHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                  <XAxis dataKey="monthYear" stroke="white" />
                  <YAxis stroke="white" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)' }} />
                  <Line type="monotone" dataKey="count" stroke="#00B4FC" strokeWidth={2} dot={{ fill: '#00B4FC' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">User Data</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-white border-opacity-20">
                  <th className="px-4 py-2 text-left">User ID</th>
                  <th className="px-4 py-2 text-left">First Name</th>
                  <th className="px-4 py-2 text-left">Last Name</th>
                  <th className="px-4 py-2 text-left">Caller ID</th>
                  <th className="px-4 py-2 text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, index) => (
                  <tr key={index} className="border-b border-white border-opacity-10 hover:bg-white hover:bg-opacity-10">
                    <td className="px-4 py-2">{user.user}</td>
                    <td className="px-4 py-2">{user['name-first-name']}</td>
                    <td className="px-4 py-2">{user['name-last-name']}</td>
                    <td className="px-4 py-2">{user['caller-id-number']}</td>
                    <td className="px-4 py-2">{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setCurrentUserPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentUserPage === 1}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-opacity-50"
            >
              Previous
            </button>
            <span className="text-white">
              Page {currentUserPage} of {Math.ceil(filteredUsers.length / usersPerPage)}
            </span>
            <button
              onClick={() => setCurrentUserPage((prev) => Math.min(prev + 1, Math.ceil(filteredUsers.length / usersPerPage)))}
              disabled={currentUserPage === Math.ceil(filteredUsers.length / usersPerPage)}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainList;
