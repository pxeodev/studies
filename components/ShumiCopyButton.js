import { useState, useCallback } from 'react';

const ShumiCopyButton = ({ text, className = "", position = "right" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed: ", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }, [text]);

  const CopyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12"></polyline>
    </svg>
  );

  return (
    <>
      <button
        onClick={handleCopy}
        className={`chatgpt-copy-button ${copied ? "copied" : ""} ${className}`}
        aria-label="Copy message"
        title="Copy message"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>

      <style jsx>{`
        .chatgpt-copy-button {
          /* ChatGPT-style minimal button design */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #8e8ea0;
          cursor: pointer;
          transition: all 0.15s ease;
          opacity: 1;
          visibility: visible;
          position: absolute;
          top: 8px;
          ${position === "left" ? "left: 8px;" : "right: 8px;"}
          z-index: 10;
        }

        /* Show button on parent hover (ChatGPT behavior) */
        .chatgpt-copy-button:hover,
        *:hover > .chatgpt-copy-button,
        *:hover .chatgpt-copy-button {
          opacity: 1;
          visibility: visible;
          background: rgba(0, 0, 0, 0.1);
          color: #374151;
        }

        /* Success state styling - keep same colors */
        .chatgpt-copy-button.copied {
          opacity: 1 !important;
          visibility: visible !important;
          color: #374151;
          background: rgba(0, 0, 0, 0.1);
        }

        .chatgpt-copy-button.copied:hover {
          background: rgba(0, 0, 0, 0.15);
        }

        /* Active state */
        .chatgpt-copy-button:active {
          transform: scale(0.95);
        }

        /* Focus state for accessibility */
        .chatgpt-copy-button:focus {
          outline: none;
          opacity: 1;
          visibility: visible;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .chatgpt-copy-button {
            color: #9ca3af;
          }

          .chatgpt-copy-button:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #d1d5db;
          }

          .chatgpt-copy-button.copied {
            color: #d1d5db;
            background: rgba(255, 255, 255, 0.1);
          }

          .chatgpt-copy-button.copied:hover {
            background: rgba(255, 255, 255, 0.15);
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .chatgpt-copy-button {
            transition: none;
          }
        }

        /* Specific styling for Shumi chat messages */
        .chatgpt-copy-button.shumi-copy-button {
          right: -1px;
        }
      `}</style>
    </>
  );
};

export default ShumiCopyButton;