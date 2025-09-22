declare module "react-virtualized-auto-sizer" {
  import * as React from "react";

  export interface AutoSizerProps {
    children: (size: { width: number; height: number }) => React.ReactNode;
    disableHeight?: boolean;
    disableWidth?: boolean;
    defaultHeight?: number;
    defaultWidth?: number;
    onResize?: (size: { width: number; height: number }) => void;
  }

  const AutoSizer: React.ComponentType<AutoSizerProps>;
  export default AutoSizer;
}
