'use client';

import { Settings as SettingsIcon, User, Bell, Shield, Palette } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            {/* Settings Sections */}
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border bg-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Profile</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Manage your personal information</p>
                </div>
                <div className="rounded-xl border bg-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <Bell className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Notifications</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Configure notification preferences</p>
                </div>
                <div className="rounded-xl border bg-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Security</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Password and authentication</p>
                </div>
                <div className="rounded-xl border bg-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <Palette className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Appearance</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Theme and display settings</p>
                </div>
            </div>
        </div>
    );
}
