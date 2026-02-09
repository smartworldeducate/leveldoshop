import React from "react";
import { MessageCircle } from "lucide-react";

export default function WhatsAppButton({
  phone = "923010483942",
  message = "",
}) {
  const url = `https://wa.me/${phone}${
    message ? `?text=${encodeURIComponent(message)}` : ""
  }`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="whatsapp-float"
    >
      <MessageCircle className="whatsapp-float__icon" />
    </a>
  );
}
