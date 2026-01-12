"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Calendar, HelpCircle, Menu, GraduationCap } from "lucide-react";
import { CoursesTab } from "./tabs/courses-tab";
import { CohortsTab } from "./tabs/cohorts-tab";
import { ProfileTab } from "./tabs/profile-tab";
import { AppointmentsTab } from "./tabs/appointments-tab";
import { SupportTab } from "./tabs/support-tab";

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

type CohortEnrollment = {
  id: string;
  cohortId: string;
  purchaseDate: Date;
  expiresAt: Date;
  cohort: {
    id: string;
    title: string;
    slug: string | null;
    instructor: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  };
};

interface StudentDashboardProps {
  user: User;
  initialEnrollments: Enrollment[];
  initialCohortEnrollments?: CohortEnrollment[];
}

export function StudentDashboard({
  user,
  initialEnrollments,
  initialCohortEnrollments = [],
}: StudentDashboardProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"courses" | "cohorts" | "profile" | "appointments" | "support">("courses");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "cohorts" || tab === "profile" || tab === "appointments" || tab === "support") {
      setActiveTab(tab);
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
                  {activeTab === "cohorts" && (
                    <>
                      <GraduationCap className="h-4 w-4" />
                      Cohortes
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
                      Rendez-vous
                    </>
                  )}
                  {activeTab === "support" && (
                    <>
                      <HelpCircle className="h-4 w-4" />
                      Support
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
                onClick={() => setActiveTab("cohorts")}
                className={activeTab === "cohorts" ? "bg-accent" : ""}
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Cohortes
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
                Rendez-vous
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTab("support")}
                className={activeTab === "support" ? "bg-accent" : ""}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Support
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
            variant={activeTab === "cohorts" ? "default" : "outline"}
            onClick={() => setActiveTab("cohorts")}
            className="flex items-center gap-2"
          >
            <GraduationCap className="h-4 w-4" />
            Cohortes
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
            Rendez-vous
          </Button>
          <Button
            variant={activeTab === "support" ? "default" : "outline"}
            onClick={() => setActiveTab("support")}
            className="flex items-center gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Support
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "courses" && (
          <CoursesTab
            enrollments={initialEnrollments}
            cohortEnrollments={[]}
          />
        )}
        {activeTab === "cohorts" && (
          <CohortsTab cohortEnrollments={initialCohortEnrollments} />
        )}
        {activeTab === "profile" && <ProfileTab user={user} />}
        {activeTab === "appointments" && <AppointmentsTab />}
        {activeTab === "support" && <SupportTab />}
      </div>
    </div>
  );
}

