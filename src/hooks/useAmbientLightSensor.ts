
import { useEffect, useState } from "react";

// Returns the ambient light level in lux (number), or null if not available
export function useAmbientLightSensor(): number | null {
  const [illuminance, setIlluminance] = useState<number | null>(null);

  useEffect(() => {
    let sensor: any;
    // Try using the Ambient Light Sensor API
    if ("AmbientLightSensor" in window) {
      try {
        // @ts-ignore
        sensor = new window.AmbientLightSensor();
        sensor.addEventListener("reading", () => {
          setIlluminance(sensor.illuminance);
        });
        sensor.start();
      } catch (e) {
        setIlluminance(null);
      }
    } else {
      // Not supported
      setIlluminance(null);
    }
    return () => {
      if (sensor && sensor.stop) sensor.stop();
    };
  }, []);

  return illuminance;
}
