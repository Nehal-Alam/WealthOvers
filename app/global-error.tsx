"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global critical error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center text-xl font-bold mb-4">
            !
          </div>
          <h1 className="text-xl font-bold mb-2">Critical System Error</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            A critical error interrupted the application shell. Please reload or contact support if the problem persists.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mb-4 select-all">
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="w-full inline-flex justify-center items-center px-4 py-2 bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

