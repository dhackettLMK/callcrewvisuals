import { Suspense } from "react";
import { SignInButton } from "./sign-in-button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-80 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-base font-semibold text-zinc-900">
          Content calendar
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          What&apos;s going out, when, and where.
        </p>
        <Suspense>
          <SignInButton />
        </Suspense>
      </div>
    </main>
  );
}
