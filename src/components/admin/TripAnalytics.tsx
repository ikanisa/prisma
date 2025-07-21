import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Clock, DollarSign, Star } from 'lucide-react';

interface AnalyticsData {
  dailyTrips: any[];
  revenueData: any[];
  averageRating: number;
  averageWaitTime: number;
  totalRevenue: number;
  completedTrips: number;
}

export function TripAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    dailyTrips: [],
    revenueData: [],
    averageRating: 0,
    averageWaitTime: 0,
    totalRevenue: 0,
    completedTrips: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      // Fetch trip analytics for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, status, created_at, completed_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (tripsError) throw tripsError;

      // Fetch payments separately
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, status, trip_id')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (paymentsError) throw paymentsError;

      // Process daily trips data
      const dailyTripsMap = new Map();
      const revenueMap = new Map();
      let totalRevenue = 0;
      let completedTrips = 0;

      trips?.forEach(trip => {
        const date = new Date(trip.created_at).toISOString().split('T')[0];
        
        // Count daily trips
        dailyTripsMap.set(date, (dailyTripsMap.get(date) || 0) + 1);
        
        // Calculate revenue
        if (trip.status === 'completed') {
          const tripPayments = payments?.filter(p => p.trip_id === trip.id && p.status === 'completed') || [];
          const paidAmount = tripPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          
          if (paidAmount > 0) {
            revenueMap.set(date, (revenueMap.get(date) || 0) + paidAmount);
            totalRevenue += paidAmount;
          }
          completedTrips++;
        }
      });

      // Convert maps to arrays for charts
      const dailyTrips = Array.from(dailyTripsMap.entries()).map(([date, count]) => ({
        date,
        trips: count,
        revenue: revenueMap.get(date) || 0
      }));

      const revenueData = Array.from(revenueMap.entries()).map(([date, revenue]) => ({
        date,
        revenue
      }));

      // Fetch satisfaction ratings
      const { data: ratings } = await supabase
        .from('customer_satisfaction')
        .select('rating')
        .not('rating', 'is', null);

      const averageRating = ratings?.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0;

      setAnalytics({
        dailyTrips,
        revenueData,
        averageRating,
        averageWaitTime: 8.5, // Mock data - would calculate from trip_events
        totalRevenue,
        completedTrips
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRevenue.toLocaleString()} RWF</div>
            <p className="text-xs text-muted-foreground">
              From {analytics.completedTrips} completed trips
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Trips</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completedTrips}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageWaitTime}m</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trips Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Trips (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.dailyTrips}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="trips" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.dailyTrips}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} RWF`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}