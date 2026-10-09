import React from "react";

import { useConnection } from "../hooks";
import { formatAge } from "../freshness";
import type { ConnectionStatus } from "../types";

const CONNECTION_STYLE: Record<ConnectionStatus, { dot: string; text: string; pulse: boolean; title: string }> = {
  LIVE: { 
    dot: "bg-emerald-500", 
    text: "text-emerald-600 dark:text-emerald-400", 
    pulse: true,
    title: "LIVE - Real-time tracking active"
  },
  CONNECTING: { 
    dot: "bg-amber-500", 
    text: "text-amber-500 dark:text-amber-400", 
    pulse: true,
    title: "CONNECTING - Establishing connection"
  },
  DISCONNECTED: { 
    dot: "bg-red-500", 
    text: "text-red-600 dark:text-red-400", 
    pulse: false,
    title: "DISCONNECTED - No connection"
  },
};

const ConnectionBadge: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { status, lastDataAge } = useConnection();
  const style = CONNECTION_STYLE[status];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 ${className}`}
      role='status'
      aria-live='polite'
      data-state={status}
      title={style.title}
    >
      <span className='relative flex size-2.5'>
        {style.pulse ? (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${style.dot}`}
          />
        ) : null}
        <span className={`relative inline-flex size-2.5 rounded-full ${style.dot}`} />
      </span>

      <span className={`text-xs font-semibold ${style.text}`}>
        {status.toLowerCase().replace(/([A-Z])/g, ' $1').trim()}
      </span>

      <span className='text-[11px] text-muted-foreground'>
        {lastDataAge !== undefined && lastDataAge !== null ? (
          formatAge(lastDataAge)
        ) : (
          "No data yet"
        )}
      </span>
    </div>
  );
};

export default ConnectionBadge;
