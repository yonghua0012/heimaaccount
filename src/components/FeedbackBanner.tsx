interface FeedbackBannerProps {
  message: string;
  tone: "success" | "warning";
  onClose: () => void;
}

export function FeedbackBanner({
  message,
  tone,
  onClose,
}: FeedbackBannerProps) {
  return (
    <div className={`feedback ${tone}`} role={tone === "warning" ? "alert" : "status"}>
      <span>{message}</span>
      <button type="button" aria-label="关闭提示" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
