import { useAppSelector } from "@/hooks/useRedux";

interface IDataPropsI {
  boys: number;
  girls: number;
}

const useChartFeatures = () => {
  const { themeMode } = useAppSelector((state) => state.theme);

  // Define colors for light and dark modes
  const colors =
    themeMode === "light"
      ? {
          total: "hsl(210 33% 96%)",
          boys: "hsl(var(--accent-strong))",
          girls: "hsl(var(--warning))",
        }
      : {
          total: "hsl(215 9% 9%)",
          boys: "hsl(var(--accent-strong))",
          girls: "hsl(var(--warning))",
        };

  const data = ({ boys, girls }: IDataPropsI) => [
    {
      name: "Total",
      count: boys + girls,
      fill: colors.total,
    },
    {
      name: "Girls",
      count: girls,
      fill: colors.girls,
    },
    {
      name: "Boys",
      count: boys,
      fill: colors.boys,
    },
  ];

  return { data };
};

export default useChartFeatures;
