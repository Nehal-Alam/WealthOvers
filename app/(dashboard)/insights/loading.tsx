export default function InsightsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 bg-surface-secondary/60 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-surface rounded-2xl border border-border/60" />
        ))}
      </div>
      <div className="h-72 bg-surface rounded-2xl border border-border/60" />
    </div>
  );
}

