import React from "react";
import { useTranslation } from "react-i18next";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const FinanceChart: React.FC<any> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <ResponsiveContainer width='100%' height='90%'>
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' />
        <XAxis
          dataKey='name'
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          tickMargin={20}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "10px",
            borderColor: "hsl(var(--border))",
            background: "hsl(var(--popover))",
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Legend
          align='center'
          verticalAlign='top'
          wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
        />
        <Line
          type='monotone'
          dataKey='income'
          name={t("admin_dashboard.income")}
          stroke='hsl(var(--success))'
          strokeWidth={5}
        />
        <Line
          type='monotone'
          dataKey='expense'
          name={t("admin_dashboard.expense")}
          stroke='hsl(var(--error))'
          strokeWidth={5}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default FinanceChart;
