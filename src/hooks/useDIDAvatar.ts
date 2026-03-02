'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// =====================================================
// useDIDAvatar — D-ID WebRTC Streaming Hook
//
// Manages the full lifecycle of a D-ID streaming session:
//   1. Creates stream → gets WebRTC offer from D-ID
//   2. Creates RTCPeerConnection → sets remote/local descriptions
//   3. Exchanges ICE candidates
//   4. Receives video/audio stream → attaches to <video> element
//   5. Exposes `speak(text)` to make the avatar talk
//
// D-ID API docs: https://docs.d-id.com/reference/createstream
// =====================================================

type AvatarStatus =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'speaking'
    | 'error'
    | 'disconnected';

interface DIDStreamData {
    id: string;
    session_id: string;
    offer: RTCSessionDescriptionInit;
    ice_servers: RTCIceServer[];
}

interface UseDIDAvatarOptions {
    onStatusChange?: (status: AvatarStatus) => void;
    onError?: (message: string) => void;
    /** If true, falls back to emoji avatar when D-ID key is not set */
    fallbackToEmoji?: boolean;
}

export function useDIDAvatar(options: UseDIDAvatarOptions = {}) {
    const { onStatusChange, onError } = options;

    const [status, setStatus] = useState<AvatarStatus>('idle');
    const [isAvailable, setIsAvailable] = useState(false);
    const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const streamIdRef = useRef<string | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const isConnectingRef = useRef(false);

    const updateStatus = useCallback(
        (s: AvatarStatus) => {
            setStatus(s);
            onStatusChange?.(s);
        },
        [onStatusChange]
    );

    // ── Check if D-ID is configured ──
    const checkAvailability = useCallback(async () => {
        try {
            // Lightweight probe — just check if server responds
            const res = await fetch('/api/avatar/stream', { method: 'POST' });
            setIsAvailable(res.status !== 503); // 503 = not configured
        } catch {
            setIsAvailable(false);
        }
    }, []);

    // ── Connect WebRTC ──
    const connect = useCallback(async () => {
        if (isConnectingRef.current || status === 'connected') return;
        isConnectingRef.current = true;
        updateStatus('connecting');

        try {
            // 1. Create D-ID stream → receive WebRTC offer
            const createRes = await fetch('/api/avatar/stream', { method: 'POST' });
            if (!createRes.ok) {
                throw new Error('Failed to create D-ID stream');
            }
            const streamData: DIDStreamData = await createRes.json();
            streamIdRef.current = streamData.id;
            sessionIdRef.current = streamData.session_id;

            // 2. Create RTCPeerConnection with D-ID's ICE servers
            const pc = new RTCPeerConnection({ iceServers: streamData.ice_servers });
            pcRef.current = pc;

            // 3. Handle incoming video/audio stream
            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setVideoStream(event.streams[0]);
                    if (videoRef.current) {
                        videoRef.current.srcObject = event.streams[0];
                    }
                    updateStatus('connected');
                }
            };

            // 4. Relay ICE candidates to D-ID
            pc.onicecandidate = async (event) => {
                if (!event.candidate || !streamIdRef.current || !sessionIdRef.current) return;
                try {
                    await fetch('/api/avatar/ice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            streamId: streamIdRef.current,
                            sessionId: sessionIdRef.current,
                            candidate: event.candidate.toJSON(),
                        }),
                    });
                } catch {
                    // Non-fatal — ICE failover handles this
                }
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    updateStatus('disconnected');
                }
            };

            // 5. Set D-ID's offer as remote description
            await pc.setRemoteDescription(new RTCSessionDescription(streamData.offer));

            // 6. Create our answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // 7. Send our answer to D-ID
            const sdpRes = await fetch('/api/avatar/sdp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    streamId: streamIdRef.current,
                    sessionId: sessionIdRef.current,
                    answer: answer,
                }),
            });

            if (!sdpRes.ok) {
                throw new Error('SDP exchange failed');
            }

            // Connection established — status will update via ontrack
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Avatar connection failed';
            console.error('D-ID avatar error:', msg);
            updateStatus('error');
            onError?.(msg);
        } finally {
            isConnectingRef.current = false;
        }
    }, [status, updateStatus, onError]);

    // ── Make the avatar speak ──
    const speak = useCallback(async (text: string) => {
        if (!streamIdRef.current || !sessionIdRef.current) {
            console.warn('Avatar not connected — cannot speak');
            return false;
        }
        if (!text.trim()) return false;

        updateStatus('speaking');

        try {
            const res = await fetch('/api/avatar/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    streamId: streamIdRef.current,
                    sessionId: sessionIdRef.current,
                    text,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('D-ID speak error:', err);
                updateStatus('connected');
                return false;
            }

            // Status will return to 'connected' when clip ends
            // D-ID sends video to the peer connection automatically
            setTimeout(() => {
                if (status === 'speaking') updateStatus('connected');
            }, text.length * 80); // rough estimate

            return true;
        } catch {
            updateStatus('connected');
            return false;
        }
    }, [status, updateStatus]);

    // ── Disconnect ──
    const disconnect = useCallback(async () => {
        if (streamIdRef.current) {
            try {
                await fetch('/api/avatar/stream', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ streamId: streamIdRef.current }),
                });
            } catch {
                // best effort
            }
        }
        pcRef.current?.close();
        pcRef.current = null;
        streamIdRef.current = null;
        sessionIdRef.current = null;
        setVideoStream(null);
        updateStatus('disconnected');
    }, [updateStatus]);

    // ── Attach stream to video element ──
    const attachVideo = useCallback((el: HTMLVideoElement | null) => {
        videoRef.current = el;
        if (el && videoStream) {
            el.srcObject = videoStream;
        }
    }, [videoStream]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        status,
        isAvailable,
        videoStream,
        connect,
        disconnect,
        speak,
        attachVideo,
        checkAvailability,
        isConnected: status === 'connected' || status === 'speaking',
    };
}
