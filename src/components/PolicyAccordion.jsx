import React from "react";

const PolicyAccordion = ({ item, isOpen, onToggle }) => {
  return (
    <div className={`policy-accordion ${isOpen ? "active" : ""}`}>
      <div
        className="policy-accordion__header"
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
      >
        <div className="policy-accordion__title">
          <i className={item.icon}></i>
          <h3>{item.title}</h3>
        </div>
        <span className="toggle-icon">{isOpen ? "−" : "+"}</span>
      </div>

      {isOpen && (
        <div className="policy-accordion__content">
          <p className="desc">{item.description}</p>
          <ul>
            {item.content.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PolicyAccordion;
