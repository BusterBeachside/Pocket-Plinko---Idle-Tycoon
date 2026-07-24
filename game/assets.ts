
export const ASSET_PATHS = {
    core: 'images/core.png', 
    bonus: 'images/MarbleWings.png',
    tut_play: 'images/TUT_HowToPlay.png',
    tut_micro: 'images/TUT_MicroMarbles.png',
    tut_bonus: 'images/TUT_BonusMarble.png',
    tut_kinetic: 'images/TUT_KineticCore.png',
    tut_shard: 'images/TUT_ShardShop.png',
    tut_skins: 'images/TUT_MarbleSkins.png',
    tut_sockets: 'images/diamond-gem.png',
    ruby_gem: 'images/ruby-gem.png',
    emerald_gem: 'images/emerald-gem.png',
    diamond_gem: 'images/diamond-gem.png'
};

export class AssetLoader {
    images: { [key: string]: HTMLImageElement } = {};
    loaded = false;

    async loadAll(onProgress?: (progress: number) => void): Promise<void> {
        const entries = Object.entries(ASSET_PATHS);
        const total = entries.length;
        let count = 0;

        const loadAsset = ([key, path]: [string, string]): Promise<void> => {
            return new Promise<void>((resolve) => {
                const img = new Image();
                let attempts = 0;
                const maxAttempts = 3;

                const tryLoad = () => {
                    attempts++;
                    img.onload = () => {
                        this.images[key] = img;
                        resolve();
                    };
                    img.onerror = () => {
                        if (attempts < maxAttempts) {
                            setTimeout(tryLoad, 250 * attempts);
                        } else {
                            console.warn(`Asset [${key}] load warning for [${path}], using fallback placeholder.`);
                            const placeholder = new Image();
                            placeholder.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                            this.images[key] = placeholder;
                            resolve();
                        }
                    };
                    img.src = attempts === 1 ? path : `${path}?r=${attempts}`;
                };

                tryLoad();
            }).finally(() => {
                count++;
                if (onProgress) onProgress(count / total);
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