interface ClassicCardBackProps {
  className?: string;
}

export function ClassicCardBack({ className = "" }: ClassicCardBackProps) {
  return (
    <div className={`classic-card-back ${className}`.trim()} aria-hidden>
      <div className="classic-card-back-inner" />
    </div>
  );
}
