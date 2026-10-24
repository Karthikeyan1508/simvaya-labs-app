import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding font-medium tracking-[-0.005em] whitespace-nowrap select-none outline-none transition-[background-color,box-shadow,transform,color,border-color,filter] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-(image:--gradient-amber) font-semibold text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_1px_2px_rgb(120_53_15/0.25),0_8px_20px_-10px_rgb(217_119_6/0.85)] hover:brightness-[1.05] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_1px_2px_rgb(120_53_15/0.3),0_12px_24px_-10px_rgb(217_119_6/0.95)]",
        outline:
          "border-border bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05)] hover:border-foreground/20 hover:bg-foreground/[0.04] aria-expanded:bg-foreground/[0.04] dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1] aria-expanded:bg-foreground/[0.1]",
        ghost:
          "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground aria-expanded:bg-foreground/[0.05] aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/25 dark:bg-destructive/20 dark:hover:bg-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        sm: "h-8 gap-1.5 px-3 text-[13px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 px-5 text-[15px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
