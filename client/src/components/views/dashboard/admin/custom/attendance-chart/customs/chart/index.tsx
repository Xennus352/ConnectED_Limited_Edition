import React from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PropsI {
  data: {
    name: string;
    present: number;
    absent: number;
  }[];
}

const AttendanceChart: React.FC<PropsI> = ({ data }) => {
  return (
    <ResponsiveContainer width='100%' height='90%'>
      <BarChart width={500} height={300} data={data} barSize={20}>
        <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='hsl(var(--border))' />
        <XAxis
          dataKey='name'
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
        />
        <YAxis axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: "10px",
            borderColor: "hsl(var(--border))",
            background: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Legend
          align='left'
          verticalAlign='top'
          wrapperStyle={{ paddingTop: "20px", paddingBottom: "40px" }}
        />
        <Bar
          dataKey='present'
          fill='hsl(var(--success))'
          legendType='circle'
          radius={[10, 10, 0, 0]}
        />
        <Bar
          dataKey='absent'
          fill='hsl(var(--error))'
          legendType='circle'
          radius={[10, 10, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AttendanceChart;
