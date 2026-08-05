"use client"

import * as React from "react"
import { ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactNode
  /**
   * Chart height in px. Defaults to 300 so every existing consumer is unchanged.
   * Pass a smaller value on mobile — a fixed 300px box minus axis labels and a
   * Brush leaves a very cramped plot area on a phone.
   */
  height?: number
}

function ChartContainer({
  children,
  className,
  height = 300,
  ...props
}: ChartContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(null)

  React.useEffect(() => {
    const checkDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current
        if (offsetWidth > 0 && offsetHeight > 0) {
          setDimensions({ width: offsetWidth, height: offsetHeight })
        } else {
          // Retry if dimensions aren't ready yet
          requestAnimationFrame(checkDimensions)
        }
      }
    }
    
    // Initial check after DOM is painted
    requestAnimationFrame(checkDimensions)
    
    // Watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      checkDimensions()
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    // Cleanup
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      {...props}
      className={cn("w-full", className)}
      style={{ 
        ...props.style, 
        width: '100%',
        height: `${height}px`,
        minHeight: `${height}px`
      }}
    >
      {dimensions && (
        <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  )
}

export { ChartContainer, type ChartConfig }
