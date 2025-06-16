
import { useEffect, useState } from "react";

// Enhanced ambient light sensor with more granular detection
export function useAmbientLightSensor(): number | null {
  const [illuminance, setIlluminance] = useState<number | null>(null);

  useEffect(() => {
    let sensor: any;
    
    // Try using the Ambient Light Sensor API
    if ("AmbientLightSensor" in window) {
      try {
        // @ts-ignore
        sensor = new window.AmbientLightSensor({ frequency: 2 });
        sensor.addEventListener("reading", () => {
          const lightLevel = sensor.illuminance;
          console.log(`[Light Sensor] Current illuminance: ${lightLevel} lux`);
          setIlluminance(lightLevel);
        });
        sensor.start();
      } catch (e) {
        console.log("[Light Sensor] Not available or permission denied");
        // Fallback: estimate based on time of day
        estimateLightLevel();
      }
    } else {
      console.log("[Light Sensor] API not supported");
      // Fallback: estimate based on time of day
      estimateLightLevel();
    }

    return () => {
      if (sensor && sensor.stop) sensor.stop();
    };
  }, []);

  // Fallback light estimation based on time of day
  const estimateLightLevel = () => {
    const now = new Date();
    const hour = now.getHours();
    
    // Estimate light levels for Rwanda (UTC+2)
    let estimatedLux = 50; // Default moderate light
    
    if (hour >= 6 && hour <= 8) {
      estimatedLux = 200; // Dawn
    } else if (hour >= 9 && hour <= 17) {
      estimatedLux = 800; // Bright daylight
    } else if (hour >= 18 && hour <= 19) {
      estimatedLux = 100; // Dusk
    } else {
      estimatedLux = 10; // Night/indoor
    }
    
    console.log(`[Light Sensor] Estimated illuminance: ${estimatedLux} lux (fallback)`);
    setIlluminance(estimatedLux);
  };

  return illuminance;
}
