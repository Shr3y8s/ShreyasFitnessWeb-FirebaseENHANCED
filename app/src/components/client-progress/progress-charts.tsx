"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getRecentWeightLogs } from '@/lib/activity-api';
import { getUserProgressPhotos } from '@/lib/progress-photo-api';
import { Area, AreaChart, Brush, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import {
  ChartContainer,
} from '@/components/ui/chart';
import { Activity, Loader2, Camera, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { PhotoLightbox } from '@/components/progress-photos/PhotoLightbox';
import type { ProgressPhotoWithId, PhotoAngle } from '@/types/progress-photo';

interface ChartDataPoint {
  dateKey: string;  // YYYY-MM-DD format for unique X-axis
  month: string;
  year: string;
  date: string;  // Formatted for tooltip display
  weight: number;
  bodyFat: number | null;
  hasPhoto: boolean;  // NEW: Indicates if photo exists for this date
  photoData: ProgressPhotoWithId | null;  // NEW: Photo data if available
}

const chartConfig = {
  weight: {
    label: "Weight (lbs)",
    color: "hsl(var(--primary))",
  },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

/**
 * Shape recharts passes to custom `dot` / `activeDot` renderers.
 * `cx`/`cy` are optional in recharts' own types (a point can be unplaceable),
 * so we mirror that and bail out when they're missing.
 */
interface DotRenderProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}

/**
 * Renders a weight data point, plus a tappable camera marker when a progress
 * photo exists for that date.
 *
 * The camera marker's *visible* circle stays small so the chart doesn't get
 * cluttered, but an invisible larger circle sits behind it to provide a ~44px
 * touch target — a 24px marker is far too small to hit reliably with a finger.
 */
function PhotoDot({
  cx,
  cy,
  payload,
  onPhotoClick,
  emphasized = false,
}: DotRenderProps & {
  onPhotoClick: (photo: ProgressPhotoWithId, date: string) => void;
  emphasized?: boolean;
}) {
  if (cx === undefined || cy === undefined || !payload) return null;

  if (!payload.hasPhoto) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={emphasized ? 7 : 5}
        fill={emphasized ? 'oklch(65% 0.16 151)' : 'oklch(1 0 0)'}
        stroke={emphasized ? 'oklch(1 0 0)' : 'oklch(65% 0.16 151)'}
        strokeWidth={2}
      />
    );
  }

  const iconY = cy - 20;
  const r = emphasized ? 14 : 12;
  const iconSize = emphasized ? 20 : 18;

  return (
    <g>
      {/* Data point dot on the line */}
      <circle
        cx={cx}
        cy={cy}
        r={emphasized ? 5 : 4}
        fill="oklch(65% 0.16 151)"
        stroke="oklch(1 0 0)"
        strokeWidth={emphasized ? 2.5 : 2}
      />
      {/* Connector from dot up to the camera marker */}
      <line
        x1={cx}
        y1={cy}
        x2={cx}
        y2={iconY + r}
        stroke="oklch(65% 0.16 151)"
        strokeWidth={emphasized ? 2 : 1.5}
        strokeDasharray="2,2"
      />
      <g
        onClick={(e) => {
          e.stopPropagation();
          if (payload.photoData) onPhotoClick(payload.photoData, payload.dateKey);
        }}
        style={{ cursor: 'pointer' }}
        role="button"
        aria-label={`View progress photo from ${payload.date}`}
      >
        {/* Invisible 44px touch target */}
        <circle cx={cx} cy={iconY} r={22} fill="transparent" />
        <circle
          cx={cx}
          cy={iconY}
          r={r}
          fill="oklch(65% 0.16 151)"
          stroke="oklch(1 0 0)"
          strokeWidth={emphasized ? 3 : 2.5}
          style={{
            filter: emphasized
              ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            transition: 'all 0.2s ease',
          }}
        />
        <Camera
          x={cx - iconSize / 2}
          y={iconY - iconSize / 2}
          width={iconSize}
          height={iconSize}
          style={{ fill: 'white', pointerEvents: 'none' }}
        />
      </g>
    </g>
  );
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-card/60 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg min-w-[150px]">
        <p className="text-sm font-semibold mb-1 text-primary">{data.date}</p>
        <div className="space-y-1 text-xs">
          <div>
            <p className="font-medium text-muted-foreground">Weight</p>
            <p className="font-semibold text-foreground">{`${data.weight} lbs`}</p>
          </div>
          {data.bodyFat && (
            <div>
              <p className="font-medium text-muted-foreground">Body Fat</p>
              <p className="font-semibold text-foreground">{`${data.bodyFat}%`}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export function ProgressCharts() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  /**
   * Mobile gets a shorter chart (a fixed 300px box minus axis labels leaves a
   * cramped plot area) and hides the `Brush` date-range slider entirely — its
   * ~10px drag handles are not realistically usable with a finger, and dragging
   * them fights the page's vertical scroll. Range exploration is still available
   * via the fullscreen view.
   */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const [totalChange, setTotalChange] = useState<{ diff: number; percent: number } | null>(null);
  const [recentChange, setRecentChange] = useState<{ diff: number; percent: number } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    date: string;
    angle: PhotoAngle;
    metrics?: ProgressPhotoWithId['associatedMetrics'];
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadWeightData = async () => {
      try {
        setLoading(true);
        
        // Fetch weight logs and progress photos
        const [weights, photos] = await Promise.all([
          getRecentWeightLogs(user.uid, 100),
          getUserProgressPhotos(user.uid)
        ]);
        
        if (weights.length === 0) {
          setChartData([]);
          setTotalChange(null);
          setRecentChange(null);
          setLoading(false);
          return;
        }

        // Create a map for quick photo lookup by date
        const photosByDate = new Map<string, ProgressPhotoWithId>(
          photos.map(photo => [photo.date, photo])
        );

        // Sort by date (oldest first)
        const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));

        // Transform to chart format
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const transformed: ChartDataPoint[] = sorted.map((log) => {
          // Parse date string (YYYY-MM-DD) properly to avoid timezone issues
          const [year, month, day] = log.date.split('-').map(Number);
          
          // Convert to lbs for consistency in chart
          let weightInLbs = log.weight;
          if (log.unit === 'kg') {
            weightInLbs = log.weight * 2.20462;
          }

          const photoData = photosByDate.get(log.date) || null;

          return {
            dateKey: log.date,  // YYYY-MM-DD - unique and sortable
            month: monthShort[month - 1],
            year: year.toString(),
            date: `${monthNames[month - 1]} ${day}, ${year}`,
            weight: Math.round(weightInLbs * 10) / 10, // Round to 1 decimal
            bodyFat: log.bodyFat || null, // Use actual body fat from API
            hasPhoto: !!photoData,  // NEW: Boolean flag
            photoData: photoData  // NEW: Photo data reference
          };
        });

        setChartData(transformed);

        // Calculate total change (from start to latest)
        if (transformed.length >= 2) {
          const firstWeight = transformed[0].weight;
          const lastWeight = transformed[transformed.length - 1].weight;
          const totalDiff = lastWeight - firstWeight;
          const totalPercent = ((lastWeight - firstWeight) / firstWeight) * 100;
          
          setTotalChange({
            diff: Math.round(totalDiff * 10) / 10,
            percent: Math.round(totalPercent * 10) / 10
          });

          // Calculate recent change (from second-to-last to last)
          const secondLastWeight = transformed[transformed.length - 2].weight;
          const recentDiff = lastWeight - secondLastWeight;
          const recentPercent = ((lastWeight - secondLastWeight) / secondLastWeight) * 100;
          
          setRecentChange({
            diff: Math.round(recentDiff * 10) / 10,
            percent: Math.round(recentPercent * 10) / 10
          });
        } else {
          setTotalChange(null);
          setRecentChange(null);
        }

      } catch (error) {
        console.error('Error loading weight data:', error);
        setChartData([]);
        setTotalChange(null);
        setRecentChange(null);
      } finally {
        setLoading(false);
      }
    };

    loadWeightData();
  }, [user]);

  const handlePhotoClick = (photoData: ProgressPhotoWithId, date: string) => {
    // Get the first available photo angle (prefer front, then side, then back)
    const angle: PhotoAngle = photoData.photos.front ? 'front' : 
                              photoData.photos.side ? 'side' : 'back';
    const photoUrl = photoData.photos[angle]?.url || '';

    if (photoUrl) {
      setSelectedPhoto({
        url: photoUrl,
        date: date,
        angle: angle,
        metrics: photoData.associatedMetrics
      });
      setLightboxOpen(true);
    }
  };

  if (loading) {
    return (
      <Card className="bg-primary/5 border-primary/50 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
        <CardHeader>
          <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Progress Overview
          </h3>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-primary/5 border-primary/50 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
        <CardHeader>
          <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Progress Overview
          </h3>
          <CardDescription>
            Your body composition changes over time.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No weight data available yet.</p>
          <p className="text-sm mt-2">Start logging your weight in the Daily Activities page!</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate Y-axis domain with padding
  const weights = chartData.map(d => d.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const padding = (maxWeight - minWeight) * 0.1 || 5; // 10% padding or 5 lbs minimum
  const yMin = Math.floor(minWeight - padding);
  const yMax = Math.ceil(maxWeight + padding);

  return (
    <Card className="bg-primary/5 border-primary/50 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="space-y-1 min-w-0 flex-1">
          {/* Fullscreen button lives beside the heading (not inside the <h3>) so it
              doesn't inherit heading layout, and is a proper 44px tap target. */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg sm:text-xl font-semibold leading-tight tracking-tight flex items-center gap-2 min-w-0">
              <Activity className="h-5 w-5 shrink-0 text-primary" />
              Progress Overview
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullscreenOpen(true)}
              className="size-11 shrink-0 transition-transform active:scale-95"
              title="View Fullscreen"
              aria-label="View chart fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Your body composition changes over {chartData.length > 30 ? 'the last several months' : 'time'}.
          </CardDescription>
        </div>
        {/* Callout Boxes - Side by Side */}
        {totalChange && recentChange && (
          <div className="flex w-full sm:w-auto gap-2 shrink-0">

            {/* From Start */}
            <div className={`${
              totalChange.diff < 0 
                ? 'bg-green-50 dark:bg-green-950/20' 
                : totalChange.diff > 0 
                ? 'bg-amber-50 dark:bg-amber-950/20'
                : 'bg-gray-50 dark:bg-gray-950/20'
            } rounded-lg p-2 sm:p-2.5 shadow-lg border border-border/50 flex-1 min-w-0 sm:flex-none sm:min-w-[110px]`}>
              <p className={`text-base sm:text-lg font-bold tabular-nums ${
                totalChange.diff < 0 

                  ? 'text-green-600 dark:text-green-500' 
                  : totalChange.diff > 0 
                  ? 'text-amber-600 dark:text-amber-500'
                  : 'text-gray-600 dark:text-gray-500'
              }`}>
                {totalChange.diff > 0 ? '+' : ''}{totalChange.diff} lbs
              </p>
              <p className={`text-xs font-semibold ${
                totalChange.diff < 0 
                  ? 'text-green-600 dark:text-green-500' 
                  : totalChange.diff > 0 
                  ? 'text-amber-600 dark:text-amber-500'
                  : 'text-gray-600 dark:text-gray-500'
              }`}>
                ({totalChange.percent > 0 ? '+' : ''}{totalChange.percent}%)
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">From Start</p>
            </div>
            
            {/* Recent Change */}
            <div className={`${
              recentChange.diff < 0 
                ? 'bg-green-50 dark:bg-green-950/20' 
                : recentChange.diff > 0 
                ? 'bg-amber-50 dark:bg-amber-950/20'
                : 'bg-gray-50 dark:bg-gray-950/20'
            } rounded-lg p-2 sm:p-2.5 shadow-lg border border-border/50 flex-1 min-w-0 sm:flex-none sm:min-w-[110px]`}>
              <p className={`text-base sm:text-lg font-bold tabular-nums ${
                recentChange.diff < 0 
                  ? 'text-green-600 dark:text-green-500' 

                  : recentChange.diff > 0 
                  ? 'text-amber-600 dark:text-amber-500'
                  : 'text-gray-600 dark:text-gray-500'
              }`}>
                {recentChange.diff > 0 ? '+' : ''}{recentChange.diff} lbs
              </p>
              <p className={`text-xs font-semibold ${
                recentChange.diff < 0 
                  ? 'text-green-600 dark:text-green-500' 
                  : recentChange.diff > 0 
                  ? 'text-amber-600 dark:text-amber-500'
                  : 'text-gray-600 dark:text-gray-500'
              }`}>
                ({recentChange.percent > 0 ? '+' : ''}{recentChange.percent}%)
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Since Last Log</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} height={isMobile ? 240 : 300}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 4,
              right: isMobile ? 12 : 24,
              bottom: 5
            }}
          >
            <defs>
              <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="brushGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.25} />
                <stop offset="50%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.25} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="dateKey"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={24}
              tickFormatter={(value) => {
                // Format YYYY-MM-DD to "MMM DD"
                const [year, month, day] = value.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
              }}
              tick={{ fontSize: 11, fontWeight: 600 }}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={44}
              tickCount={5}
              domain={[yMin, yMax]}
              tickFormatter={(value) => `${value} lbs`}
              stroke="oklch(65% 0.16 151)"
              tick={{ fontSize: 11, fontWeight: 600 }}
            />
            <Tooltip
              cursor={false}
              content={<CustomTooltip />}
            />
            <Area
              yAxisId="left"
              dataKey="weight"
              type="natural"
              fill="url(#colorWeight)"
              fillOpacity={0.6}
              stroke="oklch(65% 0.16 151)"
              strokeWidth={2.5}
              name="Weight"
              dot={(props: DotRenderProps) => (
                <PhotoDot {...props} onPhotoClick={handlePhotoClick} />
              )}
              activeDot={(props: DotRenderProps) => (
                <PhotoDot {...props} onPhotoClick={handlePhotoClick} emphasized />
              )}
            />
            {/* Brush for zooming into date ranges — desktop only (see isMobile note) */}
            {chartData.length > 7 && !isMobile && (
              <Brush
                dataKey="dateKey"
                height={40}
                stroke="oklch(65% 0.16 151)"
                fill="url(#brushGradient)"
                travellerWidth={10}
                tickFormatter={(value) => {
                  const [year, month, day] = value.split('-');
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
                }}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <PhotoLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          photoUrl={selectedPhoto.url}
          date={selectedPhoto.date}
          angle={selectedPhoto.angle}
          associatedMetrics={selectedPhoto.metrics}
        />
      )}

      {/* Fullscreen Chart Dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="!max-w-none w-[95vw] h-[95vh] !p-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-primary" />
            Progress Overview
          </DialogTitle>
          <div className="w-full" style={{ height: 'calc(95vh - 80px)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 10,
                  right: 10,
                  bottom: 5
                }}
              >
                <defs>
                  <linearGradient id="colorWeightFS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="brushGradientFS" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.25} />
                    <stop offset="50%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="oklch(65% 0.16 151)" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="dateKey"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => {
                    const [year, month, day] = value.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
                  }}
                  tick={{ fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickCount={5}
                  domain={[yMin, yMax]}
                  tickFormatter={(value) => `${value} lbs`}
                  stroke="oklch(65% 0.16 151)"
                  tick={{ fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip
                  cursor={false}
                  content={<CustomTooltip />}
                />
                <Area
                  yAxisId="left"
                  dataKey="weight"
                  type="natural"
                  fill="url(#colorWeightFS)"
                  fillOpacity={0.6}
                  stroke="oklch(65% 0.16 151)"
                  strokeWidth={2.5}
                  name="Weight"
                  dot={(props: DotRenderProps) => (
                    <PhotoDot {...props} onPhotoClick={handlePhotoClick} />
                  )}
                  activeDot={(props: DotRenderProps) => (
                    <PhotoDot {...props} onPhotoClick={handlePhotoClick} emphasized />
                  )}
                />
                {chartData.length > 7 && (
                  <Brush
                    dataKey="dateKey"
                    height={40}
                    stroke="oklch(65% 0.16 151)"
                    fill="url(#brushGradientFS)"
                    travellerWidth={10}
                    tickFormatter={(value) => {
                      const [year, month, day] = value.split('-');
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
                    }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
