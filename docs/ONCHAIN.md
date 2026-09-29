# Artwork provenance and network integration

The studio reads **Swarm Pepe on Ethereum mainnet**, contract
`0x999ce0ce8c5f7661e0c74a568ffe27ceb9177bdb`.

Sources checked on 2026-09-29:

- [The collection on OpenSea](https://opensea.io/collection/swarm-pepe) identifies the collection address and chain.
- [Verified contract source on Blockscout](https://eth.blockscout.com/address/0x999ce0ce8c5f7661e0c74a568ffe27ceb9177bdb?tab=contract), also available through its [public source API](https://eth.blockscout.com/api/v2/smart-contracts/0x999ce0ce8c5f7661e0c74a568ffe27ceb9177bdb), defines the tokenURI and reveal behavior.
- [Contract on Etherscan](https://etherscan.io/address/0x999ce0ce8c5f7661e0c74a568ffe27ceb9177bdb#code).

The contract's maximum supply is 5,000 and IDs begin at 1. `tokenURI(uint256)`
reverts for an unminted ID. It returns a base64 JSON data URI whose image is a
base64 SVG data URI. An immutable art contract renders those pixels. There is no
IPFS gateway, marketplace image API, private key, wallet connection, or synthetic
trait generator in the application.

Before reveal, the contract returns its placeholder SVG and one metadata
attribute: `Status: Unrevealed`. The studio retains that exact placeholder and
shows zero revealed traits. Once revealed, the metadata provides Skin, Eyes,
Mouth, Hat and Accessory. Merely loading a token does not reveal it or send a
transaction. An unminted token is an error, distinct from an unrevealed token.

`src/collection.ts` requests `eth_blockNumber` and then pins `eth_call` to that
block, using selector `0xc87b56dd` and the padded token ID. It first tries
`https://ethereum-rpc.publicnode.com` and then `https://eth.drpc.org`. Both
responded to actual mainnet calls with `Access-Control-Allow-Origin: *` during
development. Each endpoint has a 12-second timeout, and public services can
rate-limit or become unavailable. No RPC response is silently replaced with an
example. Failure leaves the existing preview in place with an actionable error.

## Bundled example

`public/sample.svg` is the exact decoded on-chain artwork for token **#1**, with
the corresponding traits in `public/sample.json`. It was read through dRPC at
block **26,085,433**, hash
`0xeaab3597c263891dcd2a3976624b4ecebb8d5a36e5f42e8325bbeb39137a0932`,
at `2026-09-29T20:12:18.734806+00:00`. It is explicitly a saved example, so the
studio can demonstrate its editor and exports before a network request. The
traits are Light Green, Side Eye, Cigarette, None and Chain, respectively.

`public/unrevealed.svg` is the exact placeholder returned for token **#980** at
block **26,085,446**. The matching metadata is preserved in
`test/fixtures/unrevealed-token.json`. Token #990 returned the same unrevealed
status in that block. These observations are historical fixtures; a live token
can subsequently be revealed. Token #5000 returned the expected
`ERC721NonexistentToken` revert at that block.

## Checks

`node --test test/collection.test.mjs` exercises real
metadata fixtures, invalid IDs, exact artwork/trait preservation, unrevealed
trait suppression, malformed responses, RPC fallback, block pinning,
unminted-token errors, network errors and cancellation. The fixtures are public
chain data; no credentials or dependency archives are included.

Development results: **7/7 tests passed** with Node 22.22.1. The isolated
collection module passed a strict TypeScript check. An additional live run of
the actual `loadToken()` function through Node fetch returned #1 with all five
original traits and #980 as unrevealed with zero traits, both pinned to block
26,085,458. #5000 produced the actionable not-minted error. These calls used
Publicnode and were not mocked. Earlier Python HTTP calls also verified dRPC
as a functioning fallback. Browser access, rate limits and future uptime remain
dependent on those external public services.

An initial attempt to use Node's experimental TypeScript stripping failed
because this environment's Node build does not include that feature. The tests
were repaired to use the project's existing TypeScript compiler in memory, and
then rerun successfully; no additional test dependency is necessary.
