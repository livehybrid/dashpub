---
layout: default
title: Dependency Updates and Testing
parent: Development
nav_order: 3
---

# Dependency updates and testing

How a dependency update gets from Dependabot to `develop` without anyone
clicking, and what has to be true for that to be safe.

## The checks

| Check | Workflow | Needs secrets | Required on `develop` |
| --- | --- | --- | --- |
| Render suite (Splunk latest) | `render-suite.yml` | No | Yes |
| Root lockfile (npm ci) | `npm-ci.yml` | No | Yes |
| Playwright E2E Tests | `e2e-playwright.yml` | Yes (`SPLUNKD_*`) | Yes |
| Build with custom headers | `custom-home-header.yml` | No | No (path filtered) |
| Image scan (Trivy) | `render-suite.yml` | No | No |

**Render suite** is the one that matters for updates. It builds the image,
starts a Splunk container, seeds fixture dashboards covering every
visualization type and checks each panel shows its data in a browser. Details
in [`e2e/README.md`](https://github.com/livehybrid/dashpub/blob/develop/e2e/README.md).

**Playwright E2E Tests** runs the image against a real, long-lived Splunk. If
that Splunk is unreachable or the token has expired the job skips with a
warning annotation rather than failing: an outage of the test instance should
not block every pull request. A run that skipped has tested nothing, so look
for the warning if this check is the reason you trust a change.

**Image scan** is not required on purpose. A CVE published overnight in the
base image is not caused by the pull request it lands on. It is still red on
that pull request, and on the weekly run, so it gets seen.

## What merges itself

`dependabot-auto-merge.yml` turns on auto-merge for every Dependabot pull
request that is not a major version bump. GitHub then merges it when the
required checks pass, and not before. Major bumps get a comment and wait.

Dependabot groups patch and minor updates (`.github/dependabot.yml`), so a
normal week is a handful of pull requests. The Splunk packages are one group
because they peer-depend on each other at exact versions.

## Publishing after an automatic merge

A merge made by auto-merge on behalf of a workflow does not trigger other
workflows, so "Publish Docker image" does not run for it. `publish-catch-up.yml`
checks every hour whether the head of `develop` has a publish run and starts
one if not. The `:develop` image can therefore be up to an hour behind a
Dependabot merge. A head whose publish run failed is not retried.

## When an update goes red

- **"visualization types ... that no fixture panel renders"**: the Splunk
  packages added a visualization. Add a panel for it to `e2e/fixtures.mjs`
  on the Dependabot branch (or a branch of it) and push.
- **A panel "shows a failure placeholder" or "expected text never appeared"**:
  the update broke that visualization. The run's artifact has a screenshot of
  every dashboard and a trace of the failing test.
- **`npm ci` fails with `ERESOLVE`**: usually the Splunk group resolved only
  part of a release. Comment `@dependabot recreate`.

## Weekly run

Mondays, `render-suite.yml` also runs with no pull request: against Splunk
`latest`, `10.4` and `10.2`, building the image without cache. That is what
notices a new Splunk release or a moved base image when the repository is
quiet.

## Repository settings this relies on

- Branch protection on `develop` with the three required checks above.
  Administrators are not bound by it, so a direct push still works.
- "Allow auto-merge" enabled.

Without the required checks, `gh pr merge --auto` merges immediately. If
branch protection is ever removed, disable `dependabot-auto-merge.yml` first.
