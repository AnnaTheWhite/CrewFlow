type ModalProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export default function Modal({
  open,
  title,
  children,
  onClose,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/70
        p-4
        backdrop-blur-sm
      "
    >
      <div
        className="
          relative
          max-h-[90vh]
          w-full
          max-w-2xl
          overflow-y-auto
          rounded-3xl
          border
          border-white/10
          bg-slate-900
          shadow-2xl
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-white/10
            p-4
            sm:p-6
          "
        >
          <h2 className="text-xl font-bold sm:text-2xl">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="
              text-2xl
              text-slate-400
              transition
              hover:text-white
            "
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}