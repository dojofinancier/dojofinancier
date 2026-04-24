import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckInForm } from "./checkin-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

const EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

export default function CheckInPage({ params }: PageProps) {
  return (
    <Suspense fallback={<CheckInLoadingFallback />}>
      <CheckInPageContent params={params} />
    </Suspense>
  );
}

async function CheckInPageContent({ params }: PageProps) {
  const { token } = await params;
  if (!token) notFound();
  const checkIn = await prisma.dailyCheckIn.findUnique({
    where: { token },
    include: {
      enrollment: {
        select: {
          id: true,
          user: { select: { firstName: true, email: true } },
          product: { select: { course: { select: { title: true } } } },
        },
      },
      answers: {
        orderBy: { orderIndex: "asc" },
      },
      response: { select: { id: true } },
    },
  });

  if (!checkIn) notFound();

  const studentFirstName =
    checkIn.enrollment.user.firstName ||
    checkIn.enrollment.user.email.split("@")[0];

  // Already responded
  if (checkIn.response || checkIn.status === "RESPONDED") {
    return (
      <StatusShell
        title="Suivi quotidien déjà complété"
        body="Vous avez déjà répondu à ce suivi quotidien. Rendez-vous dans votre tableau de bord pour voir votre progression."
      />
    );
  }

  // Expired
  if (Date.now() - checkIn.scheduledFor.getTime() > EXPIRY_MS) {
    return (
      <StatusShell
        title="Lien expiré"
        body="Ce suivi quotidien a expiré. Un nouveau vous sera envoyé prochainement."
      />
    );
  }

  // Load adaptive question content for rendering
  const mcqIds = checkIn.answers
    .filter((a) => a.source === "MCQ")
    .map((a) => a.adaptiveQuestionId);
  const oeqIds = checkIn.answers
    .filter((a) => a.source === "OEQ")
    .map((a) => a.adaptiveQuestionId);

  const [mcqRows, oeqRows] = await Promise.all([
    mcqIds.length > 0
      ? prisma.adaptiveMcq.findMany({
          where: { id: { in: mcqIds } },
          select: {
            id: true,
            questionText: true,
            options: true,
            chapter: true,
            topic: true,
          },
        })
      : Promise.resolve([]),
    oeqIds.length > 0
      ? prisma.adaptiveOeq.findMany({
          where: { id: { in: oeqIds } },
          select: {
            id: true,
            questionText: true,
            chapter: true,
            topic: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const mcqById = new Map(mcqRows.map((r) => [r.id, r]));
  const oeqById = new Map(oeqRows.map((r) => [r.id, r]));

  const questions = checkIn.answers.map((a) => {
    if (a.source === "MCQ") {
      const src = mcqById.get(a.adaptiveQuestionId);
      return {
        answerId: a.id,
        source: "MCQ" as const,
        questionText: src?.questionText ?? "Question indisponible.",
        options: (src?.options as Record<string, string> | null) ?? {},
        chapter: a.adaptiveChapter,
        topic: a.adaptiveTopic,
      };
    }
    const src = oeqById.get(a.adaptiveQuestionId);
    return {
      answerId: a.id,
      source: "OEQ" as const,
      questionText: src?.questionText ?? "Question indisponible.",
      options: {},
      chapter: a.adaptiveChapter,
      topic: a.adaptiveTopic,
    };
  });

  return (
    <div className="min-h-screen bg-[#f5f7f9]">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-xl bg-[#00a63e] p-6 text-white shadow-sm">
          <p className="text-sm opacity-90">
            {checkIn.enrollment.product.course.title}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            Bonjour {studentFirstName}
          </h1>
          {checkIn.contextLineBody ? (
            <p className="mt-3 text-sm leading-relaxed opacity-95">
              {checkIn.contextLineBody}
            </p>
          ) : null}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <CheckInForm
            token={token}
            type={checkIn.type}
            questions={questions}
          />
        </div>
      </div>
    </div>
  );
}

function CheckInLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#f5f7f9]">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
        <div className="h-36 rounded-xl bg-slate-200/80 animate-pulse" />
        <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    </div>
  );
}

function StatusShell(props: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[#f5f7f9]">
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">{props.title}</h1>
        <p className="mt-4 text-slate-600">{props.body}</p>
      </div>
    </div>
  );
}
