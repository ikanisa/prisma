-- First ensure all agents exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM agents WHERE name = 'OnboardingAgent') THEN
        INSERT INTO agents (name, description, status) VALUES 
        ('OnboardingAgent', 'Friendly AI concierge that greets first-time WhatsApp users and gathers profile data', 'active');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM agents WHERE name = 'PaymentAgent') THEN
        INSERT INTO agents (name, description, status) VALUES 
        ('PaymentAgent', 'Swift AI cashier that transforms numeric messages into Mobile-Money payment artifacts', 'active');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM agents WHERE name = 'ListingAgent') THEN
        INSERT INTO agents (name, description, status) VALUES 
        ('ListingAgent', 'Farmer-first AI assistant that converts produce descriptions into structured inventory', 'active');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM agents WHERE name = 'MarketplaceAgent') THEN
        INSERT INTO agents (name, description, status) VALUES 
        ('MarketplaceAgent', 'Discovery-driven AI personal shopper for fresh produce and local goods', 'active');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM agents WHERE name = 'LogisticsAgent') THEN
        INSERT INTO agents (name, description, status) VALUES 
        ('LogisticsAgent', 'Real-time dispatch AI that bridges orders with available drivers', 'active');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM agents WHERE name = 'BusinessAgent') THEN
        INSERT INTO agents (name, description, status) VALUES 
        ('BusinessAgent', 'Sales-savvy AI shop-keeper for bars, pharmacies, and retail shops', 'active');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM agents WHERE name = 'EventsAgent') THEN
        INSERT INTO agents (name, description, status) VALUES 
        ('EventsAgent', 'Vibrant AI events concierge for concerts, sports, and workshops', 'active');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM agents WHERE name = 'MarketingAgent') THEN
        INSERT INTO agents (name, description, status) VALUES 
        ('MarketingAgent', 'Autonomous AI growth hacker for personalized WhatsApp campaigns', 'active');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM agents WHERE name = 'SupportAgent') THEN
        INSERT INTO agents (name, description, status) VALUES 
        ('SupportAgent', '24/7 empathetic AI help-desk for issue resolution and escalation', 'active');
    END IF;
END $$;