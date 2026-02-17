
export const ASSET_PATHS = {
    core: 'images/core.png', 
    bonus: 'images/MarbleWings.png',
    tut_play: 'images/TUT_HowToPlay.png',
    tut_micro: 'images/TUT_MicroMarbles.png',
    tut_bonus: 'images/TUT_BonusMarble.png',
    tut_kinetic: 'images/TUT_KineticCore.png',
    tut_shard: 'images/TUT_ShardShop.png',
    tut_skins: 'images/TUT_MarbleSkins.png'
};

export class AssetLoader {
    images: { [key: string]: HTMLImageElement } = {};
    loaded = false;

    async loadAll(onProgress?: (progress: number) => void): Promise<void> {
        const entries = Object.entries(ASSET_PATHS);
        const total = entries.length;
        let count = 0;

        const loadAsset = ([key, path]: [string, string]) => {
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.src = path;
                
                img.onload = () => {
                    this.images[key] = img;
                    count++;
                    if (onProgress) onProgress(count / total);
                    resolve();
                };
                
                img.onerror = (e) => {
                    console.error(`Failed to load asset [${key}] from [${path}]`, e);
                    // Placeholder
                    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                    this.images[key] = img;
                    count++;
                    if (onProgress) onProgress(count / total);
                    resolve(); // Resolve anyway to allow game to start
                };
            });
        };

        await Promise.all(entries.map(loadAsset));
        this.loaded = true;
    }

    get(key: keyof typeof ASSET_PATHS): HTMLImageElement | undefined {
        return this.images[key];
    }
    
    getSrc(key: keyof typeof ASSET_PATHS): string {
        return this.images[key]?.src || '';
    }
}

export const assets = new AssetLoader();