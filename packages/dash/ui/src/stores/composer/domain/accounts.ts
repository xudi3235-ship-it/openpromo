export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function allSelected(current: string[], all: string[]): boolean {
  return current.length > 0 && current.length === all.length;
}

export function extractSelectedAccountIds(
  facebookFeed?: { identity: { connectedAccountID: string } }[],
  instagramFeed?: { identity: { connectedAccountID: string } }[],
): string[] {
  return [
    ...(facebookFeed?.map((s) => s.identity.connectedAccountID) || []),
    ...(instagramFeed?.map((s) => s.identity.connectedAccountID) || []),
  ];
}
