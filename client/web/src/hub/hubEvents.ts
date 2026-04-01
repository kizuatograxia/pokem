export interface HubInteractDetail {
  npcId: string;
  text: string[];
}

declare global {
  interface WindowEventMap {
    "hub:dialogue:closed": CustomEvent<void>;
    "hub:heal": CustomEvent<void>;
    "hub:interact": CustomEvent<HubInteractDetail>;
    "hub:nurse-menu": CustomEvent<void>;
    "hub:pc": CustomEvent<void>;
  }
}

export function dispatchHubInteract(detail: HubInteractDetail): void {
  window.dispatchEvent(new CustomEvent<HubInteractDetail>("hub:interact", { detail }));
}

export function dispatchHubDialogueClosed(): void {
  window.dispatchEvent(new CustomEvent<void>("hub:dialogue:closed"));
}

export function dispatchHubNurseMenu(): void {
  window.dispatchEvent(new CustomEvent<void>("hub:nurse-menu"));
}

export function dispatchHubHeal(): void {
  window.dispatchEvent(new CustomEvent<void>("hub:heal"));
}

export function dispatchHubPc(): void {
  window.dispatchEvent(new CustomEvent<void>("hub:pc"));
}
