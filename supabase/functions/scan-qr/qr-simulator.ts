
export function generateSimulatedQRPattern(): string {
  const simulatedQRPatterns = [
    "tel:*182*1*1*0788123456*1000%23", // tel: encoded version
    "*182*1*1*0788123456*1000#", // Raw version
    "tel:*182*8*1*5678*500%23",        
    "*182*8*1*5678*500#",        
    "*165*0788123456*2500#",     
    "*234*0722123456*1500#",     
    "*144*0788123456*3000#",     
  ];
  
  return simulatedQRPatterns[Math.floor(Math.random() * simulatedQRPatterns.length)];
}
