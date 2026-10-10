export default function EquipmentIcon({
  secondary = false,
}: {
  secondary?: boolean;
}) {
  return (
    <svg
      className="equipment-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {secondary ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 3v18M9 10v4M15 10v4" />
        </>
      ) : (
        <>
          <path d="M9 2h6v6l3 4v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8l3-4V2Z" />
          <path d="M6 14h12M9 5h6" />
        </>
      )}
    </svg>
  );
}
