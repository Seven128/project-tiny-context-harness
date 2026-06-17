# Deployment Context: main

This optional role Context records critical repeat-execution paths for deploy, runtime bootstrap, cloud initialization and operational recovery. Keep it minimal and durable.

## Owner

- Owning area: `main`.

## Runtime Topology

- List durable service distribution only when it matters for rerunning deploy or bootstrap, such as Web/API/worker/Redis/DB/Docker/cloud instance boundaries.

## Deployment Paths

- List the shortest deploy, CI/CD, bootstrap, migration, health-check or rollback/degradation command/path.

## Required Preparation

- List only durable setup such as cloud resources, env files, compose profiles, secret mounting names or database initialization steps. Do not store secret values.

## Expected Signals

- Name health checks, status transitions, URLs, queues, containers or logs-at-a-glance that show the path reached the intended stage.

## Acceptable Warnings

- List known benign warnings or slow-start states.

## Excluded Dead Ends

- List previously ruled-out deploy/bootstrap paths only when remembering them prevents repeated wasted work.

## Forbidden Content

- Do not record one-off logs, full command output, CI artifacts, release ledgers, secrets, tokens, cookies, device ids, raw payloads or claims that deployment already succeeded.
