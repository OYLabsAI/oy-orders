import solana from "./assets/solana.svg";
import cardano from "./assets/cardano.svg";
import chainlink from "./assets/chainlink.svg";
import nownodes from "./assets/nownodes.svg";
export const partnerLogos: Record<string, string> = {
  Solana: solana,
  Cardano: cardano,
  "Chainlink CRE": chainlink,
  NOWNodes: nownodes,
};
export function technologyLogo(name: string, size = 20) {
  const image = document.createElement("img");
  image.src = partnerLogos[name]!;
  image.alt = name;
  image.width = size;
  image.height = size;
  image.style.objectFit = "contain";
  return image;
}
export function technologyBadge(name: string) {
  const badge = document.createElement("span");
  badge.className = "tech-badge";
  const label = document.createElement("span");
  label.textContent = name;
  badge.append(technologyLogo(name), label);
  return badge;
}
