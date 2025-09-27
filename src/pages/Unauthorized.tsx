import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4 p-6">
      <div className="inline-flex items-center justify-center rounded-full bg-destructive/10 p-4">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h1 className="text-3xl font-bold">Access restricted</h1>
        <p className="text-muted-foreground mt-2">
          You do not have permission to view this page. Please contact your administrator if you believe this is a mistake.
        </p>
      </div>
      <Link to="/" className="text-sm text-primary hover:underline">
        Return to dashboard
      </Link>
    </div>
  </div>
);

export default Unauthorized;
