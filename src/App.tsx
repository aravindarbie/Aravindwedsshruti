import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Heart,
  Sparkles,
  Music,
  Volume2,
  VolumeX,
  Share2,
  Download,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  Navigation,
  Languages,
  Info
} from 'lucide-react';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export default function App() {
  const [lang, setLang] = useState<'en' | 'ml'>('en');
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [activeVenueTab, setActiveVenueTab] = useState<'sriMulam' | 'alSaj'>('sriMulam');
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);

  // Audio Synth Ref for authentic peaceful temple nadaswaram flute notes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  // Target Muhurtham date: November 16, 2026, at 10:00 AM IST (UTC+05:30)
  // UTC: 2026-11-16T04:30:00Z
  const targetDate = new Date('2026-11-16T10:00:00+05:30').getTime();

  const [countdown, setCountdown] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds, isPast: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Load custom saved couple photo if user uploaded one
  useEffect(() => {
    const saved = localStorage.getItem('wedding_couple_photo');
    if (saved) {
      setCustomPhoto(saved);
    }
  }, []);

  // Automated Checkerboard & Background Removal on Client Canvas
  const processAndRemoveBackground = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const w = canvas.width;
          const h = canvas.height;

          // Detects faux checkerboard (alternating white/gray squares #FFFFFF & #CCCCCC)
          // Achromatic neutral squares have almost zero color difference between R, G, and B.
          const isNeutralCheckerPixel = (idx: number) => {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            if (a === 0) return true;
            const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
            const avg = (r + g + b) / 3;
            // The mundu is warm cream (b is lower than r by >15). Checkerboard is neutral (maxDiff <= 14).
            return avg > 175 && maxDiff <= 14;
          };

          const visited = new Uint8Array(w * h);
          const queue: number[] = [];

          // 1. Seed exterior borders
          for (let x = 0; x < w; x++) {
            const topIdx = (0 * w + x) * 4;
            if (isNeutralCheckerPixel(topIdx)) {
              queue.push(x, 0);
              visited[0 * w + x] = 1;
            }
            const bottomIdx = ((h - 1) * w + x) * 4;
            if (isNeutralCheckerPixel(bottomIdx)) {
              queue.push(x, h - 1);
              visited[(h - 1) * w + x] = 1;
            }
          }
          for (let y = 0; y < h; y++) {
            const leftIdx = (y * w + 0) * 4;
            if (isNeutralCheckerPixel(leftIdx) && !visited[y * w + 0]) {
              queue.push(0, y);
              visited[y * w + 0] = 1;
            }
            const rightIdx = (y * w + (w - 1)) * 4;
            if (isNeutralCheckerPixel(rightIdx) && !visited[y * w + (w - 1)]) {
              queue.push(w - 1, y);
              visited[y * w + (w - 1)] = 1;
            }
          }

          // 2. BFS flood fill from edges
          let head = 0;
          while (head < queue.length) {
            const cx = queue[head++];
            const cy = queue[head++];
            const pIdx = (cy * w + cx) * 4;
            data[pIdx + 3] = 0; // Clear to transparent

            const neighbors = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1]
            ];
            for (let i = 0; i < 4; i++) {
              const nx = neighbors[i][0];
              const ny = neighbors[i][1];
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nPos = ny * w + nx;
                if (!visited[nPos]) {
                  visited[nPos] = 1;
                  if (isNeutralCheckerPixel(nPos * 4)) {
                    queue.push(nx, ny);
                  }
                }
              }
            }
          }

          // 3. Clear enclosed interior pockets of checkerboard (e.g. between arm & torso)
          // Look for neutral gray squares (rgb ~ 204) or pure white (255) in 8x8 or 16x16 blocks
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const pos = y * w + x;
              const pIdx = pos * 4;
              if (data[pIdx + 3] > 0 && isNeutralCheckerPixel(pIdx)) {
                // Check if neighboring pixels are also neutral checkerboard (confirming it's not a thin highlight)
                const r = data[pIdx];
                const g = data[pIdx + 1];
                const b = data[pIdx + 2];
                const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
                const avg = (r + g + b) / 3;
                if (maxDiff <= 8 && (avg > 250 || (avg > 195 && avg < 215))) {
                  data[pIdx + 3] = 0;
                }
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const applyPhotoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const cutoutResult = await processAndRemoveBackground(result);
      setCustomPhoto(cutoutResult);
      try {
        localStorage.setItem('wedding_couple_photo', cutoutResult);
      } catch {
        // ignore quota
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyPhotoFile(file);
  };

  // Support drag-and-drop & clipboard paste anywhere on page
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              applyPhotoFile(blob);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Peaceful Traditional Wedding Raga Melody (Web Audio API Synthesizer)
  // Uses Mohanam/Kalyani pentatonic auspicious wedding raga scales
  const toggleMusic = () => {
    if (isPlayingMusic) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      isPlayingRef.current = false;
      setIsPlayingMusic(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        isPlayingRef.current = true;
        setIsPlayingMusic(true);

        // Auspicious South Indian Wedding notes: Sa, Ri2, Ga3, Pa, Dha2, Sa'
        // Frequencies in Hz: C4(261.63), D4(293.66), E4(329.63), G4(392.00), A4(440.00), C5(523.25)
        const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 293.66];
        let noteIndex = 0;

        // Soft tanpura drone bass
        const droneOsc = ctx.createOscillator();
        const droneGain = ctx.createGain();
        droneOsc.type = 'sine';
        droneOsc.frequency.setValueAtTime(130.81, ctx.currentTime); // C3 Sa
        droneGain.gain.setValueAtTime(0.04, ctx.currentTime);
        droneOsc.connect(droneGain);
        droneGain.connect(ctx.destination);
        droneOsc.start();

        const playNextMelodyNote = () => {
          if (!isPlayingRef.current || !audioCtxRef.current) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle'; // Warm, flute-like tone
          const freq = notes[noteIndex % notes.length];
          noteIndex++;

          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          // Gentle envelope: soft attack, sustained breath, tender release
          const now = ctx.currentTime;
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.12, now + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.06, now + 0.8);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 1.7);

          setTimeout(playNextMelodyNote, 1400);
        };

        playNextMelodyNote();
      } catch (err) {
        console.error("Audio could not start", err);
      }
    }
  };

  // ICS calendar generation
  const downloadIcs = (event: 'ceremony' | 'reception') => {
    let icsContent = '';
    if (event === 'ceremony') {
      icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Aravind & Shruti Wedding//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:wedding-ceremony-aravind-shruti-2026@wedding.com',
        'DTSTAMP:20260916T000000Z',
        'DTSTART:20261116T034500Z',
        'DTEND:20261116T073000Z',
        'SUMMARY:Aravind & Shruti Wedding Ceremony',
        'DESCRIPTION:Wedding Ceremony & Muhurtham (10:00 AM - 10:35 AM) of Aravind & Shruti. Reception starts at 9:15 AM.\\nVenue: Sri Mulam Club, Vazhuthacaud, Thiruvananthapuram.',
        'LOCATION:Sri Mulam Club, Vazhuthacaud, Thiruvananthapuram, Kerala',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
    } else {
      icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Aravind & Shruti Wedding//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:wedding-reception-aravind-shruti-2026@wedding.com',
        'DTSTAMP:20260916T000000Z',
        'DTSTART:20261117T113000Z',
        'DTEND:20261117T160000Z',
        'SUMMARY:Aravind & Shruti Grand Wedding Reception',
        'DESCRIPTION:Grand Wedding Reception of Aravind & Shruti from 5:00 PM onwards.\\nVenue: Al Saj Convention Centre, Azhicode, Thiruvananthapuram.',
        'LOCATION:Al Saj Convention Centre, Azhicode, Thiruvananthapuram, Kerala',
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
    }

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Aravind-Shruti-${event === 'ceremony' ? 'Wedding' : 'Reception'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedPhone(num);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  // Google Calendar URLs
  const gcalCeremonyUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Wedding+Ceremony+-+Aravind+%26+Shruti&dates=20261116T034500Z/20261116T073000Z&details=Wedding+Ceremony+and+Muhurtham+(10:00+AM+-+10:35+AM)+of+Aravind+%26+Shruti.+Reception+from+09:15+AM+onwards.&location=Sri+Mulam+Club,+Vazhuthacaud,+Thiruvananthapuram,+Kerala`;
  const gcalReceptionUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Grand+Wedding+Reception+-+Aravind+%26+Shruti&dates=20261117T113000Z/20261117T160000Z&details=Grand+Wedding+Reception+celebrating+the+marriage+of+Aravind+%26+Shruti.+Time:+5:00+PM+onwards.&location=Al+Saj+Convention+Centre,+Azhicode,+Thiruvananthapuram,+Kerala`;

  // Maps URLs
  const mapsSriMulamUrl = `https://www.google.com/maps/search/?api=1&query=Sri+Mulam+Club+Vazhuthacaud+Thiruvananthapuram`;
  const mapsAlSajUrl = `https://www.google.com/maps/search/?api=1&query=Al+Saj+Convention+Centre+Azhicode+Thiruvananthapuram`;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C241E] font-sans-clean antialiased selection:bg-[#E8A5A5]/30 relative pb-20 overflow-x-hidden">
      
      {/* Decorative Traditional Kerala Kasavu & Floral Background Accents */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-35">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#E8A5A5]/15 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-[#7E9F88]/15 blur-3xl" />
        <div className="absolute bottom-10 -left-20 w-80 h-80 rounded-full bg-[#D4AF37]/10 blur-3xl" />
      </div>

      {/* Top Floating Action Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FAF7F2]/90 border-b border-[#C5A059]/20 transition-all">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <img 
              src="/monogram.svg" 
              alt="Aravind & Shruti Monogram" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="font-serif-cormorant text-xl font-bold tracking-wide text-[#2C241E]">
              Aravind & Shruti
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Toggle */}
            <button
              id="lang-toggle-btn"
              onClick={() => setLang(lang === 'en' ? 'ml' : 'en')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#C5A059]/40 bg-white/80 hover:bg-[#F3EFE6] text-[#2C241E] shadow-sm transition"
              title="Switch Language / ഭാഷ മാറ്റുക"
            >
              <Languages className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="font-semibold">{lang === 'en' ? 'മലയാളം' : 'English'}</span>
            </button>

            {/* Ambient Music Toggle */}
            <button
              id="music-toggle-btn"
              onClick={toggleMusic}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition shadow-sm ${
                isPlayingMusic 
                  ? 'bg-[#7E9F88] text-white' 
                  : 'bg-white/80 border border-[#C5A059]/40 text-[#2C241E] hover:bg-[#F3EFE6]'
              }`}
              title={isPlayingMusic ? "Pause Wedding Melody" : "Play Traditional Festive Melody"}
            >
              {isPlayingMusic ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  <span className="hidden sm:inline">Melody On</span>
                </>
              ) : (
                <>
                  <Music className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span className="hidden sm:inline">Play Melody</span>
                </>
              )}
            </button>

            {/* Single-File HTML Export Tool */}
            <button
              id="export-code-btn"
              onClick={() => setShowExportModal(true)}
              className="p-1.5 rounded-full border border-[#C5A059]/40 bg-white/80 hover:bg-[#F3EFE6] text-[#2C241E] shadow-sm transition"
              title="Get Single-File HTML Code for GitHub Pages / Netlify"
            >
              <Download className="w-4 h-4 text-[#C5A059]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Centered Wedding Invitation Container */}
      <main className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-10">

        {/* ==================== 1. SACRED AUSPICIOUS HERO SECTION ==================== */}
        <section id="hero" className="text-center pt-2">
          
          {/* Sacred Ganesha Motif */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative p-2 rounded-full bg-white/60 border border-[#C5A059]/30 shadow-card-soft">
              <img 
                src="/ganesha.svg" 
                alt="Lord Ganesha" 
                className="w-16 h-16 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Sacred Inscription */}
            <p className="font-serif-cormorant text-[#C5A059] text-base sm:text-lg tracking-[0.2em] uppercase font-semibold">
              {lang === 'en' ? '|| Om Gam Ganapataye Namah ||' : '|| ഓം ഗം ഗണപതയേ നമഃ ||'}
            </p>

            <img 
              src="/divider.svg" 
              alt="Traditional Kerala Gold Divider" 
              className="w-48 h-auto opacity-70 my-1"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Invitation Invocation */}
          <div className="mt-4 px-3">
            <p className="font-serif-cormorant italic text-[#6B5A4E] text-base sm:text-lg">
              {lang === 'en' ? (
                <>Rajeev R S & Bindu Rajeev cordially invite your esteemed presence with family on the auspicious occasion of the marriage of their son</>
              ) : (
                <span className="font-malayalam leading-relaxed">
                  രാജീവ് ആർ. എസ്. & ബിന്ദു രാജീവ് തങ്ങളുടെ മകൻ അരവിന്ദിന്റെ വിവാഹമംഗളകർമ്മത്തിലേക്ക് താങ്കളെയും കുടുംബത്തെയും സാദരം ക്ഷണിക്കുന്നു
                </span>
              )}
            </p>
          </div>

          {/* Couple's Names in Calligraphy */}
          <div className="my-6">
            <h1 className="font-script-alex text-5xl sm:text-6xl text-[#9E7B34] font-normal leading-tight">
              Aravind
            </h1>
            <div className="flex items-center justify-center space-x-3 my-1">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#C5A059]"></span>
              <span className="font-serif-cormorant text-2xl text-[#C76E7E] italic font-semibold">with</span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#C5A059]"></span>
            </div>
            <h1 className="font-script-alex text-5xl sm:text-6xl text-[#C76E7E] font-normal leading-tight">
              Shruti
            </h1>
            
            {lang === 'ml' && (
              <p className="font-malayalam text-xl text-[#2C241E] font-bold mt-2">
                അരവിന്ദ് & ശ്രുതി
              </p>
            )}
          </div>

          {/* ==================== COUPLE CUTOUT PORTRAIT (NO RECTANGULAR BOX) ==================== */}
          <div 
            className={`relative mx-auto max-w-md px-2 my-6 flex flex-col items-center transition-all ${
              isDraggingPhoto ? 'scale-105 ring-2 ring-[#7E9F88] rounded-3xl bg-[#7E9F88]/10 p-4' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingPhoto(true);
            }}
            onDragLeave={() => setIsDraggingPhoto(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingPhoto(false);
              const file = e.dataTransfer.files?.[0];
              if (file) applyPhotoFile(file);
            }}
          >
            {/* Ambient warm radial halo behind cutout */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-gradient-to-tr from-[#D4AF37]/15 via-[#FAF5ED]/20 to-[#E8A5A5]/15 blur-2xl pointer-events-none -z-10" />

            {/* Cutout Couple Image - Floating seamlessly on page */}
            <div className="relative w-full flex flex-col items-center justify-center group">
              <img 
                src={customPhoto || "/couple.svg"} 
                alt="Aravind and Shruti - Cutout Portrait" 
                className="w-full max-w-[320px] sm:max-w-[360px] h-auto object-contain drop-shadow-[0_15px_25px_rgba(44,36,30,0.12)] transition-transform duration-500 hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />

              {/* Natural Soft Ground Shadow under feet */}
              <div className="w-52 sm:w-64 h-3.5 rounded-[100%] bg-[#2C241E]/12 blur-sm -mt-2 pointer-events-none" />

              {/* Floating Monogram Emblem Accent */}
              <div className="absolute top-0 right-4 sm:right-8 bg-white/90 backdrop-blur-sm p-1.5 rounded-full border border-[#C5A059]/30 shadow-sm">
                <img src="/monogram.svg" alt="A & S Logo" className="w-7 h-7" />
              </div>

              {isDraggingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs rounded-2xl border-2 border-dashed border-[#7E9F88] text-center p-4">
                  <p className="text-sm font-semibold text-[#3D5A46]">Drop photo here to remove checkerboard and apply cutout</p>
                </div>
              )}
            </div>

            {/* Photo Action Bar: Upload, Paste, Drag & Drop */}
            <div className="mt-4 flex flex-col items-center w-full max-w-[360px] px-2 text-xs space-y-1.5">
              <div className="flex items-center justify-between w-full">
                <span className="font-serif-cormorant italic text-[#6B5A4E]">
                  {customPhoto ? '✓ Custom Cutout Photo Active' : 'Aravind & Shruti • Kerala Wedding'}
                </span>

                <div className="flex items-center space-x-2">
                  {customPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomPhoto(null);
                        try {
                          localStorage.removeItem('wedding_couple_photo');
                        } catch {
                          // ignore
                        }
                      }}
                      className="text-[11px] text-[#A63A3A] hover:text-[#7A1E1E] underline cursor-pointer font-medium"
                      title="Reset to default handcrafted Kerala illustration"
                    >
                      Reset
                    </button>
                  )}

                  <label className="font-medium text-[#7E9F88] hover:text-[#5C7C66] cursor-pointer flex items-center space-x-1.5 bg-white/90 px-3 py-1.5 rounded-full border border-[#C5A059]/40 shadow-xs hover:bg-[#FAF7F2] transition">
                    <span className="text-xs font-semibold">{customPhoto ? 'Replace Photo' : 'Use Uploaded Photo'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              <p className="text-[11px] text-[#8C7A6B] text-center">
                Tip: Click above to select your downloaded <span className="font-mono text-[10px] bg-[#EDE6DC] px-1 py-0.5 rounded">.png</span>, or drag &amp; drop / paste (Ctrl+V) directly.
              </p>
            </div>
          </div>

          {/* Primary Date Banner */}
          <div className="mt-6 inline-flex flex-col items-center justify-center px-6 py-3 rounded-full bg-white/90 border border-[#C5A059]/30 shadow-sm">
            <span className="font-serif-cormorant font-bold text-lg text-[#9E7B34] tracking-wide">
              Monday, 16th November 2026
            </span>
            <span className="text-xs text-[#6B5A4E] font-medium">
              (Thulam 30, 1202 • തുലാം 30, 1202)
            </span>
          </div>
        </section>

        {/* ==================== 2. LIVE COUNTDOWN TIMER ==================== */}
        <section id="countdown" className="bg-white/90 rounded-2xl p-6 border border-[#C5A059]/30 shadow-card-soft text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#C5A059]" />
            <h2 className="font-serif-cormorant font-bold text-xl sm:text-2xl text-[#2C241E] tracking-wide">
              {lang === 'en' ? 'Counting Down to the Muhurtham' : 'മുഹൂർത്തത്തിലേക്കുള്ള സമയം'}
            </h2>
            <Sparkles className="w-4 h-4 text-[#C5A059]" />
          </div>

          <p className="text-xs text-[#6B5A4E] mb-6">
            {lang === 'en' ? 'Monday, Nov 16, 2026 • 10:00 AM IST' : 'തിങ്കളാഴ്ച, നവംബർ 16, 2026 • രാവിലെ 10:00 മണിക്ക്'}
          </p>

          {countdown.isPast ? (
            <div className="py-4 text-[#7E9F88] font-serif-cormorant text-2xl font-bold">
              The auspicious wedding celebrations have commenced! ✨
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
              
              {/* Days */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-b from-[#FAF7F2] to-[#F3EFE6] border border-[#C5A059]/25 shadow-sm">
                <span className="font-serif-cormorant text-2xl sm:text-3xl font-bold text-[#9E7B34]">
                  {countdown.days}
                </span>
                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#6B5A4E] font-medium mt-1">
                  {lang === 'en' ? 'Days' : 'ദിവസങ്ങൾ'}
                </span>
              </div>

              {/* Hours */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-b from-[#FAF7F2] to-[#F3EFE6] border border-[#C5A059]/25 shadow-sm">
                <span className="font-serif-cormorant text-2xl sm:text-3xl font-bold text-[#9E7B34]">
                  {String(countdown.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#6B5A4E] font-medium mt-1">
                  {lang === 'en' ? 'Hours' : 'മണിക്കൂർ'}
                </span>
              </div>

              {/* Minutes */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-b from-[#FAF7F2] to-[#F3EFE6] border border-[#C5A059]/25 shadow-sm">
                <span className="font-serif-cormorant text-2xl sm:text-3xl font-bold text-[#9E7B34]">
                  {String(countdown.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#6B5A4E] font-medium mt-1">
                  {lang === 'en' ? 'Minutes' : 'മിനിറ്റ്'}
                </span>
              </div>

              {/* Seconds */}
              <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-b from-[#FAF7F2] to-[#F3EFE6] border border-[#C5A059]/25 shadow-sm">
                <span className="font-serif-cormorant text-2xl sm:text-3xl font-bold text-[#C76E7E] animate-pulse">
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-[#6B5A4E] font-medium mt-1">
                  {lang === 'en' ? 'Seconds' : 'സെക്കൻഡ്'}
                </span>
              </div>

            </div>
          )}
        </section>

        {/* ==================== 3. COUPLE & FAMILY DETAILS ==================== */}
        <section id="family" className="space-y-6">
          <div className="text-center">
            <h2 className="font-serif-cormorant font-bold text-2xl sm:text-3xl text-[#2C241E]">
              {lang === 'en' ? 'Family & Heritage' : 'കുടുംബ വിവരങ്ങൾ'}
            </h2>
            <img 
              src="/divider.svg" 
              alt="Divider" 
              className="w-36 h-auto mx-auto opacity-70 my-2" 
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            
            {/* GROOM'S CARD */}
            <div className="relative rounded-2xl p-6 bg-white/95 border border-[#7E9F88]/40 shadow-card-soft">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#7E9F88]/10 rounded-bl-full pointer-events-none" />
              
              <div className="flex items-center space-x-2 text-[#7E9F88] mb-2">
                <Heart className="w-4 h-4 fill-current" />
                <span className="text-xs uppercase font-semibold tracking-wider">
                  {lang === 'en' ? "The Groom" : "വരൻ"}
                </span>
              </div>

              <h3 className="font-serif-cormorant text-3xl font-bold text-[#2C241E]">
                Aravind
              </h3>
              {lang === 'ml' && (
                <p className="font-malayalam text-lg font-bold text-[#7E9F88] mb-2">അരവിന്ദ്</p>
              )}

              <div className="mt-4 space-y-3 text-sm text-[#4A3E35] leading-relaxed">
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#6B5A4E] font-semibold block mb-0.5">
                    {lang === 'en' ? 'Parents' : 'മാതാപിതാക്കൾ'}
                  </span>
                  <p className="font-semibold text-base text-[#2C241E]">
                    Rajeev R. S. & Bindu Rajeev
                  </p>
                  <p className="text-xs text-[#6B5A4E]">
                    "Sreeragam", Chellamcode, Nedumangad, Thiruvananthapuram - 695541
                  </p>
                </div>

                <div className="pt-2 border-t border-[#C5A059]/15">
                  <span className="text-xs uppercase tracking-wider text-[#6B5A4E] font-semibold block mb-0.5">
                    {lang === 'en' ? 'Grandson of' : 'പൗത്രൻ & ദൗഹിത്രൻ'}
                  </span>
                  <p className="text-xs leading-normal">
                    • Late Shri <strong>M. Rajendran Nair</strong> (Rtd. Post Master) & Smt. <strong>R. Santha Kumari</strong>
                  </p>
                  <p className="text-xs leading-normal mt-1">
                    • Shri <strong>V. Krishnan Nair</strong> (Rtd. DTO, KSRTC) & Smt. <strong>P. Retna Kumari</strong> (Rtd. Teacher)
                  </p>
                </div>
              </div>
            </div>

            {/* BRIDE'S CARD */}
            <div className="relative rounded-2xl p-6 bg-white/95 border border-[#E8A5A5]/60 shadow-card-soft">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#E8A5A5]/15 rounded-bl-full pointer-events-none" />

              <div className="flex items-center space-x-2 text-[#C76E7E] mb-2">
                <Heart className="w-4 h-4 fill-current" />
                <span className="text-xs uppercase font-semibold tracking-wider">
                  {lang === 'en' ? "The Bride" : "വധു"}
                </span>
              </div>

              <h3 className="font-serif-cormorant text-3xl font-bold text-[#2C241E]">
                Shruti
              </h3>
              {lang === 'ml' && (
                <p className="font-malayalam text-lg font-bold text-[#C76E7E] mb-2">ശ്രുതി</p>
              )}

              <div className="mt-4 space-y-3 text-sm text-[#4A3E35] leading-relaxed">
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#6B5A4E] font-semibold block mb-0.5">
                    {lang === 'en' ? 'Parents' : 'മാതാപിതാക്കൾ'}
                  </span>
                  <p className="font-semibold text-base text-[#2C241E]">
                    Sri Mohanachandran Nair & Smt. Renjitha Mohan
                  </p>
                  <p className="text-xs text-[#6B5A4E]">
                    8A, VSC Homes Milan Castle, Neeramankara, Thiruvananthapuram - 695040
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ==================== 4. EVENT ITINERARY ==================== */}
        <section id="itinerary" className="space-y-6">
          <div className="text-center">
            <h2 className="font-serif-cormorant font-bold text-2xl sm:text-3xl text-[#2C241E]">
              {lang === 'en' ? 'Event Itinerary' : 'മംഗള ചടങ്ങുകൾ'}
            </h2>
            <p className="text-xs text-[#6B5A4E] mt-1">
              {lang === 'en' ? 'Two days of auspicious celebration & fellowship' : 'വിവാഹ ചടങ്ങുകളും സൽക്കാരവും'}
            </p>
            <img 
              src="/divider.svg" 
              alt="Divider" 
              className="w-36 h-auto mx-auto opacity-70 my-2" 
            />
          </div>

          <div className="space-y-6">
            
            {/* EVENT 1: WEDDING CEREMONY */}
            <div className="rounded-2xl p-6 bg-white/95 border-2 border-[#C5A059]/35 shadow-card-soft relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-[#FAF7F2] border border-[#C5A059]/40 px-3 py-1 rounded-full text-xs font-serif-cormorant font-bold text-[#9E7B34]">
                Day 1 • Ceremony
              </div>

              <div className="flex items-center space-x-2 text-[#9E7B34] mb-3">
                <Calendar className="w-5 h-5" />
                <span className="font-serif-cormorant font-bold text-lg">
                  Monday, 16th November 2026
                </span>
              </div>
              <p className="text-xs text-[#6B5A4E] -mt-2 mb-4 font-medium">
                (Thulam 30, 1202 • തുലാം 30, 1202)
              </p>

              <h3 className="font-serif-cormorant text-2xl font-bold text-[#2C241E] mb-2">
                Wedding Ceremony & Muhurtham
              </h3>
              {lang === 'ml' && (
                <p className="font-malayalam text-base font-semibold text-[#6B5A4E] mb-3">
                  വിവാഹമംഗളകർമ്മം & താലികെട്ട്
                </p>
              )}

              {/* Time Details */}
              <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-[#FAF7F2] border border-[#C5A059]/20">
                <div>
                  <span className="text-[11px] text-[#6B5A4E] uppercase font-semibold block">
                    {lang === 'en' ? 'Reception Starts' : 'സ്വീകരണം'}
                  </span>
                  <div className="flex items-center space-x-1.5 mt-0.5 text-[#2C241E] font-semibold text-sm">
                    <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>09:15 AM</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-[#C76E7E] uppercase font-bold block">
                    {lang === 'en' ? 'Auspicious Muhurtham' : 'ശുഭ മുഹൂർത്തം'}
                  </span>
                  <div className="flex items-center space-x-1.5 mt-0.5 text-[#C76E7E] font-bold text-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>10:00 AM – 10:35 AM</span>
                  </div>
                </div>
              </div>

              {/* Venue */}
              <div className="flex items-start space-x-2 text-sm text-[#4A3E35] mb-5">
                <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base text-[#2C241E]">Sri Mulam Club</p>
                  <p className="text-xs text-[#6B5A4E]">Vazhuthacaud, Thiruvananthapuram, Kerala</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#C5A059]/15">
                <a
                  href={mapsSriMulamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F3EFE6] border border-[#C5A059]/40 text-[#2C241E] shadow-sm transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>View on Google Maps</span>
                </a>

                <div className="flex space-x-1.5">
                  <a
                    href={gcalCeremonyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#7E9F88] hover:bg-[#688a72] text-white shadow-sm transition"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Google Cal</span>
                  </a>

                  <button
                    onClick={() => downloadIcs('ceremony')}
                    className="flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F3EFE6] border border-[#C5A059]/40 text-[#6B5A4E] shadow-sm transition"
                    title="Download iCal (.ics) for Apple / Outlook"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="ml-1">.ICS</span>
                  </button>
                </div>
              </div>
            </div>

            {/* EVENT 2: GRAND RECEPTION */}
            <div className="rounded-2xl p-6 bg-white/95 border-2 border-[#C5A059]/35 shadow-card-soft relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-[#FAF7F2] border border-[#C5A059]/40 px-3 py-1 rounded-full text-xs font-serif-cormorant font-bold text-[#C76E7E]">
                Day 2 • Reception
              </div>

              <div className="flex items-center space-x-2 text-[#C76E7E] mb-3">
                <Calendar className="w-5 h-5" />
                <span className="font-serif-cormorant font-bold text-lg">
                  Tuesday, 17th November 2026
                </span>
              </div>

              <h3 className="font-serif-cormorant text-2xl font-bold text-[#2C241E] mb-2">
                Grand Wedding Reception
              </h3>
              {lang === 'ml' && (
                <p className="font-malayalam text-base font-semibold text-[#6B5A4E] mb-3">
                  വിവാഹ സൽക്കാരം
                </p>
              )}

              {/* Time Details */}
              <div className="my-4 p-3 rounded-xl bg-[#FAF7F2] border border-[#C5A059]/20">
                <span className="text-[11px] text-[#6B5A4E] uppercase font-semibold block">
                  {lang === 'en' ? 'Reception Timing' : 'സമയം'}
                </span>
                <div className="flex items-center space-x-1.5 mt-0.5 text-[#2C241E] font-semibold text-sm">
                  <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>5:00 PM onwards</span>
                </div>
              </div>

              {/* Venue */}
              <div className="flex items-start space-x-2 text-sm text-[#4A3E35] mb-5">
                <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-base text-[#2C241E]">Al Saj Convention Centre</p>
                  <p className="text-xs text-[#6B5A4E]">Azhicode, Thiruvananthapuram, Kerala</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#C5A059]/15">
                <a
                  href={mapsAlSajUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F3EFE6] border border-[#C5A059]/40 text-[#2C241E] shadow-sm transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>View on Google Maps</span>
                </a>

                <div className="flex space-x-1.5">
                  <a
                    href={gcalReceptionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#7E9F88] hover:bg-[#688a72] text-white shadow-sm transition"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Google Cal</span>
                  </a>

                  <button
                    onClick={() => downloadIcs('reception')}
                    className="flex items-center justify-center px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F3EFE6] border border-[#C5A059]/40 text-[#6B5A4E] shadow-sm transition"
                    title="Download iCal (.ics) for Apple / Outlook"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="ml-1">.ICS</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ==================== 5. VENUE MAPS PREVIEW ==================== */}
        <section id="venues" className="bg-white/95 rounded-2xl p-6 border border-[#C5A059]/30 shadow-card-soft">
          <div className="text-center mb-4">
            <h2 className="font-serif-cormorant font-bold text-2xl text-[#2C241E]">
              {lang === 'en' ? 'Venue Locations & Directions' : 'സ്ഥല വിവരങ്ങൾ'}
            </h2>
            <p className="text-xs text-[#6B5A4E]">
              {lang === 'en' ? 'Tap below to toggle details for each celebration venue' : 'ഓരോ വേദിയുടെയും വിവരങ്ങൾ താഴെ കാണാം'}
            </p>
          </div>

          {/* Venue Tabs */}
          <div className="flex p-1 bg-[#FAF7F2] rounded-xl border border-[#C5A059]/20 mb-4">
            <button
              onClick={() => setActiveVenueTab('sriMulam')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                activeVenueTab === 'sriMulam'
                  ? 'bg-white text-[#2C241E] shadow-sm border border-[#C5A059]/30'
                  : 'text-[#6B5A4E] hover:text-[#2C241E]'
              }`}
            >
              Sri Mulam Club (Wedding)
            </button>
            <button
              onClick={() => setActiveVenueTab('alSaj')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                activeVenueTab === 'alSaj'
                  ? 'bg-white text-[#2C241E] shadow-sm border border-[#C5A059]/30'
                  : 'text-[#6B5A4E] hover:text-[#2C241E]'
              }`}
            >
              Al Saj Convention (Reception)
            </button>
          </div>

          {activeVenueTab === 'sriMulam' ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#C5A059]/25 flex items-start space-x-3">
                <Navigation className="w-5 h-5 text-[#C5A059] shrink-0 mt-1" />
                <div className="text-sm">
                  <h4 className="font-bold text-[#2C241E]">Sri Mulam Club</h4>
                  <p className="text-xs text-[#6B5A4E] mt-0.5">
                    Cotton Hill Road, Vazhuthacaud, Thiruvananthapuram, Kerala 695014
                  </p>
                  <p className="text-xs text-[#7E9F88] mt-2 font-medium">
                    • Located in the heart of Trivandrum, easily accessible from Thampanoor Central Railway Station (approx. 2.5 km).
                  </p>
                </div>
              </div>

              <a
                href={mapsSriMulamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-semibold bg-[#7E9F88] hover:bg-[#688a72] text-white shadow-sm transition"
              >
                <MapPin className="w-4 h-4" />
                <span>Open in Google Maps App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#C5A059]/25 flex items-start space-x-3">
                <Navigation className="w-5 h-5 text-[#C76E7E] shrink-0 mt-1" />
                <div className="text-sm">
                  <h4 className="font-bold text-[#2C241E]">Al Saj Convention Centre</h4>
                  <p className="text-xs text-[#6B5A4E] mt-0.5">
                    NH 66 Bypass, Azhicode, Kazhakkoottam, Thiruvananthapuram, Kerala 695563
                  </p>
                  <p className="text-xs text-[#7E9F88] mt-2 font-medium">
                    • Spacious convention centre with ample car parking facility on NH 66 bypass.
                  </p>
                </div>
              </div>

              <a
                href={mapsAlSajUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-semibold bg-[#7E9F88] hover:bg-[#688a72] text-white shadow-sm transition"
              >
                <MapPin className="w-4 h-4" />
                <span>Open in Google Maps App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </section>

        {/* ==================== 6. CONTACT & RSVP SECTION ==================== */}
        <section id="rsvp" className="bg-white/95 rounded-2xl p-6 border border-[#C5A059]/30 shadow-card-soft space-y-6">
          <div className="text-center">
            <h2 className="font-serif-cormorant font-bold text-2xl sm:text-3xl text-[#2C241E]">
              {lang === 'en' ? 'Contact & RSVP' : 'ബന്ധപ്പെടുക & സാന്നിധ്യമറിയിക്കുക'}
            </h2>
            <p className="text-xs text-[#6B5A4E] mt-1">
              {lang === 'en' ? 'Feel free to call, WhatsApp, or convey your warm blessings' : 'വിളിക്കാനും വാട്ട്സാപ്പിൽ സന്ദേശമയക്കാനും താഴെ ടാപ്പ് ചെയ്യുക'}
            </p>
            <img 
              src="/divider.svg" 
              alt="Divider" 
              className="w-36 h-auto mx-auto opacity-70 my-2" 
            />
          </div>

          {/* Direct Phone & WhatsApp Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Contact 1 */}
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#C5A059]/25 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs text-[#6B5A4E] font-medium block">Rajeev R. S. / Bindu Rajeev</span>
                <span className="font-serif-cormorant text-lg font-bold text-[#2C241E]">
                  +91 9447270320
                </span>
              </div>

              <div className="flex space-x-2">
                <a
                  href="tel:+919447270320"
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-white border border-[#C5A059]/30 hover:bg-[#FAF7F2] text-[#2C241E] transition shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-[#7E9F88]" />
                  <span>Call</span>
                </a>

                <a
                  href="https://wa.me/919447270320?text=Heartiest%20congratulations%20Aravind%20%26%20Shruti!%20Delighted%20to%20attend%20your%20wedding%20celebration."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20ba5a] text-white transition shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={() => copyNumber('+919447270320')}
                  className="p-2 rounded-lg bg-white border border-[#C5A059]/30 hover:bg-[#FAF7F2] text-[#6B5A4E] transition shadow-sm"
                  title="Copy Phone Number"
                >
                  {copiedPhone === '+919447270320' ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Contact 2 */}
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#C5A059]/25 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs text-[#6B5A4E] font-medium block">Rajeev R. S. / Bindu Rajeev</span>
                <span className="font-serif-cormorant text-lg font-bold text-[#2C241E]">
                  +91 9447585410
                </span>
              </div>

              <div className="flex space-x-2">
                <a
                  href="tel:+919447585410"
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-white border border-[#C5A059]/30 hover:bg-[#FAF7F2] text-[#2C241E] transition shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-[#7E9F88]" />
                  <span>Call</span>
                </a>

                <a
                  href="https://wa.me/919447585410?text=Heartiest%20congratulations%20Aravind%20%26%20Shruti!%20Looking%20forward%20to%20celebrating%20with%20you."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-[#25D366] hover:bg-[#20ba5a] text-white transition shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={() => copyNumber('+919447585410')}
                  className="p-2 rounded-lg bg-white border border-[#C5A059]/30 hover:bg-[#FAF7F2] text-[#6B5A4E] transition shadow-sm"
                  title="Copy Phone Number"
                >
                  {copiedPhone === '+919447585410' ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ==================== 7. WARM FAMILY FOOTER NOTE ==================== */}
        <footer className="text-center pt-6 pb-12 space-y-4">
          
          <img 
            src="/monogram.svg" 
            alt="Monogram" 
            className="w-12 h-12 mx-auto opacity-70"
          />

          <div className="space-y-2">
            <p className="font-serif-cormorant text-xl text-[#2C241E] font-bold">
              Together in joy:
            </p>
            <p className="font-serif-cormorant text-lg text-[#6B5A4E] italic font-medium">
              Dr. Ragendu, Dr. Amal, Ridhav, Devendu
            </p>
            {lang === 'ml' && (
              <p className="font-malayalam text-sm text-[#6B5A4E]">
                ഉപചാരപൂർവ്വം : ഡോ. രാഗേന്ദു, ഡോ. അമൽ, ഋധവ്, ദേവേന്ദു
              </p>
            )}
          </div>

          <div className="pt-2">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/90 border border-[#C5A059]/30 text-xs font-serif-cormorant font-semibold tracking-wider text-[#9E7B34] uppercase">
              Presents in blessings only
            </span>
            {lang === 'ml' && (
              <p className="font-malayalam text-xs text-[#6B5A4E] mt-1">
                പ്രസ്തുത മംഗളകർമ്മത്തിൽ പങ്കെടുക്കുന്നതിന് താങ്കളുടെ സകുടുംബസാന്നിധ്യം സാദരം ക്ഷണിച്ചുകൊള്ളുന്നു.
              </p>
            )}
          </div>

          {/* Quick Share / Link copy */}
          <div className="pt-4 flex items-center justify-center space-x-3 text-xs text-[#6B5A4E]">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Aravind & Shruti Wedding Invitation',
                    text: 'You are cordially invited to the wedding of Aravind & Shruti on Nov 16-17, 2026.',
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Wedding link copied to clipboard!');
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-[#C5A059]/30 hover:bg-[#FAF7F2] transition"
            >
              <Share2 className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Share Invitation</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-[#C5A059]/30 hover:bg-[#FAF7F2] transition"
            >
              <Download className="w-3.5 h-3.5 text-[#7E9F88]" />
              <span>Single-File HTML</span>
            </button>
          </div>

        </footer>

      </main>

      {/* ==================== SINGLE-FILE EXPORT MODAL ==================== */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#C5A059]/40 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-serif-cormorant font-bold text-xl text-[#2C241E]">
                  Single-File HTML Invitation
                </h3>
                <p className="text-xs text-[#6B5A4E]">
                  Ready to deploy directly to GitHub Pages, Netlify, or Vercel
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#FAF7F2] rounded-xl text-xs text-[#4A3E35] space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-[#9E7B34]">
                <Info className="w-4 h-4" />
                <span>Zero-Dependency Single File</span>
              </div>
              <p>
                This generated file contains all fonts, Tailwind styling, vanilla JS countdown, maps links, and .ics calendar triggers inside one standalone <code>index.html</code> file.
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <a
                href="/standalone-invitation.html"
                download="index.html"
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold bg-[#7E9F88] hover:bg-[#688a72] text-white shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>Download standalone index.html</span>
              </a>

              <button
                onClick={() => {
                  fetch('/standalone-invitation.html')
                    .then(res => res.text())
                    .then(code => {
                      navigator.clipboard.writeText(code);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2500);
                    });
                }}
                className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#C5A059]/40 hover:bg-[#FAF7F2] text-[#2C241E] transition"
              >
                {codeCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span>{codeCopied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
