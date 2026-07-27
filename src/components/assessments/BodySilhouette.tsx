export function BodySilhouette() {
  return (
    <div className="rounded-2xl border bg-gradient-to-b from-emerald-50/70 to-background p-5">
      <svg
        viewBox="0 0 180 360"
        className="mx-auto h-72 w-auto text-emerald-700/70"
        role="img"
        aria-label="Ilustração das regiões de medidas corporais"
      >
        <circle cx="90" cy="38" r="25" fill="currentColor" opacity=".16" />
        <path
          d="M66 70c-18 11-23 36-25 65l-7 86c-1 12 16 15 19 3l13-70 5 74-13 105c-2 15 19 20 23 4l9-75 9 75c4 16 25 11 23-4l-13-105 5-74 13 70c3 12 20 9 19-3l-7-86c-2-29-7-54-25-65-15 9-33 9-48 0Z"
          fill="currentColor"
          opacity=".16"
          stroke="currentColor"
          strokeWidth="2"
        />
        {[
          [45, 122, 135, 122, "Tórax"],
          [52, 157, 128, 157, "Cintura"],
          [54, 183, 126, 183, "Abdômen"],
          [55, 213, 125, 213, "Quadril"],
          [31, 145, 58, 145, "Braços"],
          [69, 270, 111, 270, "Coxas"],
        ].map(([x1, y1, x2, y2, label]) => (
          <g key={String(label)}>
            <line
              x1={Number(x1)}
              y1={Number(y1)}
              x2={Number(x2)}
              y2={Number(y2)}
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <text x="90" y={Number(y1) - 5} textAnchor="middle" fontSize="9" fill="currentColor">
              {label}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-center text-xs text-muted-foreground">
        Use sempre o mesmo ponto anatômico nas reavaliações.
      </p>
    </div>
  );
}
