
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RealTimeFleetMap } from '@/components/admin/RealTimeFleetMap';
import { TripAnalytics } from '@/components/admin/TripAnalytics';

export default function FleetDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fleet Management Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time monitoring and analytics for your driver fleet
        </p>
      </div>

      <Tabs defaultValue="fleet" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fleet">Live Fleet</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="fleet">
          <RealTimeFleetMap />
        </TabsContent>
        
        <TabsContent value="analytics">
          <TripAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
