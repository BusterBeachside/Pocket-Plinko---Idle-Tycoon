export const ASSET_PATHS = {
    core: './images/core.png', 
    bonus: './images/MarbleWings.png',
    tut_play: './images/TUT_HowToPlay.png',
    tut_micro: './images/TUT_MicroMarbles.png',
    tut_bonus: './images/TUT_BonusMarble.png',
    tut_kinetic: './images/TUT_KineticCore.png',
    tut_shard: './images/TUT_ShardShop.png',
    tut_skins: './images/TUT_MarbleSkins.png'
};

export class AssetLoader {
    images: { [key: string]: HTMLImageElement } = {};
    loaded = false;

    async loadAll(onProgress?: (progress: number) => void): Promise<void> {
        const entries = Object.entries(ASSET_PATHS);
        const total = entries.length;
        let count = 0;

        const loadAsset = async ([key, path]: [string, string]) => {
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const blob = await response.blob();
                const objectURL = URL.createObjectURL(blob);
                
                const img = new Image();
                img.src = objectURL;
                
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Image load failed'));
                });
                
                this.images[key] = img;
            } catch (e) {
                console.error(`Failed to load asset [${key}] from [${path}]:`, e);
                // Create a placeholder 1x1 transparent image to prevent rendering crashes
                const placeholder = new Image();
                placeholder.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                this.images[key] = placeholder;
            } finally {
                count++;
                if (onProgress) onProgress(count / total);
            }
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