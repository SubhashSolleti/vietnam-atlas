"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container-x max-w-xl py-24 text-center">
      <h1 className="text-4xl">Something went wrong</h1>
      <p className="mt-3 text-muted">The page couldn't load. This is usually temporary: please try again. If it keeps happening, the local database may need to be reset (see README).</p>
      {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
