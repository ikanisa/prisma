import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from './chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';

const SAMPLE_CONFIG: ChartConfig = {
  promoters: {
    label: 'Promoters',
    theme: {
      light: '#16a34a',
      dark: '#22c55e',
    },
  },
  passives: {
    label: 'Passives',
    theme: {
      light: '#60a5fa',
      dark: '#93c5fd',
    },
  },
  detractors: {
    label: 'Detractors',
    theme: {
      light: '#f97316',
      dark: '#fb923c',
    },
  },
};

const SAMPLE_DATA = [
  { bucket: 'Promoters', bucketKey: 'promoters', count: 28 },
  { bucket: 'Passives', bucketKey: 'passives', count: 14 },
  { bucket: 'Detractors', bucketKey: 'detractors', count: 8 },
];

const ChartStory = ({ theme }: { theme: 'light' | 'dark' }) => {
  const wrapperClassName =
    theme === 'dark'
      ? 'dark bg-slate-950 text-white'
      : 'bg-white text-slate-900';

  return (
    <div className={`${wrapperClassName} w-full`}> 
      <div className="mx-auto max-w-xl p-6">
        <ChartContainer
          config={SAMPLE_CONFIG}
          theme={theme}
          className="h-64 w-full aspect-auto rounded-xl border bg-background"
        >
          <BarChart data={SAMPLE_DATA}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent labelKey="bucketKey" />} />
            <Bar dataKey="count" name="Responses">
              {SAMPLE_DATA.map((entry) => (
                <Cell
                  key={entry.bucketKey}
                  fill={`var(--color-${entry.bucketKey})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
};

export default {
  title: 'Components/ChartContainer',
  component: ChartStory,
  parameters: {
    layout: 'centered',
  },
};

export const LightTheme = {
  render: () => <ChartStory theme="light" />,
};

export const DarkTheme = {
  render: () => <ChartStory theme="dark" />,
};
