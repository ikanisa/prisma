# WhatsApp Message Templates for easyMO Driver System

## Driver Session Management

### Go Online Confirmation
```
👋 Muraho {driver_name}! You're online ✅
🛵 Ready for rides. Location sharing enabled for 4hrs.
```

### Go Offline Confirmation  
```
😴 You're now offline. Thanks for today!
💰 Check your wallet: *wallet*
```

## Job Assignment

### New Trip Available
```
🛵 New trip: {pickup} → {dropoff} | {distance} km | {fee} RWF
Reply *accept* in 20 sec.
⏰ Timer: 20...19...18...
```

### Assignment Accepted
```
Great! Navigate ➡️ {google_maps_link}
📞 Customer: {customer_phone}
Tap *Picked Up* when you have the package.
```

### Assignment Expired
```
⏰ Trip expired. Next one coming...
Stay online for more rides!
```

## Trip Progress

### Pickup Confirmation
```
✅ Pickup confirmed!
🚗 Navigate to delivery: {dropoff_address}
Tap *Delivered* when complete.
```

### Delivery Confirmation
```
🎉 Trip complete! +{fee} RWF earned
💰 Balance: {wallet_balance} RWF
Rate customer: ⭐⭐⭐⭐⭐ (optional)
```

## Payments & Wallet

### Wallet Balance
```
💰 Your wallet: {balance} RWF
💸 Available to withdraw: {available} RWF
Tap here to withdraw: {ussd_link}
```

### Payout Initiated
```
💸 Payout: {amount} RWF
📱 Dial: {ussd_code}
Or tap: {ussd_link}
Complete on your phone (P2P transfer)
```

## Error Handling

### Location Issues
```
📍 Can't find your location.
Please enable GPS and share location again.
```

### Technical Error
```
⚠️ Something went wrong. Please try again.
If problem persists, reply *help*
```

### Support Escalation
```
🤝 Support ticket #{ticket_id} created.
We'll help within 30 mins.
Continue driving - we'll call you!
```

## Implementation Notes

- All messages should be under 160 characters when possible
- Use emoji sparingly (✅, 🛵, 💰, 📍)
- Include USSD links for quick mobile money access
- Kinyarwanda versions needed for Rwanda market
- Test all templates with actual phones before launch