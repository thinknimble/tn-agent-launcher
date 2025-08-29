import { FC, TextareaHTMLAttributes } from 'react'
import { cn } from 'src/utils/style'

export const Textarea: FC<
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string
  }
> = ({ className, label, ...props }) => {
  return (
    <section className="flex w-full flex-col items-start">
      {label && <span className="mb-1 block text-sm font-medium text-primary">{label}</span>}
      <textarea
        className={cn([
          `w-full rounded-md border bg-white p-2`,
          `text-black placeholder:font-thin placeholder:text-slate-500 invalid:outline-none invalid:ring-2 invalid:ring-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300`,
          className,
        ])}
        {...props}
      />
    </section>
  )
}
