// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-background">
      <div className="text-center space-y-6 p-4">
        <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-medium">
          <span className="text-primary-foreground font-bold text-2xl">eM</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-4 text-foreground">Welcome to easyMO</h1>
          <p className="text-xl text-muted-foreground mb-6">Your AI-powered Mobile Money Super App</p>
        </div>
        <div className="space-y-3">
          <a 
            href="/passenger/home" 
            className="inline-block w-full max-w-xs bg-gradient-primary text-primary-foreground px-6 py-3 rounded-lg font-medium shadow-medium hover:opacity-90 transition-opacity"
          >
            Continue as Passenger
          </a>
          <p className="text-sm text-muted-foreground">
            More user types coming soon: Farmers, Businesses, Drivers
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
