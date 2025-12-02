'use client';

import { useEffect, useState } from 'react';

export function TitleBar({ title = 'Prisma Glow' }: { title?: string }) {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(typeof window !== 'undefined' && '__TAURI__' in window);
  }, []);

  if (!isTauri) return null;

  const handleMinimize = async () => {
    const { getCurrent } = await import('@tauri-apps/api/window');
    await getCurrent().minimize();
  };

  const handleMaximize = async () => {
    const { getCurrent } = await import('@tauri-apps/api/window');
    const window = getCurrent();
    const isMax = await window.isMaximized();
    await (isMax ? window.unmaximize() : window.maximize());
  };

  const handleClose = async () => {
    const { getCurrent } = await import('@tauri-apps/api/window');
    await getCurrent().close();
  };

  return (
    <div
      data-tauri-drag-region
      className="h-12 flex items-center justify-between px-4 bg-background/95 backdrop-blur border-b select-none"
    >
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm font-semibold" data-tauri-drag-region>
          {title}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleMinimize}
          className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition"
          title="Minimize"
        />
        <button
          onClick={handleMaximize}
          className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition"
          title="Maximize"
        />
        <button
          onClick={handleClose}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition"
          title="Close"
        />
      </div>
    </div>
  );
}
