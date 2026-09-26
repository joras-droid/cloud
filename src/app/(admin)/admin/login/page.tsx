import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-bold text-brand-700">
            Ghar Ko Swad
          </p>
          <p className="mt-1 text-sm text-ink-soft">Kitchen admin</p>
        </div>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
