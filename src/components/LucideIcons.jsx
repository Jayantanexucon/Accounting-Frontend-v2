import * as LucideIcons from "lucide-react";
import { SafeIcon } from "./SafeIcon";

export default function IconGrid() {
  return (
    <div className="grid grid-cols-8 gap-3">
      {Object.keys(LucideIcons).map((name) => {
        const Icon = LucideIcons[name];

        if (!Icon) return null; // safety

        return (
          <div key={name} className="flex flex-col items-center">
            <SafeIcon name={LucideIcons[name]} className="w-5 h-5" />
            <span className="text-xs">{name}</span>
          </div>
        );
      })}
    </div>
  );
}
