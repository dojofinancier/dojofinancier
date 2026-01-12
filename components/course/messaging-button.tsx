"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { MessagingDialog } from "./messaging-dialog";

interface MessagingButtonProps {
  contentItemId: string;
  courseId: string;
}

export function MessagingButton({ contentItemId, courseId }: MessagingButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg h-14 w-14"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
      {open && (
        <MessagingDialog
          open={open}
          onOpenChange={setOpen}
          contentItemId={contentItemId}
          courseId={courseId}
        />
      )}
    </>
  );
}

