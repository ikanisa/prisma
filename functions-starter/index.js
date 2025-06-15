
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const QRCode = require('qrcode');
const OpenAI = require('openai');

admin.initializeApp();
const db = admin.firestore();
const storage = new Storage();
const bucket = storage.bucket('ikanisa-ac07c.appspot.com');

// Initialize OpenAI - you'll need to set this in Firebase Functions config
const openai = new OpenAI({
  apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY
});

// Helper function to detect phone vs code
const detectInputType = (receiver) => {
  const phoneRegex = /^(07[2-9]\d{7})$/;
  const codeRegex = /^\d{4,6}$/;
  
  if (phoneRegex.test(receiver)) return 'phone';
  if (codeRegex.test(receiver)) return 'code';
  return 'phone'; // default
};

// Helper function to generate USSD string
const generateUSSDString = (receiver, amount) => {
  const inputType = detectInputType(receiver);
  if (inputType === 'phone') {
    return `*182*1*1*${receiver}*${amount}#`;
  } else {
    return `*182*8*1*${receiver}*${amount}#`;
  }
};

// Generate QR Code
exports.generateQRCode = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { receiver, amount, sessionId } = req.body;
    
    if (!receiver || !amount || !sessionId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Generate USSD string
    const ussdString = generateUSSDString(receiver, amount);
    
    // Generate QR code with high error correction
    const qrCodeBuffer = await QRCode.toBuffer(ussdString, {
      width: 512,
      margin: 2,
      color: { dark: '#1f2937', light: '#ffffff' },
      errorCorrectionLevel: 'Q'
    });
    
    // Upload to Firebase Storage
    const fileName = `qr-codes/${sessionId}/${Date.now()}.png`;
    const file = bucket.file(fileName);
    
    await file.save(qrCodeBuffer, {
      metadata: { contentType: 'image/png' }
    });
    
    // Make file publicly readable
    await file.makePublic();
    
    const qrCodeUrl = `https://storage.googleapis.com/ikanisa-ac07c.appspot.com/${fileName}`;
    const qrCodeImage = qrCodeBuffer.toString('base64');
    
    // Save to Firestore
    await db.collection('qrCache').add({
      sessionId,
      ussdString,
      qrCodeImage: `data:image/png;base64,${qrCodeImage}`,
      qrCodeUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Log the operation
    await db.collection('sessionLogs').add({
      sessionId,
      function: 'generateQRCode',
      status: 'success',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({
      qrCodeImage: `data:image/png;base64,${qrCodeImage}`,
      qrCodeUrl,
      ussdString
    });
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    
    // Log the error
    if (req.body.sessionId) {
      await db.collection('sessionLogs').add({
        sessionId: req.body.sessionId,
        function: 'generateQRCode',
        status: 'error',
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Scan QR Code using OpenAI Vision
exports.scanQRCodeImage = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { qrImage, sessionId } = req.body;
    
    if (!qrImage || !sessionId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Use OpenAI Vision to decode QR code
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this QR code image and extract the USSD string. Look for patterns like *182*1*1* or *182*8*1* followed by phone numbers and amounts. Return only the exact USSD string found, or 'NO_QR_FOUND' if no valid USSD code is detected."
            },
            {
              type: "image_url",
              image_url: {
                url: qrImage
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    const decodedText = response.choices[0]?.message?.content?.trim();
    
    if (!decodedText || decodedText === 'NO_QR_FOUND') {
      // Save failed scan result
      await db.collection('qrHistory').add({
        sessionId,
        scannedAt: admin.firestore.FieldValue.serverTimestamp(),
        decodedUssd: '',
        result: 'fail',
        imageSource: 'camera'
      });
      
      res.json({
        ussdString: '',
        parsedReceiver: '',
        parsedAmount: 0,
        result: 'fail'
      });
      return;
    }

    // Parse the USSD string to extract receiver and amount
    let parsedReceiver = '';
    let parsedAmount = 0;
    
    // Try to extract phone and amount from USSD
    const phoneMatch = decodedText.match(/\*182\*[18]\*1\*(\d+)\*(\d+)#/);
    if (phoneMatch) {
      parsedReceiver = phoneMatch[1];
      parsedAmount = parseInt(phoneMatch[2], 10);
    }
    
    // Save successful scan result
    await db.collection('qrHistory').add({
      sessionId,
      scannedAt: admin.firestore.FieldValue.serverTimestamp(),
      decodedUssd: decodedText,
      decodedReceiver: parsedReceiver,
      decodedAmount: parsedAmount,
      result: 'success',
      imageSource: 'camera'
    });
    
    res.json({
      ussdString: decodedText,
      parsedReceiver,
      parsedAmount,
      result: 'success'
    });
    
  } catch (error) {
    console.error('Error scanning QR code:', error);
    
    // Log the error
    if (req.body.sessionId) {
      await db.collection('sessionLogs').add({
        sessionId: req.body.sessionId,
        function: 'scanQRCodeImage',
        status: 'error',
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.status(500).json({ error: 'Failed to scan QR code' });
  }
});

// Create Payment Link
exports.createPaymentLink = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { receiver, amount, sessionId } = req.body;
    
    if (!receiver || !amount || !sessionId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Generate short payment link
    const linkId = Math.random().toString(36).substring(2, 15);
    const paymentLink = `https://ikanisa-ac07c.web.app/pay?link=${linkId}`;
    
    // Save to Firestore
    await db.collection('sharedLinks').add({
      sessionId,
      receiver,
      amount,
      paymentLink,
      linkId,
      sharedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ paymentLink });
    
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

// Log Share Event
exports.logShareEvent = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { sessionId, method, timestamp } = req.body;
    
    await db.collection('sessionLogs').add({
      sessionId,
      function: 'logShareEvent',
      method,
      status: 'success',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ message: 'Event logged successfully' });
    
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

// Get Offline QR Code
exports.getOfflineQRCode = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const snapshot = await db.collection('qrCache')
      .where('sessionId', '==', sessionId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      res.json({ qrCode: null });
      return;
    }
    
    const qrData = snapshot.docs[0].data();
    res.json({ qrCode: qrData });
    
  } catch (error) {
    console.error('Error getting offline QR code:', error);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});
