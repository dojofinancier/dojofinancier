"use client";

import { CaseStudyList } from "../case-study-list";
import { CaseStudyPlayer } from "../case-study-player";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface CaseStudiesToolProps {
  courseId: string;
  onBack: () => void;
  onStartCaseStudy?: (caseStudyId: string, timeLimit: number | null) => void;
}

export function CaseStudiesTool({ courseId, onBack, onStartCaseStudy }: CaseStudiesToolProps) {
  const [selectedCaseStudyId, setSelectedCaseStudyId] = useState<string | null>(null);
  const [selectedTimeLimit, setSelectedTimeLimit] = useState<number | null>(null);

  const handleStartCaseStudy = (caseStudyId: string, timeLimit: number | null) => {
    if (onStartCaseStudy) {
      onStartCaseStudy(caseStudyId, timeLimit);
    } else {
      setSelectedCaseStudyId(caseStudyId);
      setSelectedTimeLimit(timeLimit);
    }
  };

  if (selectedCaseStudyId) {
    return (
      <CaseStudyPlayer
        caseStudyId={selectedCaseStudyId}
        timeLimit={selectedTimeLimit}
        onExit={() => {
          setSelectedCaseStudyId(null);
          setSelectedTimeLimit(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Études de cas</h1>
          <p className="text-muted-foreground mt-1">
            Analysez des scénarios réels et répondez à des questions basées sur le récit
          </p>
        </div>
      </div>
      <CaseStudyList courseId={courseId} onStartCaseStudy={handleStartCaseStudy} />
    </div>
  );
}
