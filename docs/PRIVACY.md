# Privacy and data flow

Tarelog is software for self-hosters, not a hosted privacy promise. The deployer chooses the host, model provider, retention, and who receives the access tokens.

## Where data goes

| Data | Destination | When |
| --- | --- | --- |
| Food photo | Deployer-selected model provider | During photo analysis only |
| Unconfirmed recognition result | Browser memory | Until confirmed, replaced, dismissed, or the page closes |
| Confirmed recognition and correction metadata | Deployer's D1 database | After the user confirms |
| Confirmed meal | Deployer's D1 database | After the user confirms “记入今天” |
| Generic food query | USDA FoodData Central; optionally the configured model for name normalisation | During nutrition matching |
| Browser access token | The deployment | Once, to create an HTTP-only session cookie |
| Apple sync token | Request header in the deployer's generated Shortcut | During Apple Health sync |

Tarelog does not store uploaded photo bytes. A photo still leaves the device when sent to the configured model provider; that provider's logging and retention terms apply.

## Defaults

- No product analytics, advertising tracker, central account, or public upload demo.
- No personal targets, frequent foods, shared API key, or generated Shortcut in Git.
- Browser access cookies are HTTP-only, SameSite Strict, and Secure on HTTPS.
- Model output is untrusted. Closing an unconfirmed result stores neither the result nor a meal.

## Photo consent

Tell every user which model provider receives photos before enabling analysis. Do not upload faces, addresses, payment receipts, medical documents, or unrelated sensitive content. The model is instructed to copy visible facts, but it can still be wrong; review the name, amount, label, and nutrition source before confirming.

## Retention, export, and deletion

Individual meal rows can be edited and deleted. The current release does not yet provide a complete account-wide export, bulk deletion, or tested in-product backup/restore flow. Until those exist, the deployer must back up, export, restore, and delete D1 data through the hosting account.

Release migrations must not rewrite or delete a person's journal history. Always back up a deployed D1 database before applying new migrations.

## Health disclaimer

Food logs and nutrition values can be health-related personal data. Tarelog is not a medical device, does not diagnose conditions, and cannot establish that a diet is nutritionally complete. Follow the laws and consent requirements that apply to the deployment and its users.
