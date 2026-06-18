import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  variant?: 'primary' | 'secondary' | 'destructive' | 'warning';
}

const variantStyles = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-blue-100 text-blue-700',
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-amber-100 text-amber-700',
};

export function MetricCard({ title, value, icon: Icon, trend, variant = 'primary' }: MetricCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2 rounded-lg ${variantStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <span className={`text-xs font-medium flex items-center gap-1 ${
              trend.direction === 'up' ? 'text-green-600' : 'text-destructive'
            }`}>
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {trend.value}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl font-semibold">{value}</h3>
      </CardContent>
    </Card>
  );
}
