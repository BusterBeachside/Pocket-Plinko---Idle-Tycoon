export class AudioController {
    private ctx: AudioContext | null = null;
    private sfxGain: GainNode | null = null;
    private musicGain: GainNode | null = null;
    
    private buffers: Map<string, AudioBuffer[]> = new Map();
    private musicSource: AudioBufferSourceNode | null = null;
    
    private sfxVolume: number = 0.5;
    private musicVolume: number = 0.3;
    private sfxMuted: boolean = false;
    private musicMuted: boolean = false;

    // Cooldown map to prevent spamming the same sound type too fast
    private lastPlayed: Map<string, number> = new Map();

    constructor() {}

    // Initialize context if not already done (can be done during preload without user interaction, starts suspended)
    private ensureContext() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.sfxGain = this.ctx.createGain();
            this.musicGain = this.ctx.createGain();
            this.sfxGain.connect(this.ctx.destination);
            this.musicGain.connect(this.ctx.destination);
            this.applyVolumes();
        } catch (e) {
            console.error("Audio Context Creation Failed:", e);
        }
    }

    async loadAll(onProgress?: (progress: number) => void): Promise<void> {
        this.ensureContext();
        if (!this.ctx) return;

        const tasks: { type: 'group' | 'single', key: string, url: string, count?: number }[] = [];

        // Define groups
        tasks.push({ type: 'group', key: 'peg', url: 'sounds/Marble', count: 10 });
        tasks.push({ type: 'group', key: 'basket', url: 'sounds/MarbleBasket', count: 3 });
        tasks.push({ type: 'group', key: 'microPeg', url: 'sounds/MicroMarble', count: 10 });
        tasks.push({ type: 'group', key: 'microBasket', url: 'sounds/MicroMarbleBasket', count: 3 });
        
        // Define singles
        tasks.push({ type: 'single', key: 'upgrade', url: 'sounds/Upgrade.wav' });
        tasks.push({ type: 'single', key: 'bonus', url: 'sounds/Bonus.wav' });
        tasks.push({ type: 'single', key: 'prestige1', url: 'sounds/Prestige1.wav' });
        tasks.push({ type: 'single', key: 'prestige2', url: 'sounds/Prestige2.wav' });
        tasks.push({ type: 'single', key: 'music', url: 'sounds/Music.ogg' });

        let totalFiles = 0;
        tasks.forEach(t => totalFiles += (t.type === 'group' ? (t.count || 1) : 1));
        
        let loadedCount = 0;
        const updateProgress = () => {
            loadedCount++;
            if (onProgress) onProgress(loadedCount / totalFiles);
        };

        const promises = tasks.map(async (task) => {
            if (task.type === 'group') {
                const buffers: AudioBuffer[] = [];
                for(let i=1; i<=(task.count || 1); i++) {
                    let fileUrl = '';
                    if (task.key.includes('basket') || task.key.includes('Basket')) {
                         fileUrl = i === 1 ? `${task.url}.ogg` : `${task.url}${i}.ogg`;
                    } else {
                         fileUrl = `${task.url}${i}.ogg`;
                    }
                    const buf = await this.fetchBuffer(fileUrl);
                    if(buf) buffers.push(buf);
                    updateProgress();
                }
                this.buffers.set(task.key, buffers);
            } else {
                const buf = await this.fetchBuffer(task.url);
                if(buf) this.buffers.set(task.key, [buf]);
                updateProgress();
            }
        });

        await Promise.all(promises);
    }

    async init() {
        // init is now just a check to ensure context exists and resume if possible (user interaction)
        this.ensureContext();
        if (this.ctx && this.ctx.state === 'suspended') {
            try { await this.ctx.resume(); } catch(e) {}
        }
    }

    startMusic() {
        if (!this.ctx || this.musicSource) return;
        if (this.musicMuted) return;

        const musicBuffer = this.buffers.get('music')?.[0];
        if (!musicBuffer) return; // assumed loaded via loadAll

        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(()=>{});
            }

            this.musicSource = this.ctx.createBufferSource();
            this.musicSource.buffer = musicBuffer;
            this.musicSource.loop = true;
            this.musicSource.connect(this.musicGain!);
            this.musicSource.start(0);
        } catch (e) {
            console.error("Failed to start music:", e);
        }
    }

    stopMusic() {
        if (this.musicSource) {
            try {
                this.musicSource.stop();
                this.musicSource.disconnect();
            } catch(e) {}
            this.musicSource = null;
        }
    }

    restartMusic() {
        this.stopMusic();
        this.startMusic();
    }

    private async fetchBuffer(url: string): Promise<AudioBuffer | null> {
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.arrayBuffer();
            if(this.ctx) return await this.ctx.decodeAudioData(data);
        } catch(e) { 
            return null;
        }
        return null;
    }

    play(key: string, pitchVar: number = 0, volumeScale: number = 1) {
        if (!this.ctx || this.sfxMuted || !this.sfxGain) return;
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(()=>{});
        }

        const group = this.buffers.get(key);
        if (!group || group.length === 0) return;

        const now = performance.now();
        const last = this.lastPlayed.get(key) || 0;
        if (now - last < 40) return; 
        this.lastPlayed.set(key, now);

        const buf = group[Math.floor(Math.random() * group.length)];
        
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        
        if (pitchVar > 0) {
            const detune = (Math.random() - 0.5) * 2 * (pitchVar * 100);
            src.detune.value = detune;
        }

        const gain = this.ctx.createGain();
        gain.gain.value = volumeScale;
        
        src.connect(gain);
        gain.connect(this.sfxGain);
        src.start(0);
    }

    setSfxVolume(vol: number) {
        this.sfxVolume = vol;
        this.applyVolumes();
    }

    setMusicVolume(vol: number) {
        this.musicVolume = vol;
        this.applyVolumes();
    }

    toggleSfxMute(mute: boolean) {
        this.sfxMuted = mute;
        this.applyVolumes();
    }

    toggleMusicMute(mute: boolean) {
        this.musicMuted = mute;
        if (this.musicMuted) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
    }

    private applyVolumes() {
        if (this.ctx) {
            try {
                if (this.sfxGain) this.sfxGain.gain.setValueAtTime(this.sfxMuted ? 0 : this.sfxVolume, this.ctx.currentTime);
                if (this.musicGain) this.musicGain.gain.setValueAtTime(this.musicMuted ? 0 : this.musicVolume, this.ctx.currentTime);
            } catch(e) {}
        }
    }
}