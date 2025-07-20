import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Shield, UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdminSetup() {
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      console.log('Checking admin status...');
      
      // Check if any admin exists in the system
      const { data: adminExistsResult, error: adminExistsError } = await supabase
        .rpc('admin_exists');
        
      if (adminExistsError) {
        console.error('Error checking if admin exists:', adminExistsError);
        setAdminExists(false);
      } else {
        console.log('Admin exists:', adminExistsResult);
        setAdminExists(adminExistsResult);
      }
      
      // Check if current user is authenticated and is admin
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        console.log('User is authenticated, checking admin role...');
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
          
        if (rolesError) {
          console.error('Error checking user roles:', rolesError);
          setCurrentUserIsAdmin(false);
        } else {
          console.log('User admin status:', !!roles);
          setCurrentUserIsAdmin(!!roles);
        }
      } else {
        console.log('User not authenticated');
        setCurrentUserIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminExists(false);
      setCurrentUserIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSetupLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        throw new Error('Failed to verify admin role');
      }

      if (!roleData) {
        throw new Error('You do not have admin privileges');
      }

      toast({
        title: "Success!",
        description: "Signed in successfully. Redirecting to admin panel...",
      });

      // Redirect to admin panel
      window.location.href = '/admin';
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
      setSetupLoading(false);
    }
  };

  const createFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    setSetupLoading(true);

    try {
      console.log('Starting admin creation process...');
      
      // First check if admin already exists
      const { data: adminCheck, error: adminCheckError } = await supabase.rpc('admin_exists');
      
      if (adminCheckError) {
        console.error('Error checking admin status:', adminCheckError);
        throw new Error('Failed to verify admin status');
      }

      if (adminCheck && !currentUserIsAdmin) {
        throw new Error('Admin already exists and you are not authorized to create additional admins');
      }

      let userId: string;
      
      // Try to sign up the user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          console.log('User already exists, attempting sign in...');
          // User exists, try to sign them in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            console.error('Sign in error:', signInError);
            throw new Error(`Failed to sign in: ${signInError.message}`);
          }

          if (!signInData.user) {
            throw new Error('Sign in successful but no user data returned');
          }

          userId = signInData.user.id;
          console.log('User signed in successfully:', userId);
        } else {
          console.error('Auth error:', authError);
          throw new Error(`Authentication failed: ${authError.message}`);
        }
      } else if (authData.user) {
        userId = authData.user.id;
        console.log('User created successfully:', userId);
      } else {
        throw new Error('No user data returned from authentication');
      }

      // Create admin role using RPC function
      console.log('Creating admin role for user:', userId);
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_admin_user', {
        user_id: userId
      });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw new Error(`Failed to assign admin role: ${rpcError.message}`);
      }

      console.log('RPC result:', rpcResult);

      // Parse the JSON result if it's a string
      let parsedResult: any = rpcResult;
      if (typeof rpcResult === 'string') {
        try {
          parsedResult = JSON.parse(rpcResult);
        } catch (e) {
          console.warn('Could not parse RPC result as JSON:', rpcResult);
        }
      }

      if (parsedResult && typeof parsedResult === 'object' && !parsedResult.success) {
        throw new Error(parsedResult.message || 'Failed to assign admin role');
      }

      setSuccess('✅ Admin account created successfully! Redirecting to dashboard...');
      
      toast({
        title: "Success!",
        description: "Admin account created successfully. You will be redirected to the dashboard.",
      });
      
      // Recheck admin status
      await checkAdminStatus();
      
      // Wait a moment then navigate to admin dashboard
      setTimeout(() => {
        window.location.href = '/admin';
      }, 2000);

    } catch (error: any) {
      console.error('Admin setup error:', error);
      const errorMessage = error.message || 'Failed to create admin account';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Checking admin status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If admin exists and current user is admin, show admin panel access
  if (adminExists && currentUserIsAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Welcome Back, Admin</CardTitle>
            <CardDescription>
              You have admin access to the easyMO platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/admin'} 
              className="w-full"
            >
              Go to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If admin exists but current user is not admin, show login form
  if (adminExists && !currentUserIsAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Sign in with your admin credentials to access the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@easymo.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={setupLoading || !email || !password}
              >
                {setupLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Sign In as Admin
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              <Button 
                onClick={async () => {
                  setError('');
                  setSetupLoading(true);
                  try {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email: email
                    });
                    if (error) throw error;
                    setSuccess('Confirmation email sent! Check your inbox.');
                  } catch (error: any) {
                    setError(error.message);
                  } finally {
                    setSetupLoading(false);
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!email || setupLoading}
              >
                Resend Confirmation Email
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="ghost"
                size="sm"
                className="w-full"
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>easyMO Admin Setup</CardTitle>
          <CardDescription>
            {adminExists === false ? 
              'Create the first admin account to secure your platform' :
              'Setup your admin access'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> {adminExists === false ? 
                'This is a one-time setup to create the first admin account. After completion, only existing admins can create new admin accounts.' :
                'You are creating an additional admin account.'
              }
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={createFirstAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@easymo.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={setupLoading || !email || !password || !confirmPassword}
            >
              {setupLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating Admin Account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {adminExists === false ? 'Create First Admin Account' : 'Create Admin Account'}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground text-center">
            <p>This will create an admin account with full system access.</p>
            <p className="mt-1">Keep these credentials secure!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}