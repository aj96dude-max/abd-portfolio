"use client";

import { useState, type FormEvent } from "react";
import { SITE_META } from "@/data/portfolio";

export interface EmailJsConfig {
  serviceId: string | null;
  publicKey: string | null;
  ownerTemplateId: string | null;
  userTemplateId: string | null;
  toEmail: string;
}

interface ContactFormProps {
  config: EmailJsConfig;
}

interface NotificationState {
  message: string;
  type: "success" | "error";
}

export function ContactForm({ config }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotice = (msg: string, type: "success" | "error") => {
    setNotification({ message: msg, type });
    window.setTimeout(() => {
      setNotification((curr) => (curr?.message === msg ? null : curr));
    }, 4000);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!config.serviceId || !config.publicKey) {
      showNotice(
        "Email service is not configured yet. Please add PUBLIC_EMAILJS_SERVICE_ID and PUBLIC_EMAILJS_PUBLIC_KEY.",
        "error",
      );
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMsg = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMsg) {
      showNotice("Please fill in all fields before sending.", "error");
      return;
    }

    setSubmitting(true);

    try {
      const basePayload = {
        service_id: config.serviceId,
        user_id: config.publicKey,
      };
      const requests: Promise<Response>[] = [];

      if (config.ownerTemplateId) {
        requests.push(
          fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...basePayload,
              template_id: config.ownerTemplateId,
              template_params: {
                from_name: trimmedName,
                reply_to: trimmedEmail,
                message: trimmedMsg,
                email: config.toEmail,
                to_email: config.toEmail,
                user_email: trimmedEmail,
              },
            }),
          }),
        );
      }

      if (config.userTemplateId) {
        requests.push(
          fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...basePayload,
              template_id: config.userTemplateId,
              template_params: {
                from_name: "abdullah",
                reply_to: config.toEmail,
                message: trimmedMsg,
                email: trimmedEmail,
                to_email: trimmedEmail,
              },
            }),
          }),
        );
      }

      if (requests.length === 0) {
        throw new Error("No EmailJS templates configured.");
      }

      const responses = await Promise.all(requests);
      const failure = responses.find((res) => !res.ok);
      if (failure) {
        const text = await failure.text();
        throw new Error(text || "EmailJS send failed");
      }

      showNotice(
        "Message sent successfully! I'll get back to you soon.",
        "success",
      );
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      showNotice(
        "Could not send your message. Please try again or email me directly.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div>
        <p className="text-sm leading-relaxed text-white/68">
          Open to collaboration, consulting, and interesting engineering problems.
          Reach out directly or use the form below.
        </p>

        <div className="mt-6 flex flex-col gap-1.5">
          <a
            href={`mailto:${SITE_META.email}`}
            className="inline-flex items-center rounded-lg px-3 py-2 font-mono-tech text-sm text-white/75 transition-all hover:translate-x-1 hover:bg-white/6 hover:text-white"
          >
            {SITE_META.email}
          </a>
          <a
            href={SITE_META.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg px-3 py-2 font-mono-tech text-sm text-white/75 transition-all hover:translate-x-1 hover:bg-white/6 hover:text-white"
          >
            {SITE_META.githubHandle}
          </a>
          <a
            href={SITE_META.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg px-3 py-2 font-mono-tech text-sm text-white/75 transition-all hover:translate-x-1 hover:bg-white/6 hover:text-white"
          >
            resume.pdf &nearr;
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="contact-name" className="sr-only">
            Your name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="w-full rounded-lg border border-white/12 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/55 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="sr-only">
            Your email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            required
            className="w-full rounded-lg border border-white/12 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/55 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="sr-only">
            Your message
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your message"
            required
            className="w-full resize-y rounded-lg border border-white/12 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/55 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 self-start rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 cursor-pointer"
        >
          {submitting ? "sending..." : "send message"}
        </button>
      </form>

      {notification && (
        <div
          role="status"
          className={`fixed top-16 right-5 z-50 max-w-sm rounded-xl px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-md ${
            notification.type === "success"
              ? "bg-emerald-600/90 border border-emerald-400/30"
              : "bg-red-600/90 border border-red-400/30"
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

