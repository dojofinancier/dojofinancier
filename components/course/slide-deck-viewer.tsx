"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

interface SlideDeckViewerProps {
  slideImages: string[];
}

export function SlideDeckViewer({ slideImages }: SlideDeckViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const total = slideImages.length;

  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < total) setCurrentIndex(index);
    },
    [total]
  );

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext]);

  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Aucune diapositive disponible pour ce module.
          </p>
        </CardContent>
      </Card>
    );
  }

  const slideContent = (
    <>
      {/* Slide image */}
      <div
        className={`relative bg-black flex items-center justify-center ${
          isFullscreen ? "flex-1 min-h-0" : "aspect-[16/9]"
        } rounded-lg overflow-hidden`}
      >
        <img
          src={slideImages[currentIndex]}
          alt={`Diapositive ${currentIndex + 1} sur ${total}`}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />

        {/* Prev / Next overlay buttons (large click areas) */}
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="absolute left-0 top-0 h-full w-1/5 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity disabled:pointer-events-none"
          aria-label="Diapositive précédente"
        >
          <span className="bg-black/50 text-white rounded-full p-2">
            <ChevronLeft className="h-6 w-6" />
          </span>
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex === total - 1}
          className="absolute right-0 top-0 h-full w-1/5 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity disabled:pointer-events-none"
          aria-label="Diapositive suivante"
        >
          <span className="bg-black/50 text-white rounded-full p-2">
            <ChevronRight className="h-6 w-6" />
          </span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Précédent
        </Button>

        <div className="flex items-center gap-3">
          <Select
            value={currentIndex.toString()}
            onValueChange={(v) => goTo(Number(v))}
          >
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {slideImages.map((_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  Diapo {i + 1} / {total}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsFullscreen((f) => !f)}
            aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goNext}
          disabled={currentIndex === total - 1}
        >
          Suivant
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-200"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col gap-4 p-4">
        {slideContent}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">{slideContent}</CardContent>
    </Card>
  );
}
