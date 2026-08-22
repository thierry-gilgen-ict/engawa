# Vision

The web needs two first-class interfaces: one for humans and one for agents.

## The problem

Websites were historically designed for browsers and humans. Navigation chrome, ads, and JavaScript-heavy pages make human HTML a poor agent interface. Scraping is imprecise, expensive, and brittle.

Many sites respond by embedding another chatbot—forcing every visitor into a new AI relationship duplicated from the one they may already have with Claude, ChatGPT, Grok, or a coding agent.

## The Engawa thesis

> Do not force every visitor to use another embedded website chatbot.
> Let visitors bring the AI agent they already trust.

The site should provide **authoritative context** and **safe capabilities**. The visitor's agent should provide **personalization** and **conversation**.

Engawa is the toolkit that helps sites implement that agent interface—sitting between the website and the agent ecosystem, like an _engawa_: the transitional space between the inside of a house and the outside world.

## What Engawa is not

- A new competing agent protocol
- A hosted chatbot product
- A provider-specific integration layer

Engawa implements and documents **existing standards and conventions** with an opinionated profile.

## Standards vs conventions vs choices

| Category                  | Examples                                                         |
| ------------------------- | ---------------------------------------------------------------- |
| **Standards implemented** | MCP protocol revision 2026-07-28                                 |
| **Conventions supported** | llms.txt v2, `rel="alternate"` / `rel="describedby"`             |
| **Engawa choices**        | Resource URI scheme, adapter interface, read-only public default |

## Who this is for

Developers building websites, documentation sites, product marketing sites, and applications that want agent-native discovery without locking users into a single AI vendor.
