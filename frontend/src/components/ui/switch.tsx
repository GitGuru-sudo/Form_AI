"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        size === "default" ? "h-5 w-9" : "h-4 w-7",
        "data-unchecked:bg-slate-700 data-checked:bg-indigo-600",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform",
          size === "default" ? "h-4 w-4" : "h-3 w-3",
          "data-unchecked:translate-x-0.5 data-checked:translate-x-[calc(100%+2px)]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
