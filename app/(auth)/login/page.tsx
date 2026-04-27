import { LoginForm } from "./login-form";
import { Suspense } from "react";
import { LoginPageContent } from "./login-page-content";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginForm next={null} tab={null} />}>
      <LoginPageContent />
    </Suspense>
  );
}

