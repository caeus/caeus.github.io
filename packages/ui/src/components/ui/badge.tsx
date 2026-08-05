import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '#lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
        secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        outline: 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
      }
    },
    defaultVariants: { variant: 'secondary' }
  }
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
