export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-[var(--border)] rounded-md ${className}`} />
    );
}

export function SkeletonCard() {
    return (
        <div className="card p-6 space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-1/2" />
        </div>
    );
}
