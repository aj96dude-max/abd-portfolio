import { PortfolioShell } from "@/components/PortfolioShell";
import { loadProjects } from "@/lib/projects";
import type { EmailJsConfig } from "@/components/ContactForm";

export default async function HomePage() {
  const projects = await loadProjects();

  const emailConfig: EmailJsConfig = {
    serviceId:
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ??
      process.env.PUBLIC_EMAILJS_SERVICE_ID ??
      null,
    publicKey:
      process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ??
      process.env.PUBLIC_EMAILJS_PUBLIC_KEY ??
      null,
    ownerTemplateId:
      process.env.NEXT_PUBLIC_EMAILJS_OWNER_TEMPLATE_ID ??
      process.env.PUBLIC_EMAILJS_OWNER_TEMPLATE_ID ??
      null,
    userTemplateId:
      process.env.NEXT_PUBLIC_EMAILJS_USER_TEMPLATE_ID ??
      process.env.PUBLIC_EMAILJS_USER_TEMPLATE_ID ??
      null,
    toEmail:
      process.env.NEXT_PUBLIC_EMAILJS_TO_EMAIL ??
      process.env.PUBLIC_EMAILJS_TO_EMAIL ??
      "aj96dude@gmail.com",
  };

  return <PortfolioShell projects={projects} emailConfig={emailConfig} />;
}

