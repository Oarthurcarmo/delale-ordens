import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ChefHat,
  CheckCircle2,
} from "lucide-react";

interface ProductionStatusBadgeProps {
  status:
    | "awaiting_start"
    | "in_progress"
    | "completed"
    | null
    | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const statusConfig = {
  awaiting_start: {
    label: "AGUARDANDO INÍCIO",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  in_progress: {
    label: "FAZENDO",
    icon: ChefHat,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  completed: {
    label: "FEITO",
    icon: CheckCircle2,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
};

export function ProductionStatusBadge({
  status,
  size = "md",
  showIcon = true,
}: ProductionStatusBadgeProps) {
  if (!status) {
    return null;
  }

  const config = statusConfig[status];
  if (!config) {
    return null;
  }

  const Icon = config.icon;
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Badge
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1.5 font-medium border-0`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </Badge>
  );
}

