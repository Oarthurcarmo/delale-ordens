import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ChefHat,
  Flame,
  Snowflake,
  Package,
  CheckCircle2,
  CircleCheck,
} from "lucide-react";

interface ProductionStatusBadgeProps {
  status:
    | "awaiting_start"
    | "in_preparation"
    | "in_oven"
    | "cooling"
    | "packaging"
    | "ready_for_pickup"
    | "completed"
    | null
    | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const statusConfig = {
  awaiting_start: {
    label: "Aguardando Início",
    icon: Clock,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  in_preparation: {
    label: "Em Preparação",
    icon: ChefHat,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  in_oven: {
    label: "No Forno",
    icon: Flame,
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  cooling: {
    label: "Esfriando",
    icon: Snowflake,
    className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  },
  packaging: {
    label: "Embalando",
    icon: Package,
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  ready_for_pickup: {
    label: "Pronto para Retirada",
    icon: CheckCircle2,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  completed: {
    label: "Concluído",
    icon: CircleCheck,
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
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

