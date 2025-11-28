import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, ArrowRight, Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { runtimeConfig } from '@/lib/runtime-config';
import { logger } from '@/lib/logger';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user, signIn, signUp, sendMagicLink, loading } = useAuth();
  const { memberships } = useOrganizations();
  const { toast } = useToast();
  const enableDemoLogin = runtimeConfig.enableDemoLogin;

  // Redirect authenticated users to their organization
  useEffect(() => {
    if (user && memberships.length > 0) {
      const firstOrg = memberships[0].organization;
      navigate(`/${firstOrg.slug}/dashboard`, { replace: true });
    }
  }, [user, memberships, navigate]);

  useEffect(() => {
    resetCaptcha();
    setCaptchaError(null);
  }, [activeTab, resetCaptcha]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await signIn(email, password);
    resetCaptcha();
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error,
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in",
      });
      // Navigation will be handled by useEffect when user state updates
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (shouldRenderCaptcha && !captchaToken) {
      setCaptchaError('Complete the verification challenge to continue.');
      return;
    }
    
    const { error } = await signUp(email, password, name, captchaToken);
    resetCaptcha();
    
    if (error) {
      if (['captcha_failed', 'captcha_required', 'captcha_verification_failed'].includes(error)) {
        setCaptchaError('Verification failed. Please try again.');
      } else if (error === 'captcha_verification_unavailable') {
        setCaptchaError('Verification is currently unavailable. Please try again in a moment.');
      }
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error,
      });
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account",
      });
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (shouldRenderCaptcha && !captchaToken) {
      setCaptchaError('Complete the verification challenge to continue.');
      return;
    }
    
    const { error } = await sendMagicLink(email, captchaToken);
    resetCaptcha();
    
    if (error) {
      if (['captcha_failed', 'captcha_required', 'captcha_verification_failed'].includes(error)) {
        setCaptchaError('Verification failed. Please try again.');
      } else if (error === 'captcha_verification_unavailable') {
        setCaptchaError('Verification is currently unavailable. Please try again in a moment.');
      }
      toast({
        variant: "destructive",
        title: "Failed to send magic link",
        description: error,
      });
    } else {
      toast({
        title: "Magic link sent!",
        description: "Check your email for the sign-in link",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-glow opacity-20 animate-pulse" />
      <div className="absolute inset-0 bg-gradient-subtle" />
      
      {/* Floating elements */}
      <motion.div 
        className="absolute top-20 left-20 w-20 h-20 bg-primary/20 rounded-full blur-xl"
        animate={{ 
          y: [0, -20, 0],
          x: [0, 10, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-20 right-20 w-32 h-32 bg-secondary-accent/20 rounded-full blur-2xl"
        animate={{ 
          y: [0, 20, 0],
          x: [0, -15, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="w-full max-w-md relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-glow rounded-2xl mb-4 shadow-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold gradient-text">Prisma Glow</h1>
            <p className="text-muted-foreground mt-2">Professional services platform</p>
          </div>

          {/* Auth Forms */}
          <Card className="glass border-white/20">
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  <TabsTrigger value="magic">Magic Link</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin" className="space-y-4 mt-6">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" variant="gradient" loading={loading}>
                      {!loading && <ArrowRight className="w-4 h-4 mr-2" />}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4 mt-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {shouldRenderCaptcha && (
                      <div className="space-y-2">
                        <Turnstile
                          key={`${captchaResetKey}-signup`}
                          siteKey={turnstileSiteKey}
                          onSuccess={(token) => {
                            setCaptchaToken(token);
                            setCaptchaError(null);
                          }}
                          onError={() => {
                            setCaptchaToken(null);
                            setCaptchaError('Verification failed. Please try again.');
                          }}
                          onExpire={() => {
                            setCaptchaToken(null);
                          }}
                          options={{ retry: 'auto' }}
                        />
                        {captchaError && (
                          <p className="text-sm text-destructive">{captchaError}</p>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      variant="gradient"
                      loading={loading}
                      disabled={loading || (shouldRenderCaptcha && !captchaToken)}
                    >
                      {!loading && <UserPlus className="w-4 h-4 mr-2" />}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="magic" className="space-y-4 mt-6">
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="magic-email">Email</Label>
                      <Input
                        id="magic-email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    {shouldRenderCaptcha && (
                      <div className="space-y-2">
                        <Turnstile
                          key={`${captchaResetKey}-magic`}
                          siteKey={turnstileSiteKey}
                          onSuccess={(token) => {
                            setCaptchaToken(token);
                            setCaptchaError(null);
                          }}
                          onError={() => {
                            setCaptchaToken(null);
                            setCaptchaError('Verification failed. Please try again.');
                          }}
                          onExpire={() => {
                            setCaptchaToken(null);
                          }}
                          options={{ retry: 'auto' }}
                        />
                        {captchaError && (
                          <p className="text-sm text-destructive">{captchaError}</p>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      variant="gradient"
                      loading={loading}
                      disabled={loading || (shouldRenderCaptcha && !captchaToken)}
                    >
                      {!loading && <Mail className="w-4 h-4 mr-2" />}
                      Send Magic Link
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {enableDemoLogin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <p className="text-sm text-muted-foreground text-center mb-3">
                Demo user logins are available for evaluation.
              </p>
              <div className="grid gap-2">
                {[
                  { email: 'sophia@prismaglow.test', name: 'Sophia Systems', role: 'System Admin' },
                  { email: 'mark@prismaglow.test', name: 'Mark Manager', role: 'Manager' },
                  { email: 'eli@prismaglow.test', name: 'Eli Employee', role: 'Employee' },
                ].map((user, index) => (
                  <motion.button
                    key={user.email}
                    onClick={() => {
                      setEmail(user.email);
                      setPassword('');
                      setActiveTab('signin');
                    }}
                    className="text-left p-3 rounded-lg bg-card/50 hover:bg-card border border-border/50 hover:border-border transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <div className="font-medium text-sm">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.role} • {user.email}</div>
                  </motion.button>
                ))}
              </div>
              <div className="mt-3 text-center">
                <button
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('create-demo-users');
                      if (error || !data?.success) {
                        toast({
                          variant: 'destructive',
                          title: 'Failed to create demo users',
                          description: error?.message ?? data?.error ?? 'Unknown error',
                        });
                        return;
                      }

                      toast({
                        title: 'Demo users created!',
                        description: 'Invitees will receive email-based access instructions.',
                      });
                    } catch (error) {
                      logger.error('auth.create_demo_users_failed', error);
                      toast({
                        variant: 'destructive',
                        title: 'Network error',
                        description: 'Could not connect to create demo users',
                      });
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Create demo users if not available
                </button>
              </div>
            </motion.div>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
