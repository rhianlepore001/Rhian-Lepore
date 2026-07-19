import React from 'react';
import { AreaChart, Area, LineChart, Line, ResponsiveContainer } from 'recharts';

interface MiniSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  showArea?: boolean;
  animate?: boolean;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color = 'var(--color-accent)',
  height = 40,
  showArea = true,
  animate = true,
}) => {
  const gradientId = React.useId();
  const chartData = data.map((value, index) => ({ index, value }));

  if (data.length < 2) {
    return <div style={{ height }} className="w-full" />;
  }

  const commonProps = {
    type: 'monotone' as const,
    dataKey: 'value',
    stroke: color,
    strokeWidth: 2,
    dot: false,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    isAnimationActive: animate,
    animationDuration: 1200,
    animationEasing: 'ease-out' as const,
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {showArea ? (
          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area
              {...commonProps}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line {...commonProps} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
