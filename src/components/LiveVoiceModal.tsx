import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Mic, MicOff, PhoneOff, Loader2, Activity } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { GradeLevel, Subject } from '../types';
import { getApiKey, markKeyAsFailed } from '../utils/apiKeyManager';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  grade: GradeLevel;
  subject: Subject;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose, grade, subject }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanup = useCallback(async () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();

    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { await audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      try { await inputAudioContextRef.current.close(); } catch(e) {}
      inputAudioContextRef.current = null;
    }
  }, []);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  const connect = useCallback(async (currentRetry = 0) => {
    const currentApiKey = getApiKey();
    try {
      setStatus('connecting');
      const ai = new GoogleGenAI({ apiKey: currentApiKey });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 24000 });
      audioContextRef.current = ctx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      mediaStreamRef.current = stream;

      const systemInstruction = `أنت "المعلم الذكي" لصف ${grade} مادة ${subject}. أجب بلهجة مصرية قصيرة ومباشرة. لا تزد عن جملتين.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            if (!mountedRef.current) return;
            setStatus('connected');
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            inputAudioContextRef.current = inputCtx;
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const base64Data = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(session => {
                if (!isMuted) {
                  session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: base64Data } });
                }
              });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
            sourceRef.current = source;
            processorRef.current = processor;
          },
          onmessage: async (message: LiveServerMessage) => {
             if (!mountedRef.current) return;
             
             if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                return;
             }

             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && audioContextRef.current) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.onended = () => { sourcesRef.current.delete(source); };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
                setVolumeLevel(0.8);
                setTimeout(() => setVolumeLevel(0), 300);
             }
          },
          onclose: () => { if (mountedRef.current) onClose(); },
          onerror: (err: any) => { 
            console.error("Live Error:", err);
            if (err?.message?.includes('429')) markKeyAsFailed(currentApiKey);
            if (mountedRef.current && currentRetry < 2) cleanup().then(() => connect(currentRetry + 1)); 
            else setStatus('error'); 
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) { 
      if (e?.message?.includes('429')) markKeyAsFailed(currentApiKey);
      if (currentRetry < 2) cleanup().then(() => connect(currentRetry + 1)); 
      else setStatus('error'); 
    }
  }, [grade, subject, isMuted, onClose, cleanup]);

  useEffect(() => {
    mountedRef.current = true;
    if (isOpen) connect(0);
    return () => { mountedRef.current = false; cleanup(); };
  }, [isOpen, connect, cleanup]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"><X size={32} /></button>
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
         {status === 'connecting' && <div className="flex flex-col items-center gap-4 text-indigo-200"><Loader2 size={48} className="animate-spin" /><p className="text-lg font-medium">جاري فتح القناة...</p></div>}
         {status === 'error' && <div className="flex flex-col items-center gap-4 text-red-300 text-center"><PhoneOff size={48} /><p className="text-lg font-medium">عذراً، الضغط عالي جداً.</p><button onClick={() => connect(0)} className="px-6 py-2 bg-white text-red-600 font-bold rounded-full">محاولة مرة أخرى</button></div>}
         {status === 'connected' && (
            <>
               <div className="text-center space-y-2"><h2 className="text-3xl font-black text-white">المعلم معك الآن</h2><p className="text-indigo-200 text-lg font-bold">تحدث بوضوح عن درس {subject}</p></div>
               <div className="relative w-64 h-64 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full transition-all duration-75" style={{ transform: `scale(${1 + volumeLevel * 0.4})` }}></div>
                  <div className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.5)] transition-all duration-200 ${isMuted ? 'bg-slate-700' : 'bg-indigo-600'}`}><Activity size={48} className="text-white" /></div>
               </div>
               <div className="flex items-center gap-6 mt-8">
                  <button onClick={() => setIsMuted(!isMuted)} className={`p-6 rounded-full transition-all ${isMuted ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-900'}`}>{isMuted ? <MicOff size={28} /> : <Mic size={28} />}</button>
                  <button onClick={onClose} className="p-6 rounded-full bg-red-500 text-white shadow-lg hover:scale-105 transition-all"><PhoneOff size={28} /></button>
               </div>
            </>
         )}
      </div>
    </div>
  );
};
