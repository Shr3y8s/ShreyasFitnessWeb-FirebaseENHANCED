"use client";

import { Button } from '@/components/ui/button';
import { TimeRange } from '@/app/progress/page';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: '7D', label: '7D' },
    { value: '30D', label: '30D' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: '1Y' },
    { value: 'ALL', label: 'All' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ranges.map((range) => (
        <Button
          key={range.value}
          variant={value === range.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(range.value)}
          className={
            value === range.value
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'hover:bg-accent'
          }
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
