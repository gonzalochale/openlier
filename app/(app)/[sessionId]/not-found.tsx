import Link from "next/link";

export default function SessionNotFound() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background z-10">
      <h2 className="text-2xl font-medium tracking-tight">Session not found</h2>
      <Link
        href="/"
        className="text-sm text-foreground/50 hover:text-foreground transition-colors"
      >
        Start a new session
      </Link>
    </div>
  );
}
