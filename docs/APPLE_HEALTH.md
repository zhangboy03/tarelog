# Apple Health sync

Tarelog generates an Apple Shortcut that writes newly confirmed nutrition samples to Apple Health. The Shortcut runs on iPhone because Health sample actions are not supported on macOS.

## What it writes

Positive dietary energy, protein, carbohydrate, total fat, fibre, sugar, saturated fat, sodium, and caffeine values for confirmed entries that have not yet been acknowledged. Zero is skipped because it can also mean that the source did not provide that nutrient.

It does not read other Apple Health data. Apple prompts the user to approve each Health data type.

## Generate your Shortcut

Use a dedicated HTTPS endpoint and a unique `HEALTH_SYNC_TOKEN`:

```bash
swift run TarelogAppleHealthShortcut \
  "Tarelog Sync Today.unsigned.shortcut" \
  "https://YOUR-DOMAIN.example/api/health-sync" \
  "YOUR-HEALTH-SYNC-TOKEN"

shortcuts sign \
  --mode anyone \
  --input "Tarelog Sync Today.unsigned.shortcut" \
  --output "Tarelog Sync Today.shortcut"
```

Import the signed file on iPhone. Keep it out of Git: the generated Shortcut contains your endpoint and token.

## Duplicate prevention

After each nutrient is written, the Shortcut acknowledges `<meal-id>:<nutrient>` to Tarelog. Re-running skips acknowledged nutrients. The token is sent in the `X-Health-Sync-Token` request header, not the URL. A reset action exists for recovery and should not be exposed without the dedicated sync token.

This is best-effort duplicate prevention, not an exactly-once transaction. If Health accepts a sample but the following acknowledgement request fails, the next run may write that sample again. Check Apple Health before retrying after a network failure.

Changing a Tarelog meal after it was synchronised does not edit the existing Apple Health sample. Correct or delete that sample in Apple Health manually, then reset and re-run only when appropriate.

Do not describe Apple Health as verified until the generated Shortcut has been imported on the owner's iPhone, all requested write permissions were granted, values and dates were inspected in Health, and a second run produced no new samples.

## Rotation

If a Shortcut is shared with the wrong person or committed to a repository, rotate `HEALTH_SYNC_TOKEN`, regenerate the Shortcut, and invalidate the previous deployment value.
