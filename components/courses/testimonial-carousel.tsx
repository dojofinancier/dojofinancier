"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  avatar?: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  autoRotate?: boolean;
  autoRotateInterval?: number;
}

export function TestimonialCarousel({
  testimonials,
  autoRotate = true,
  autoRotateInterval = 5000,
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate || isHovered || testimonials.length <= 1) return;

    const interval = setInterval(goToNext, autoRotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, autoRotateInterval, isHovered, goToNext, testimonials.length]);

  if (testimonials.length === 0) {
    return null;
  }

  // Get visible testimonials (3 at a time)
  const getVisibleTestimonials = () => {
    const visible = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % testimonials.length;
      visible.push(testimonials[index]);
    }
    return visible;
  };

  const visibleTestimonials = getVisibleTestimonials();

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Testimonials grid - 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visibleTestimonials.map((testimonial, idx) => (
          <div key={`${testimonial.id}-${idx}`} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 md:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              {/* Quote icon */}
              <Quote className="h-8 w-8 text-primary/40 mb-4" />
              
              {/* Testimonial text */}
              <blockquote className="text-base md:text-lg text-white/90 font-light leading-relaxed mb-6 min-h-[100px]">
                "{testimonial.text}"
              </blockquote>
              
              {/* Author info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                    {getInitials(testimonial.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold text-sm">{testimonial.name}</p>
                  {testimonial.role && (
                    <p className="text-white/60 text-xs">{testimonial.role}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {testimonials.length > 3 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 text-slate-600 hover:text-slate-900 hover:bg-white/80 h-12 w-12 rounded-full shadow-lg"
            onClick={goToPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 text-slate-600 hover:text-slate-900 hover:bg-white/80 h-12 w-12 rounded-full shadow-lg"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Dots indicator */}
      {testimonials.length > 3 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.ceil(testimonials.length / 3) }).map((_, groupIndex) => {
            const startIndex = groupIndex * 3;
            const isActive = currentIndex >= startIndex && currentIndex < startIndex + 3;
            return (
              <button
                key={groupIndex}
                onClick={() => goToSlide(startIndex)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  isActive
                    ? "bg-primary w-8"
                    : "bg-slate-300 hover:bg-slate-400"
                )}
                aria-label={`Go to testimonial group ${groupIndex + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}



