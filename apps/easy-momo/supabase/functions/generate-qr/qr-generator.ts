
/**
 * QR Code Generation Utility
 * Handles the actual QR code image generation with fallback
 */

export async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    // Use a faster QR code generation API with optimized parameters
    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}&format=png&margin=1&color=1f2937&bgcolor=ffffff&ecc=M`);
    
    if (!response.ok) {
      throw new Error('QR code generation failed');
    }

    const qrImageBlob = await response.blob();
    const arrayBuffer = await qrImageBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('QR generation error:', error);
    // Fallback: create a simple SVG with text
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <rect width="300" height="300" fill="white"/>
      <text x="150" y="150" text-anchor="middle" font-family="monospace" font-size="10" fill="black">${text}</text>
    </svg>`;
    const base64 = btoa(svgContent);
    return `data:image/svg+xml;base64,${base64}`;
  }
}
