"use client";

import React, { useEffect, useRef } from "react";

export default function AutoMeasuredRow({
  virtualizer,
  index,
  children,
  expanded,
  rawVisible,
}: {
  virtualizer: any;
  index: number;
  children: React.ReactNode;
  expanded: boolean;
  rawVisible: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) virtualizer.measureElement(ref.current);
  }, []);

  useEffect(() => {
    virtualizer.measure();
  }, [expanded, rawVisible]);

  const vItem = virtualizer.getVirtualItems()[index];

  return (
    <div
      ref={ref}
      data-index={index}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${vItem.start}px)`,
      }}
    >
      {children}
    </div>
  );
}
