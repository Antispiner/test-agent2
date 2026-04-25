# Snake Arena — Wire Protocol

Transport: WebSocket. Frame format: UTF-8 JSON, one message per frame.
All messages carry a `type` discriminator.

## Client → Server

### `join`

Sent once, immediately after the WebSocket opens.

```json
{ "type": "join", "nick": "string" }
```

| Field | Type   | Required | Description                       |
|-------|--------|----------|-----------------------------------|
| type  | string | yes      | Constant `"join"`.                |
| nick  | string | yes      | Display name, 1–16 chars, unique. |

### `input`

Sent whenever the player wants to change direction. Server applies on the
next tick. Reverse-direction inputs (180°) are ignored.

```json
{ "type": "input", "dir": "up" }
```

| Field | Type   | Required | Description                                |
|-------|--------|----------|--------------------------------------------|
| type  | string | yes      | Constant `"input"`.                        |
| dir   | string | yes      | One of `"up"`, `"down"`, `"left"`, `"right"`. |

## Server → Client

### `welcome`

Sent once, in response to a successful `join`.

```json
{ "type": "welcome", "playerId": "uuid", "tick": 0 }
```

| Field    | Type    | Description                                |
|----------|---------|--------------------------------------------|
| type     | string  | Constant `"welcome"`.                      |
| playerId | string  | Server-assigned player identifier (UUID).  |
| tick     | integer | Current server tick at the time of join.   |

### `state`

Broadcast to every connected player on every tick (15Hz).

```json
{
  "type": "state",
  "snakes": [
    {
      "id": "uuid",
      "nick": "string",
      "segments": [[x, y]],
      "alive": true,
      "color": "#rrggbb",
      "kills": 0
    }
  ],
  "apples": [[x, y]],
  "tick": 123
}
```

| Field            | Type        | Description                                                  |
|------------------|-------------|--------------------------------------------------------------|
| type             | string      | Constant `"state"`.                                          |
| snakes           | array       | All snakes in the round, alive and dead.                     |
| snakes[].id      | string      | Player UUID (matches `welcome.playerId`).                    |
| snakes[].nick    | string      | Player nickname.                                             |
| snakes[].segments| array of [int,int] | Grid cells, head first, tail last. `[x, y]`, 0-indexed. |
| snakes[].alive   | boolean     | False after collision; segments freeze in place.             |
| snakes[].color   | string      | Render color, hex with leading `#`.                          |
| snakes[].kills   | integer     | Snakes this player has caused to die in this round.          |
| apples           | array of [int,int] | Apple positions on the grid.                          |
| tick             | integer     | Server tick number, monotonically increasing.                |

### `round_end`

Sent when a round terminates (≤ 1 snake alive or time limit reached).
The next `state` frames begin a new round.

```json
{
  "type": "round_end",
  "winner": "nick or null",
  "leaderboard": [
    { "nick": "string", "kills": 0, "length": 0 }
  ]
}
```

| Field                  | Type    | Description                                              |
|------------------------|---------|----------------------------------------------------------|
| type                   | string  | Constant `"round_end"`.                                  |
| winner                 | string  | Nickname of the surviving snake, or `null` on draw.      |
| leaderboard            | array   | All participants, sorted by `kills` desc then `length` desc. |
| leaderboard[].nick     | string  | Player nickname.                                         |
| leaderboard[].kills    | integer | Kills scored in the round.                               |
| leaderboard[].length   | integer | Final segment count.                                     |

## Coordinates

Grid is 40 columns × 30 rows. `x ∈ [0, 39]`, `y ∈ [0, 29]`. Origin `(0, 0)`
is the top-left cell. `up` decreases `y`, `down` increases `y`.

## Errors

Malformed frames or unknown `type` values cause the server to close the
WebSocket with code `1003` (unsupported data).
