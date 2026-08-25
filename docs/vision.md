# Vision

The web needs two first-class interfaces: one for humans and one for agents.

## The problem

Websites were historically designed for browsers and humans. Navigation chrome, ads, and JavaScript-heavy pages add presentation and behavior that agents **can** parse—but often at higher cost and with more ambiguity than a clean document surface.

Agents can read HTML. The practical issue is that browser HTML may wrap the intended public prose in layout, navigation, scripts, and unrelated links. Retrieval becomes noisier and less deterministic than a purpose-built representation of the **same** content.

Many sites respond by embedding another chatbot—forcing every visitor into a new AI relationship duplicated from the one they may already have with Claude, ChatGPT, Grok, or a coding agent.

## The Engawa thesis

> Do not force every visitor to use another embedded website chatbot.
> Let visitors bring the AI agent they already trust.

The site should provide **authoritative context** and **safe capabilities**. The visitor's agent should provide **personalization** and **conversation**.

Engawa is the toolkit that helps sites implement that agent interface—sitting between the website and the agent ecosystem, like an _engawa_: the transitional space between the inside of a house and the outside world.

Engawa exposes the **same human-public information** through cleaner, bounded agent-facing representations—not because HTML is unusable, but because both human and agent interfaces deserve appropriate surfaces.

## What Engawa is not

- A claim that AI agents cannot read HTML
- A replacement for schema.org, sitemaps, robots.txt, OpenAPI, or your CMS
- A new competing agent protocol
- A hosted chatbot product
- A provider-specific integration layer
- A guarantee that publishing `llms.txt` means providers automatically discover or use it

Engawa implements and documents **existing standards and conventions** with an opinionated profile.

## Standards vs conventions vs choices

| Category                  | Examples                                                         |
| ------------------------- | ---------------------------------------------------------------- |
| **Standards implemented** | MCP protocol revision 2026-07-28                                 |
| **Conventions supported** | llms.txt v2, `rel="alternate"` / `rel="describedby"`             |
| **Engawa choices**        | Resource URI scheme, adapter interface, read-only public default |

Conventions are **published machine-readable entry points**. Consumer support varies; automatic discovery must not be assumed. See [Do you need Engawa?](do-you-need-engawa.md).

## Who this is for

Developers building websites, documentation sites, product marketing sites, and applications that want explicit agent-facing surfaces and corpus governance—without locking users into a single AI vendor.

Not every site needs Engawa. See [Do you need Engawa?](do-you-need-engawa.md).
