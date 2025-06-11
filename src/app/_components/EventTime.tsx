"use client";

import { useEffect, useState } from "react";

interface EventTimeProps {
  startTime: Date;
}

export default function EventTime({ startTime }: EventTimeProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <>
      {new Date(startTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </>
  );
}
