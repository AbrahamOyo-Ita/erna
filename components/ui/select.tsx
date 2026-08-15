'use client'

import { Select } from '@base-ui/react/select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type CustomSelectProps = {
  id?: string
  name?: string
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  ariaLabel: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function CustomSelect({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Choose an option',
  ariaLabel,
  required,
  disabled,
  className,
}: CustomSelectProps) {
  const items = options.map(option => ({ label: option.label, value: option.value }))

  return (
    <Select.Root
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={next => {
        if (next !== null) onValueChange?.(next)
      }}
      items={items}
      required={required}
      disabled={disabled}
    >
      <Select.Trigger className={cn('custom-select-trigger', className)} aria-label={ariaLabel}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="custom-select-icon"><ChevronDown aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="custom-select-positioner" sideOffset={7} alignItemWithTrigger={false}>
          <Select.Popup className="custom-select-popup">
            <Select.ScrollUpArrow className="custom-select-scroll"><ChevronUp aria-hidden="true" /></Select.ScrollUpArrow>
            <Select.List className="custom-select-list">
              {options.map(option => (
                <Select.Item
                  className="custom-select-item"
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="custom-select-check"><Check aria-hidden="true" /></Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
            <Select.ScrollDownArrow className="custom-select-scroll"><ChevronDown aria-hidden="true" /></Select.ScrollDownArrow>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
