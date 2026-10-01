import React, { useEffect } from "react";

export default function SearchModal({ isOpen, onClose, value, onChange }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [isOpen]);

  // Escape closes it, like the scrim and the ✕ already do.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="search-modal" role="dialog" aria-modal="true">
      <div
        className="search-modal__overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="search-modal__content">
        <button
          className="search-modal__close"
          onClick={onClose}
          aria-label="Close search"
        >
          ✕
        </button>

        <h3>Search Products</h3>

        {/* The results are already filtering behind the modal, so Enter just
            needs to get the modal out of the way. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          <input
            type="search"
            placeholder="Search by product name..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}
