-- Update agent configs with new tools registry
UPDATE public.agent_configs 
SET tools_json = '[
  {
    "type": "function",
    "function": {
      "name": "generateMomoUssd",
      "description": "Generate Rwanda MoMo USSD payment string",
      "parameters": {
        "type": "object",
        "properties": {
          "amount": {"type": "number", "description": "Payment amount in RWF"},
          "receiver": {"type": "string", "description": "Receiver phone number"},
          "purpose": {"type": "string", "description": "Payment purpose", "default": "Payment"}
        },
        "required": ["amount", "receiver"]
      }
    }
  },
  {
    "type": "function", 
    "function": {
      "name": "savePaymentIntent",
      "description": "Save payment intent for tracking",
      "parameters": {
        "type": "object",
        "properties": {
          "user_phone": {"type": "string", "description": "User phone number"},
          "amount": {"type": "number", "description": "Payment amount"},
          "purpose": {"type": "string", "description": "Payment purpose"},
          "recipient": {"type": "string", "description": "Payment recipient"}
        },
        "required": ["user_phone", "amount", "purpose", "recipient"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "searchProducts", 
      "description": "Search marketplace products",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {"type": "string", "description": "Search query"},
          "category": {"type": "string", "description": "Product category"},
          "location": {"type": "string", "description": "Location filter"}
        },
        "required": ["query"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "createRideRequest",
      "description": "Create ride booking request", 
      "parameters": {
        "type": "object",
        "properties": {
          "pickup": {"type": "string", "description": "Pickup location"},
          "destination": {"type": "string", "description": "Destination location"},
          "passenger_phone": {"type": "string", "description": "Passenger phone number"}
        },
        "required": ["pickup", "destination", "passenger_phone"]
      }
    }
  }
]'::jsonb,
updated_at = now()
WHERE code = 'easymo_main';