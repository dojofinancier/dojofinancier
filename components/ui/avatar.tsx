"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
)
Avatar.displayName = "Avatar"

interface AvatarImageProps extends Omit<React.ComponentProps<typeof Image>, "src" | "alt"> {
  src?: string | null
  alt?: string
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt = "", ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false)
    
    if (!src || hasError) {
      return null
    }
    
    return (
      <Image
        ref={ref}
        src={src}
        alt={alt}
        width={40}
        height={40}
        className={cn("aspect-square h-full w-full object-cover", className)}
        onError={() => setHasError(true)}
        unoptimized={src.startsWith('http') || src.startsWith('data:')} // Don't optimize external URLs or data URIs
        {...props}
      />
    )
  }
)
AvatarImage.displayName = "AvatarImage"

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className
      )}
      {...props}
    />
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }

