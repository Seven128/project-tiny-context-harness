# Webhook Provider Safety Bridge Debug Fix

Apply this after the RFC cascade is complete.

Verify that an expired previous secret or stale timestamp is rejected after tenant secret rotation and replay protection are implemented. If replay/timestamp protection accepts an unsafe event, fix it and add regression coverage.

The final implementation must preserve schema v2 signing, tenant-level replay protection, do-not-retry live credential boundaries, and separate local/mock/live evidence.
