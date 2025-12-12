import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import styles from './styles.module.css';

const CustomizedTick = (props) => {
  const { x, y, payload } = props;
  const [date, time] = payload.value.split("T");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={10}>
        <tspan x="0" dy="0">{time.slice(0, 5)}</tspan>
        <tspan x="0" dy="12">{date}</tspan>
      </text>
    </g>
  );
};

export function PredictionChart({ predictions }) {
  if (!predictions) return null;

  const chartData = Object.keys(predictions).map((key) => ({
    datetime: key,
    power: predictions[key],
  }));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Power Forecast Chart</h3>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ bottom: 20, left: 0, right: 20, top: 10 }}>
            <CartesianGrid vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="datetime"
              axisLine={false}
              tickLine={false}
              tick={<CustomizedTick />}
              minTickGap={50}
              height={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              label={{
                value: "Power (kW)",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: 'middle', fill: '#666' }
              }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
            />
            <Line
              dataKey="power"
              type="monotone"
              stroke="#00D9A3"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#00D9A3' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
