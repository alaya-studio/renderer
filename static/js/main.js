// ===== Authors Toggle =====
(function() {
    const btn = document.getElementById('authorsToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        btn.closest('.authors-toggle').classList.toggle('open');
    });
})();

// ===== Team Toggle =====
(function() {
    const section = document.querySelector('.team-section');
    const btn = document.getElementById('teamToggle');
    if (!section || !btn) return;

    btn.addEventListener('click', () => section.classList.toggle('open'));

    // Auto-open when navigating to #team
    if (window.location.hash === '#team') section.classList.add('open');
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#team') section.classList.add('open');
    });
})();

// ===== Video Keyframes =====
(function() {
    const video = document.getElementById('heroVideo');
    const dots = document.querySelectorAll('.keyframe-dot');
    if (!video || !dots.length) return;

    // Show 17.55s frame as poster, but play from 0
    video.addEventListener('loadedmetadata', () => {
        video.currentTime = 17.55;
    });

    video.addEventListener('play', function onFirstPlay() {
        if (Math.abs(video.currentTime - 17.55) < 0.5) {
            video.currentTime = 0;
        }
        video.removeEventListener('play', onFirstPlay);
    });

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            video.currentTime = parseFloat(dot.dataset.time);
            video.play();
        });
    });

    let lastActive = null;
    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        let active = null;
        dots.forEach(dot => {
            if (currentTime >= parseFloat(dot.dataset.time)) active = dot;
        });
        if (active !== lastActive) {
            if (lastActive) lastActive.classList.remove('active');
            if (active) active.classList.add('active');
            lastActive = active;
        }
    });
})();

// ===== Channel Slider =====
window._chSliders = [];
document.querySelectorAll('.ch-slider').forEach(slider => {
    const allChannels = slider.dataset.channels.split(',');
    const prefix = slider.dataset.prefix;
    const labelMap = { rgb: 'RGB', depth: 'Depth', normal: 'Normal', basecolor: 'Albedo', metallic: 'Metallic', roughness: 'Roughness' };

    // Track which channels are enabled
    let enabled = allChannels.slice(); // all on by default

    // Create all videos and labels (hidden by default, toggled via enabled)
    const videoMap = {};
    const labelElMap = {};
    allChannels.forEach((ch, i) => {
        const video = document.createElement('video');
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.src = prefix + ch + '.mp4';
        video.dataset.ch = ch;
        video.addEventListener('loadedmetadata', () => { requestAnimationFrame(() => updateClips()); });
        video.addEventListener('loadeddata', () => { requestAnimationFrame(() => updateClips()); });
        slider.appendChild(video);
        videoMap[ch] = video;

        const label = document.createElement('span');
        label.className = 'ch-slider-label';
        label.textContent = labelMap[ch] || ch;
        label.dataset.ch = ch;
        slider.appendChild(label);
        labelElMap[ch] = label;
    });

    // Handles container — we'll recreate handles when channel count changes
    let handles = [];
    let dividers = [];
    let dragging = -1;

    function rebuildHandles() {
        handles.forEach(h => h.remove());
        handles = [];
        const n = enabled.length;
        dividers = [];
        for (let i = 1; i < n; i++) dividers.push(i / n);
        dividers.forEach(() => {
            const handle = document.createElement('div');
            handle.className = 'ch-slider-handle';
            slider.appendChild(handle);
            handles.push(handle);
        });
        attachHandleEvents();
        updateClips();
    }

    function updateClips() {
        const h = slider.offsetHeight;
        const w = slider.offsetWidth;
        if (!w || !h) return;
        const skewPx = h * Math.tan(6 * Math.PI / 180);
        const skew = skewPx / w;
        const n = enabled.length;

        // Hide all, then show enabled
        allChannels.forEach(ch => {
            videoMap[ch].style.clipPath = 'polygon(0 0, 0 0, 0 0)';
            videoMap[ch].style.display = 'none';
            videoMap[ch].classList.remove('ch-sizer');
            labelElMap[ch].style.display = 'none';
        });

        enabled.forEach((ch, i) => {
            const video = videoMap[ch];
            const label = labelElMap[ch];
            video.style.display = '';
            if (i === 0) video.classList.add('ch-sizer');
            const left = i === 0 ? 0 : dividers[i - 1];
            const right = i === n - 1 ? 1 : dividers[i];
            const lTop = i === 0 ? 0 : (left + skew / 2) * 100;
            const lBot = i === 0 ? 0 : (left - skew / 2) * 100;
            const rTop = i === n - 1 ? 100 : (right + skew / 2) * 100;
            const rBot = i === n - 1 ? 100 : (right - skew / 2) * 100;
            video.style.clipPath = `polygon(${lTop}% 0%, ${rTop}% 0%, ${rBot}% 100%, ${lBot}% 100%)`;

            const center = (left + right) / 2;
            const width = right - left;
            label.style.display = width < 0.05 ? 'none' : '';
            label.style.left = (center * 100) + '%';
            label.style.transform = 'translateX(-50%)';
        });

        handles.forEach((handle, i) => {
            handle.style.left = (dividers[i] * 100) + '%';
            handle.style.transform = 'translateX(-50%) skewX(-6deg)';
        });
    }

    function attachHandleEvents() {
        handles.forEach((handle, i) => {
            handle.addEventListener('mousedown', e => { e.preventDefault(); dragging = i; document.body.style.cursor = 'col-resize'; });
            handle.addEventListener('touchstart', e => { e.preventDefault(); dragging = i; }, { passive: false });
        });
    }

    function onMove(clientX) {
        if (dragging < 0) return;
        const rect = slider.getBoundingClientRect();
        let pos = (clientX - rect.left) / rect.width;
        const min = (dragging === 0 ? 0.03 : dividers[dragging - 1] + 0.03);
        const max = (dragging === dividers.length - 1 ? 0.97 : dividers[dragging + 1] - 0.03);
        pos = Math.max(min, Math.min(max, pos));
        dividers[dragging] = pos;
        updateClips();
    }

    document.addEventListener('mousemove', e => onMove(e.clientX));
    document.addEventListener('touchmove', e => { if (dragging >= 0) { e.preventDefault(); onMove(e.touches[0].clientX); } }, { passive: false });
    document.addEventListener('mouseup', () => { dragging = -1; document.body.style.cursor = ''; });
    document.addEventListener('touchend', () => { dragging = -1; });

    function syncPlay() {
        const isActive = slider.closest('.carousel-slide')?.classList.contains('active');
        if (!isActive) { Object.values(videoMap).forEach(v => v.pause()); return; }
        updateClips();
        const firstEnabled = videoMap[enabled[0]];
        if (!firstEnabled) return;
        const t = firstEnabled.currentTime;
        enabled.forEach((ch, i) => {
            if (i > 0) videoMap[ch].currentTime = t;
            videoMap[ch].play().catch(() => {});
        });
    }

    // Public API: set which channels are visible
    function setEnabled(newEnabled) {
        if (newEnabled.length < 1) return;
        enabled = newEnabled;
        rebuildHandles();
        syncPlay();
    }

    rebuildHandles();

    // Recalculate clips when slider resizes (e.g. video loads and changes height)
    new ResizeObserver(() => updateClips()).observe(slider);

    const observer = new MutationObserver(() => syncPlay());
    const slide = slider.closest('.carousel-slide');
    if (slide) observer.observe(slide, { attributes: true, attributeFilter: ['class'] });

    setInterval(() => {
        if (slider.closest('.carousel-slide')?.classList.contains('active') && enabled.length > 1) {
            const t = videoMap[enabled[0]].currentTime;
            enabled.forEach((ch, i) => { if (i > 0 && Math.abs(videoMap[ch].currentTime - t) > 0.15) videoMap[ch].currentTime = t; });
        }
    }, 2000);

    if (slide?.classList.contains('active')) setTimeout(syncPlay, 500);

    // Store reference for toggle buttons
    window._chSliders.push({ slider, allChannels, setEnabled, getEnabled: () => enabled.slice() });
});

// ===== Channel Toggle Buttons =====
(function() {
    const toggles = document.querySelectorAll('#channelToggles .channel-toggle');
    if (!toggles.length) return;

    toggles.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const active = Array.from(toggles)
                .filter(b => b.classList.contains('active'))
                .map(b => b.dataset.ch);
            if (active.length < 1) { btn.classList.add('active'); return; } // at least 1
            window._chSliders.forEach(s => s.setEnabled(active));
        });
    });
})();

// ===== Relighting Dial =====
document.querySelectorAll('.relight-interactive').forEach(container => {
    const svg = container.querySelector('.relight-dial__svg');
    const sun = container.querySelector('.relight-sun');
    const video = container.querySelector('[data-relight-video]');
    if (!svg || !sun || !video) return;

    const cx = 100, cy = 100, r = 85;
    let angle = 0; // radians, 0 = right
    let dragging = false;

    function updateSun() {
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        sun.setAttribute('cx', x);
        sun.setAttribute('cy', y);
    }

    function updateVideo() {
        if (!video.duration || isNaN(video.duration)) return;
        // Map angle (0 to 2π) to video time (0 to duration)
        const normalized = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        video.currentTime = (normalized / (2 * Math.PI)) * video.duration;
    }

    function getAngle(e) {
        const rect = svg.getBoundingClientRect();
        const mx = ((e.clientX || e.touches[0].clientX) - rect.left) / rect.width * 200;
        const my = ((e.clientY || e.touches[0].clientY) - rect.top) / rect.height * 200;
        return Math.atan2(my - cy, mx - cx);
    }

    svg.addEventListener('mousedown', e => {
        dragging = true;
        video.pause();
        sun.classList.add('dragging');
        angle = getAngle(e);
        updateSun();
        updateVideo();
        e.preventDefault();
    });

    svg.addEventListener('touchstart', e => {
        dragging = true;
        video.pause();
        sun.classList.add('dragging');
        angle = getAngle(e);
        updateSun();
        updateVideo();
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        angle = getAngle(e);
        updateSun();
        updateVideo();
    });

    document.addEventListener('touchmove', e => {
        if (!dragging) return;
        angle = getAngle(e);
        updateSun();
        updateVideo();
    }, { passive: true });

    document.addEventListener('mouseup', () => { if (dragging) { dragging = false; sun.classList.remove('dragging'); video.play().catch(() => {}); } });
    document.addEventListener('touchend', () => { if (dragging) { dragging = false; sun.classList.remove('dragging'); video.play().catch(() => {}); } });

    // Autoplay and sync sun to video time
    video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
    });

    video.addEventListener('timeupdate', () => {
        if (dragging) return; // don't override while user is dragging
        if (!video.duration || isNaN(video.duration)) return;
        angle = (video.currentTime / video.duration) * 2 * Math.PI;
        updateSun();
    });

    // Also use requestAnimationFrame for smoother sun movement during playback
    function animateSun() {
        if (!dragging && !video.paused && video.duration) {
            angle = (video.currentTime / video.duration) * 2 * Math.PI;
            updateSun();
        }
        requestAnimationFrame(animateSun);
    }
    requestAnimationFrame(animateSun);
});

// ===== Edit Slider (Game Editing) =====
(function() {
    const BASE = 'static/videos/editing/';
    const styleSelector = document.getElementById('styleSelector');
    const carousel = document.getElementById('editingCarousel');
    if (!styleSelector || !carousel) return;

    // Per-clip available styles
    const BMW_STYLES = [
        'cyberpunk_neon', 'snowy_winter', 'sandstorm', 'underwater',
        'fire_and_embers', 'heavy_rain', 'blizzard_whiteout', 'sunset_dramatic',
        'autumn_warm', 'moonlit_night', 'dense_fog', 'volcanic_ash',
        'dusk_purple_haze', 'magic_particle_storm', 'toxic_green_fog',
        'frozen_lens', 'dawn_overcast', 'bright_sunny',
        'dust_haze', 'eclipse_darkness', 'extreme_bloom',
        'firefly_swarm', 'harsh_backlight', 'heat_distortion',
        'heavy_snowfall', 'ice_storm', 'lens_flare_overload',
        'light_drizzle', 'light_fog', 'pitch_black', 'pollen_bloom',
        'rain_with_fog', 'rolling_fog_patches', 'steam_vents',
        'strobe_lightning', 'thick_smoke', 'underwater_bubbles',
        'underwater_murky', 'wet_lens'
    ];
    const CP2077_STYLES = [
        'aurora_night', 'cherry_blossom', 'fire_apocalypse', 'foggy_noir',
        'golden_hour', 'rainy_neon', 'sandstorm', 'snowy_blizzard',
        'sunny_day', 'thunderstorm'
    ];
    const CLIP_STYLES = {
        '2025-12-28_15-53-24_clip52': BMW_STYLES,
        '2025-12-28_16-52-40_clip9': BMW_STYLES,
        '2025-12-28_17-09-06_clip18': BMW_STYLES,
        '2025-12-28_18-10-29_clip7': BMW_STYLES,
        '2025-12-28_18-31-21_clip22': BMW_STYLES,
        '2025-12-28_17-09-06_clip55': BMW_STYLES,
        '2025-12-28_17-53-47_clip20': BMW_STYLES,
        '2077_2025-11-28_19-57-23_clip': CP2077_STYLES,
    };

    function styleName(s) {
        return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    let currentStyle = 'cyberpunk_neon'; // default

    function getActiveClip() {
        const active = carousel.querySelector('.carousel-slide.active');
        return active ? active.dataset.clip : null;
    }

    function getStylesForClip(clip) {
        return CLIP_STYLES[clip] || BMW_STYLES;
    }

    // Build style buttons for the active clip
    function buildButtons() {
        const clip = getActiveClip();
        const styles = getStylesForClip(clip);
        // If current style not in this clip's styles, reset to first
        if (!currentStyle || !styles.includes(currentStyle)) {
            currentStyle = styles[0];
        }
        styleSelector.innerHTML = '<span class="style-selector__label">Style:</span><div class="style-selector__btns"></div>';
        const container = styleSelector.querySelector('.style-selector__btns');
        styles.forEach(style => {
            const btn = document.createElement('button');
            btn.className = 'style-btn' + (style === currentStyle ? ' active' : '');
            btn.dataset.style = style;
            btn.textContent = styleName(style);
            btn.addEventListener('click', () => {
                container.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStyle = style;
                updateAllSliders();
            });
            container.appendChild(btn);
        });
    }

    // Init each edit-slider
    const sliders = [];
    carousel.querySelectorAll('.carousel-slide').forEach(slide => {
        const clip = slide.dataset.clip;
        const slider = slide.querySelector('.edit-slider');
        const inputVid = slider.querySelector('.edit-slider__input');
        const resultVid = slider.querySelector('.edit-slider__result');
        const handle = slider.querySelector('.edit-slider__handle');
        const labelRight = slider.querySelector('.edit-label-right');

        // Set initial sources (only for active slide; others loaded on demand)
        inputVid.src = BASE + clip + '/epoch27_original.mp4';
        const clipStyles = getStylesForClip(clip);
        const initStyle = clipStyles.includes(currentStyle) ? currentStyle : clipStyles[0];
        if (slide.classList.contains('active')) {
            resultVid.src = BASE + clip + '/epoch27_' + initStyle + '.mp4';
        }
        labelRight.textContent = styleName(initStyle);

        let divider = 0.5;
        let dragging = false;

        function updateClips() {
            const h = slider.offsetHeight;
            const w = slider.offsetWidth;
            if (!w || !h) return;
            const skewPx = h * Math.tan(6 * Math.PI / 180);
            const skew = skewPx / w;
            const dTop = (divider + skew / 2) * 100;
            const dBot = (divider - skew / 2) * 100;
            inputVid.style.clipPath = `polygon(0% 0%, ${dTop}% 0%, ${dBot}% 100%, 0% 100%)`;
            resultVid.style.clipPath = `polygon(${dTop}% 0%, 100% 0%, 100% 100%, ${dBot}% 100%)`;
            handle.style.left = (divider * 100) + '%';
            handle.style.transform = 'translateX(-50%) skewX(-6deg)';
        }

        function onDrag(clientX) {
            const rect = slider.getBoundingClientRect();
            divider = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
            updateClips();
        }

        handle.addEventListener('mousedown', e => { e.preventDefault(); dragging = true; document.body.style.cursor = 'col-resize'; });
        handle.addEventListener('touchstart', e => { e.preventDefault(); dragging = true; }, { passive: false });
        slider.addEventListener('mousedown', e => {
            if (e.target === handle || handle.contains(e.target)) return;
            dragging = true; document.body.style.cursor = 'col-resize';
            onDrag(e.clientX);
        });

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            e.preventDefault();
            onDrag(e.clientX);
        });
        document.addEventListener('touchmove', e => {
            if (!dragging) return;
            onDrag(e.touches[0].clientX);
        }, { passive: true });
        document.addEventListener('mouseup', () => { if (dragging) { dragging = false; document.body.style.cursor = ''; } });
        document.addEventListener('touchend', () => { if (dragging) { dragging = false; } });

        new ResizeObserver(() => updateClips()).observe(slider);
        inputVid.addEventListener('loadedmetadata', () => updateClips());
        resultVid.addEventListener('loadedmetadata', () => updateClips());

        // Sync playback
        setInterval(() => {
            if (!inputVid.paused && resultVid.duration && Math.abs(inputVid.currentTime - resultVid.currentTime) > 0.15) {
                resultVid.currentTime = inputVid.currentTime;
            }
        }, 1000);

        sliders.push({ clip, inputVid, resultVid, labelRight, updateClips });
    });

    function updateAllSliders() {
        const activeClip = getActiveClip();
        sliders.forEach(s => {
            const styles = getStylesForClip(s.clip);
            const style = styles.includes(currentStyle) ? currentStyle : styles[0];
            const newSrc = BASE + s.clip + '/epoch27_' + style + '.mp4';
            // Only load video for active slide
            if (s.clip === activeClip) {
                if (!s.resultVid.src.endsWith('/epoch27_' + style + '.mp4')) {
                    const t = s.inputVid.currentTime;
                    s.resultVid.src = newSrc;
                    s.resultVid.load();
                    s.resultVid.addEventListener('loadedmetadata', function once() {
                        s.resultVid.currentTime = t;
                        s.resultVid.play().catch(() => {});
                        s.resultVid.removeEventListener('loadedmetadata', once);
                    });
                }
                s.inputVid.play().catch(() => {});
                s.resultVid.play().catch(() => {});
                s.updateClips();
            }
            s.labelRight.textContent = styleName(style);
        });
    }

    buildButtons();
    updateAllSliders();

    // Play active slide videos + rebuild buttons when slide changes
    let lastActiveClip = getActiveClip();
    const observer = new MutationObserver(() => {
        const nowActive = getActiveClip();
        carousel.querySelectorAll('.carousel-slide').forEach(slide => {
            const vids = slide.querySelectorAll('video');
            if (slide.classList.contains('active')) {
                vids.forEach(v => { v.currentTime = 0; v.play().catch(() => {}); });
            } else {
                vids.forEach(v => v.pause());
            }
        });
        if (nowActive !== lastActiveClip) {
            lastActiveClip = nowActive;
            buildButtons();
            updateAllSliders();
        }
    });
    carousel.querySelectorAll('.carousel-slide').forEach(slide => {
        observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
    });
})();

// ===== Inverse Rendering Controls =====
(function() {
    const BASE = 'static/videos/inverse/';
    const sceneBtns = document.querySelectorAll('#inverseSceneSelector .scene-btn');
    const channelBtns = document.querySelectorAll('#inverseChannelSelector .channel-btn');
    const video = document.getElementById('invVideo');
    if (!sceneBtns.length || !video) return;

    const SCENE_CHANNELS = {
        outdoor: ['albedo', 'depth', 'normal', 'metallic', 'roughness'],
        ai: ['albedo', 'depth', 'normal', 'metallic'],
        indoor: ['albedo', 'depth'],
    };

    let currentScene = 'outdoor';
    let currentChannel = 'albedo';

    function updateVideo() {
        video.src = BASE + currentScene + '_' + currentChannel + '_merged.mp4';
        video.load();
        video.play().catch(() => {});
    }

    function updateChannelButtons() {
        const available = SCENE_CHANNELS[currentScene] || [];
        channelBtns.forEach(btn => {
            const ch = btn.dataset.ch;
            btn.disabled = !available.includes(ch);
            btn.style.opacity = available.includes(ch) ? '' : '0.3';
            btn.style.pointerEvents = available.includes(ch) ? '' : 'none';
        });
        if (!available.includes(currentChannel)) {
            currentChannel = available[0];
            channelBtns.forEach(b => b.classList.remove('active'));
            channelBtns.forEach(b => { if (b.dataset.ch === currentChannel) b.classList.add('active'); });
        }
    }

    sceneBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sceneBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentScene = btn.dataset.scene;
            updateChannelButtons();
            updateVideo();
        });
    });

    channelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            channelBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChannel = btn.dataset.ch;
            updateVideo();
        });
    });

    updateChannelButtons();
    updateVideo();
})();

// ===== Carousel Zoom =====
document.querySelectorAll('.carousel-resize-controls').forEach(controls => {
    const container = controls.closest('.carousel') || controls.closest('.zoomable');
    const slides = container.querySelector('.carousel-slides') || container.querySelector('.edit-slider');
    const steps = [60, 75, 100, 120, 150];
    let current = 0; // 60% default

    function applyZoom() {
        const pct = steps[current];
        slides.style.width = pct + '%';
        slides.style.marginLeft = 'auto';
        slides.style.marginRight = 'auto';
        if (pct > 100) {
            slides.style.marginLeft = ((100 - pct) / 2) + '%';
            slides.style.marginRight = ((100 - pct) / 2) + '%';
        }
        slides.style.transition = 'width 0.3s ease, margin-left 0.3s ease';
    }

    controls.querySelector('.carousel-zoom-in').addEventListener('click', () => {
        if (current < steps.length - 1) current++;
        applyZoom();
    });
    controls.querySelector('.carousel-zoom-out').addEventListener('click', () => {
        if (current > 0) current--;
        applyZoom();
    });

    applyZoom(); // apply initial size
});

// ===== Carousel =====
document.querySelectorAll('.carousel').forEach(carousel => {
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dotsContainer = carousel.querySelector('.carousel-dots');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    let current = 0;

    slides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
    });

    function goTo(index) {
        // Pause all videos in old slide
        slides[current].querySelectorAll('video').forEach(v => v.pause());

        slides[current].classList.remove('active');
        dotsContainer.children[current].classList.remove('active');
        current = (index + slides.length) % slides.length;
        slides[current].classList.add('active');
        dotsContainer.children[current].classList.add('active');

        // Play all videos in new slide (for ch-slider sync)
        const newVideos = slides[current].querySelectorAll('video');
        newVideos.forEach(v => { v.currentTime = 0; v.play().catch(() => {}); });
    }

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));
});

// ===== Tab Switching =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const container = btn.closest('.article-content') || btn.closest('.container');
        container.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        const target = container.querySelector(`#${tabId}`);
        if (target) target.classList.add('active');
    });
});

// ===== Channel Selector =====
document.querySelectorAll('.channel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const channel = btn.dataset.channel;
        btn.parentElement.querySelectorAll('.channel-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const comparison = btn.closest('.channel-comparison');
        comparison.querySelectorAll('.channel-content').forEach(cc => cc.classList.remove('active'));
        const target = comparison.querySelector(`#ch-${channel}`);
        if (target) target.classList.add('active');
    });
});

// ===== Copy BibTeX =====
function copyBibtex() {
    const code = document.querySelector('.bibtex-block code');
    navigator.clipboard.writeText(code.textContent).then(() => {
        const btn = document.querySelector('.copy-btn');
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => btn.innerHTML = original, 2000);
    });
}

// ===== Synchronized Video Playback =====
document.querySelectorAll('.video-row').forEach(row => {
    const videos = row.querySelectorAll('video');
    if (videos.length <= 1) return;
    let isSyncing = false;

    videos.forEach(video => {
        video.addEventListener('play', () => {
            if (isSyncing) return;
            isSyncing = true;
            videos.forEach(v => {
                if (v !== video && v.paused) {
                    v.currentTime = video.currentTime;
                    v.play().catch(() => {});
                }
            });
            isSyncing = false;
        });

        video.addEventListener('pause', () => {
            if (isSyncing) return;
            isSyncing = true;
            videos.forEach(v => {
                if (v !== video && !v.paused) v.pause();
            });
            isSyncing = false;
        });

        video.addEventListener('seeked', () => {
            if (isSyncing) return;
            isSyncing = true;
            videos.forEach(v => {
                if (v !== video) v.currentTime = video.currentTime;
            });
            isSyncing = false;
        });
    });
});

// ===== Lazy Autoplay on Scroll =====
const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting && video.hasAttribute('autoplay') && video.paused) {
            video.play().catch(() => {});
        }
    });
}, { threshold: 0.3 });

document.querySelectorAll('video[autoplay]').forEach(video => videoObserver.observe(video));

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 72; // header height
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

// ===== Grid Background Overlay =====
(function() {
    const grid = document.createElement('div');
    grid.className = 'grid-bg';
    document.body.prepend(grid);
})();

// ===== Scroll Progress Bar =====
(function() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.prepend(bar);
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (scrollTop / docHeight * 100) + '%';
    });
})();

// ===== Hero Elements Fade In =====
(function() {
    const heroText = document.querySelector('.hero-text');
    if (!heroText) return;
    const children = heroText.children;
    Array.from(children).forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 100 + i * 100);
    });

    const heroMedia = document.querySelector('.hero-media');
    if (heroMedia) {
        heroMedia.style.opacity = '0';
        heroMedia.style.transform = 'translateY(24px)';
        heroMedia.style.transition = 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s';
        setTimeout(() => {
            heroMedia.style.opacity = '1';
            heroMedia.style.transform = 'translateY(0)';
        }, 200);
    }
})();

// ===== Scroll-Triggered Section Reveal =====
(function() {
    const sections = document.querySelectorAll('.article-body, .stats-scene');
    sections.forEach(s => s.classList.add('reveal'));

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
    }, { threshold: 0.08 });

    sections.forEach(s => revealObserver.observe(s));
})();

// ===== Stats Scene Reveal =====
(function() {
    const sceneObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('is-active');
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.stats-scene').forEach((scene) => sceneObserver.observe(scene));
})();

// ===== Animated Number Count-Up (Ropedia-style) =====
(function() {
    function animateCount(el) {
        if (!el || el.dataset.animated) return;
        el.dataset.animated = 'true';

        const end = Number(el.dataset.count || 0);
        const suffix = el.dataset.suffix || '';
        const duration = end > 100 ? 1600 : 1200;
        const start = performance.now();

        function tick(now) {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const current = end * eased;
            el.textContent = (end >= 100 ? Math.round(current) : Number(current.toFixed(1)).toString()) + suffix;
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = (Number.isInteger(end) ? end : end) + suffix;
        }

        requestAnimationFrame(tick);
    }

    const countObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) animateCount(entry.target);
        });
    }, { threshold: 0.4 });

    document.querySelectorAll('.js-count[data-count]').forEach((el) => countObserver.observe(el));
})();

// ===== Active TOC Highlight on Scroll =====
(function() {
    const dots = document.querySelectorAll('.toc-dot');
    if (!dots.length) return;

    const sections = [];
    dots.forEach(dot => {
        const id = dot.getAttribute('href').slice(1);
        const section = document.getElementById(id);
        if (section) sections.push({ el: section, dot });
    });

    function updateToc() {
        let active = sections[0];
        for (const s of sections) {
            if (s.el.getBoundingClientRect().top <= 100) active = s;
        }
        dots.forEach(d => d.dot.classList.remove('active'));
        if (active) active.dot.classList.add('active');
    }

    window.addEventListener('scroll', updateToc, { passive: true });
    updateToc();
})();
