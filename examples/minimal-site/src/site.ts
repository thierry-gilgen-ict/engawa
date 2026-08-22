import { createEngawa, StaticContentAdapter } from "@thierry-gilgen-ict/engawa-core";

const CANONICAL_URL = "http://127.0.0.1:3847";

export const exampleConfig = {
  site: {
    name: "Example Studio",
    canonicalUrl: CANONICAL_URL,
    description:
      "A fictional creative studio demonstrating Engawa agent-native website capabilities.",
    language: "en",
  },
  agentInterface: {
    enabled: true,
    public: true,
  },
  content: {
    maxResourceBytes: 65536,
    maxSearchResults: 10,
    maxSearchQueryLength: 200,
  },
  security: {
    publicDefault: "read-only" as const,
  },
  metadata: {
    version: "0.1.0",
  },
};

export const exampleAdapter = new StaticContentAdapter(CANONICAL_URL, [
  {
    id: "about",
    title: "About Example Studio",
    description: "Who we are and what we do",
    path: "/about.md",
    content:
      "# About Example Studio\n\nExample Studio is a fictional creative agency specializing in brand design and digital experiences.\n\nWe believe great work starts with listening.",
  },
  {
    id: "services",
    title: "Services",
    description: "What Example Studio offers",
    path: "/services.md",
    content:
      "# Services\n\n- Brand identity and visual systems\n- Web design and prototyping\n- Content strategy for humans and agents",
  },
  {
    id: "faq",
    title: "FAQ",
    description: "Common questions",
    path: "/faq.md",
    content:
      "# FAQ\n\n## Do you work with international clients?\n\nYes. Example Studio works with clients worldwide.\n\n## How do agents access our site?\n\nVia llms.txt and the public MCP endpoint.",
  },
  {
    id: "contact",
    title: "Contact",
    description: "How to reach us",
    path: "/contact.md",
    content: "# Contact\n\nEmail: hello@example.studio\n\nWe respond within two business days.",
  },
]);

export const exampleEngawa = createEngawa(exampleConfig, exampleAdapter);
