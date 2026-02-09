import React, { useEffect } from "react";

export default function SearchModal({ isOpen, onClose, value, onChange }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [isOpen]);

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

        <input
          type="text"
          placeholder="Search by product name..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      </div>
    </div>
  );
}
