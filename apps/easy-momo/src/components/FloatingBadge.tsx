
import React, { useEffect, useState } from "react";

interface FloatingBadgeProps {
  label: string;
}

const FloatingBadge: React.FC<FloatingBadgeProps> = ({ label }) => {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed left-1/2 top-[18%] z-[99] -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-2xl font-bold shadow-xl opacity-90 animate-fade-in pointer-events-none">
      {label}
    </div>
  );
};
export default FloatingBadge;
