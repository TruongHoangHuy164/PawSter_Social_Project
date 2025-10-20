import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../state/socket.jsx';

// Props:
// - isOpen: boolean
// - onClose: fn
// - conversationId: string
// - selfUserId: string
// - otherUserId: string
// - mode: 'caller' | 'callee'
// - remoteOffer?: RTCSessionDescriptionInit (when callee)
export default function CallModal({ isOpen, onClose, conversationId, selfUserId, otherUserId, mode = 'caller', remoteOffer }) {
  const { socket } = useSocket();
  const [status, setStatus] = useState('init'); // init | connecting | connected | error | ended
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('call:candidate', {
          toUserId: otherUserId,
          conversationId,
          candidate: e.candidate,
        });
      }
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    };

    const start = async () => {
      try {
        setStatus('connecting');
        const local = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = local;
        if (localVideoRef.current) localVideoRef.current.srcObject = local;
        local.getTracks().forEach(t => pc.addTrack(t, local));

        if (mode === 'caller') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('call:offer', { toUserId: otherUserId, conversationId, sdp: offer });
        } else if (mode === 'callee' && remoteOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket?.emit('call:answer', { toUserId: otherUserId, conversationId, sdp: answer });
        }
      } catch (err) {
        console.error('Call start error', err);
        setStatus('error');
      }
    };

    start();

    const onAnswer = async ({ conversationId: cid, fromUserId, sdp }) => {
      if (String(cid) !== String(conversationId) || String(fromUserId) !== String(otherUserId)) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        setStatus('connected');
      } catch (err) {
        console.error('setRemoteDescription(answer) failed', err);
      }
    };
    const onOffer = async ({ conversationId: cid, fromUserId, sdp }) => {
      // Callee path: if user receives an offer while modal is open in callee mode without remoteOffer
      if (mode !== 'callee') return;
      if (String(cid) !== String(conversationId) || String(fromUserId) !== String(otherUserId)) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.emit('call:answer', { toUserId: otherUserId, conversationId, sdp: answer });
      } catch (err) {
        console.error('handle offer (callee) failed', err);
      }
    };
    const onCandidate = async ({ conversationId: cid, fromUserId, candidate }) => {
      if (String(cid) !== String(conversationId) || String(fromUserId) !== String(otherUserId)) return;
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (err) { console.error('addIceCandidate failed', err); }
    };
    const onHangup = () => { cleanup(); };

    socket?.on('call:answer', onAnswer);
    socket?.on('call:offer', onOffer);
    socket?.on('call:candidate', onCandidate);
    socket?.on('call:hangup', onHangup);

    const cleanup = () => {
      try { socket?.off('call:answer', onAnswer); } catch {}
      try { socket?.off('call:offer', onOffer); } catch {}
      try { socket?.off('call:candidate', onCandidate); } catch {}
      try { socket?.off('call:hangup', onHangup); } catch {}
      try { pcRef.current?.close(); } catch {}
      try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
      pcRef.current = null;
      localStreamRef.current = null;
      setStatus('ended');
      onClose?.();
    };

    return () => {
      cleanup();
    };
  }, [isOpen, conversationId, otherUserId, mode, remoteOffer, socket, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl aspect-video bg-white dark:bg-black rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden relative">
        <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-black text-white dark:bg-white dark:text-black">{status === 'connecting' ? 'Đang kết nối...' : status === 'connected' ? 'Đang gọi' : status === 'error' ? 'Lỗi cuộc gọi' : 'Cuộc gọi'}</div>
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localVideoRef} autoPlay muted playsInline className="absolute bottom-3 right-3 w-40 h-28 object-cover rounded-lg border border-black/20 dark:border-white/20 bg-black/40" />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button onClick={() => { try { pcRef.current?.getSenders().forEach(s => { if (s.track && s.track.kind === 'audio') s.track.enabled = !s.track.enabled; }); } catch {} }} className="px-3 py-2 rounded-xl border">Mic</button>
          <button onClick={() => { try { pcRef.current?.getSenders().forEach(s => { if (s.track && s.track.kind === 'video') s.track.enabled = !s.track.enabled; }); } catch {} }} className="px-3 py-2 rounded-xl border">Cam</button>
          <button onClick={() => { try { socket?.emit('call:hangup', { toUserId: otherUserId, conversationId }); } catch {}; onClose?.(); }} className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black">Kết thúc</button>
        </div>
      </div>
    </div>
  );
}
