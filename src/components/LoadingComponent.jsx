export default function LoadingComponent({
  message = "",
  color = "bg-neutral-600",
  fullPage = false,
}) {
  return (
    <div
      className={`flex items-center justify-center w-full ${
        fullPage && "h-screen"
      } py-10`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5 items-end h-8">
          <div
            className={`w-1.5 ${color} rounded-full animate-[expand_0.8s_ease-in-out_infinite]`}
          ></div>
          <div
            className={`w-1.5 ${color} rounded-full animate-[expand_0.8s_ease-in-out_infinite] [animation-delay:0.15s]`}
          ></div>
          <div
            className={`w-1.5 ${color} rounded-full animate-[expand_0.8s_ease-in-out_infinite] [animation-delay:0.3s]`}
          ></div>
          <div
            className={`w-1.5 ${color} rounded-full animate-[expand_0.8s_ease-in-out_infinite] [animation-delay:0.45s]`}
          ></div>
        </div>
        {message && (
          <p className="text-neutral-600 text-sm font-mono">{message}</p>
        )}
      </div>

      <style>
        {`
          @keyframes expand {
            0%,100% {
              height: 20%;
            }
            50% {
              height: 100%;
            }
          }
        `}
      </style>
    </div>
  );
}
