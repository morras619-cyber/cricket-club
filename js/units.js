// Ball speeds in the player's chosen unit (Settings): km/h or mph.
export const units = { speed: 'kmh' };
export const speedText = kmh => units.speed === 'mph' ? `${Math.round(kmh / 1.609)} MPH` : `${Math.round(kmh)} KM/H`;
export const speedRange = ([a, b]) => units.speed === 'mph' ? `${Math.round(a / 1.609)}-${Math.round(b / 1.609)} mph` : `${a}-${b} km/h`;
