"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple accordion context for managing open state
interface AccordionContextValue {
  type: "single" | "multiple"
  openItems: string[]
  toggleItem: (value: string) => void
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple"
  collapsible?: boolean
  defaultValue?: string | string[]
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ className, type = "single", collapsible = true, defaultValue, children, ...props }, ref) => {
    const [openItems, setOpenItems] = React.useState<string[]>(() => {
      if (defaultValue) {
        return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
      }
      return []
    })

    const toggleItem = React.useCallback((value: string) => {
      setOpenItems((prev) => {
        if (type === "single") {
          return prev.includes(value) && collapsible ? [] : [value]
        }
        return prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]
      })
    }, [type, collapsible])

    return (
      <AccordionContext.Provider value={{ type, openItems, toggleItem }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = "Accordion"

// Item context
const AccordionItemContext = React.createContext<{ value: string; isOpen: boolean } | null>(null)

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const accordionContext = React.useContext(AccordionContext)
    const isOpen = accordionContext?.openItems.includes(value) ?? false

    return (
      <AccordionItemContext.Provider value={{ value, isOpen }}>
        <div
          ref={ref}
          className={cn("border-b", className)}
          data-state={isOpen ? "open" : "closed"}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    )
  }
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const accordionContext = React.useContext(AccordionContext)
    const itemContext = React.useContext(AccordionItemContext)

    return (
      <div className="flex">
        <button
          ref={ref}
          type="button"
          className={cn(
            "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
            className
          )}
          data-state={itemContext?.isOpen ? "open" : "closed"}
          onClick={() => itemContext && accordionContext?.toggleItem(itemContext.value)}
          {...props}
        >
          {children}
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
        </button>
      </div>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const itemContext = React.useContext(AccordionItemContext)
    const isOpen = itemContext?.isOpen ?? false

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden text-sm transition-all",
          isOpen ? "animate-accordion-down" : "animate-accordion-up hidden"
        )}
        data-state={isOpen ? "open" : "closed"}
        {...props}
      >
        <div className={cn("pb-4 pt-0", className)}>{children}</div>
      </div>
    )
  }
)
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

