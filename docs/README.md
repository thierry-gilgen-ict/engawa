# Engawa documentation

Documentation in this directory is licensed under [CC BY 4.0](LICENSE).

## Choose your path

### For humans — add Engawa to an existing site

- [Integrating an existing site](integrating-an-existing-site.md) — primary workflow for live websites
- [Integration acceptance contract](integration-acceptance.md) — done-when checklist
- [Content publication rule](content-publication.md) — `HUMAN_PUBLIC_SOURCE == ENGAWA_SOURCE`
- [Getting started](getting-started.md) — empty external project quick start

### For coding agents

- [Agent integration playbook](agent-integration-playbook.md) — deterministic integration sequence
- [Ready-to-copy integrate prompt](prompts/integrate-engawa.md)
- [AGENTS.md](../AGENTS.md) — repository orientation

### For existing Engawa installations — upgrade

- [Upgrading](upgrading.md) — safe consumer upgrade path
- [Compatibility matrix](compatibility.md) — tested package sets
- [Migration guides](migrations/README.md) — when `MIGRATION_REQUIRED = YES`
- [Ready-to-copy upgrade prompt](prompts/upgrade-engawa.md)

## Integration guides

- [Next.js integration](integrations/nextjs.md) — route handlers, host responsibilities
- [Headless CMS integration](integrations/headless-cms.md) — Node/TS frontend + CMS API pattern
- [Production references](production-references.md) — live sites
- [Consuming from npm](integration-consuming-from-npm.md) — install pins
- [Consuming from git (development)](integration-consuming-from-git.md)

## Reference

- [Vision](vision.md)
- [Architecture](architecture.md)
- [Implementation profile v0.1](implementation-profile-v0.1.md)
- [Security model](security-model.md)
- [Distribution Map](distribution-map.md) — optional showcase; opt-in policy
- [Distribution Map production launch (DM3A)](distribution-map-production-launch.md)
- [Distribution Map API contract](distribution-map-api.md) — frozen v1 registry/CLI contract (DM1A)
- [Distribution Map threat model](distribution-map-threat-model.md) — CLI and registry threats (DM1A)
- [Roadmap](roadmap.md)
- [Engawa Inspector CLI (source)](../../packages/cli/README.md) — `engawa inspect` readiness reports
- [Releasing](releasing.md) — maintainer npm publish
- [Provider capability matrix](providers/provider-capability-matrix.md)
- [Launch kit (internal)](launch/launch-kit.md)
- [Architecture decision records](adr/)
