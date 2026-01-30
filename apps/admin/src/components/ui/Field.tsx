import { useMemo, type ReactNode, type HTMLAttributes } from 'react'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

/**
 * FieldSet - Groups related fields with an optional legend
 */
interface FieldSetProps extends HTMLAttributes<HTMLFieldSetElement> {
  legend?: string
  description?: string
  children: ReactNode
}

export function FieldSet({ legend, description, children, className, ...props }: FieldSetProps) {
  return (
    <fieldset className={cn('space-y-4', className)} {...props}>
      {legend && (
        <legend className={cn('font-medium text-base', description ? 'mb-1' : 'mb-3')}>
          {legend}
        </legend>
      )}
      {description && (
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}

/**
 * FieldGroup - Layout container for form fields
 */
type FieldGroupOrientation = 'vertical' | 'horizontal'

interface FieldGroupProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: FieldGroupOrientation
  children: ReactNode
}

export function FieldGroup({
  orientation = 'vertical',
  children,
  className,
  ...props
}: FieldGroupProps) {
  return (
    <div
      className={cn(
        orientation === 'horizontal'
          ? 'flex flex-wrap items-start gap-4'
          : 'flex flex-col gap-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Field - Single field wrapper with proper data attributes
 */
interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  isInvalid?: boolean
  isDisabled?: boolean
  isRequired?: boolean
  orientation?: FieldGroupOrientation
  children: ReactNode
}

export function Field({
  isInvalid,
  isDisabled,
  isRequired,
  orientation = 'vertical',
  children,
  className,
  ...props
}: FieldProps) {
  return (
    <div
      role="group"
      data-slot="field"
      data-invalid={isInvalid || undefined}
      data-disabled={isDisabled || undefined}
      data-required={isRequired || undefined}
      data-orientation={orientation}
      className={cn(
        orientation === 'horizontal'
          ? 'flex items-center gap-3'
          : 'flex flex-col gap-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * FieldLabel - Accessible label for form fields
 */
interface FieldLabelProps {
  htmlFor?: string
  isRequired?: boolean
  children: ReactNode
  className?: string
}

export function FieldLabel({ htmlFor, isRequired, children, className }: FieldLabelProps) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn('flex items-center gap-1', className)}
    >
      {children}
      {isRequired && (
        <span className="text-destructive" aria-hidden="true">*</span>
      )}
    </Label>
  )
}

/**
 * FieldDescription - Helper text for form fields
 */
interface FieldDescriptionProps {
  children: ReactNode
  className?: string
}

export function FieldDescription({ children, className }: FieldDescriptionProps) {
  return (
    <p
      data-slot="field-description"
      className={cn('text-xs text-muted-foreground leading-tight', className)}
    >
      {children}
    </p>
  )
}

/**
 * FieldError - Error display with proper ARIA attributes
 */
interface FieldErrorProps {
  children?: ReactNode
  errors?: Array<{ message?: string } | undefined>
  className?: string
}

export function FieldError({ children, errors, className }: FieldErrorProps) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors || errors.length === 0) {
      return null
    }

    const validErrors = errors.filter((e) => e?.message)

    if (validErrors.length === 0) {
      return null
    }

    if (validErrors.length === 1 && validErrors[0]?.message) {
      return validErrors[0].message
    }

    return (
      <ul className="list-disc pl-4">
        {validErrors.map((error, index) => (
          <li key={index}>{error?.message}</li>
        ))}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn('text-sm text-destructive', className)}
    >
      {content}
    </p>
  )
}

/**
 * FieldSeparator - Visual separator between field groups
 */
interface FieldSeparatorProps {
  children?: ReactNode
}

export function FieldSeparator({ children }: FieldSeparatorProps) {
  if (!children) {
    return <Separator className="my-4" />
  }

  return (
    <div className="flex items-center my-4 gap-2">
      <Separator className="flex-1" />
      <span className="text-xs text-muted-foreground uppercase font-medium whitespace-nowrap px-2">
        {children}
      </span>
      <Separator className="flex-1" />
    </div>
  )
}
