
import React, { useEffect, useState } from "react";

const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center bg-yellow-400/90 text-yellow-900 py-2 text-sm font-bold shadow animate-fade-in">
      <span role="img" aria-label="offline" className="mr-2">📴</span>
      You are offline. Most features may be unavailable.
    </div>
  );
};
export default OfflineBanner;
