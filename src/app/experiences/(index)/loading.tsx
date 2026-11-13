export default function Loading() {
  return (
    <div className="container-x pt-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-10 w-2/3 max-w-lg rounded-sm" />
      <div className="skeleton mt-3 h-5 w-1/2 max-w-md rounded-sm" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-md border border-line bg-surface">
            <div className="skeleton aspect-[4/3]" />
            <div className="space-y-2 p-4"><div className="skeleton h-4 w-3/4 rounded-sm" /><div className="skeleton h-3 w-1/2 rounded-sm" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
