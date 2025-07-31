# WhatsApp Passenger Templates - easyMO

## Ride Confirmation Templates

### 1. Ride Request Confirmation
```
🛵 **Ride Confirmed!**
From: {{origin_address}}
To: {{destination_address}}
Fare: {{fare_estimate}} RWF

🚗 Looking for nearest driver...
⏱️ ETA: 2-5 minutes
```

### 2. Driver Assigned
```
🎉 **Driver Found!**
👨‍🦲 {{driver_name}} ({{vehicle_plate}})
⭐ {{driver_rating}}/5 stars
📍 Arriving in {{eta_minutes}} minutes

📍 Track: {{tracking_link}}
📞 Call: {{driver_phone}}
```

### 3. Driver Arriving
```
🚗 **Driver Arriving**
{{driver_name}} is 1 minute away
🔍 Look for: {{vehicle_description}}
📱 Plate: {{vehicle_plate}}

⚠️ Reply CANCEL if you need to cancel
```

## Payment Templates

### 4. Fare Payment Request
```
💰 **Payment Due**
Ride completed! Total fare: {{total_amount}} RWF

💳 **Pay Options:**
1️⃣ Mobile Money: {{momo_ussd_code}}
2️⃣ QR Code: Reply QR

💸 Tip driver? Add tip amount (optional)
```

### 5. Payment Confirmation
```
✅ **Payment Successful**
Amount: {{paid_amount}} RWF
Transaction: {{transaction_id}}

🙏 Thank you for riding with easyMO!
⭐ Rate your ride: Reply 1-5 stars
```

### 6. Rating Request
```
⭐ **Rate Your Ride**
How was your experience with {{driver_name}}?

1️⃣ ⭐ Poor
2️⃣ ⭐⭐ Fair  
3️⃣ ⭐⭐⭐ Good
4️⃣ ⭐⭐⭐⭐ Very Good
5️⃣ ⭐⭐⭐⭐⭐ Excellent

💬 Optional feedback: Type your comment
```

## Support Templates

### 7. Ride Issue
```
🚨 **Issue Reported**
We received your concern about ride #{{ride_id}}

👥 Support team notified
⏰ Response within 15 minutes
📞 Urgent? Call: +250-XXX-XXXX

Ref: {{ticket_id}}
```

### 8. Emergency
```
🆘 **Emergency Protocol**
Your safety is our priority

🚨 Emergency contacts notified
📍 Location shared with authorities
📞 Emergency line: 912

Stay calm, help is coming.
```

## Promotional Templates

### 9. Promo Code
```
🎁 **Special Offer!**
Get 20% off your next 3 rides

🏷️ Code: {{promo_code}}
⏰ Valid until: {{expiry_date}}
🛵 Reply RIDE to book now

Terms apply*
```

### 10. Loyalty Reward
```
🏆 **Loyal Rider Reward!**
You've completed {{ride_count}} rides!

🎯 Unlock: {{reward_title}}
💰 Save: {{discount_amount}} RWF
🛵 Use on next ride automatically

Keep riding! 🚀
```

## Operational Templates

### 11. Service Area Notice
```
📍 **Service Area Notice**
Sorry, we don't serve {{requested_location}} yet

🗺️ Available areas:
• Kigali City Center
• Kimisagara
• Nyamirambo
• Remera

🚀 Coming soon to your area!
```

### 12. No Drivers Available
```
😔 **No Drivers Available**
All drivers are busy right now

⏰ Try again in 5-10 minutes
🔔 Or join waitlist: Reply WAIT
📍 Peak times: 7-9AM, 5-7PM

Thank you for your patience!
```

## Template Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| {{driver_name}} | Driver's display name | "John Uwimana" |
| {{vehicle_plate}} | Vehicle registration | "RC-123T" |
| {{driver_rating}} | Driver rating | "4.8" |
| {{eta_minutes}} | Arrival time | "3" |
| {{fare_estimate}} | Estimated cost | "1,500" |
| {{origin_address}} | Pickup location | "Kigali City Center" |
| {{destination_address}} | Drop-off location | "Airport" |
| {{momo_ussd_code}} | USSD payment code | "*182*8*1*1500#" |
| {{transaction_id}} | Payment reference | "TX123456" |
| {{ride_id}} | Unique ride identifier | "R789012" |
| {{promo_code}} | Discount code | "SAVE20" |

## Message Flow Guidelines

1. **Timing**: Messages sent immediately after status changes
2. **Language**: Default Kinyarwanda, fallback to English
3. **Tone**: Friendly, professional, concise
4. **Emojis**: Use sparingly, culture-appropriate
5. **Length**: Max 160 characters per SMS fallback
6. **Personalization**: Always use passenger name when available

## Compliance Notes

- All promotional messages include opt-out instructions
- Emergency templates trigger immediate escalation
- Payment confirmations include transaction details
- Service area messages updated quarterly
- Template performance tracked for optimization