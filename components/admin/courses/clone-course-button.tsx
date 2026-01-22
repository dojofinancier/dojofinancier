"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { CloneCourseDialog } from "./clone-course-dialog";

interface CloneCourseButtonProps {
  courseId: string;
  courseTitle: string;
  courseCode?: string | null;
  categoryId: string;
}

export function CloneCourseButton({
  courseId,
  courseTitle,
  courseCode,
  categoryId,
}: CloneCourseButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <Copy className="h-4 w-4" />
        Cloner ce cours
      </Button>
      <CloneCourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sourceCourseId={courseId}
        sourceCourseTitle={courseTitle}
        sourceCourseCode={courseCode}
        sourceCategoryId={categoryId}
      />
    </>
  );
}
