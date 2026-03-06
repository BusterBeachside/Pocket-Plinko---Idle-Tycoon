
import { MARBLE_SKINS } from './shardShopConfig';

export interface AvatarOption {
    id: string;
    name: string;
    type: 'default' | 'skin';
    color?: string;
    texture?: string;
    icon?: string;
}

export const DEFAULT_AVATARS: AvatarOption[] = [
    { id: 'marble_white', name: 'Marble', type: 'default', color: '#ffffff' },
    { id: 'peg_metallic', name: 'Peg', type: 'default', color: '#999999' },
    { id: 'marble_blue', name: 'Uncommon Marble', type: 'default', color: '#00f5ff' },
    { id: 'marble_red', name: 'Rare Marble', type: 'default', color: '#ff2e2e' },
    { id: 'marble_green', name: 'Legendary Marble', type: 'default', color: '#39ff14' },
    { id: 'marble_bonus', name: 'Bonus Marble', type: 'default', color: '#ff6b6b', texture: 'MarbleWings.png' },
    { id: 'core', name: 'Kinetic Core', type: 'default', color: '#00d2ff', texture: 'core.png' },
    { id: 'marble_micro', name: 'Micro Marble', type: 'default', color: '#b200ff' },
    { id: 'dollar_sign', name: 'Dollar Sign', type: 'default', color: '#ffd700', icon: '$' },
];

export const getAvatarOptions = (ownedSkins: string[] = []): AvatarOption[] => {
    const skinOptions: AvatarOption[] = MARBLE_SKINS
        .filter(skin => ownedSkins.includes(skin.id))
        .map(skin => ({
            id: skin.id,
            name: skin.name,
            type: 'skin',
            texture: skin.texture
        }));

    return [...DEFAULT_AVATARS, ...skinOptions];
};

export const getAvatarById = (id: string, ownedSkins: string[] = []): AvatarOption => {
    return getAvatarOptions(ownedSkins).find(a => a.id === id) || DEFAULT_AVATARS[0];
};
