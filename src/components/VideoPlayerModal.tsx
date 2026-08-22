import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Pause, 
  X, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';

interface VideoPlayerModalProps {
  video: {
    title: string;
    youtube_url: string;
  };
  onClose: () => void;
}

export default function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFakeFullscreen, setIsFakeFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const ytPlayerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [ytReady, setYtReady] = useState(
    typeof window !== 'undefined' && 
    typeof (window as any).YT !== 'undefined' && 
    typeof (window as any).YT.Player !== 'undefined'
  );

  // Load YouTube Iframe API if not loaded
  useEffect(() => {
    if (ytReady) return;
    const checkYT = () => {
      if (typeof (window as any).YT !== 'undefined' && typeof (window as any).YT.Player !== 'undefined') {
        setYtReady(true);
        return true;
      }
      return false;
    };
    if (checkYT()) return;

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    const interval = setInterval(() => {
      if (checkYT()) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [ytReady]);

  // Handle controls auto-hide
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isDraggingRef.current) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Initialize YouTube custom player
  useEffect(() => {
    if (!ytReady) return;

    const url = video.youtube_url || "";
    let videoId = "";
    
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('embed/')) {
      videoId = url.split('embed/')[1].split('?')[0];
    } else {
      videoId = url.split('/').pop() || "";
    }

    let player: any;
    let timeInterval: NodeJS.Timeout;

    const initPlayer = () => {
      const container = document.getElementById('custom-yt-player');
      if (!container) return;

      player = new (window as any).YT.Player('custom-yt-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,       // COMPLETELY hide native YouTube controls
          disablekb: 1,      // Disable keyboard controls
          fs: 0,             // Hide fullscreen button
          modestbranding: 1, // Minimize branding
          rel: 0,            // Don't show related videos
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: (event: any) => {
            ytPlayerRef.current = event.target;
            setIsPlaying(true);
            setPlaybackSpeed(event.target.getPlaybackRate() || 1);
            setDuration(event.target.getDuration() || 0);
            setIsMuted(event.target.isMuted() || false);
            event.target.playVideo();

            // Periodically fetch current position and duration
            timeInterval = setInterval(() => {
              if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
                if (!isDraggingRef.current) {
                  setCurrentTime(ytPlayerRef.current.getCurrentTime() || 0);
                }
                const d = ytPlayerRef.current.getDuration() || 0;
                if (d) {
                  setDuration(d);
                }
              }
            }, 250);
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === (window as any).YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === (window as any).YT.PlayerState.ENDED) {
              setIsPlaying(false);
            }
          },
          onError: (event: any) => {
            console.error("YouTube custom player error:", event.data);
          }
        }
      });
    };

    const timeout = setTimeout(initPlayer, 150);

    return () => {
      clearTimeout(timeout);
      if (timeInterval) clearInterval(timeInterval);
      if (player && typeof player.destroy === 'function') {
        try {
          player.destroy();
        } catch (e) {
          console.warn("Error destroying player:", e);
        }
      }
      ytPlayerRef.current = null;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    };
  }, [video, ytReady]);

  // Keyboard Shortcuts for accessibility & ease
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        resetControlsTimeout();
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const newTime = Math.min(duration, ytPlayerRef.current.getCurrentTime() + 5);
          setCurrentTime(newTime);
          ytPlayerRef.current.seekTo(newTime, true);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        resetControlsTimeout();
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const newTime = Math.max(0, ytPlayerRef.current.getCurrentTime() - 5);
          setCurrentTime(newTime);
          ytPlayerRef.current.seekTo(newTime, true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, isPlaying]);

  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    resetControlsTimeout();
    if (!ytPlayerRef.current) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetControlsTimeout();
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleSeekStart = () => {
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleSeekEnd = (e: React.SyntheticEvent<HTMLInputElement>) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    const newTime = parseFloat(e.currentTarget.value);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(newTime, true);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (!ytPlayerRef.current) return;
    if (isMuted) {
      ytPlayerRef.current.unMute();
      setIsMuted(false);
    } else {
      ytPlayerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    resetControlsTimeout();
    if (!ytPlayerRef.current) return;
    if (typeof ytPlayerRef.current.setPlaybackRate === 'function') {
      ytPlayerRef.current.setPlaybackRate(speed);
      setPlaybackSpeed(speed);
    }
  };

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex items-center justify-center p-0 md:p-6"
    >
      <div 
        className={`bg-stone-950 overflow-hidden relative flex flex-col w-full max-w-5xl md:rounded-xl border border-amber-600/50 shadow-2xl ${
          isFakeFullscreen ? 'fixed inset-0 z-[99999] max-w-none border-none rounded-none' : ''
        }`}
      >
        {/* Video Container header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-stone-950 z-20">
          <h4 className="text-lg md:text-xl font-black text-stone-100 truncate">
            {video.title}
          </h4>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-stone-100 p-1 rounded-full border border-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Custom video player */}
        <div 
          className="relative aspect-video flex-1 bg-stone-950 group"
          onMouseMove={resetControlsTimeout}
          onClick={() => handleTogglePlay()}
        >
          {/* Invisible pointer-events interception layer to block any YouTube clicks or redirections */}
          <div className="absolute inset-0 z-10 bg-transparent cursor-pointer" />

          {/* The YouTube iframe placeholder where the Player API will render */}
          <div id="custom-yt-player" className="w-full h-full absolute inset-0 pointer-events-none" />

          {/* Loading placeholder */}
          {!ytPlayerRef.current && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-950 text-stone-300 gap-3 z-0">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-black tracking-wide">جاري تحميل مشغل الفيديو الآمن...</span>
            </div>
          )}

          {/* Custom Controls Bar */}
          <div 
            onClick={(e) => e.stopPropagation()} // Prevent play/pause toggle when interacting with controls
            className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-950 via-stone-950/90 to-transparent z-20 flex flex-col gap-3 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Progress Slider */}
            <div className="flex items-center gap-3 w-full group/progress">
              <span className="text-xs font-mono text-stone-400 select-none min-w-[36px] text-left">
                {formatVideoTime(currentTime)}
              </span>
              <input 
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeekChange}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekEnd}
                className="flex-1 h-1.5 rounded-lg bg-stone-800 accent-amber-500 hover:accent-amber-400 cursor-pointer transition focus:outline-none"
              />
              <span className="text-xs font-mono text-stone-400 select-none min-w-[36px] text-right">
                {formatVideoTime(duration)}
              </span>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              {/* Left side: Play, Mute, volume */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleTogglePlay()}
                  className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105 active:scale-95"
                  title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-stone-950 text-stone-950" /> : <Play className="w-5 h-5 fill-stone-950 text-stone-950 ml-0.5" />}
                </button>

                <button 
                  onClick={handleToggleMute}
                  className="text-stone-300 hover:text-amber-400 p-2 rounded-full hover:bg-stone-900 transition"
                  title={isMuted ? "إلغاء كتم الصوت" : "كتم الصوت"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Right side: Speed and fake fullscreen */}
              <div className="flex items-center gap-3">
                {/* Playback Speeds */}
                <div className="flex bg-stone-900 rounded-xl p-1 border border-stone-800">
                  {[1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                        playbackSpeed === speed 
                          ? 'bg-amber-500 text-stone-950' 
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Fake Fullscreen Toggle */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFakeFullscreen(!isFakeFullscreen);
                  }}
                  className="text-stone-300 hover:text-amber-400 p-2 rounded-full hover:bg-stone-900 transition"
                  title={isFakeFullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
                >
                  {isFakeFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
