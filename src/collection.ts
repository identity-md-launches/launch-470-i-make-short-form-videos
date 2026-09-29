/** Read-only Ethereum integration. No wallet or API key is needed. */
export const COLLECTION_ADDRESS = "0x999ce0ce8c5f7661e0c74a568ffe27ceb9177bdb";
export const COLLECTION_URL = "https://opensea.io/collection/swarm-pepe";
export const CONTRACT_URL = `https://etherscan.io/address/${COLLECTION_ADDRESS}#code`;
export const RPC_URLS = [
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
] as const;
export const MAX_TOKEN_ID = 5000;

export interface CollectorTrait {
  trait_type: string;
  value: string;
}

export interface CollectorToken {
  id: string;
  name: string;
  revealed: boolean;
  image: string;
  traits: CollectorTrait[];
  block?: string;
  blockHash?: string;
  fetchedAt?: string;
  source: "live" | "saved";
  contract?: string;
  chainId?: number;
  rpc?: string;
}

export function tokenLink(id: string) {
  return `https://opensea.io/item/ethereum/${COLLECTION_ADDRESS}/${id}`;
}

export function normalizeTokenId(input: string): string {
  const value = input.trim().replace(/^#/, "");
  if (
    !/^\d{1,8}$/.test(value) ||
    Number(value) < 1 ||
    Number(value) > MAX_TOKEN_ID
  ) {
    throw new Error("Enter a whole token ID from 1 to 5,000.");
  }
  return String(Number(value));
}

/** Decode the ABI's dynamic string, with bounds checks before allocating. */
export function decodeABIString(result: string): string {
  if (
    !/^0x[0-9a-f]+$/i.test(result) ||
    result.length < 130 ||
    result.length > 4_000_000 ||
    result.length % 2 !== 0
  ) {
    throw new Error(
      "The network returned incomplete artwork. Please try again.",
    );
  }
  const hex = result.slice(2);
  const offset = Number(BigInt(`0x${hex.slice(0, 64)}`));
  if (
    !Number.isSafeInteger(offset) ||
    offset < 32 ||
    offset * 2 + 64 > hex.length
  ) {
    throw new Error("The network returned invalid metadata.");
  }
  const length = Number(BigInt(`0x${hex.slice(offset * 2, offset * 2 + 64)}`));
  const start = offset * 2 + 64;
  if (
    !Number.isSafeInteger(length) ||
    length < 1 ||
    length > 1_000_000 ||
    start + length * 2 > hex.length
  ) {
    throw new Error("The network returned invalid metadata.");
  }
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++)
    bytes[i] = parseInt(hex.slice(start + i * 2, start + i * 2 + 2), 16);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function decodeBase64(value: string): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(value), (c) => c.charCodeAt(0)),
  );
}

/** The immutable contract emits inline JSON and SVG; no gateway or generated traits. */
export function parseTokenURI(
  uri: string,
  id: string,
): Omit<CollectorToken, "source"> {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix))
    throw new Error("This token returned an unsupported metadata format.");
  const metadata: unknown = JSON.parse(decodeBase64(uri.slice(prefix.length)));
  if (!metadata || typeof metadata !== "object")
    throw new Error("The token metadata is incomplete.");
  const record = metadata as Record<string, unknown>;
  if (
    typeof record.image !== "string" ||
    !record.image.startsWith("data:image/svg+xml;base64,") ||
    !Array.isArray(record.attributes)
  ) {
    throw new Error("The on-chain artwork is unavailable. Please try again.");
  }
  // Never insert chain-provided SVG into the page DOM. The image is rendered as an image/canvas source.
  const svg = decodeBase64(record.image.split(",")[1]);
  if (
    !svg.includes("<svg") ||
    /<(script|foreignObject|iframe)\b|\bon\w+\s*=|(?:href|url)\s*[:=(]/i.test(
      svg,
    )
  ) {
    throw new Error("This artwork contains unsupported image content.");
  }
  const traits: CollectorTrait[] = record.attributes.map((entry: unknown) => {
    if (!entry || typeof entry !== "object")
      throw new Error("The revealed traits are incomplete.");
    const trait = entry as Record<string, unknown>;
    if (typeof trait.trait_type !== "string" || typeof trait.value !== "string")
      throw new Error("The revealed traits are incomplete.");
    return { trait_type: trait.trait_type, value: trait.value };
  });
  const unrevealed = traits.some(
    (t) => t.trait_type === "Status" && t.value === "Unrevealed",
  );
  if (
    !unrevealed &&
    !["Skin", "Eyes", "Mouth", "Hat", "Accessory"].every((name) =>
      traits.some((t) => t.trait_type === name),
    )
  ) {
    throw new Error("The revealed traits are incomplete. Please try again.");
  }
  return {
    id,
    name: typeof record.name === "string" ? record.name : `Swarm Pepe #${id}`,
    revealed: !unrevealed,
    image: record.image,
    // The unrevealed card must never expose inferred traits, even if unexpected attributes appear.
    traits: unrevealed ? [] : traits,
  };
}

class MissingTokenError extends Error {}

async function rpc(
  endpoint: string,
  method: string,
  params: unknown[],
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  });
  if (!response.ok)
    throw new Error("Ethereum is taking a little longer to respond.");
  const data = await response.json();
  if (data.error) {
    if (
      /execution reverted|ERC721NonexistentToken/i.test(
        String(data.error.message),
      ) ||
      String(data.error.data).startsWith("0x7e273289")
    ) {
      throw new MissingTokenError(
        "This token has not been minted. Try another ID.",
      );
    }
    throw new Error("The public Ethereum endpoint is busy.");
  }
  if (typeof data.result !== "string")
    throw new Error("Ethereum returned an incomplete response.");
  return data.result;
}

/** Pin metadata to a concrete block. Retry the other public endpoint on network/rate failures. */
export async function loadToken(
  input: string,
  signal?: AbortSignal,
): Promise<CollectorToken> {
  const id = normalizeTokenId(input);
  for (const endpoint of RPC_URLS) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 12_000);
    try {
      const block = await rpc(
        endpoint,
        "eth_blockNumber",
        [],
        controller.signal,
      );
      if (!/^0x[0-9a-f]+$/i.test(block))
        throw new Error("Invalid block response.");
      const data = `0xc87b56dd${BigInt(id).toString(16).padStart(64, "0")}`;
      const result = await rpc(
        endpoint,
        "eth_call",
        [{ to: COLLECTION_ADDRESS, data }, block],
        controller.signal,
      );
      const token = parseTokenURI(decodeABIString(result), id);
      return {
        ...token,
        block: BigInt(block).toString(),
        fetchedAt: new Date().toISOString(),
        source: "live",
        contract: COLLECTION_ADDRESS,
        chainId: 1,
        rpc: endpoint,
      };
    } catch (error) {
      if (error instanceof MissingTokenError) throw error;
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
  throw new Error(
    "Couldn’t reach Ethereum. Check your connection and try Load Pepe again.",
  );
}
