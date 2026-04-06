import * as Icons from "lucide-react";

export function SafeIcon({ name, ...props }) {
  const Icon = Icons[name];

  if (!Icon) {
    console.warn("Invalid Lucide icon:", name);
    return <Icons.HelpCircle {...props} />;
  }

  return <Icon {...props} />;
}
