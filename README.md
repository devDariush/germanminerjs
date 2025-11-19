# germanminerjs

Advanced TypeScript-first library for the [GermanMiner API](https://api.germanminer.de/v2/dokumentation.php).

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)

## Features

- 🔒 **Type-safe** - Full TypeScript support with runtime validation using Zod
- ⚡ **Smart caching** - Automatic request limit tracking with cache expiration
- 🚀 **Lazy loading** - Optional deferred data loading for better performance
- 🔄 **Cross-runtime** - Works with Deno, Node.js and also on every web browser
- 🛡️ **Error handling** - Comprehensive custom error classes
- 🐛 **Debug mode** - Built-in debugging support

## Installation

### Deno

```typescript
import { GMClient } from "jsr:@devdariush/germanminerjs";
```

### Node.js (currently untested)

```bash
# for npm:
npx jsr add @devdariush/germanminerjs
# or yarn:
yarn add jsr:@devdariush/germanminerjs
# or pnpm:
pnpm i jsr:@devdariush/germanminerjs
```

## Quick Start

```typescript
import { GMClient } from "@devdariush/germanminerjs";

// Create client with API key
const client = await GMClient.create({
  apiKey: "your-api-key-here", // Your GermanMiner API key (default: environment variables)
  lazyMode: false,  // Load data immediately (default: false)
  debugMode: false  // Enable debug logging (default: false)
});

// Get API info
const info = await client.getApiInfo();
console.log(`Requests: ${info.requests}/${info.limit}`);

// Check remaining requests
const remaining = await client.getRemainingRequests();
console.log(`Remaining: ${remaining}`);
```

## Configuration

### Environment Variables

The client can automatically load your API key from environment variables:

- `GM_API_KEY` or `API_KEY` - Your GermanMiner API key
- `NODE_ENV=development` (Node.js) or `DENO_ENV=development` (Deno) - Enables debug mode

```typescript
// No need to pass apiKey if set in environment
const client = await GMClient.create();
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | from env | Your GermanMiner API key |
| `lazyMode` | `boolean` | `false` | Defer loading data until explicitly requested |
| `debugMode` | `boolean` | from env | Enable debug logging |

## Usage Examples

### Bank Accounts

```typescript
// Get a specific bank account
const account = await client.bank("DEF04317923");
console.log(account.accountNumber);
console.log(account.balance);
console.log(account.accountType); // "Privatkonto" or "Firma"

// In lazy mode, load data manually
const client = await GMClient.create({ lazyMode: true });
const account = await client.bank("DEF04317923");
await account.load(); // Load balance, type, and bearer
console.log(account.balance);

// List all accounts owned by API key owner
const allAccounts = await client.bank().listAll();
console.log(`You have ${allAccounts.length} accounts`);

// Filter accounts
const privateAccounts = allAccounts.filter(
  acct => acct.accountType === "Privatkonto"
);
```

### Players

```typescript
// Get player by name
const player = await client.player().fromPlayername("Steve");
console.log(player.uuid);
console.log(player.playerName);

// Get player by UUID
const player = await client.player().fromUuid("69bfb349-a17d-476a-8142-67df65a86039");
console.log(player.playerName);
console.log(player.uuid);
```

### Request Limit Management

```typescript
// Check if limit is reached
if (client.isLimitReached()) {
  console.log("Request limit reached!");
}

// Get remaining requests
const remaining = await client.getRemainingRequests();
console.log(`${remaining} requests remaining`);

// Get detailed API info
const info = await client.getApiInfo();
console.log(`Limit: ${info.limit}`);
console.log(`Current requests: ${info.requests}`);
console.log(`Outstanding costs: ${info.outstandingCosts}`);
```

## API Reference

### GMClient

Main client class for interacting with the GermanMiner API.

#### Static Methods

- `GMClient.create(options?)` - Create and initialize a client instance (async)

#### Instance Methods

- `getApiInfo(ignoreCache?)` - Get API usage information
- `getRemainingRequests()` - Get number of remaining API requests
- `isLimitReached()` - Check if request limit has been reached
- `bank()` - Get BankService instance
- `bank(accountNumber)` - Get specific BankAccount
- `player()` - Get PlayerService instance

### BankAccount

Represents a bank account.

#### Properties

- `accountNumber: string` - The account number
- `balance?: number` - Account balance (loaded based on lazy mode)
- `accountType?: "Privatkonto" | "Firma"` - Type of account
- `bearer?: Player | string` - Account owner (Player for private accounts)

#### Methods

- `load()` - Manually load account data

### BankService

Service for bank-related operations.

#### Methods

- `get(accountNumber)` - Get a specific bank account
- `listAll()` - List all accounts owned by API key owner

### Player

Represents a Minecraft player.

#### Properties

- `playerName?: string` - Player's username
- `uuid?: string` - Player's UUID

#### Methods

- `load()` - Manually load player data

### PlayerService

Service for player-related operations.

#### Methods

- `fromPlayername(playerName)` - Get player by username
- `fromUuid(uuid)` - Get player by UUID

## Error Handling

The library provides custom error classes:

```typescript
import { GMClient } from "@devdariush/germanminerjs";

try {
  const client = await GMClient.create({ apiKey: "invalid" });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status: ${error.status}`);
  } else if (error instanceof GmClientError) {
    console.error(`Client Error: ${error.message}`);
  } else if (error instanceof LimitReachedError) {
    console.error(`Limit reached: ${error.currentRequests}/${error.limit}`);
  }
}
```

### Error Types

- `ApiError` - API request failed
- `GmClientError` - Client configuration or usage error
- `LimitReachedError` - Request limit has been reached

## Lazy Mode

Lazy mode defers loading data until explicitly requested, saving API requests:

```typescript
// Without lazy mode (default)
const client = await GMClient.create({ lazyMode: false });
const account = await client.bank("ACC123"); // Data loaded immediately
console.log(account.balance); // Available

// With lazy mode
const client = await GMClient.create({ lazyMode: true });
const account = await client.bank("ACC123"); // Data NOT loaded yet
console.log(account.balance); // undefined
await account.load(); // Now load the data
console.log(account.balance); // Available
```

## Debug Mode

Enable debug mode to see detailed logging:

```typescript
const client = await GMClient.create({ debugMode: true });
// Will log:
// - Request count updates
// - Schema validation results
// - Fetch operations and responses (API key masked in DEBUG logs)
// - ... and much more
```

## Development

### Prerequisites

- Deno 2.x or newer

### Run Example

```bash
# Set your API key
export GM_API_KEY="your-api-key"
# or use a .env file in the root folder

# Run the example
deno task dev
```

### Lint

```bash
deno lint
```

### Format

```bash
deno fmt
```

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Author

**Dariush Komeili**

## Repository

[https://github.com/devDariush/germanminerjs](https://github.com/devDariush/germanminerjs)
