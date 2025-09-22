
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { transactionService, TransactionAnalytics } from '@/services/transactionService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Globe, Phone, Activity } from 'lucide-react';

const USSDAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<TransactionAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  useEffect(() => {
    loadAnalytics();
  }, [selectedCountry]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await transactionService.getAnalytics(selectedCountry || undefined);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const countries = [...new Set(analytics.map(a => a.country))];
  const totalScans = analytics.reduce((sum, a) => sum + a.total_scans, 0);
  const totalLaunches = analytics.reduce((sum, a) => sum + a.successful_launches, 0);
  const overallSuccessRate = totalScans > 0 ? (totalLaunches / totalScans) * 100 : 0;

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const countryData = analytics.reduce((acc, item) => {
    const existing = acc.find(c => c.country === item.country);
    if (existing) {
      existing.total_scans += item.total_scans;
      existing.successful_launches += item.successful_launches;
    } else {
      acc.push({
        country: item.country,
        total_scans: item.total_scans,
        successful_launches: item.successful_launches
      });
    }
    return acc;
  }, [] as any[]);

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-700 rounded mb-4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
          <Activity className="w-5 h-5" />
          <span>USSD Analytics Dashboard</span>
        </h3>
        <div className="flex space-x-2">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
          >
            <option value="">All Countries</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          <Button onClick={loadAnalytics} size="sm" variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800 border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <Globe className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-gray-400 text-sm">Total Scans</p>
              <p className="text-white text-2xl font-bold">{totalScans}</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <Phone className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-gray-400 text-sm">Successful Launches</p>
              <p className="text-white text-2xl font-bold">{totalLaunches}</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-gray-400 text-sm">Success Rate</p>
              <p className="text-white text-2xl font-bold">{overallSuccessRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate by Country */}
        <Card className="bg-gray-800 border-gray-700 p-4">
          <h4 className="text-white font-semibold mb-4">Success Rate by Country</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={countryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="country" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                formatter={(value, name) => [
                  `${value}`,
                  name === 'total_scans' ? 'Total Scans' : 'Successful Launches'
                ]}
              />
              <Bar dataKey="total_scans" fill="#3B82F6" name="total_scans" />
              <Bar dataKey="successful_launches" fill="#22C55E" name="successful_launches" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Provider Distribution */}
        <Card className="bg-gray-800 border-gray-700 p-4">
          <h4 className="text-white font-semibold mb-4">Provider Distribution</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.slice(0, 5)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ provider, total_scans }) => `${provider}: ${total_scans}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total_scans"
              >
                {analytics.slice(0, 5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="bg-gray-800 border-gray-700 p-4">
        <h4 className="text-white font-semibold mb-4">Detailed Statistics</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left p-2 text-gray-300">Country</th>
                <th className="text-left p-2 text-gray-300">Provider</th>
                <th className="text-left p-2 text-gray-300">Pattern</th>
                <th className="text-right p-2 text-gray-300">Scans</th>
                <th className="text-right p-2 text-gray-300">Launches</th>
                <th className="text-right p-2 text-gray-300">Success Rate</th>
                <th className="text-right p-2 text-gray-300">Avg Confidence</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((item, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="p-2 text-white">{item.country}</td>
                  <td className="p-2 text-white">{item.provider}</td>
                  <td className="p-2 text-gray-300 font-mono text-xs">{item.ussd_pattern_type}</td>
                  <td className="p-2 text-right text-white">{item.total_scans}</td>
                  <td className="p-2 text-right text-green-400">{item.successful_launches}</td>
                  <td className="p-2 text-right text-white">{item.success_rate_percent}%</td>
                  <td className="p-2 text-right text-blue-400">{item.avg_confidence?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default USSDAnalyticsDashboard;
