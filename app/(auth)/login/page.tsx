import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    tab?: string | string[];
  }>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginForm
      next={getFirstParam(params?.next)}
      tab={getFirstParam(params?.tab)}
    />
  );
}

