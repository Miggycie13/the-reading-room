let shelvesReady = false;

export function shelvesAreReady(): boolean {
  return shelvesReady;
}

export function markShelvesReady(): void {
  shelvesReady = true;
}
