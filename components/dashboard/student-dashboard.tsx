"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Calendar, HelpCircle, Menu, ClipboardCheck } from "lucide-react";
const CoursesTab = lazy(() => import("./tabs/courses-tab").then((m) => ({ default: m.CoursesTab })));
const ProfileTab = lazy(() => import("./tabs/profile-tab").then((m) => ({ default: m.ProfileTab })));
const AppointmentsTab = lazy(() => import("./tabs/appointments-tab").then((m) => ({ default: m.AppointmentsTab })));
const SupportTab = lazy(() => import("./tabs/support-tab").then((m) => ({ default: m.SupportTab })));
const AccompagnementTab = lazy(() => import("@/components/accompagnement/student-accompagnement-tab").then((m) => ({ default: m.StudentAccompagnementTab })));

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
};

type Enrollment = {
  id: string;
  courseId: string;
  purchaseDate: Date;
  expiresAt: Date;
  course: {
    id: string;
    title: string;
    code: string | null;
    slug: string | null;
    category: {
      name: string;
    };
  };
};

interface StudentDashboardProps {
  user: User;
  initialEnrollments: Enrollment[];
}

const TabLoading = () => (
  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
    Chargement...
  </div>
);

export function StudentDashboard({
  user,
  initialEnrollments,
}: StudentDashboardProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "courses" | "profile" | "appointments" | "support" | "accompagnement"
  >("courses");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" || tab === "appointments" || tab === "support" || tab === "accompagnement") {
      setActiveTab(tab);
    }
    // Legacy deep link
    if (tab === "suivi") {
      setActiveTab("accompagnement");
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          Tableau de bord
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Bienvenue, {user.firstName || user.lastName ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : user.email}
        </p>
      </div>

      {/* Navigation Tabs - Hamburger Menu on Mobile, Tabs on Desktop */}
      <div className="mb-6 md:mb-8">
        {/* Mobile: Hamburger Menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  {activeTab === "courses" && (
                    <>
                      <BookOpen className="h-4 w-4" />
                      Formations
                    </>
                  )}
                  {activeTab === "profile" && (
                    <>
                      <User className="h-4 w-4" />
                      Mon profil
                    </>
                  )}
                  {activeTab === "appointments" && (
                    <>
                      <Calendar className="h-4 w-4" />
                      Coaching
                    </>
                  )}
                  {activeTab === "support" && (
                    <>
                      <HelpCircle className="h-4 w-4" />
                      Support
                    </>
                  )}
                  {activeTab === "accompagnement" && (
                    <>
                      <ClipboardCheck className="h-4 w-4" />
                      Accompagnement
                    </>
                  )}
                </span>
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuItem
                onClick={() => setActiveTab("courses")}
                className={activeTab === "courses" ? "bg-accent" : ""}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Formations
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTab("profile")}
                className={activeTab === "profile" ? "bg-accent" : ""}
              >
                <User className="h-4 w-4 mr-2" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTab("appointments")}
                className={activeTab === "appointments" ? "bg-accent" : ""}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Coaching
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTab("support")}
                className={activeTab === "support" ? "bg-accent" : ""}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Support
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTab("accompagnement")}
                className={activeTab === "accompagnement" ? "bg-accent" : ""}
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Accompagnement
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop: Horizontal Buttons */}
        <div className="hidden md:flex flex-wrap gap-2">
          <Button
            variant={activeTab === "courses" ? "default" : "outline"}
            onClick={() => setActiveTab("courses")}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Formations
          </Button>
          <Button
            variant={activeTab === "profile" ? "default" : "outline"}
            onClick={() => setActiveTab("profile")}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Mon profil
          </Button>
          <Button
            variant={activeTab === "appointments" ? "default" : "outline"}
            onClick={() => setActiveTab("appointments")}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Coaching
          </Button>
          <Button
            variant={activeTab === "support" ? "default" : "outline"}
            onClick={() => setActiveTab("support")}
            className="flex items-center gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Support
          </Button>
          <Button
            variant={activeTab === "accompagnement" ? "default" : "outline"}
            onClick={() => setActiveTab("accompagnement")}
            className="flex items-center gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            Accompagnement
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "courses" && (
          <Suspense fallback={<TabLoading />}>
            <CoursesTab enrollments={initialEnrollments} />
          </Suspense>
        )}
        {activeTab === "profile" && (
          <Suspense fallback={<TabLoading />}>
            <ProfileTab user={user} />
          </Suspense>
        )}
        {activeTab === "appointments" && (
          <Suspense fallback={<TabLoading />}>
            <AppointmentsTab />
          </Suspense>
        )}
        {activeTab === "support" && (
          <Suspense fallback={<TabLoading />}>
            <SupportTab />
          </Suspense>
        )}
        {activeTab === "accompagnement" && (
          <Suspense fallback={<TabLoading />}>
            <AccompagnementTab />
          </Suspense>
        )}
      </div>
    </div>
  );
}

