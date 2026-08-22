import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function SaqlabHeroAnimation() {
  const containerRef = useRef(null);
  const zoomStageRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Responsive scaling to fit 1600x900 stage within container width & height
    const updateScale = () => {
      if (!root || !zoomStageRef.current) return;
      const w = root.clientWidth || 1200;
      const h = root.clientHeight || 675;
      const scale = Math.min(w / 1600, h / 900);
      zoomStageRef.current.style.transform = `scale(${scale})`;
      zoomStageRef.current.style.transformOrigin = '50% 50%';
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    // Cursor shape switcher helper
    const cursorSvgs = root.querySelectorAll('.cursor-svg');
    function setCursorType(type) {
      cursorSvgs.forEach(svg => svg.classList.remove('active'));
      const activeSvg = root.querySelector(`.cursor-${type}`);
      if (activeSvg) activeSvg.classList.add('active');
    }

    // Elements
    const zoomStage = zoomStageRef.current;
    const svgLayer = root.querySelector('#connections-svg');
    const cursor = root.querySelector('#virtual-cursor');

    const card1 = root.querySelector('#card-1');
    const card2 = root.querySelector('#card-2');
    const card3 = root.querySelector('#card-3');

    const ripple1 = root.querySelector('#ripple-1');
    const ripple2 = root.querySelector('#ripple-2');

    const card1Plus = card1?.querySelector('.plus-icon');
    const card2Plus = card2?.querySelector('.plus-icon');

    const imgSaq = root.querySelector('#img-saq');
    const imgSaqlab = root.querySelector('#img-saqlab');
    const imgHink = root.querySelector('#img-hink');
    const imgLab = root.querySelector('#img-lab');

    const branchNodes = root.querySelectorAll('.branch-node');
    const dashedSlots = root.querySelectorAll('.dashed-slot');
    const portDots = root.querySelectorAll('.port-dot');

    // Search Elements
    const searchModule = root.querySelector('#search-module');
    const searchText = root.querySelector('#search-text');
    const langBadge = root.querySelector('#lang-badge');
    const searchDropdown = root.querySelector('#search-dropdown');
    const dropdownPoster = root.querySelector('#dropdown-poster');
    const dropdownTitle = root.querySelector('#dropdown-title');
    const dropdownSubtitle = root.querySelector('#dropdown-subtitle');
    const dropdownRatingText = root.querySelector('#dropdown-rating-text');

    const connectionPairs = [
      [610, 388, 520, 240],
      [990, 388, 1120, 220],
      [320, 240, 260, 330],
      [610, 500, 460, 460],
      [990, 500, 1080, 440],
      [260, 460, 240, 580],
      [1280, 440, 1350, 360],
      [1280, 440, 1330, 600],
      [610, 612, 540, 670],
      [990, 612, 1100, 690],
      [240, 580, 340, 670],
      [1330, 600, 1300, 690]
    ];

    function buildSvgConnections() {
      if (!svgLayer) return;
      svgLayer.innerHTML = '';
      connectionPairs.forEach(([x1, y1, x2, y2], idx) => {
        const dx = Math.abs(x2 - x1) * 0.45;
        const cx1 = x1 < x2 ? x1 + dx : x1 - dx;
        const cx2 = x1 < x2 ? x2 - dx : x2 + dx;
        const pathD = `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('class', 'connection-path');
        path.setAttribute('id', `path-${idx}`);
        svgLayer.appendChild(path);
      });
    }

    buildSvgConnections();
    const connectionPaths = root.querySelectorAll('.connection-path');

    function updateDropdown(data) {
      if (dropdownTitle) dropdownTitle.textContent = data.title;
      if (dropdownSubtitle) dropdownSubtitle.textContent = data.subtitle;
      if (dropdownRatingText) dropdownRatingText.textContent = data.score;
      if (dropdownPoster) dropdownPoster.className = `w-13 h-17 rounded-xl ${data.posterGradient} shrink-0 flex items-center justify-center shadow-inner border border-slate-100 p-2.5`;
      if (langBadge) {
        langBadge.textContent = data.badgeText;
        langBadge.className = `px-3 py-0.5 rounded-full text-[11.5px] font-bold font-inter tracking-wide shrink-0 border ${data.badgeClass}`;
      }
    }

    function resetInitialState() {
      gsap.set(card1, {
        x: 0,
        y: 0,
        scale: 1,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#cbd5e1',
        zIndex: 10,
        opacity: 1
      });

      gsap.set(card2, {
        x: 0,
        y: 0,
        scale: 1,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#cbd5e1',
        zIndex: 1,
        opacity: 1
      });

      gsap.set(card3, {
        x: 0,
        y: 0,
        scale: 1,
        zIndex: 1,
        opacity: 1
      });

      card1?.classList.remove('card-solid-active');
      card2?.classList.remove('card-solid-active');

      if (card1Plus && card2Plus) gsap.set([card1Plus, card2Plus], { opacity: 1, scale: 1, rotate: 0 });
      if (imgSaq) gsap.set(imgSaq, { opacity: 0, scale: 0.4 });
      if (imgSaqlab) gsap.set(imgSaqlab, { opacity: 0, scale: 0.9 });
      if (imgHink) gsap.set(imgHink, { opacity: 0, scale: 0.4 });
      if (imgLab) gsap.set(imgLab, { opacity: 1, scale: 1 });
      if (ripple1 && ripple2) gsap.set([ripple1, ripple2], { scale: 0, opacity: 0 });
      if (cursor) gsap.set(cursor, { x: 900, y: 450, opacity: 0 });
      setCursorType('default');

      gsap.set(branchNodes, { opacity: 0, scale: 0.85 });
      gsap.set(dashedSlots, { opacity: 1 });
      gsap.set(portDots, { opacity: 1 });
      gsap.set(connectionPaths, { strokeDashoffset: 1000, opacity: 0 });

      gsap.set(searchModule, { opacity: 0, scale: 0.92, y: 15 });
      gsap.set(searchDropdown, { opacity: 0, scale: 0.95, y: 8 });
      gsap.set(langBadge, { opacity: 0, scale: 0.75 });
      if (searchText) searchText.textContent = '';
    }

    const masterTl = gsap.timeline({ repeat: -1 });
    timelineRef.current = masterTl;

    masterTl.addLabel('reset', 0.0);
    masterTl.add(() => resetInitialState(), 0.0);

    // --- PHASE 1: Spawning & Drag Reorder ---
    masterTl.to(cursor, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.2);
    masterTl.to(cursor, { x: 788, y: 385, duration: 0.55, ease: 'power2.inOut' }, 0.3);
    masterTl.call(() => setCursorType('pointer'), null, 0.8);

    masterTl.fromTo(ripple1,
      { scale: 0, opacity: 0.6 },
      { scale: 18, opacity: 0, duration: 0.5, ease: 'power2.out' },
      0.85
    );

    masterTl.to(card1, { scale: 0.97, duration: 0.08, ease: 'power2.in' }, 0.85);
    masterTl.to(card1, { scale: 1.0, duration: 0.28, ease: 'elastic.out(1, 0.75)' }, 0.93);
    masterTl.to(card1Plus, { opacity: 0, scale: 0.3, rotate: 45, duration: 0.2, ease: 'power2.in' }, 0.85);
    masterTl.call(() => card1?.classList.add('card-solid-active'), null, 0.9);
    masterTl.to(imgSaq, { opacity: 1, scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.75)' }, 0.93);

    // Second Spawn: hink
    masterTl.to(cursor, { x: 788, y: 497, duration: 0.55, ease: 'power2.inOut' }, 1.3);
    masterTl.fromTo(ripple2,
      { scale: 0, opacity: 0.6 },
      { scale: 18, opacity: 0, duration: 0.5, ease: 'power2.out' },
      1.85
    );
    masterTl.to(card2, { scale: 0.97, duration: 0.08, ease: 'power2.in' }, 1.85);
    masterTl.to(card2, { scale: 1.0, duration: 0.28, ease: 'elastic.out(1, 0.75)' }, 1.93);
    masterTl.to(card2Plus, { opacity: 0, scale: 0.3, rotate: 45, duration: 0.2, ease: 'power2.in' }, 1.85);
    masterTl.call(() => card2?.classList.add('card-solid-active'), null, 1.9);
    masterTl.to(imgHink, { opacity: 1, scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.75)' }, 1.93);

    // Drag & Drop Swap
    masterTl.to(cursor, { x: 924, y: 353, duration: 0.5, ease: 'power2.inOut' }, 2.3);
    masterTl.call(() => setCursorType('grab'), null, 2.75);
    masterTl.call(() => setCursorType('grabbing'), null, 2.9);

    masterTl.to(card1, {
      scale: 1.03,
      boxShadow: '0 25px 40px -10px rgba(0, 0, 0, 0.16)',
      zIndex: 50,
      duration: 0.18,
      ease: 'power2.out'
    }, 2.9);

    masterTl.to(cursor, { y: 465, duration: 0.6, ease: 'power2.inOut' }, 3.0);
    masterTl.to(card1, { y: 112, duration: 0.6, ease: 'power2.inOut' }, 3.0);
    masterTl.to(card2, { y: -112, duration: 0.45, ease: 'power3.inOut' }, 3.2);

    masterTl.call(() => setCursorType('grab'), null, 3.65);
    masterTl.to(card1, {
      scale: 1.0,
      boxShadow: '0 8px 25px -4px rgba(0, 0, 0, 0.05)',
      zIndex: 10,
      duration: 0.3,
      ease: 'elastic.out(1, 0.75)'
    }, 3.65);

    // --- PHASE 2: Chronology Tree Zoom-Out ---
    masterTl.to(cursor, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 3.75);
    masterTl.to(zoomStage, { scale: 0.85, duration: 0.85, ease: 'power2.inOut' }, 'zoom')
      .to(branchNodes, { opacity: 1, scale: 1, stagger: 0.025, duration: 0.45, ease: 'back.out(1.4)' }, 'zoom+=0.15')
      .to(connectionPaths, { opacity: 0.65, strokeDashoffset: 0, duration: 0.65, stagger: 0.015, ease: 'power2.out' }, 'zoom+=0.25');

    masterTl.to({}, { duration: 1.0 }, 5.2);

    // --- PHASE 3: saqlab Unified & Search Engine ---
    masterTl.to('.branch-node, .connection-path', { opacity: 0, scale: 0.85, duration: 0.4, ease: 'power2.in' }, 6.2);
    masterTl.to(zoomStage, { scale: 1.02, y: 0, duration: 0.7, ease: 'power2.inOut' }, 6.25);

    masterTl.to(card2, { opacity: 0, scale: 0.7, y: -160, duration: 0.45, ease: 'power2.in' }, 6.25);
    masterTl.to([dashedSlots, portDots], { opacity: 0, duration: 0.35, ease: 'power2.in' }, 6.25);
    masterTl.to(card3, { y: -112, opacity: 0, duration: 0.5, ease: 'power3.inOut' }, 6.25);

    masterTl.to(imgSaq, { opacity: 0, scale: 0.8, duration: 0.35, ease: 'power2.in' }, 6.35);
    masterTl.to(imgSaqlab, { opacity: 1, scale: 1.05, duration: 0.45, ease: 'back.out(1.2)' }, 6.45);
    masterTl.to(card1, { scale: 0.86, y: -148, boxShadow: '0 6px 24px -2px rgba(0, 0, 0, 0.06)', duration: 0.65, ease: 'power3.inOut' }, 6.35);

    masterTl.to(searchModule, { opacity: 1, scale: 1.0, y: 0, duration: 0.5, ease: 'back.out(1.2)' }, 6.65);

    // Scenario 1: English
    const q1 = 'Avengers: Doomsday';
    const q1Obj = { p: 0 };
    masterTl.to(q1Obj, {
      p: q1.length,
      duration: 0.45,
      ease: 'none',
      onUpdate: () => {
        if (searchText) searchText.textContent = q1.substring(0, Math.round(q1Obj.p));
      }
    }, 7.0);

    masterTl.call(() => updateDropdown({
      title: 'Avengers: Doomsday',
      subtitle: '2026 • Marvel Studios • Action / Sci-Fi',
      score: '9.1',
      posterGradient: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-800',
      badgeText: 'EN • Direct Match',
      badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200'
    }), null, 7.45);

    masterTl.to(langBadge, { opacity: 1, scale: 1.0, duration: 0.22, ease: 'back.out(1.5)' }, 7.45);
    masterTl.to(searchDropdown, { opacity: 1, scale: 1.0, y: 0, duration: 0.32, ease: 'power2.out' }, 7.5);

    masterTl.to([searchDropdown, langBadge], { opacity: 0, scale: 0.96, y: 6, duration: 0.22, ease: 'power2.in' }, 8.15);
    masterTl.call(() => { if (searchText) searchText.textContent = ''; }, null, 8.25);

    // Scenario 2: Uzbek
    const q2 = 'Temir odam';
    const q2Obj = { p: 0 };
    masterTl.to(q2Obj, {
      p: q2.length,
      duration: 0.4,
      ease: 'none',
      onUpdate: () => {
        if (searchText) searchText.textContent = q2.substring(0, Math.round(q2Obj.p));
      }
    }, 8.3);

    masterTl.call(() => updateDropdown({
      title: 'Iron Man',
      subtitle: '2008 • Matched: "Temir odam" • Action',
      score: '7.9',
      posterGradient: 'bg-gradient-to-br from-amber-500 via-red-600 to-red-800',
      badgeText: 'UZ ➔ EN Translated',
      badgeClass: 'bg-blue-50 text-blue-600 border-blue-200'
    }), null, 8.75);

    masterTl.to(langBadge, { opacity: 1, scale: 1.0, duration: 0.22, ease: 'back.out(1.5)' }, 8.75);
    masterTl.to(searchDropdown, { opacity: 1, scale: 1.0, y: 0, duration: 0.32, ease: 'power2.out' }, 8.8);

    masterTl.to([searchDropdown, langBadge], { opacity: 0, scale: 0.96, y: 6, duration: 0.22, ease: 'power2.in' }, 9.5);
    masterTl.call(() => { if (searchText) searchText.textContent = ''; }, null, 9.6);

    // Scenario 3: Russian
    const q3 = 'Бумажный дом';
    const q3Obj = { p: 0 };
    masterTl.to(q3Obj, {
      p: q3.length,
      duration: 0.42,
      ease: 'none',
      onUpdate: () => {
        if (searchText) searchText.textContent = q3.substring(0, Math.round(q3Obj.p));
      }
    }, 9.65);

    masterTl.call(() => updateDropdown({
      title: 'Money Heist (La Casa de Papel)',
      subtitle: 'Netflix • Matched: "Бумажный дом" • Crime',
      score: '8.2',
      posterGradient: 'bg-gradient-to-br from-rose-600 via-red-700 to-slate-900',
      badgeText: 'RU ➔ EN Translated',
      badgeClass: 'bg-purple-50 text-purple-600 border-purple-200'
    }), null, 10.1);

    masterTl.to(langBadge, { opacity: 1, scale: 1.0, duration: 0.22, ease: 'back.out(1.5)' }, 10.1);
    masterTl.to(searchDropdown, { opacity: 1, scale: 1.0, y: 0, duration: 0.32, ease: 'power2.out' }, 10.15);

    masterTl.to({}, { duration: 0.6 }, 10.45);

    // --- PHASE 4: Seamless Loop Reset ---
    masterTl.to([searchDropdown, langBadge], { opacity: 0, scale: 0.96, y: 6, duration: 0.25, ease: 'power2.in' }, 10.9);
    masterTl.call(() => { if (searchText) searchText.textContent = ''; }, null, 11.0);
    masterTl.to(searchModule, { opacity: 0, scale: 0.92, y: -12, duration: 0.35, ease: 'power2.in' }, 11.05);
    masterTl.to(zoomStage, { scale: 1.0, y: 0, duration: 0.7, ease: 'power2.inOut' }, 11.1);
    masterTl.to([dashedSlots, portDots], { opacity: 1, duration: 0.5, ease: 'power2.out' }, 11.2);

    masterTl.to(imgSaqlab, { opacity: 0, scale: 0.8, duration: 0.3, ease: 'power2.in' }, 11.15);
    masterTl.to(card1, { y: 0, scale: 1.0, boxShadow: '0 8px 25px -4px rgba(0, 0, 0, 0.05)', duration: 0.65, ease: 'power2.inOut' }, 11.15);
    masterTl.call(() => {
      if (card1) {
        card1.classList.remove('card-solid-active');
        card1.style.borderStyle = 'dashed';
        card1.style.borderColor = '#cbd5e1';
        card1.style.borderWidth = '2px';
      }
      if (imgSaq) gsap.set(imgSaq, { opacity: 0, scale: 0.4 });
    }, null, 11.5);

    masterTl.to(card1Plus, { opacity: 1, scale: 1, rotate: 0, duration: 0.35, ease: 'back.out(1.2)' }, 11.55);

    masterTl.call(() => {
      if (card2) {
        card2.classList.remove('card-solid-active');
        card2.style.borderStyle = 'dashed';
        card2.style.borderColor = '#cbd5e1';
        card2.style.borderWidth = '2px';
        gsap.set(card2, { x: 0, y: 0, scale: 1, opacity: 1 });
      }
      if (imgHink) gsap.set(imgHink, { opacity: 0, scale: 0.4 });
      if (card2Plus) gsap.set(card2Plus, { opacity: 1, scale: 1, rotate: 0 });
    }, null, 11.6);

    masterTl.to(card3, { y: 0, opacity: 1, scale: 1.0, duration: 0.55, ease: 'power2.out' }, 11.25);
    masterTl.to(cursor, { x: 900, y: 450, opacity: 0, duration: 0.35, ease: 'power2.inOut' }, 11.75);
    masterTl.to({}, { duration: 0.2 }, 12.0);

    return () => {
      window.removeEventListener('resize', updateScale);
      masterTl.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[1600px] mx-auto overflow-hidden flex items-center justify-center select-none"
      style={{
        aspectRatio: '16 / 9',
        minHeight: 380,
        maxHeight: 'min(760px, 78vh)'
      }}
    >
      <style>{`
        .gpu-layer {
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .card-solid-active {
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.06) !important;
          background-color: #ffffff !important;
        }
        .cursor-svg {
          opacity: 0;
          transition: opacity 0.12s ease;
          filter: drop-shadow(0px 4px 10px rgba(0, 0, 0, 0.18));
        }
        .cursor-svg.active {
          opacity: 1;
        }
        .connection-path {
          stroke: #94a3b8;
          stroke-width: 1.6px;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.65;
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          will-change: stroke-dashoffset, opacity;
        }
        @keyframes saqlabBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink-cursor {
          animation: saqlabBlink 0.8s infinite;
        }
        .brand-logo-img {
          height: 23px;
          width: auto;
          max-height: 26px;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
        }
        #img-saqlab {
          height: 38px;
          max-height: 42px;
        }
      `}</style>

      {/* Fixed 1600px x 900px Canvas Stage with Transform Scale */}
      <div
        ref={zoomStageRef}
        id="zoom-stage"
        className="relative w-[1600px] h-[900px] shrink-0"
        style={{
          transformOrigin: '50% 50%',
          willChange: 'transform, opacity'
        }}
      >
        <svg id="connections-svg" className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible"></svg>

        {/* 0. SMART SEARCH MODULE */}
        <div id="search-module" className="gpu-layer absolute left-[520px] top-[345px] w-[560px] z-30 opacity-0 scale-90 translate-y-3 pointer-events-none">
          <div id="search-bar" className="w-full h-[54px] bg-white/95 backdrop-blur-md rounded-full border border-slate-200 shadow-[0_15px_40px_rgba(0,0,0,0.06)] px-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div className="text-[15px] font-semibold text-slate-800 font-inter flex items-center truncate">
                <span id="search-text"></span>
                <span id="search-cursor" className="inline-block w-[2px] h-4 bg-blue-600 ml-0.5 animate-blink-cursor"></span>
              </div>
            </div>
            <div id="lang-badge" className="px-3 py-0.5 rounded-full text-[11.5px] font-bold font-inter tracking-wide opacity-0 scale-75 shrink-0 border">
              EN • Direct Match
            </div>
          </div>

          <div id="search-dropdown" className="gpu-layer mt-3 w-full bg-white rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.12)] p-3.5 flex items-center gap-4 opacity-0 scale-95 translate-y-2">
            <div id="dropdown-poster" className="w-13 h-17 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-800 shrink-0 flex items-center justify-center shadow-inner border border-slate-100 p-2.5">
              <svg className="w-6 h-6 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
              </svg>
            </div>
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <div id="dropdown-title" className="text-[15.5px] font-bold text-slate-900 tracking-tight truncate">
                Avengers: Doomsday
              </div>
              <div id="dropdown-subtitle" className="text-[12.5px] font-medium text-slate-500 font-inter truncate mt-0.5">
                2026 • Marvel Studios • Action / Sci-Fi
              </div>
            </div>
            <div id="dropdown-score" className="ml-auto px-3 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 text-[13px] font-bold font-inter flex items-center gap-1 shrink-0">
              <svg className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span id="dropdown-rating-text">9.1</span>
            </div>
          </div>
        </div>

        {/* 1. LEFT BRANCH NODES */}
        <div id="movie-1" className="branch-node gpu-layer absolute left-[320px] top-[208px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 font-inter">2008</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              7.9
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">Iron Man</div>
          <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
          <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        <div id="movie-2" className="branch-node gpu-layer absolute left-[60px] top-[298px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 font-inter">2008</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              9.0
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">The Dark Knight</div>
          <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        <div id="movie-3" className="branch-node gpu-layer absolute left-[260px] top-[428px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 font-inter">2024</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              9.4
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">Avatar: The Last Airbender</div>
          <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
          <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        <div id="movie-4" className="branch-node gpu-layer absolute left-[40px] top-[548px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 font-inter">2012</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              8.0
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">The Avengers</div>
          <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        <div id="movie-5" className="branch-node gpu-layer absolute left-[340px] top-[638px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 font-inter">2011</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              6.9
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">Captain America</div>
          <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
          <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        {/* 2. CENTRAL BRAND STACK */}
        <div id="center-stack" className="absolute left-[610px] top-[340px] w-[380px] h-[320px] z-20">
          <div id="slot-1-bg" className="dashed-slot gpu-layer absolute left-0 top-0 w-[380px] h-[96px] rounded-[18px] border-2 border-dashed border-slate-300 bg-slate-50/60 flex items-center justify-center pointer-events-none">
            <svg className="w-6 h-6 stroke-slate-400" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>

          <div id="slot-2-bg" className="dashed-slot gpu-layer absolute left-0 top-[112px] w-[380px] h-[96px] rounded-[18px] border-2 border-dashed border-slate-300 bg-slate-50/60 flex items-center justify-center pointer-events-none">
            <svg className="w-6 h-6 stroke-slate-400" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>

          <div id="slot-3-bg" className="dashed-slot gpu-layer absolute left-0 top-[224px] w-[380px] h-[96px] rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_25px_-4px_rgba(0,0,0,0.05)] flex items-center justify-center pointer-events-none"></div>

          {/* Card 1: saq / saqlab */}
          <div id="card-1" className="gpu-layer absolute left-0 top-0 w-[380px] h-[96px] rounded-[18px] bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden z-10 shadow-[0_8px_25px_-4px_rgba(0,0,0,0.05)]">
            <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
            <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
            <div id="ripple-1" className="absolute top-1/2 left-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/10 scale-0 opacity-0 pointer-events-none"></div>
            <div className="plus-icon absolute w-6 h-6 flex items-center justify-center pointer-events-none">
              <svg className="w-6 h-6 stroke-slate-400" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <img id="img-saq" src="/saqlab-animation/saq.png" alt="saq" className="brand-logo-img opacity-0 scale-40" draggable="false" />
            <img id="img-saqlab" src="/saqlab-animation/saqlab-logo-b.png" alt="saqlab" className="brand-logo-img opacity-0 scale-90 absolute" draggable="false" />
          </div>

          {/* Card 2: hink */}
          <div id="card-2" className="gpu-layer absolute left-0 top-[112px] w-[380px] h-[96px] rounded-[18px] bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden z-0 shadow-[0_8px_25px_-4px_rgba(0,0,0,0.05)]">
            <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
            <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
            <div id="ripple-2" className="absolute top-1/2 left-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/10 scale-0 opacity-0 pointer-events-none"></div>
            <div className="plus-icon absolute w-6 h-6 flex items-center justify-center pointer-events-none">
              <svg className="w-6 h-6 stroke-slate-400" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <img id="img-hink" src="/saqlab-animation/hink.png" alt="hink" className="brand-logo-img opacity-0 scale-40" draggable="false" />
          </div>

          {/* Card 3: lab */}
          <div id="card-3" className="gpu-layer absolute left-0 top-[224px] w-[380px] h-[96px] rounded-[18px] bg-white border border-slate-200 shadow-[0_8px_25px_-4px_rgba(0,0,0,0.05)] flex items-center justify-center overflow-hidden z-0">
            <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
            <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
            <img id="img-lab" src="/saqlab-animation/lab.png" alt="lab" className="brand-logo-img" draggable="false" />
          </div>
        </div>

        {/* 3. RIGHT BRANCH NODES */}
        <div id="movie-6" className="branch-node gpu-layer absolute left-[1120px] top-[188px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 font-inter">2021</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              8.2
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">Spider-Man: No Way Home</div>
          <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        <div id="movie-7" className="branch-node gpu-layer absolute left-[1350px] top-[328px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-600 border border-cyan-100 font-inter">2014</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              8.7
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">Interstellar</div>
          <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        <div id="movie-8" className="branch-node gpu-layer absolute left-[1080px] top-[408px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100 font-inter">2023</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              8.9
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">Oppenheimer</div>
          <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
          <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        <div id="movie-9" className="branch-node gpu-layer absolute left-[1330px] top-[568px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100 font-inter">2014</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              8.0
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">Guardians of the Galaxy</div>
          <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        <div id="movie-10" className="branch-node gpu-layer absolute left-[1100px] top-[658px] w-[200px] h-[64px] bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2 flex flex-col justify-between opacity-0 scale-[0.85] z-10">
          <div className="flex items-center justify-between">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 font-inter">2018</span>
            <span className="text-[11px] font-bold text-amber-500 font-inter flex items-center gap-0.5">
              <svg className="w-3 h-3 fill-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              7.3
            </span>
          </div>
          <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">Black Panther</div>
          <div className="port-dot absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
          <div className="port-dot absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 border border-white"></div>
        </div>

        {/* Virtual Cursor */}
        <div id="virtual-cursor" className="gpu-layer absolute top-0 left-0 w-9 h-9 pointer-events-none z-50 opacity-0 translate-x-[900px] translate-y-[450px]">
          <svg className="cursor-svg cursor-default active absolute top-0 left-0 w-8 h-8" viewBox="0 0 32 32" fill="none">
            <path d="M4.5 3.5L24 16.5L14.5 18.5L20 29L16 31L10.5 20.5L4.5 25.5V3.5Z" fill="#0f172a" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <svg className="cursor-svg cursor-pointer absolute top-0 left-0 w-8 h-8" viewBox="0 0 32 32" fill="none">
            <path d="M10 14V5.5C10 4.4 10.9 3.5 12 3.5C13.1 3.5 14 4.4 14 5.5V13M14 13V10.5C14 9.4 14.9 8.5 16 8.5C17.1 8.5 18 9.4 18 10.5V13M18 13V11.5C18 10.4 18.9 9.5 20 9.5C21.1 9.5 22 10.4 22 11.5V13M22 13V12.5C22 11.4 22.9 10.5 24 10.5C25.1 10.5 26 11.4 26 12.5V19C26 24 22 28 17 28C12.5 28 8.8 24.7 8.2 20.3L7 12.4C6.8 11.3 7.6 10.3 8.7 10.2C9.7 10.1 10.6 10.7 10.8 11.7L12 18" fill="#ffffff" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <svg className="cursor-svg cursor-grab absolute top-0 left-0 w-8 h-8" viewBox="0 0 32 32" fill="none">
            <path d="M10.5 6.5C10.5 5.4 11.4 4.5 12.5 4.5C13.6 4.5 14.5 5.4 14.5 6.5V12.5M14.5 6.5C14.5 5.4 15.4 4.5 16.5 4.5C17.6 4.5 18.5 5.4 18.5 6.5V12.5M18.5 7.5C18.5 6.4 19.4 5.5 20.5 5.5C21.6 5.5 22.5 6.4 22.5 7.5V12.5M22.5 9.5C22.5 8.4 23.4 7.5 24.5 7.5C25.6 7.5 26.5 8.4 26.5 9.5V18C26.5 23.5 22 28 16.5 28C11.5 28 7.3 24.3 6.6 19.3L5.5 12C5.3 10.9 6.1 9.9 7.2 9.7C8.2 9.5 9.2 10.2 9.4 11.2L10.5 16" fill="#ffffff" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <svg className="cursor-svg cursor-grabbing absolute top-0 left-0 w-8 h-8" viewBox="0 0 32 32" fill="none">
            <path d="M9.5 13.5V10.5C9.5 9.4 10.4 8.5 11.5 8.5C12.6 8.5 13.5 9.4 13.5 10.5V13.5M13.5 13.5V10.5C13.5 9.4 14.4 8.5 15.5 8.5C16.6 8.5 17.5 9.4 17.5 10.5V13.5M17.5 13.5V11.5C17.5 10.4 18.4 9.5 19.5 9.5C20.6 9.5 21.5 10.4 21.5 11.5V13.5M21.5 13.5V12.5C21.5 11.4 22.4 10.5 23.5 10.5C24.6 10.5 25.5 11.4 25.5 12.5V17C25.5 22.5 21 27 15.5 27C10.5 27 6.3 23.3 5.6 18.3L5 14C4.8 12.9 5.6 11.9 6.7 11.7C7.7 11.5 8.7 12.2 8.9 13.2L9.5 15.5" fill="#ffffff" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
