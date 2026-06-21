type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger" | "secondary";
  type?: "button" | "submit";
  // "lg" gives a taller, full-width-friendly touch target (44px+) for
  // mobile-first actions like Clock In/Out — default stays as-is so
  // existing call sites are unaffected.
  size?: "md" | "lg";
  className?: string;
};

export default function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  size = "md",
  className = "",
}: ButtonProps) {
  const base = "rounded-xl font-medium transition";

  const sizes = {
    md: "px-4 py-2",
    lg: "px-6 py-4 text-base w-full sm:w-auto",
  };

  const styles = {
    primary: "bg-orange-500 text-white hover:bg-orange-600",
    danger:
      "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
    secondary:
      "bg-white/5 text-white border border-white/10 hover:bg-white/10",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}