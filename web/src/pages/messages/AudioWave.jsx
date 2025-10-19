import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

export default function AudioWave({ url, height = 48 }) {
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(107,114,128,0.6)',
      progressColor: 'rgba(124,58,237,0.9)',
      cursorColor: 'transparent',
      height,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      responsive: true,
      normalize: true,
    });
    wsRef.current = ws;
    ws.load(url);
    const onFinish = () => setPlaying(false);
    ws.on('finish', onFinish);
    return () => {
      ws.un('finish', onFinish);
      ws.destroy();
      wsRef.current = null;
    };
  }, [url, height]);

  const toggle = () => {
    const ws = wsRef.current;
    if (!ws) return;
    ws.playPause();
    setPlaying(ws.isPlaying());
  };

  return (
    <div className="flex items-center gap-2">
      <button onClick={toggle} className="px-2 py-1 text-xs rounded border" title={playing? 'Tạm dừng' : 'Phát'}>
        {playing ? '⏸️' : '▶️'}
      </button>
      <div ref={containerRef} className="flex-1 min-w-[160px]" />
    </div>
  );
}
