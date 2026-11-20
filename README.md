# attackscout (CLI)

Audit the public exposure of a domain from your terminal: grade A to F, SSL certificate, DNS, email (SPF, DKIM, DMARC) and deadlines. Node 20+, zero runtime dependencies.

Part of [AttackScout](https://attackscout.com/en?utm_source=github&utm_medium=repo&utm_campaign=attackscout-cli): what an attacker can see of your site from the Internet, explained simply, with the fix.

## Quick start

1. Create a free API key (no card): [https://attackscout.com/espace/cles?utm_source=cli&utm_medium=terminal&utm_campaign=cli-cle](https://attackscout.com/espace/cles?utm_source=cli&utm_medium=terminal&utm_campaign=cli-cle). Channel `cli`, scope `scans:write`.
2. Export it and run the audit:

```sh
export ATTACKSCOUT_API_KEY=as_live_...
npx attackscout check example.com
```

The key is read only from `ATTACKSCOUT_API_KEY`: never as an argument, never printed, no config file, nothing written to disk.

## Options

| Option | Effect |
|---|---|
| `--json` | Raw API result on stdout |
| `--fail-on none\|ssl\|email\|any` | Exit code 1 when a check of the group fails (default `none`) |
| `--min-grade A..F` | Exit code 1 when the grade is worse than the threshold |
| `--lang fr\|en\|es\|de\|it\|pt` | Text language (fr or en) |
| `--api-url`, `--timeout`, `--no-color` | Advanced |

Exit codes: 0 ok, 1 problem found, 2 usage, 3 API or network error, 4 quota reached.

## In CI

```sh
npx attackscout check example.com --min-grade B --fail-on ssl
npx attackscout check example.com --json | jq '.grade'
```

## Limits

Free account quotas, per API key: 600 requests per hour and 100 audit requests per day (300 per day across all the keys of an account). A result less than 24 hours old is served from cache and still counts. Over quota the API answers HTTP 429 with a `Retry-After` header.

## Privacy

No tracker, no telemetry, nothing stored on your machine. The only data sent is the domain name you ask about, with your API key, to `https://attackscout.com`.

## License

MIT
