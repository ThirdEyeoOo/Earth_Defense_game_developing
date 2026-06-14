import agroalimentare from '../../Assets/Widgets/Risorse/agroalimentare.svg?raw';
import chimica from '../../Assets/Widgets/Risorse/chimica.svg?raw';
import combustibili_fossili from '../../Assets/Widgets/Risorse/combustibili_fossili.svg?raw';
import energia from '../../Assets/Widgets/Risorse/energia.svg?raw';
import finanza from '../../Assets/Widgets/Risorse/finanza.svg?raw';
import industria from '../../Assets/Widgets/Risorse/industria.svg?raw';
import materiali_da_costruzione from '../../Assets/Widgets/Risorse/materiali_da_costruzione.svg?raw';
import metalli_preziosi_e_minerali from '../../Assets/Widgets/Risorse/metalli_preziosi_e_minerali.svg?raw';
import tecnologia from '../../Assets/Widgets/Risorse/tecnologia.svg?raw';
import tessuti from '../../Assets/Widgets/Risorse/tessuti.svg?raw';
import type { ResourceType } from '../sim/resources';
import { stripForInline } from './icons';

// Iconcina colorata per ogni risorsa, inline nel DOM (via id/title come gli
// altri asset UI). Chiave = ResourceType per mapping diretto col dato.
export const resourceIcons: Record<ResourceType, string> = {
  agroalimentare: stripForInline(agroalimentare),
  chimica: stripForInline(chimica),
  combustibili_fossili: stripForInline(combustibili_fossili),
  energia: stripForInline(energia),
  finanza: stripForInline(finanza),
  industria: stripForInline(industria),
  materiali_da_costruzione: stripForInline(materiali_da_costruzione),
  metalli_preziosi_e_minerali: stripForInline(metalli_preziosi_e_minerali),
  tecnologia: stripForInline(tecnologia),
  tessuti: stripForInline(tessuti),
};

export function resourceIcon(type: ResourceType): string {
  return `<span class="res-icon">${resourceIcons[type]}</span>`;
}
