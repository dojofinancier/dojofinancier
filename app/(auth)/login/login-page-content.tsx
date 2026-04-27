"use client";

import { useSearchParams } from "next/navigation";
import { LoginForm } from "./login-form";

export function LoginPageContent() {
  const searchParams = useSearchParams();

  return (
    <LoginForm
      next={searchParams.get("next")}
      tab={searchParams.get("tab")}
    />
  );
}
