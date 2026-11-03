import {
  Beef,
  Droplets,
  Fish,
  Flame,
  Fuel,
  Leaf,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CategoryIcon } from "@/components/expenses/category-icon";
import type { SubcategoryExtraIconKey, SubcategoryMark } from "@/lib/expenses/subcategory-visual";

const EXTRA_ICON_COMPONENTS: Record<SubcategoryExtraIconKey, LucideIcon> = {
  beef: Beef,
  fish: Fish,
  wheat: Wheat,
  leaf: Leaf,
  flame: Flame,
  droplets: Droplets,
  zap: Zap,
  fuel: Fuel,
};

export function SubcategoryMark({
  mark,
  size = 22,
}: {
  mark: SubcategoryMark;
  size?: number;
}) {
  if (mark.kind === "emoji") {
    return (
      <span className="expense-option-emoji" aria-hidden>
        {mark.emoji}
      </span>
    );
  }

  if (mark.kind === "category-icon") {
    return <CategoryIcon icon={mark.icon} size={size} />;
  }

  const Icon = EXTRA_ICON_COMPONENTS[mark.icon];
  return <Icon size={size} aria-hidden />;
}
